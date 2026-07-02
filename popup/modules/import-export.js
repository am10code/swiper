// Модуль импорта/экспорта задач
(function() {
  function setupImportExport(options) {
    const storage = options?.storage;
    const onAfterImport = options?.onAfterImport;
    if (!storage) return;

    const tasksExportBtn = document.getElementById('tasksExportBtn');
    if (tasksExportBtn) {
      tasksExportBtn.addEventListener('click', () => handleTasksExport(storage));
    }
    const tasksImportBtn = document.getElementById('tasksImportBtn');
    const tasksImportInput = document.getElementById('tasksImportInput');
    if (tasksImportBtn && tasksImportInput) {
      tasksImportBtn.addEventListener('click', () => {
        tasksImportInput.click();
      });
    }
    if (tasksImportInput) {
      tasksImportInput.addEventListener('change', (event) => handleTasksImport(event, storage, onAfterImport));
    }
  }

  async function handleTasksExport(storage) {
    const tasks = await storage.getTasks();
    const payload = JSON.stringify(tasks, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const timestamp = Math.floor(Date.now() / 1000);
    const filename = `tasks_${timestamp}.swiper`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function handleTasksImport(event, storage, onAfterImport) {
    const input = event.target;
    const file = input?.files?.[0];
    if (!file) return;
    input.value = '';

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.swiper') && !lowerName.endsWith('.json')) {
      await window.dialogService.showAlert('Поддерживаются только файлы .swiper или .json');
      return;
    }

    try {
      const content = await file.text();
      const parsed = JSON.parse(content);
      const parsedTasks = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === 'object' && Array.isArray(parsed.tasks)
          ? parsed.tasks
          : null;
      if (!parsedTasks) {
        await window.dialogService.showAlert('Файл должен содержать массив задач или объект с массивом tasks.');
        return;
      }
      const normalization = normalizeImportedTasks(parsedTasks);
      if (!normalization.ok) {
        await window.dialogService.showAlert(`Файл сломан: ${normalization.error}`);
        return;
      }

      const confirmed = await window.dialogService.showConfirm('Импорт', 'Импорт перезапишет все текущие задачи. Продолжить?', { confirmLabel: 'Продолжить' });
      if (!confirmed) return;

      await storage.saveTasks(normalization.tasks);
      if (typeof onAfterImport === 'function') {
        await onAfterImport();
      }
      await window.dialogService.showAlert('Задачи успешно импортированы.');
    } catch (error) {
      console.error('Ошибка при импорте задач:', error);
      await window.dialogService.showAlert('Не удалось импортировать задачи. Проверьте формат файла.');
    }
  }

  function normalizePriority(value) {
    if (value === 'high') return 'high';
    return 'medium';
  }

  function normalizeTaskStatus(value) {
    if (value === 'draft') return 'draft';
    return 'ready';
  }

  const WORKFLOW_STATUSES = ['active', 'waiting', 'backlog', 'idea', 'killed'];
  const NEXT_STEP_KINDS = ['do', 'ping', 'check', 'write', 'think', 'delegate'];
  const RECURRENCE_EXECUTION_MODES = ['routine', 'needs_next_action'];

  function normalizeWorkflowStatus(value) {
    return WORKFLOW_STATUSES.includes(value) ? value : 'active';
  }

  function normalizeNullableText(value) {
    if (value === null || value === undefined) return null;
    if (typeof value !== 'string') return null;
    const text = value.trim();
    return text || null;
  }

  function normalizeDateKeyOrNull(value) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value !== 'string') return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    if (!match) return null;
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  function normalizeNextStepSize(value) {
    if (value === 'deep') return 'deep';
    const parsed = Number(value);
    if ([5, 15, 30, 60].includes(parsed)) return parsed;
    return 30;
  }

  function normalizeNextStepKind(value) {
    return NEXT_STEP_KINDS.includes(value) ? value : 'do';
  }

  function hasOpenNextSteps(steps) {
    return Array.isArray(steps) && steps.some((step) =>
      step && step.completed !== true && typeof step.text === 'string' && step.text.trim()
    );
  }

  function normalizeRecurrenceExecutionMode(value, task) {
    if (RECURRENCE_EXECUTION_MODES.includes(value)) return value;
    if (task?.isRecurringParticipation === true && !hasOpenNextSteps(task.nextSteps)) {
      return 'routine';
    }
    return 'needs_next_action';
  }

  function normalizeNextSteps(steps) {
    if (!Array.isArray(steps)) return [];
    return steps
      .map((step, index) => {
        if (!step || typeof step !== 'object' || Array.isArray(step)) return null;
        const text = typeof step.text === 'string' ? step.text.trim() : '';
        if (!text) return null;
        const completedAt = step.completed === true && typeof step.completedAt === 'number' && !Number.isNaN(step.completedAt)
          ? step.completedAt
          : null;
        return {
          ...step,
          id: typeof step.id === 'string' && step.id.trim() ? step.id.trim() : createTaskId(),
          text,
          completed: step.completed === true,
          order: Number.isFinite(Number(step.order)) ? Number(step.order) : index,
          size: normalizeNextStepSize(step.size),
          kind: normalizeNextStepKind(step.kind),
          completedAt
        };
      })
      .filter(Boolean)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((step, index) => ({ ...step, order: index }));
  }

  function normalizeTaskEvents(events) {
    if (!Array.isArray(events)) return [];
    return events
      .map((event) => {
        if (!event || typeof event !== 'object' || Array.isArray(event)) return null;
        return {
          id: typeof event.id === 'string' && event.id.trim() ? event.id.trim() : createTaskId(),
          type: typeof event.type === 'string' && event.type.trim() ? event.type.trim() : 'note',
          timestamp: typeof event.timestamp === 'number' && !Number.isNaN(event.timestamp) ? event.timestamp : Date.now(),
          payload: event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload)
            ? event.payload
            : {}
        };
      })
      .filter(Boolean)
      .slice(-250);
  }

  function normalizePriorityRank(value) {
    if (value === null || value === undefined || value === '') return null;
    const rank = Number(value);
    if (!Number.isFinite(rank)) return null;
    return Math.max(1, Math.floor(rank));
  }

  function normalizeDeadline(value) {
    if (value === null || value === undefined) return null;
    if (typeof value !== 'string') return null;
    var s = value.trim();
    if (s === '') return null;
    var match = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (match) return match[1] + '-' + match[2] + '-' + match[3];
    return s;
  }

  function normalizePositiveNumberOrNull(value) {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return Math.floor(parsed);
  }

  function normalizeNonNegativeNumber(value, fallback) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    const safeFallback = Number(fallback);
    if (Number.isFinite(safeFallback) && safeFallback >= 0) return safeFallback;
    return 0;
  }

  function normalizeEstimateMode(value) {
    return ['fixed', 'range', 'epic', 'none'].includes(value) ? value : 'none';
  }

  function pickFirstDefined(source, keys) {
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        return source[key];
      }
    }
    return undefined;
  }

  function normalizeTimeEstimateRange(value) {
    if (value === null || value === undefined || value === '') return null;

    let minValue;
    let maxValue;

    if (Array.isArray(value)) {
      minValue = value[0];
      maxValue = value[1];
    } else if (typeof value === 'object') {
      minValue = pickFirstDefined(value, ['min', 'from', 'start', 'low', 'minimum', 'minMinutes']);
      maxValue = pickFirstDefined(value, ['max', 'to', 'end', 'high', 'maximum', 'maxMinutes']);
    } else if (typeof value === 'string') {
      const match = value.trim().match(/^(\d+)\s*(?:-|–|—|\.{2}|…)\s*(\d+)$/);
      if (match) {
        minValue = match[1];
        maxValue = match[2];
      } else {
        minValue = value;
        maxValue = value;
      }
    } else {
      minValue = value;
      maxValue = value;
    }

    const min = normalizePositiveNumberOrNull(minValue);
    const max = normalizePositiveNumberOrNull(maxValue);
    if (min === null || max === null || max < min) return null;
    return { min, max };
  }

  function normalizeImportedEstimateMode(value, timeEstimateMin, timeEstimateMinRange) {
    const rawValue = typeof value === 'string' ? value.trim().toLowerCase() : value;
    const normalized = normalizeEstimateMode(rawValue);
    const explicitMode = ['fixed', 'range', 'epic', 'none'].includes(rawValue);

    if (normalized === 'range') {
      if (timeEstimateMinRange) return 'range';
      return timeEstimateMin !== null ? 'fixed' : 'none';
    }

    if (normalized === 'fixed') {
      if (timeEstimateMin !== null) return 'fixed';
      return timeEstimateMinRange ? 'range' : 'none';
    }

    if (normalized === 'epic' || explicitMode) {
      return normalized;
    }

    if (timeEstimateMinRange) return 'range';
    if (timeEstimateMin !== null) return 'fixed';
    return 'none';
  }

  function validateTimeFields(estimateMode, estimateRange, taskIndex) {
    if (estimateMode === 'range' && !estimateRange) {
      return { ok: false, error: `В задаче #${taskIndex} для estimateMode="range" требуется корректный timeEstimateMinRange.` };
    }
    return { ok: true };
  }

  function normalizeImportedTasks(tasks) {
    var now = Date.now();
    var normalized = [];
    var usedIds = new Set();

    for (var i = 0; i < tasks.length; i += 1) {
      var task = tasks[i];
      if (!task || typeof task !== 'object' || Array.isArray(task)) {
        return { ok: false, error: 'Задача #' + (i + 1) + ' имеет неверный формат.' };
      }

      var text = typeof task.text === 'string' ? task.text.trim() : '';
      if (!text) {
        return { ok: false, error: 'Отсутствует поле "text" в задаче #' + (i + 1) + '.' };
      }

      var rawId = typeof task.id === 'string' && task.id.trim() ? task.id.trim() : '';
      var id = rawId && !usedIds.has(rawId) ? rawId : createTaskId();
      while (usedIds.has(id)) id = createTaskId();
      usedIds.add(id);

      var completed = typeof task.completed === 'boolean' ? task.completed : false;
      var category = typeof task.category === 'string' ? task.category.trim() : '';
      var priority = normalizePriority(typeof task.priority === 'string' ? task.priority.trim().toLowerCase() : '');
      var status = normalizeTaskStatus(typeof task.status === 'string' ? task.status.trim().toLowerCase() : task.status);
      var priorityRank = normalizePriorityRank(task.priorityRank);
      var deadline = normalizeDeadline(task.deadline === null || typeof task.deadline === 'string' ? task.deadline : null);
      const createdAt = typeof task.createdAt === 'number' && !Number.isNaN(task.createdAt)
        ? task.createdAt
        : now;
      const updatedAt = typeof task.updatedAt === 'number' && !Number.isNaN(task.updatedAt)
        ? task.updatedAt
        : createdAt;
      const pomodoroSessions = Array.isArray(task.pomodoroSessions) ? task.pomodoroSessions : [];
      const totalTime = typeof task.totalTime === 'number' && !Number.isNaN(task.totalTime)
        ? task.totalTime
        : 0;
      const log = Array.isArray(task.log) ? task.log : [];
      const nextSteps = normalizeNextSteps(Array.isArray(task.nextSteps) ? task.nextSteps : []);
      const pomodoroSettings = task.pomodoroSettings && typeof task.pomodoroSettings === 'object' && !Array.isArray(task.pomodoroSettings)
        ? task.pomodoroSettings
        : null;
      const link = task.link === null || typeof task.link === 'string' ? task.link : null;
      const completedAt = task.completedAt === null || typeof task.completedAt === 'number'
        ? task.completedAt
        : null;
      const isRecurringParticipation = task.isRecurringParticipation === true;
      const recurrenceDays = Math.max(1, Number(task.recurrenceDays) || 3);
      const timeEstimateMin = normalizePositiveNumberOrNull(task.timeEstimateMin);
      const timeEstimateUpdatedAt = normalizeNonNegativeNumber(task.timeEstimateUpdatedAt, null) || null;
      const rawEstimateMode = typeof task.estimateMode === 'string'
        ? task.estimateMode.trim().toLowerCase()
        : task.estimateMode;
      const timeEstimateMinRange = normalizeTimeEstimateRange(task.timeEstimateMinRange);
      const estimateMode = normalizeImportedEstimateMode(rawEstimateMode, timeEstimateMin, timeEstimateMinRange);
      const actualFocusSeconds = normalizeNonNegativeNumber(task.actualFocusSeconds, totalTime);
      const workflowStatus = normalizeWorkflowStatus(
        typeof task.workflowStatus === 'string' ? task.workflowStatus.trim().toLowerCase() : task.workflowStatus
      );
      const recurrenceExecutionMode = normalizeRecurrenceExecutionMode(
        typeof task.recurrenceExecutionMode === 'string' ? task.recurrenceExecutionMode.trim().toLowerCase() : task.recurrenceExecutionMode,
        { ...task, isRecurringParticipation, nextSteps }
      );
      const waitingFor = normalizeNullableText(task.waitingFor);
      const waitingUntil = normalizeDateKeyOrNull(task.waitingUntil);
      const waitingNote = normalizeNullableText(task.waitingNote);
      const killedAt = task.killedAt === null || typeof task.killedAt === 'number' ? task.killedAt : null;
      const backlogAt = task.backlogAt === null || typeof task.backlogAt === 'number' ? task.backlogAt : null;
      const ideaAt = task.ideaAt === null || typeof task.ideaAt === 'number' ? task.ideaAt : null;
      const events = normalizeTaskEvents(task.events);

      const sessionsValidation = validatePomodoroSessions(pomodoroSessions, i + 1);
      if (!sessionsValidation.ok) return sessionsValidation;
      const logValidation = validateLogEntries(log, i + 1);
      if (!logValidation.ok) return logValidation;
      const stepsValidation = validateNextSteps(nextSteps, i + 1);
      if (!stepsValidation.ok) return stepsValidation;
      const eventsValidation = validateTaskEvents(events, i + 1);
      if (!eventsValidation.ok) return eventsValidation;
      const settingsValidation = validatePomodoroSettings(pomodoroSettings, i + 1);
      if (!settingsValidation.ok) return settingsValidation;
      const timeValidation = validateTimeFields(estimateMode, timeEstimateMinRange, i + 1);
      if (!timeValidation.ok) return timeValidation;

      normalized.push({
        id,
        text,
        completed,
        category,
        priority,
        status,
        priorityRank,
        deadline,
        createdAt,
        updatedAt,
        pomodoroSessions,
        totalTime,
        log,
        nextSteps,
        pomodoroSettings,
        link,
        completedAt,
        isRecurringParticipation,
        recurrenceDays,
        recurrenceExecutionMode,
        timeEstimateMin,
        timeEstimateUpdatedAt,
        actualFocusSeconds,
        estimateMode,
        timeEstimateMinRange,
        workflowStatus,
        waitingFor,
        waitingUntil,
        waitingNote,
        killedAt,
        backlogAt,
        ideaAt,
        events
      });
    }

    return { ok: true, tasks: normalized };
  }

  function createTaskId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  function validateKeys(obj, _allowedKeys, requiredKeys) {
    const missingKeys = (requiredKeys || []).filter((key) => !Object.prototype.hasOwnProperty.call(obj, key));
    if (missingKeys.length > 0) {
      return { ok: false, error: `отсутствуют обязательные поля: ${missingKeys.join(', ')}` };
    }
    // Import is intentionally forward-compatible: unknown keys are allowed.
    return { ok: true };
  }

  function validatePomodoroSessions(sessions, taskIndex) {
    for (let i = 0; i < sessions.length; i += 1) {
      const session = sessions[i];
      if (!session || typeof session !== 'object' || Array.isArray(session)) {
        return { ok: false, error: `Сессия #${i + 1} в задаче #${taskIndex} имеет неверный формат.` };
      }
      const hasLegacy = Object.prototype.hasOwnProperty.call(session, 'startTime')
        || Object.prototype.hasOwnProperty.call(session, 'endTime')
        || Object.prototype.hasOwnProperty.call(session, 'duration');
      const hasNew = Object.prototype.hasOwnProperty.call(session, 'timestamp')
        || Object.prototype.hasOwnProperty.call(session, 'durationSeconds')
        || Object.prototype.hasOwnProperty.call(session, 'type');

      if (!hasLegacy && !hasNew) {
        return { ok: false, error: `Сессия #${i + 1} в задаче #${taskIndex} не похожа на экспорт.` };
      }

      if (hasLegacy) {
        const allowedKeys = ['id', 'startTime', 'endTime', 'duration'];
        const requiredKeys = ['startTime', 'endTime', 'duration'];
        const keysValidation = validateKeys(session, allowedKeys, requiredKeys);
        if (!keysValidation.ok) {
          return { ok: false, error: `Сессия #${i + 1} в задаче #${taskIndex}: ${keysValidation.error}` };
        }
        if (typeof session.startTime !== 'number' || typeof session.endTime !== 'number') {
          return { ok: false, error: `Сессия #${i + 1} в задаче #${taskIndex} содержит некорректные даты.` };
        }
        if (typeof session.duration !== 'number' || Number.isNaN(session.duration)) {
          return { ok: false, error: `Сессия #${i + 1} в задаче #${taskIndex} содержит некорректную длительность.` };
        }
      } else {
        const allowedKeys = ['id', 'timestamp', 'durationSeconds', 'type'];
        const requiredKeys = ['timestamp', 'durationSeconds'];
        const keysValidation = validateKeys(session, allowedKeys, requiredKeys);
        if (!keysValidation.ok) {
          return { ok: false, error: `Сессия #${i + 1} в задаче #${taskIndex}: ${keysValidation.error}` };
        }
        if (typeof session.timestamp !== 'number' || Number.isNaN(session.timestamp)) {
          return { ok: false, error: `Сессия #${i + 1} в задаче #${taskIndex} содержит некорректную дату.` };
        }
        if (typeof session.durationSeconds !== 'number' || Number.isNaN(session.durationSeconds)) {
          return { ok: false, error: `Сессия #${i + 1} в задаче #${taskIndex} содержит некорректную длительность.` };
        }
        if (session.type !== undefined && typeof session.type !== 'string') {
          return { ok: false, error: `Сессия #${i + 1} в задаче #${taskIndex} имеет некорректный type.` };
        }
      }
    }
    return { ok: true };
  }

  function validateLogEntries(logEntries, taskIndex) {
    for (let i = 0; i < logEntries.length; i += 1) {
      const entry = logEntries[i];
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        return { ok: false, error: `Лог #${i + 1} в задаче #${taskIndex} имеет неверный формат.` };
      }
      const allowedKeys = ['id', 'text', 'timestamp'];
      const requiredKeys = ['id', 'text', 'timestamp'];
      const keysValidation = validateKeys(entry, allowedKeys, requiredKeys);
      if (!keysValidation.ok) {
        return { ok: false, error: `Лог #${i + 1} в задаче #${taskIndex}: ${keysValidation.error}` };
      }
      if (typeof entry.id !== 'string' || !entry.id.trim()) {
        return { ok: false, error: `Лог #${i + 1} в задаче #${taskIndex} имеет некорректный id.` };
      }
      if (typeof entry.text !== 'string') {
        return { ok: false, error: `Лог #${i + 1} в задаче #${taskIndex} имеет некорректный text.` };
      }
      if (typeof entry.timestamp !== 'number' || Number.isNaN(entry.timestamp)) {
        return { ok: false, error: `Лог #${i + 1} в задаче #${taskIndex} имеет некорректный timestamp.` };
      }
    }
    return { ok: true };
  }

  function validateNextSteps(steps, taskIndex) {
    for (let i = 0; i < steps.length; i += 1) {
      const step = steps[i];
      if (!step || typeof step !== 'object' || Array.isArray(step)) {
        return { ok: false, error: `Шаг #${i + 1} в задаче #${taskIndex} имеет неверный формат.` };
      }
      const allowedKeys = ['id', 'text', 'completed', 'order', 'size', 'kind', 'completedAt'];
      const requiredKeys = ['id', 'text', 'completed', 'order'];
      const keysValidation = validateKeys(step, allowedKeys, requiredKeys);
      if (!keysValidation.ok) {
        return { ok: false, error: `Шаг #${i + 1} в задаче #${taskIndex}: ${keysValidation.error}` };
      }
      if (typeof step.id !== 'string' || !step.id.trim()) {
        return { ok: false, error: `Шаг #${i + 1} в задаче #${taskIndex} имеет некорректный id.` };
      }
      if (typeof step.text !== 'string') {
        return { ok: false, error: `Шаг #${i + 1} в задаче #${taskIndex} имеет некорректный text.` };
      }
      if (typeof step.completed !== 'boolean') {
        return { ok: false, error: `Шаг #${i + 1} в задаче #${taskIndex} имеет некорректный completed.` };
      }
      if (typeof step.order !== 'number' || Number.isNaN(step.order)) {
        return { ok: false, error: `Шаг #${i + 1} в задаче #${taskIndex} имеет некорректный order.` };
      }
      if (![5, 15, 30, 60, 'deep'].includes(step.size)) {
        return { ok: false, error: `Шаг #${i + 1} в задаче #${taskIndex} имеет некорректный size.` };
      }
      if (!NEXT_STEP_KINDS.includes(step.kind)) {
        return { ok: false, error: `Шаг #${i + 1} в задаче #${taskIndex} имеет некорректный kind.` };
      }
      if (step.completedAt !== null && (typeof step.completedAt !== 'number' || Number.isNaN(step.completedAt))) {
        return { ok: false, error: `Шаг #${i + 1} в задаче #${taskIndex} имеет некорректный completedAt.` };
      }
    }
    return { ok: true };
  }

  function validateTaskEvents(events, taskIndex) {
    for (let i = 0; i < events.length; i += 1) {
      const event = events[i];
      if (!event || typeof event !== 'object' || Array.isArray(event)) {
        return { ok: false, error: `Событие #${i + 1} в задаче #${taskIndex} имеет неверный формат.` };
      }
      if (typeof event.id !== 'string' || !event.id.trim()) {
        return { ok: false, error: `Событие #${i + 1} в задаче #${taskIndex} имеет некорректный id.` };
      }
      if (typeof event.type !== 'string' || !event.type.trim()) {
        return { ok: false, error: `Событие #${i + 1} в задаче #${taskIndex} имеет некорректный type.` };
      }
      if (typeof event.timestamp !== 'number' || Number.isNaN(event.timestamp)) {
        return { ok: false, error: `Событие #${i + 1} в задаче #${taskIndex} имеет некорректный timestamp.` };
      }
      if (!event.payload || typeof event.payload !== 'object' || Array.isArray(event.payload)) {
        return { ok: false, error: `Событие #${i + 1} в задаче #${taskIndex} имеет некорректный payload.` };
      }
    }
    return { ok: true };
  }

  function validatePomodoroSettings(settings, taskIndex) {
    if (settings === null) return { ok: true };
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      return { ok: false, error: `pomodoroSettings в задаче #${taskIndex} имеет неверный формат.` };
    }
    const allowedKeys = ['interval', 'shortBreak', 'longBreak', 'longBreakAfter'];
    const requiredKeys = allowedKeys;
    const keysValidation = validateKeys(settings, allowedKeys, requiredKeys);
    if (!keysValidation.ok) {
      return { ok: false, error: `pomodoroSettings в задаче #${taskIndex}: ${keysValidation.error}` };
    }
    if (typeof settings.interval !== 'number' || Number.isNaN(settings.interval)) {
      return { ok: false, error: `pomodoroSettings.interval в задаче #${taskIndex} должен быть числом.` };
    }
    if (typeof settings.shortBreak !== 'number' || Number.isNaN(settings.shortBreak)) {
      return { ok: false, error: `pomodoroSettings.shortBreak в задаче #${taskIndex} должен быть числом.` };
    }
    if (typeof settings.longBreak !== 'number' || Number.isNaN(settings.longBreak)) {
      return { ok: false, error: `pomodoroSettings.longBreak в задаче #${taskIndex} должен быть числом.` };
    }
    if (typeof settings.longBreakAfter !== 'number' || Number.isNaN(settings.longBreakAfter)) {
      return { ok: false, error: `pomodoroSettings.longBreakAfter в задаче #${taskIndex} должен быть числом.` };
    }
    return { ok: true };
  }

  window.setupImportExport = setupImportExport;
})();
