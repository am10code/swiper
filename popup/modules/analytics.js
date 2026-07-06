(function () {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const DEFAULT_PERIOD_DAYS = 7;
  const OPEN_STEP_KINDS = ['do', 'ping', 'check', 'write', 'think', 'delegate'];
  const STEP_SIZES = [5, 15, 30, 60, 'deep'];

  function startOfTodayMs(now) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function parseDateKeyMs(value) {
    if (!value) return null;
    const str = typeof value === 'string' ? value.split('T')[0] : String(value);
    const parts = str.split('-');
    if (parts.length !== 3) return null;
    const year = Number(parts[0]);
    const month = Number(parts[1]) - 1;
    const day = Number(parts[2]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    const d = new Date(year, month, day);
    d.setHours(0, 0, 0, 0);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }

  function periodStartMs(periodDays, now) {
    if (periodDays === null) return null;
    const days = Number.isFinite(Number(periodDays)) ? Math.max(1, Math.floor(Number(periodDays))) : DEFAULT_PERIOD_DAYS;
    return startOfTodayMs(now) - (days - 1) * DAY_MS;
  }

  function inPeriod(timestamp, startMs) {
    if (startMs === null) return true;
    const time = Number(timestamp);
    return Number.isFinite(time) && time >= startMs;
  }

  function normalizeTaskStatus(value) {
    return value === 'draft' ? 'draft' : 'ready';
  }

  function normalizeWorkflowStatus(value) {
    return ['active', 'waiting', 'backlog', 'idea', 'killed'].includes(value) ? value : 'active';
  }

  function normalizeStepSize(value) {
    if (value === 'deep') return 'deep';
    const parsed = Number(value);
    return [5, 15, 30, 60].includes(parsed) ? parsed : 30;
  }

  function normalizeStepKind(value) {
    return OPEN_STEP_KINDS.includes(value) ? value : 'do';
  }

  function getSteps(task) {
    return Array.isArray(task?.nextSteps) ? task.nextSteps : [];
  }

  function getOpenSteps(task) {
    return getSteps(task).filter(step => step && step.completed !== true && typeof step.text === 'string' && step.text.trim());
  }

  function getCompletedSteps(task, startMs) {
    return getSteps(task).filter(step => step && step.completed === true && inPeriod(step.completedAt, startMs));
  }

  function getEvents(task) {
    return Array.isArray(task?.events) ? task.events : [];
  }

  function getSessions(task) {
    return Array.isArray(task?.pomodoroSessions) ? task.pomodoroSessions : [];
  }

  function getSessionTimestamp(session) {
    return Number(session?.timestamp) || Number(session?.endTime) || Number(session?.startTime) || 0;
  }

  function getSessionSeconds(session) {
    if (session?.durationSeconds !== undefined) {
      return Math.max(0, Math.floor(Number(session.durationSeconds) || 0));
    }
    if (session?.startTime && session?.endTime) {
      return Math.max(0, Math.floor((Number(session.endTime) - Number(session.startTime)) / 1000));
    }
    const minutes = Number(session?.duration);
    return Number.isFinite(minutes) && minutes > 0 ? Math.floor(minutes * 60) : 0;
  }

  function getTaskFactSeconds(task) {
    const actualFocus = Number(task?.actualFocusSeconds);
    if (Number.isFinite(actualFocus) && actualFocus >= 0) return Math.floor(actualFocus);
    const totalTime = Number(task?.totalTime);
    return Number.isFinite(totalTime) && totalTime >= 0 ? Math.floor(totalTime) : 0;
  }

  function getEstimateMinutes(task) {
    const mode = ['fixed', 'range', 'epic', 'none'].includes(task?.estimateMode) ? task.estimateMode : 'none';
    if (mode === 'none') return null;
    if (mode === 'fixed' || mode === 'epic') {
      const fixed = Number(task?.timeEstimateMin);
      return Number.isFinite(fixed) && fixed > 0 ? Math.floor(fixed) : null;
    }
    const range = task?.timeEstimateMinRange && typeof task.timeEstimateMinRange === 'object'
      ? task.timeEstimateMinRange
      : null;
    const min = Number(range?.min);
    const max = Number(range?.max);
    if (Number.isFinite(min) && Number.isFinite(max) && min > 0 && max >= min) {
      return Math.round((min + max) / 2);
    }
    return null;
  }

  function getDeadlineMs(task) {
    return parseDateKeyMs(task?.deadline);
  }

  function isOverdue(task, todayMs) {
    const deadlineMs = getDeadlineMs(task);
    return deadlineMs !== null && deadlineMs < todayMs && task?.completed !== true;
  }

  function isWaitingOverdue(task, todayMs) {
    const waitingUntilMs = parseDateKeyMs(task?.waitingUntil);
    return task?.completed !== true
      && normalizeWorkflowStatus(task?.workflowStatus) === 'waiting'
      && waitingUntilMs !== null
      && waitingUntilMs <= todayMs;
  }

  function hasRecentProgress(task, now) {
    const updatedAt = Number(task?.updatedAt) || 0;
    if (updatedAt >= now - DAY_MS) return true;
    return getEvents(task).some(event => Number(event?.timestamp) >= now - DAY_MS);
  }

  function getTaskAgeDays(task, now) {
    const createdAt = Number(task?.createdAt) || now;
    return Math.max(0, Math.floor((now - createdAt) / DAY_MS));
  }

  function getStaleDays(task, now) {
    const updatedAt = Number(task?.updatedAt) || Number(task?.createdAt) || now;
    return Math.max(0, Math.floor((now - updatedAt) / DAY_MS));
  }

  function ratioPercent(factSeconds, planMinutes) {
    if (!planMinutes || planMinutes <= 0) return null;
    return Math.round((factSeconds / (planMinutes * 60)) * 100);
  }

  function createEmptyStepCounts() {
    return {
      bySize: STEP_SIZES.reduce((acc, size) => {
        acc[String(size)] = 0;
        return acc;
      }, {}),
      byKind: OPEN_STEP_KINDS.reduce((acc, kind) => {
        acc[kind] = 0;
        return acc;
      }, {})
    };
  }

  function formatAction(reasonIds) {
    if (reasonIds.includes('missing_next_action')) return 'Добавить следующий шаг';
    if (reasonIds.includes('deadline_churn') || reasonIds.includes('overdue')) return 'Проверить дедлайн';
    if (reasonIds.includes('waiting_overdue')) return 'Проверить ожидание';
    if (reasonIds.includes('flow_skipped')) return 'Разбить задачу';
    if (reasonIds.includes('plan_fact_over')) return 'Пересчитать оценку';
    return 'Открыть и принять решение';
  }

  function buildProblemTasks(tasks, now, todayMs) {
    return tasks
      .filter(task => task && task.completed !== true)
      .map(task => {
        let score = 0;
        const reasons = [];
        const reasonIds = [];
        const planMinutes = getEstimateMinutes(task);
        const factSeconds = getTaskFactSeconds(task);
        const percent = ratioPercent(factSeconds, planMinutes);
        const ageDays = getTaskAgeDays(task, now);
        const staleDays = getStaleDays(task, now);

        if (isOverdue(task, todayMs)) {
          score += 5;
          reasonIds.push('overdue');
          reasons.push('Просрочена');
        }
        if (Math.floor(Number(task.deadlineMoveCount) || 0) >= 3) {
          score += 4;
          reasonIds.push('deadline_churn');
          reasons.push('Дедлайн переносился 3+ раза');
        }
        if (Math.floor(Number(task.flowSkipCount) || 0) >= 2) {
          score += 4;
          reasonIds.push('flow_skipped');
          reasons.push('Пропущена во ФЛОУ 2+ раза');
        }
        if (getOpenSteps(task).length === 0) {
          score += 3;
          reasonIds.push('missing_next_action');
          reasons.push('Нет открытого следующего шага');
        }
        if (isWaitingOverdue(task, todayMs)) {
          score += 3;
          reasonIds.push('waiting_overdue');
          reasons.push('Ожидание пора проверить');
        }
        if (staleDays >= 14) {
          score += 2;
          reasonIds.push('stale');
          reasons.push(`Не обновлялась ${staleDays} дн.`);
        }
        if (percent !== null && percent >= 150) {
          score += 2;
          reasonIds.push('plan_fact_over');
          reasons.push(`Факт ${percent}% от плана`);
        }
        if (ageDays >= 30) {
          score += 1;
          reasonIds.push('old');
          reasons.push(`Возраст ${ageDays} дн.`);
        }
        if (hasRecentProgress(task, now)) {
          score -= 2;
          reasonIds.push('recent_progress');
        }

        return {
          id: task.id,
          title: task.text || 'Без названия',
          score,
          reasons,
          suggestedAction: formatAction(reasonIds),
          ageDays,
          staleDays,
          planMinutes,
          factSeconds,
          percent
        };
      })
      .filter(item => item.score > 0 && item.reasons.length > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.staleDays - a.staleDays;
      })
      .slice(0, 10);
  }

  function buildPlanFact(tasks) {
    const items = tasks
      .map(task => {
        const planMinutes = getEstimateMinutes(task);
        const factSeconds = getTaskFactSeconds(task);
        const percent = ratioPercent(factSeconds, planMinutes);
        return {
          id: task.id,
          title: task.text || 'Без названия',
          planMinutes,
          factSeconds,
          percent,
          direction: percent === null ? null : percent >= 150 ? 'over' : percent <= 50 ? 'under' : 'ok'
        };
      })
      .filter(item => item.percent !== null && item.direction !== 'ok')
      .sort((a, b) => Math.abs((b.percent || 100) - 100) - Math.abs((a.percent || 100) - 100))
      .slice(0, 10);

    const withPlan = tasks
      .map(task => ({ planMinutes: getEstimateMinutes(task), factSeconds: getTaskFactSeconds(task) }))
      .filter(item => item.planMinutes && item.planMinutes > 0);
    const planSeconds = withPlan.reduce((sum, item) => sum + item.planMinutes * 60, 0);
    const factSeconds = withPlan.reduce((sum, item) => sum + item.factSeconds, 0);

    return {
      items,
      accuracyPercent: planSeconds > 0 ? Math.round((factSeconds / planSeconds) * 100) : null,
      plannedTasks: withPlan.length
    };
  }

  function createAnalyticsReport(tasksInput, options) {
    const tasks = Array.isArray(tasksInput) ? tasksInput.filter(Boolean) : [];
    const now = Number(options?.now) || Date.now();
    const todayMs = startOfTodayMs(now);
    const periodDays = Object.prototype.hasOwnProperty.call(options || {}, 'periodDays')
      ? options.periodDays
      : DEFAULT_PERIOD_DAYS;
    const startMs = periodStartMs(periodDays, now);

    const completedTasks = tasks.filter(task => task.completed === true && inPeriod(task.completedAt || task.updatedAt, startMs));
    const activeReadyTasks = tasks.filter(task => task.completed !== true && normalizeTaskStatus(task.status) === 'ready');
    const overdueTasks = tasks.filter(task => isOverdue(task, todayMs));
    const waitingOverdue = tasks.filter(task => isWaitingOverdue(task, todayMs));
    const deadlineChurn = tasks.filter(task => task.completed !== true && Math.floor(Number(task.deadlineMoveCount) || 0) >= 3);
    const tasksWithoutNextAction = tasks.filter(task => task.completed !== true && normalizeWorkflowStatus(task.workflowStatus) === 'active' && getOpenSteps(task).length === 0);

    const stepCounts = createEmptyStepCounts();
    let completedStepsCount = 0;
    let completedStepSeconds = 0;
    tasks.forEach(task => {
      getCompletedSteps(task, startMs).forEach(step => {
        completedStepsCount += 1;
        const size = normalizeStepSize(step.size);
        const kind = normalizeStepKind(step.kind);
        stepCounts.bySize[String(size)] = (stepCounts.bySize[String(size)] || 0) + 1;
        stepCounts.byKind[kind] = (stepCounts.byKind[kind] || 0) + 1;
        completedStepSeconds += Math.max(0, Math.floor(Number(step.durationSec) || 0));
      });
    });

    const modes = {
      micro: { seconds: 0, sessions: 0 },
      pomodoro: { seconds: 0, sessions: 0 },
      other: { seconds: 0, sessions: 0 }
    };
    tasks.forEach(task => {
      getSessions(task).forEach(session => {
        if (!inPeriod(getSessionTimestamp(session), startMs)) return;
        const seconds = getSessionSeconds(session);
        const key = session?.type === 'micro' ? 'micro' : session?.type === 'pomodoro' ? 'pomodoro' : 'other';
        modes[key].seconds += seconds;
        modes[key].sessions += 1;
      });
    });

    return {
      periodDays,
      generatedAt: now,
      summary: {
        completedTasks: completedTasks.length,
        completedSteps: completedStepsCount,
        focusSeconds: modes.pomodoro.seconds + modes.other.seconds,
        microSeconds: modes.micro.seconds,
        activeReadyCount: activeReadyTasks.length,
        overdueCount: overdueTasks.length
      },
      problemTasks: buildProblemTasks(tasks, now, todayMs),
      planFact: buildPlanFact(tasks),
      deadlines: {
        overdue: overdueTasks.map(task => ({ id: task.id, title: task.text || 'Без названия', deadline: task.deadline })),
        deadlineChurn: deadlineChurn.map(task => ({ id: task.id, title: task.text || 'Без названия', count: Math.floor(Number(task.deadlineMoveCount) || 0) })),
        waitingOverdue: waitingOverdue.map(task => ({ id: task.id, title: task.text || 'Без названия', waitingUntil: task.waitingUntil }))
      },
      steps: {
        completed: completedStepsCount,
        completedSeconds: completedStepSeconds,
        bySize: stepCounts.bySize,
        byKind: stepCounts.byKind,
        tasksWithoutNextAction: tasksWithoutNextAction.map(task => ({ id: task.id, title: task.text || 'Без названия' }))
      },
      modes
    };
  }

  if (typeof window !== 'undefined') {
    window.createAnalyticsReport = createAnalyticsReport;
  }
})();
