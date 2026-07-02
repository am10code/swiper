// Модуль для работы с полной карточкой задачи

// Используем существующий экземпляр StorageManager из popup.js
// Не объявляем storage здесь, чтобы избежать конфликта с popup.js
let currentTaskId = null;
let isEditing = false;
let currentTask = null;
let pomodoroAudio = null;
let currentPomodoroSettings = null;
let lastFocusedElement = null;
let isLogExpanded = null;
let pendingDeleteTaskId = null;
let isHistoryExpanded = false;
let isCompletedExpanded = false;
let isPomodoroStopping = false;
let isTitleEditing = false;
let pomodoroState = 'IDLE_POMODORO';
let pomodoroRemainingSeconds = 0;
let pomodoroIntervalId = null;
let pomodoroTargetEndTime = null;
let pomodoroLastStartTime = null;
let isPomodoroTransitioning = false;
let bellAudio = null;
let bellAudioUnlocked = false;
let isPomodoroBgMuted = false;
let isTaskCardPageInited = false;
let isTaskCardClosing = false;
let hasMeaningfulProgressInCurrentCard = false;
let forceTodayCapacityCheckOnNextSave = false;
let saveTaskEditChain = Promise.resolve(true);

const PomodoroState = {
  IDLE_POMODORO: 'IDLE_POMODORO',
  RUNNING_POMODORO: 'RUNNING_POMODORO',
  PAUSED_POMODORO: 'PAUSED_POMODORO',
  BREAK_READY: 'BREAK_READY',
  RUNNING_BREAK: 'RUNNING_BREAK'
};

function resetCardProgressTracking() {
  hasMeaningfulProgressInCurrentCard = false;
}

function markMeaningfulProgress() {
  hasMeaningfulProgressInCurrentCard = true;
}

function isCurrentTaskReadyForCombatFlow() {
  return currentTask?.status !== 'draft' && normalizeWorkflowStatusForCard(currentTask?.workflowStatus) === 'active';
}

async function registerFlowSkipIfNeeded() {
  if (!currentTaskId || !isCurrentTaskReadyForCombatFlow()) return;
  if (hasMeaningfulProgressInCurrentCard) return;
  const storage = getStorage();
  const nextSkipCount = Math.max(0, Math.floor(Number(currentTask?.flowSkipCount) || 0)) + 1;
  const updated = await storage.updateTask(currentTaskId, {
    flowSkipCount: nextSkipCount,
    events: [
      ...(Array.isArray(currentTask?.events) ? currentTask.events : []),
      createTaskCardEvent('flow_skipped', { count: nextSkipCount })
    ]
  });
  if (updated) {
    currentTask = updated;
  } else if (currentTask) {
    currentTask = { ...currentTask, flowSkipCount: nextSkipCount };
  }
}

function normalizePriority(priority) {
  return priority === 'high' ? 'high' : 'medium';
}

function normalizeEstimateMode(mode) {
  return ['fixed', 'range', 'epic', 'none'].includes(mode) ? mode : 'none';
}

function normalizeWorkflowStatusForCard(value) {
  return ['active', 'waiting', 'backlog', 'idea', 'killed'].includes(value) ? value : 'active';
}

function normalizeRecurrenceExecutionModeForCard(value) {
  return value === 'routine' ? 'routine' : 'needs_next_action';
}

function isRecurringRoutineTaskForCard(task) {
  return task?.isRecurringParticipation === true
    && normalizeRecurrenceExecutionModeForCard(task?.recurrenceExecutionMode) === 'routine';
}

function normalizeNextStepSizeForCard(value) {
  if (value === 'deep') return 'deep';
  const parsed = Number(value);
  return [5, 15, 30, 60].includes(parsed) ? parsed : 30;
}

function normalizeNextStepKindForCard(value) {
  return ['do', 'ping', 'check', 'write', 'think', 'delegate'].includes(value) ? value : 'do';
}

function formatNextStepSizeForCard(size) {
  const normalized = normalizeNextStepSizeForCard(size);
  return normalized === 'deep' ? 'Deep' : `${normalized}м`;
}

function getOpenNextStepsForCard(task) {
  const steps = Array.isArray(task?.nextSteps) ? task.nextSteps : [];
  return steps
    .filter(step => step && !step.completed && typeof step.text === 'string' && step.text.trim())
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function getPrimaryNextActionForCard(task) {
  return getOpenNextStepsForCard(task)[0] || null;
}

function getNextActionMinutesForCard(action) {
  if (!action) return null;
  const size = normalizeNextStepSizeForCard(action.size);
  return size === 'deep' ? 120 : size;
}

function isNextActionFitForWindow(action, windowMin) {
  if (!action) return false;
  const size = normalizeNextStepSizeForCard(action.size);
  const safeWindow = Math.max(5, Number(windowMin) || 30);
  if (size === 'deep') return safeWindow >= 60;
  return size <= safeWindow;
}

function createTaskCardEvent(type, payload) {
  return {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    type,
    timestamp: Date.now(),
    payload: payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {}
  };
}

function normalizePositiveIntegerOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

function normalizeTimeEstimateRange(minValue, maxValue) {
  const min = normalizePositiveIntegerOrNull(minValue);
  const max = normalizePositiveIntegerOrNull(maxValue);
  if (min === null || max === null || max < min) return null;
  return { min, max };
}

function isRangeEqual(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return Number(a.min) === Number(b.min) && Number(a.max) === Number(b.max);
}

async function waitForSaveTaskEditQueue() {
  try {
    await saveTaskEditChain;
  } catch (error) {
    // Ошибка в одном сохранении не должна блокировать последующие.
  }
}

function formatMinutesShort(minutes) {
  const safe = Math.max(0, Math.floor(Number(minutes) || 0));
  if (safe < 60) return `${safe}м`;
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  if (mins === 0) return `${hours}ч`;
  return `${hours}ч ${mins}м`;
}

function formatSecondsShort(seconds) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(safe / 60);
  return formatMinutesShort(minutes);
}

function formatCompactEstimateForBadge(minutes) {
  const safe = Math.max(1, Math.floor(Number(minutes) || 0));
  if (safe < 60) return `~${safe}м`;
  const roundedHours = Math.max(1, Math.round(safe / 60));
  return `~${roundedHours}ч`;
}

function resolveTaskEstimateMinutesForBadge(task) {
  const mode = normalizeEstimateMode(task?.estimateMode);
  if (mode === 'none' && isRecurringRoutineTaskForCard(task)) {
    return 30;
  }
  if (mode === 'none') return null;
  if (mode === 'fixed' || mode === 'epic') {
    return normalizePositiveIntegerOrNull(task?.timeEstimateMin);
  }
  if (mode === 'range') {
    const range = task?.timeEstimateMinRange && typeof task.timeEstimateMinRange === 'object'
      ? normalizeTimeEstimateRange(task.timeEstimateMinRange.min, task.timeEstimateMinRange.max)
      : null;
    return range ? Math.round((range.min + range.max) / 2) : null;
  }
  return null;
}

function appendFlowTimeBadges(meta, task) {
  if (!meta) return;
  const nextAction = getPrimaryNextActionForCard(task);
  if (nextAction) {
    const sizeBadge = document.createElement('span');
    sizeBadge.className = 'task-time-badge task-next-size-badge';
    sizeBadge.textContent = formatNextStepSizeForCard(nextAction.size);
    meta.appendChild(sizeBadge);

    const kindBadge = document.createElement('span');
    kindBadge.className = 'task-time-badge task-next-kind-badge';
    const kindLabels = {
      do: 'Сделать',
      ping: 'Пинг',
      check: 'Проверить',
      write: 'Написать',
      think: 'Подумать',
      delegate: 'Делегировать'
    };
    kindBadge.textContent = kindLabels[normalizeNextStepKindForCard(nextAction.kind)] || 'Сделать';
    meta.appendChild(kindBadge);
    return;
  }

  if (isRecurringRoutineTaskForCard(task)) {
    const routineBadge = document.createElement('span');
    routineBadge.className = 'task-time-badge task-next-kind-badge';
    routineBadge.textContent = 'Рутина';
    meta.appendChild(routineBadge);
  }

  const estimateBadge = document.createElement('span');
  estimateBadge.className = 'task-time-badge task-time-estimate-badge';
  const estimateMin = resolveTaskEstimateMinutesForBadge(task);
  if (estimateMin === null) {
    estimateBadge.textContent = 'без оценки';
    estimateBadge.classList.add('neutral');
    meta.appendChild(estimateBadge);
    return;
  }
  estimateBadge.textContent = formatCompactEstimateForBadge(estimateMin);
  meta.appendChild(estimateBadge);
}

function resolveTaskPlanModel(task) {
  const mode = normalizeEstimateMode(task?.estimateMode);
  const fixedMinutes = normalizePositiveIntegerOrNull(task?.timeEstimateMin);
  const range = task?.timeEstimateMinRange && typeof task.timeEstimateMinRange === 'object'
    ? normalizeTimeEstimateRange(task.timeEstimateMinRange.min, task.timeEstimateMinRange.max)
    : null;

  if (mode === 'range' && range) {
    return {
      label: `${formatMinutesShort(range.min)} - ${formatMinutesShort(range.max)}`,
      baselineSeconds: Math.floor(((range.min + range.max) / 2) * 60)
    };
  }

  if ((mode === 'fixed' || mode === 'epic') && fixedMinutes !== null) {
    return {
      label: formatMinutesShort(fixedMinutes),
      baselineSeconds: fixedMinutes * 60
    };
  }

  return null;
}

function resolveTaskFactSeconds(task) {
  const actualFocus = Number(task?.actualFocusSeconds);
  const totalTime = Number(task?.totalTime);
  if (Number.isFinite(actualFocus) && actualFocus > 0) return Math.floor(actualFocus);
  if (Number.isFinite(totalTime) && totalTime > 0) return Math.floor(totalTime);
  if (Number.isFinite(actualFocus) && actualFocus >= 0) return Math.floor(actualFocus);
  return 0;
}

function renderPlanFactSummary(task) {
  const container = document.getElementById('taskCardPlanFact');
  const planValue = document.getElementById('taskCardPlanValue');
  const factValue = document.getElementById('taskCardFactValue');
  const deviationRow = document.getElementById('taskCardDeviationRow');
  const deviationValue = document.getElementById('taskCardDeviationValue');
  const hint = document.getElementById('taskCardPlanFactHint');
  if (!container || !planValue || !factValue || !deviationRow || !deviationValue || !hint) return;

  const planModel = resolveTaskPlanModel(task);
  if (!planModel) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'flex';
  planValue.textContent = planModel.label;

  const factSeconds = resolveTaskFactSeconds(task);
  factValue.textContent = formatSecondsShort(factSeconds);

  deviationValue.classList.remove('over-budget', 'under-budget');
  hint.style.display = 'none';
  hint.textContent = '';

  if (planModel.baselineSeconds > 0) {
    const deviationRatio = (factSeconds - planModel.baselineSeconds) / planModel.baselineSeconds;
    const deviationPercent = Math.round(deviationRatio * 100);
    const sign = deviationPercent > 0 ? '+' : '';
    deviationValue.textContent = `${sign}${deviationPercent}%`;
    deviationRow.style.display = 'flex';

    if (deviationPercent >= 50) {
      deviationValue.classList.add('over-budget');
      hint.textContent = 'Сильный перерасход: попробуйте декомпозировать задачу на меньшие шаги.';
      hint.style.display = 'block';
    } else if (deviationPercent <= -50 && factSeconds > 0) {
      deviationValue.classList.add('under-budget');
      hint.textContent = 'Сильный недорасход: возможно, оценка завышена и ее стоит скорректировать.';
      hint.style.display = 'block';
    }
  } else {
    deviationRow.style.display = 'none';
  }
}

function getTodayDeadlineKey() {
  if (window.dateUtils && typeof window.dateUtils.todayKey === 'function') {
    return window.dateUtils.todayKey();
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return getDateKey(today);
}

function formatDeadlineKeyForCardWarning(deadlineKey) {
  if (!deadlineKey) return '';
  if (window.dateUtils && typeof window.dateUtils.formatDeadline === 'function') {
    return window.dateUtils.formatDeadline(deadlineKey);
  }
  const date = parseDeadlineDate(deadlineKey);
  if (!date || Number.isNaN(date.getTime())) return String(deadlineKey);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function resolveEstimateMinutesForCapacity(task) {
  const mode = normalizeEstimateMode(task?.estimateMode);
  if (mode === 'none') return 0;
  if (mode === 'fixed' || mode === 'epic') {
    return normalizePositiveIntegerOrNull(task?.timeEstimateMin) || 0;
  }
  if (mode === 'range') {
    const range = task?.timeEstimateMinRange && typeof task.timeEstimateMinRange === 'object'
      ? normalizeTimeEstimateRange(task.timeEstimateMinRange.min, task.timeEstimateMinRange.max)
      : null;
    return range ? Math.round((range.min + range.max) / 2) : 0;
  }
  return 0;
}

function fallbackValidateDeadlineCapacity(candidateTask, allTasks, settings) {
  const deadline = candidateTask?.deadline || null;
  const capacityMin = Math.max(60, Math.min(960, Math.floor(Number(settings?.dailyCapacityMin) || 240)));
  const todayKey = getTodayDeadlineKey();
  if (!deadline || String(deadline).split('T')[0] !== todayKey) {
    return { isOverCapacity: false, capacityMin, plannedMinutes: 0, projectedMinutes: 0 };
  }
  const plannedMinutes = (allTasks || [])
    .filter((task) => !task.completed && String(task.deadline || '').split('T')[0] === todayKey)
    .reduce((sum, task) => sum + resolveEstimateMinutesForCapacity(task), 0);
  const projectedMinutes = plannedMinutes + resolveEstimateMinutesForCapacity(candidateTask);
  return {
    isOverCapacity: projectedMinutes > capacityMin,
    capacityMin,
    plannedMinutes,
    projectedMinutes
  };
}

function findNearestDeadlineWithinCapacity(candidateTask, allTasks, settings) {
  for (let offset = 1; offset <= 30; offset++) {
    const deadline = getDateStringWithOffset(offset);
    const validator = typeof window.validateDeadlineCapacity === 'function'
      ? window.validateDeadlineCapacity
      : fallbackValidateDeadlineCapacity;
    const check = validator({ ...candidateTask, deadline }, allTasks, settings);
    if (!check.isOverCapacity) {
      return deadline;
    }
  }
  return null;
}

async function resolveTodayDeadlineWithCapacityInCard(candidateTask, allTasks, settings) {
  const todayKey = getTodayDeadlineKey();
  const normalizedDeadline = candidateTask?.deadline ? String(candidateTask.deadline).split('T')[0] : null;
  if (normalizedDeadline !== todayKey) return candidateTask?.deadline || null;

  const validator = typeof window.validateDeadlineCapacity === 'function'
    ? window.validateDeadlineCapacity
    : fallbackValidateDeadlineCapacity;
  const capacityCheck = validator(candidateTask, allTasks, settings);
  if (!capacityCheck.isOverCapacity) {
    return candidateTask.deadline;
  }

  const suggested = findNearestDeadlineWithinCapacity(candidateTask, allTasks, settings);
  const suggestedLabel = suggested ? formatDeadlineKeyForCardWarning(suggested) : null;
  const lines = [
    `План на сегодня: ${capacityCheck.projectedMinutes} мин при лимите ${capacityCheck.capacityMin} мин.`,
    'Сегодняшний день выглядит перегруженным.'
  ];
  if (suggestedLabel) {
    lines.push(`Предлагаю перенести на: ${suggestedLabel}.`);
  }
  const keepToday = await window.dialogService.showConfirm(
    'Риск перегруза дня',
    lines.join('\n'),
    {
      confirmLabel: 'Оставить Сегодня',
      cancelLabel: suggestedLabel ? `Перенести на ${suggestedLabel}` : 'Перенести на завтра'
    }
  );
  if (keepToday) return candidateTask.deadline;
  return suggested || getDateStringWithOffset(1);
}

function isFlowSectionActive() {
  const section = typeof window.getCurrentSectionName === 'function'
    ? window.getCurrentSectionName()
    : '';
  return section === 'flow';
}

function isTaskDeadlineOverdueForCard(deadline) {
  if (window.dateUtils && typeof window.dateUtils.isDeadlineOverdue === 'function') {
    return window.dateUtils.isDeadlineOverdue(deadline);
  }
  const t = getTodayDeadlineKey();
  if (!deadline || !t) return false;
  const part = String(deadline).split('T')[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(part)) return false;
  return part < t;
}

async function applyDeadlineTodayAfterEngagement() {
  if (!currentTaskId || !currentTask || currentTask.completed) return;
  if (!isTaskDeadlineOverdueForCard(currentTask.deadline)) return;
  const todayKey = getTodayDeadlineKey();
  if (!todayKey) return;
  const storage = getStorage();
  const updated = await storage.updateTask(currentTaskId, { deadline: todayKey });
  if (updated) {
    currentTask = updated;
  }
  displayTaskInfo();
  await refreshTaskLists();
}

async function applyTaskUpdateToCardUI(updatedTask) {
  if (!updatedTask) return;
  const prevDeadline = currentTask ? currentTask.deadline : undefined;
  currentTask = updatedTask;
  if (prevDeadline !== updatedTask.deadline) {
    displayTaskInfo();
    await refreshTaskLists();
  }
}

const POMODORO_BG_AUDIO_URL = chrome.runtime.getURL(
  'assets/audio/pomodoro-ambience.mp3'
);
const BELL_AUDIO_URL = chrome.runtime.getURL('assets/audio/bell.wav');
const POMODORO_SOUND_ICON_MUTE = chrome.runtime.getURL('assets/icons/icon-sound-mute.svg');
const POMODORO_SOUND_ICON_UNMUTE = chrome.runtime.getURL('assets/icons/icon-sound-unmute.svg');

function ensurePomodoroAudio() {
  if (!pomodoroAudio) {
    pomodoroAudio = new Audio(POMODORO_BG_AUDIO_URL);
    pomodoroAudio.loop = true;
  }
}

function startPomodoroAudio() {
  ensurePomodoroAudio();
  pomodoroAudio.currentTime = 0;
  if (isPomodoroBgMuted) return;
  const playPromise = pomodoroAudio.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {
      // Автовоспроизведение может быть заблокировано без жеста пользователя
    });
  }
}

function stopPomodoroAudio() {
  if (!pomodoroAudio) return;
  pomodoroAudio.pause();
  pomodoroAudio.currentTime = 0;
}

function ensureBellAudio() {
  if (!bellAudio) {
    bellAudio = new Audio(BELL_AUDIO_URL);
    bellAudio.preload = 'auto';
  }
}

function unlockBellAudio() {
  ensureBellAudio();
  if (bellAudioUnlocked) return;
  const playPromise = bellAudio.play();
  if (playPromise && typeof playPromise.then === 'function') {
    playPromise.then(() => {
      bellAudio.pause();
      bellAudio.currentTime = 0;
      bellAudioUnlocked = true;
    }).catch(() => {
      // Разблокировка может требовать повторного жеста пользователя
    });
  }
}

function playBellSound() {
  ensureBellAudio();
  bellAudio.currentTime = 0;
  const playPromise = bellAudio.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {
      // Звук может быть заблокирован до жеста пользователя
    });
  }
}

// Функция для получения storage (использует существующий или создает новый)
function getStorage() {
  if (window.storage) {
    return window.storage;
  }
  // Если storage еще не создан, создаем новый экземпляр
  if (typeof StorageManager !== 'undefined') {
    return new StorageManager();
  }
  throw new Error('StorageManager не определен');
}

// Открытие карточки задачи (определяем сразу, чтобы была доступна глобально)
window.openTaskCard = async function(taskId) {
  lastFocusedElement = document.activeElement;
  // Проверяем, что DOM загружен
  if (document.readyState === 'loading') {
    await new Promise(resolve => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', resolve);
      } else {
        resolve();
      }
    });
  }
  
  const storage = getStorage();
  if (!window.storage) {
    await storage.init();
  }
  
  currentTaskId = taskId;
  const tasks = await storage.getTasks();
  currentTask = tasks.find(t => t.id === taskId);
  isLogExpanded = null;
  isHistoryExpanded = false;
  isCompletedExpanded = false;
  isTitleEditing = false;
  isEditing = false;
  resetCardProgressTracking();
  
  if (!currentTask) {
    console.error('Задача не найдена:', taskId);
    return;
  }

  try {
    resetTaskCardScroll();
    // Загружаем данные карточки
    await loadTaskCardData();
    
    // Показываем панель
    const overlay = document.getElementById('taskCardOverlay');
    const panel = document.getElementById('taskCardPanel');
    
    if (!overlay || !panel) {
      console.error('Элементы карточки задачи не найдены в DOM. Проверьте, что HTML структура загружена.');
      return;
    }
    
    overlay.style.display = 'block';
    panel.style.display = 'flex';
    
    // Устанавливаем правильное позиционирование для центрирования
    panel.style.top = '50%';
    panel.style.left = '50%';
    panel.style.transform = 'translate(-50%, -50%)';
    panel.style.right = 'auto';
    
    // Предотвращаем прокрутку основного контента
    document.body.style.overflow = 'hidden';
    const editSection = document.getElementById('taskCardEditSection');
    if (editSection) {
      editSection.style.display = 'none';
    }
    const nextStepInput = document.getElementById('nextStepInput');
    if (nextStepInput) {
      setTimeout(() => nextStepInput.focus(), 0);
    }
    setupFocusTrap();
  } catch (error) {
    console.error('Ошибка при открытии карточки задачи:', error);
    await window.dialogService.showAlert('Ошибка при открытии карточки задачи: ' + error.message);
  }
};

window.startPomodoroForTaskCard = async function() {
  await startPomodoroIfInactive();
};

// Инициализация при загрузке страницы
async function initTaskCardPage() {
  if (isTaskCardPageInited) return;
  isTaskCardPageInited = true;

  // Убеждаемся, что storage инициализирован
  const storage = getStorage();
  if (!window.storage) {
    await storage.init();
    window.storage = storage;
  }
  setupTaskCardListeners();
  setupKeyboardListeners();
}

window.initTaskCardPage = initTaskCardPage;

document.addEventListener('DOMContentLoaded', async () => {
  await initTaskCardPage();
});

// Настройка обработчиков событий
function setupTaskCardListeners() {
  // Закрытие карточки
  const closeBtn = document.getElementById('taskCardCloseBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await closeTaskCard();
    });
  }
  const overlay = document.getElementById('taskCardOverlay');
  if (overlay) {
    overlay.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await closeTaskCard();
    });
  }

  // Редактирование заголовка по клику
  const titleElement = document.getElementById('taskCardTitle');
  const titleInput = document.getElementById('taskCardTitleInput');
  if (titleElement && titleInput) {
    titleElement.addEventListener('click', () => {
      openTitleEditor();
    });
    titleInput.addEventListener('blur', () => {
      saveTitleEditor();
    });
    titleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        titleInput.blur();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        cancelTitleEditor();
      }
    });
  }

  const moreOptionsBtn = document.getElementById('taskCardMoreOptionsBtn');
  const optionsMenu = document.getElementById('taskCardOptionsMenu');
  const optionNextWeekBtn = document.getElementById('taskCardOptionNextWeekBtn');
  const optionCompleteBtn = document.getElementById('taskCardOptionCompleteBtn');
  const optionEditBtn = document.getElementById('taskCardOptionEditBtn');
  const optionResetPriorityWeightBtn = document.getElementById('taskCardOptionResetPriorityWeightBtn');
  const optionDeleteBtn = document.getElementById('taskCardOptionDeleteBtn');

  if (moreOptionsBtn && optionsMenu) {
    moreOptionsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleTaskCardOptionsMenu(moreOptionsBtn);
    });
  }
  if (optionsMenu) {
    optionsMenu.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
  if (optionEditBtn) {
    optionEditBtn.addEventListener('click', () => {
      closeTaskCardOptionsMenu();
      toggleEditMode();
    });
  }
  if (optionResetPriorityWeightBtn) {
    optionResetPriorityWeightBtn.addEventListener('click', async () => {
      closeTaskCardOptionsMenu();
      await resetTaskPriorityWeight();
    });
  }
  if (optionDeleteBtn) {
    optionDeleteBtn.addEventListener('click', () => {
      closeTaskCardOptionsMenu();
      openDeleteModal();
    });
  }
  if (optionCompleteBtn) {
    optionCompleteBtn.addEventListener('click', async () => {
      closeTaskCardOptionsMenu();
      await handleTaskCardComplete();
    });
  }
  if (optionNextWeekBtn) {
    optionNextWeekBtn.addEventListener('click', async () => {
      closeTaskCardOptionsMenu();
      await postponeTaskToNextMonday();
    });
  }

  document.addEventListener('click', async (e) => {
    if (optionsMenu && optionsMenu.style.display !== 'none') {
      if (moreOptionsBtn && (e.target === moreOptionsBtn || moreOptionsBtn.contains(e.target))) {
        return;
      }
      closeTaskCardOptionsMenu();
    }

    if (isEditing) {
      const editSection = document.getElementById('taskCardEditSection');
      const clickedInsideEdit = editSection && editSection.contains(e.target);
      const clickedEditButton = optionEditBtn && (e.target === optionEditBtn || optionEditBtn.contains(e.target));
      if (!clickedInsideEdit && !clickedEditButton) {
        await toggleEditMode();
      }
    }
  });

  // Быстрые действия
  const completeBtn = document.getElementById('taskCardCompleteBtn');
  if (completeBtn) {
    completeBtn.addEventListener('click', handlePrimaryCompleteAction);
  }
  const nextBtn = document.getElementById('taskCardNextBtn');
  if (nextBtn) {
    nextBtn.addEventListener('click', handleOpenNextTodayTask);
  }

  const deleteCancelBtn = document.getElementById('taskDeleteCancelBtn');
  const deleteConfirmBtn = document.getElementById('taskDeleteConfirmBtn');
  const deleteModal = document.getElementById('taskDeleteModal');
  if (deleteCancelBtn) {
    deleteCancelBtn.addEventListener('click', () => {
      if (typeof closeDeleteModal === 'function') {
        closeDeleteModal();
      }
    });
  }
  if (deleteConfirmBtn) {
    deleteConfirmBtn.addEventListener('click', () => {
      if (typeof confirmDeleteTask === 'function') {
        confirmDeleteTask();
      }
    });
  }
  if (deleteModal) {
    deleteModal.addEventListener('click', (e) => {
      if (e.target === deleteModal && typeof closeDeleteModal === 'function') {
        closeDeleteModal();
      }
    });
  }

  // Помодоро-таймер
  document.getElementById('pomodoroStartBtn').addEventListener('click', startPomodoro);
  document.getElementById('pomodoroPauseBtn').addEventListener('click', pausePomodoro);
  document.getElementById('pomodoroStopBtn').addEventListener('click', stopPomodoro);
  document.getElementById('pomodoroStartBreakBtn').addEventListener('click', startPomodoroBreak);
  document.getElementById('pomodoroResetBtn').addEventListener('click', resetPomodoroFromBreak);
  const pomodoroSoundToggleBtn = document.getElementById('pomodoroSoundToggleBtn');
  if (pomodoroSoundToggleBtn) {
    pomodoroSoundToggleBtn.addEventListener('click', togglePomodoroSound);
  }

  // Лог задачи
  document.getElementById('taskLogAddBtn').addEventListener('click', addLogEntry);
  document.getElementById('taskLogInput').addEventListener('keydown', (e) => {
    // Поддержка Ctrl+Enter и Cmd+Enter (для Mac)
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      addLogEntry();
    }
  });

  // Следующие шаги
  document.getElementById('nextStepAddBtn').addEventListener('click', addNextStep);
  document.getElementById('nextStepInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addNextStep();
    }
  });

  // Сохранение редактирования задачи
  const editPriority = document.getElementById('taskCardEditPriority');
  const editDeadline = document.getElementById('taskCardEditDeadline');
  const editLink = document.getElementById('taskCardEditLink');
  const editRecurring = document.getElementById('taskCardEditRecurringParticipation');
  const editRecurrenceDays = document.getElementById('taskCardEditRecurrenceDays');
  const editRecurrenceMode = document.getElementById('taskCardEditRecurrenceMode');
  const editEstimateMode = document.getElementById('taskCardEditEstimateMode');
  const editEstimateMin = document.getElementById('taskCardEditTimeEstimateMin');
  const editEstimateRangeMin = document.getElementById('taskCardEditTimeEstimateRangeMin');
  const editEstimateRangeMax = document.getElementById('taskCardEditTimeEstimateRangeMax');
  if (editPriority) editPriority.addEventListener('change', () => { saveTaskEdit({ trigger: 'change' }); });
  if (editDeadline) editDeadline.addEventListener('change', () => { saveTaskEdit({ trigger: 'change' }); });
  if (editLink) editLink.addEventListener('change', () => { saveTaskEdit({ trigger: 'change' }); });
  if (editRecurring) {
    editRecurring.addEventListener('change', () => {
      updateRecurringEditControls();
      saveTaskEdit({ trigger: 'change' });
    });
  }
  if (editRecurrenceDays) editRecurrenceDays.addEventListener('change', () => { saveTaskEdit({ trigger: 'change' }); });
  if (editRecurrenceMode) editRecurrenceMode.addEventListener('change', () => { saveTaskEdit({ trigger: 'change' }); });
  if (editEstimateMode) {
    editEstimateMode.addEventListener('change', () => {
      updateEstimateEditControls();
      saveTaskEdit({ trigger: 'change' });
    });
  }
  if (editEstimateMin) {
    editEstimateMin.addEventListener('change', () => {
      updateEstimatePresetSelection();
      saveTaskEdit({ trigger: 'change' });
    });
    editEstimateMin.addEventListener('input', () => {
      updateEstimatePresetSelection();
      saveTaskEdit({ trigger: 'input' });
    });
  }
  if (editEstimateRangeMin) editEstimateRangeMin.addEventListener('change', () => { saveTaskEdit({ trigger: 'change' }); });
  if (editEstimateRangeMax) editEstimateRangeMax.addEventListener('change', () => { saveTaskEdit({ trigger: 'change' }); });
  if (editEstimateRangeMin) editEstimateRangeMin.addEventListener('input', () => { saveTaskEdit({ trigger: 'input' }); });
  if (editEstimateRangeMax) editEstimateRangeMax.addEventListener('input', () => { saveTaskEdit({ trigger: 'input' }); });

  document.querySelectorAll('.task-card-estimate-preset').forEach((button) => {
    button.addEventListener('click', () => {
      const presetMinutes = normalizePositiveIntegerOrNull(button.getAttribute('data-minutes'));
      if (presetMinutes === null) return;
      const estimateMode = document.getElementById('taskCardEditEstimateMode');
      const estimateMinInput = document.getElementById('taskCardEditTimeEstimateMin');
      if (!estimateMode || !estimateMinInput) return;
      estimateMode.value = 'fixed';
      estimateMinInput.value = String(presetMinutes);
      updateEstimateEditControls();
      updateEstimatePresetSelection();
      saveTaskEdit({ trigger: 'change' });
    });
  });

  document.querySelectorAll('.deadline-quick-btn[data-target="taskCardEditDeadline"]').forEach(button => {
    button.addEventListener('click', () => {
      const input = document.getElementById('taskCardEditDeadline');
      if (!input) return;
      const action = button.getAttribute('data-action');
      if (action === 'next-monday') {
        input.value = getNextMondayDateString();
      } else {
        const offset = Number(button.getAttribute('data-offset') || 0);
        input.value = getDateStringWithOffset(offset);
        if (offset === 0) {
          forceTodayCapacityCheckOnNextSave = true;
        }
      }
      input.dispatchEvent(new Event('change'));
    });
  });

  const logToggleBtn = document.getElementById('taskLogToggleBtn');
  if (logToggleBtn) {
    logToggleBtn.addEventListener('click', () => {
      setLogExpanded(!(isLogExpanded === true));
    });
  }

  const historyToggleBtn = document.getElementById('pomodoroHistoryToggleBtn');
  if (historyToggleBtn) {
    historyToggleBtn.addEventListener('click', () => {
      setHistoryExpanded(!(isHistoryExpanded === true));
    });
  }

  const completedToggleBtn = document.getElementById('nextStepsCompletedToggleBtn');
  if (completedToggleBtn) {
    completedToggleBtn.addEventListener('click', () => {
      setCompletedExpanded(!(isCompletedExpanded === true));
    });
  }
}

// Настройка обработчиков клавиатуры
function setupKeyboardListeners() {
  document.addEventListener('keydown', async (e) => {
    if (e.key === 'Escape') {
      const deleteModal = document.getElementById('taskDeleteModal');
      if (deleteModal && deleteModal.style.display !== 'none') {
        e.preventDefault();
        closeDeleteModal();
        return;
      }
      if (isTaskCardOpen()) {
        e.preventDefault();
        e.stopPropagation();
        await closeTaskCard();
      }
    }
  });
}

function setupFocusTrap() {
  const panel = document.getElementById('taskCardPanel');
  if (!panel) return;
  if (panel.dataset.focusTrap === 'active') return;
  panel.dataset.focusTrap = 'active';

  panel.addEventListener('keydown', handleFocusTrap);
}

function removeFocusTrap() {
  const panel = document.getElementById('taskCardPanel');
  if (!panel) return;
  if (panel.dataset.focusTrap !== 'active') return;
  panel.removeEventListener('keydown', handleFocusTrap);
  delete panel.dataset.focusTrap;
}

function handleFocusTrap(e) {
  if (e.key !== 'Tab') return;
  const panel = document.getElementById('taskCardPanel');
  if (!panel) return;
  const focusable = panel.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  const focusables = Array.from(focusable).filter(el => el.offsetParent !== null);
  if (focusables.length === 0) return;

  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function resetTaskCardScroll() {
  const body = document.querySelector('.task-card-body');
  if (body) {
    body.scrollTop = 0;
  }
}

// Закрытие карточки задачи
async function closeTaskCard(options = {}) {
  if (isTaskCardClosing) return;
  isTaskCardClosing = true;
  const { goToTasksAfterClose = true } = options;
  if (isEditing) {
    const canCloseEdit = await saveTaskEdit({ trigger: 'close-card', forceCommit: true });
    if (canCloseEdit === false) {
      isTaskCardClosing = false;
      return;
    }
  }
  if (isPomodoroActive()) {
    const confirmed = await window.dialogService.showConfirm(
      'Закрыть карточку?',
      'Помодоро-таймер активен. Вы уверены, что хотите закрыть карточку? Таймер будет остановлен.',
      { confirmLabel: 'Закрыть' }
    );
    if (!confirmed) {
      isTaskCardClosing = false;
      return;
    }
    await stopActivePomodoroSession();
  }
  
  clearPomodoroInterval();
  closeTaskCardOptionsMenu();
  
  const overlay = document.getElementById('taskCardOverlay');
  const panel = document.getElementById('taskCardPanel');
  if (panel) {
    panel.classList.add('closing');
  }
  removeFocusTrap();

  setTimeout(() => {
    if (panel) {
      panel.style.display = 'none';
      panel.classList.remove('closing');
    }
    if (overlay) {
      overlay.style.display = 'none';
    }
    document.body.style.overflow = '';
    currentTaskId = null;
    currentTask = null;
    resetCardProgressTracking();
    isEditing = false;
    isPomodoroBgMuted = false;
    updatePomodoroSoundToggle();
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
    if (goToTasksAfterClose && typeof window.switchSection === 'function') {
      window.switchSection('tasks');
    }
    isTaskCardClosing = false;
  }, 300);
}

// Проверка, открыта ли карточка
function isTaskCardOpen() {
  const panel = document.getElementById('taskCardPanel');
  return !!panel && panel.style.display !== 'none';
}

// Загрузка данных карточки задачи
async function loadTaskCardData() {
  if (!currentTaskId) {
    console.error('loadTaskCardData: currentTaskId не установлен');
    return;
  }

  try {
    const storage = getStorage();
    // Обновляем текущую задачу
    const tasks = await storage.getTasks();
    currentTask = tasks.find(t => t.id === currentTaskId);
    if (!currentTask) {
      console.error('loadTaskCardData: задача не найдена:', currentTaskId);
      return;
    }

    // Загружаем данные карточки
    const cardData = await storage.getTaskCardData(currentTaskId);
    const pomodoroSettings = await storage.getTaskPomodoroSettings(currentTaskId);

    // Отображаем информацию о задаче
    displayTaskInfo();
    
    // Загружаем помодоро-таймер
    await loadPomodoroTimer(pomodoroSettings);
    
    // Загружаем затраченное время (totalTime теперь в секундах)
    // totalTime всегда в секундах, берем напрямую из объекта задачи
    let totalTimeSeconds = cardData.totalTime || 0;
    // Убеждаемся, что это число
    totalTimeSeconds = Math.floor(Number(totalTimeSeconds) || 0);
    
    // Обновляем базовое значение времени из storage
    baseTotalSeconds = totalTimeSeconds;
    
    displayTotalTime(totalTimeSeconds);
    stopTotalTimeUpdate();
    
    // Загружаем лог
    displayLog(cardData.log || []);
    
    // Загружаем следующие шаги
    displayNextSteps(cardData.nextSteps || []);
  } catch (error) {
    console.error('Ошибка при загрузке данных карточки задачи:', error);
    throw error;
  }
}

// Отображение информации о задаче
function displayTaskInfo() {
  const titleElement = document.getElementById('taskCardTitle');
  const titleInput = document.getElementById('taskCardTitleInput');
  if (titleElement) {
    appendTaskCardTitleWithRecurringMarker(titleElement, currentTask);
    titleElement.style.display = isTitleEditing ? 'none' : 'block';
  }
  if (titleInput) {
    titleInput.value = currentTask.text;
    titleInput.style.display = isTitleEditing ? 'block' : 'none';
  }
  
  const meta = document.getElementById('taskCardMeta');
  if (!meta) return;
  meta.innerHTML = '';
  
  if (currentTask.category) {
    const categorySpan = document.createElement('span');
    categorySpan.className = 'task-category';
    categorySpan.textContent = currentTask.category;
    meta.appendChild(categorySpan);
  }

  if (currentTask.priority) {
    const normalizedPriority = normalizePriority(currentTask.priority);
    const prioritySpan = document.createElement('span');
    prioritySpan.className = `task-priority priority-${normalizedPriority}`;
    prioritySpan.textContent = getPriorityLabel(normalizedPriority);
    meta.appendChild(prioritySpan);
  }
  
  if (currentTask.deadline) {
    const deadlineSpan = document.createElement('span');
    deadlineSpan.className = 'task-deadline';
    deadlineSpan.textContent = formatDeadline(currentTask.deadline);
    deadlineSpan.title = 'Редактировать задачу';
    deadlineSpan.style.cursor = 'pointer';
    deadlineSpan.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isEditing) {
        toggleEditMode();
      }
      const deadlineInput = document.getElementById('taskCardEditDeadline');
      if (deadlineInput) {
        deadlineInput.focus();
      }
    });
    meta.appendChild(deadlineSpan);
  }
  const link = normalizeTaskLink(currentTask.link);
  if (link) {
    const linkAnchor = document.createElement('a');
    linkAnchor.className = 'task-link';
    linkAnchor.href = link;
    linkAnchor.target = '_blank';
    linkAnchor.rel = 'noopener noreferrer';
    linkAnchor.textContent = link;
    meta.appendChild(linkAnchor);
  }
  const isFlowMode = isFlowSectionActive();
  if (isFlowMode) {
    appendFlowTimeBadges(meta, currentTask);
  }
  updatePrimaryCompleteButton();
  renderPlanFactSummary(currentTask);
}

function updatePrimaryCompleteButton() {
  const completeBtn = document.getElementById('taskCardCompleteBtn');
  const optionCompleteBtn = document.getElementById('taskCardOptionCompleteBtn');
  const status = currentTask?.status === 'draft' ? 'draft' : 'ready';
  const isRecurring = currentTask?.isRecurringParticipation === true;
  if (completeBtn) {
    completeBtn.classList.toggle('task-card-ready-btn', status === 'draft');
    completeBtn.textContent = status === 'draft'
      ? 'Пометить как готово к работе'
      : (isRecurring ? 'Выполнено на сегодня' : 'Отметить задачу выполненной');
  }
  if (optionCompleteBtn) {
    optionCompleteBtn.style.display = status === 'ready' && isRecurring ? '' : 'none';
  }
}

async function handlePrimaryCompleteAction() {
  if (currentTask?.status === 'draft') {
    await handleMarkTaskReady();
    return;
  }
  if (currentTask?.isRecurringParticipation) {
    await handleTaskDoneForToday();
    return;
  }
  await handleTaskCardComplete();
}

function normalizeTaskEstimateMode(value) {
  return ['fixed', 'range', 'epic', 'none'].includes(value) ? value : 'none';
}

function normalizeTaskPriority(value) {
  if (value === 'high' || value === 'medium') return value;
  return null;
}

function hasTaskDecomposition(cardData) {
  const steps = Array.isArray(cardData?.nextSteps) ? cardData.nextSteps : [];
  return steps.some((step) => step && typeof step.text === 'string' && step.text.trim().length > 0);
}

function isComplexTaskForReadiness(task) {
  const mode = normalizeTaskEstimateMode(task?.estimateMode);
  const estimateMin = Number(task?.timeEstimateMin);
  const range = task?.timeEstimateMinRange && typeof task.timeEstimateMinRange === 'object'
    ? task.timeEstimateMinRange
    : null;
  const rangeMax = range ? Number(range.max) : null;

  if (mode === 'epic') return true;
  if (Number.isFinite(estimateMin) && estimateMin >= 120) return true;
  if (Number.isFinite(rangeMax) && rangeMax > 120) return true;
  return false;
}

function validateDraftReadyCriteria(task, cardData) {
  const problems = [];
  const title = typeof task?.text === 'string' ? task.text.trim() : '';
  if (!title) {
    problems.push('Добавьте название задачи.');
  }

  if (!normalizeTaskPriority(task?.priority)) {
    problems.push('Укажите приоритет задачи.');
  }

  const mode = normalizeTaskEstimateMode(task?.estimateMode);
  const estimateMin = Number(task?.timeEstimateMin);
  const range = task?.timeEstimateMinRange && typeof task.timeEstimateMinRange === 'object'
    ? task.timeEstimateMinRange
    : null;
  const rangeMin = range ? Number(range.min) : null;
  const rangeMax = range ? Number(range.max) : null;

  if (mode === 'fixed' || mode === 'epic') {
    if (!Number.isFinite(estimateMin) || estimateMin <= 0) {
      problems.push('Заполните оценку времени (минуты) для выбранного режима.');
    }
  }

  if (mode === 'range') {
    const isValidRange = Number.isFinite(rangeMin) && Number.isFinite(rangeMax) && rangeMin > 0 && rangeMax >= rangeMin;
    if (!isValidRange) {
      problems.push('Заполните корректный диапазон оценки времени (min/max).');
    }
  }

  if (!isRecurringRoutineTaskForCard(task) && isComplexTaskForReadiness(task) && !hasTaskDecomposition(cardData)) {
    problems.push('Для сложной задачи добавьте декомпозицию (хотя бы один следующий шаг).');
  }

  return problems;
}

async function handleMarkTaskReady() {
  if (!currentTaskId || !currentTask) return;
  const storage = getStorage();
  const cardData = await storage.getTaskCardData(currentTaskId);
  const problems = validateDraftReadyCriteria(currentTask, cardData);

  if (problems.length > 0) {
    const details = problems.map((item) => `- ${item}`).join('\n');
    await window.dialogService.showAlert(
      `Пока нельзя перевести задачу в готовые.\n\nНе хватает:\n${details}`
    );
    return;
  }

  const updated = await storage.updateTask(currentTaskId, { status: 'ready' });
  if (updated) {
    currentTask = updated;
  } else {
    currentTask = { ...currentTask, status: 'ready' };
  }
  displayTaskInfo();
  await refreshTaskLists();
}

function openTitleEditor() {
  if (!currentTask) return;
  const titleElement = document.getElementById('taskCardTitle');
  const titleInput = document.getElementById('taskCardTitleInput');
  if (!titleElement || !titleInput) return;
  isTitleEditing = true;
  titleElement.style.display = 'none';
  titleInput.style.display = 'block';
  titleInput.value = currentTask.text;
  titleInput.focus();
  const length = titleInput.value.length;
  titleInput.setSelectionRange(length, length);
}

async function saveTitleEditor() {
  if (!isTitleEditing) return;
  const titleElement = document.getElementById('taskCardTitle');
  const titleInput = document.getElementById('taskCardTitleInput');
  if (!titleElement || !titleInput) return;
  const nextTitle = titleInput.value.trim();
  isTitleEditing = false;
  titleInput.style.display = 'none';
  titleElement.style.display = 'block';
  if (!nextTitle || nextTitle === currentTask?.text) {
    appendTaskCardTitleWithRecurringMarker(titleElement, currentTask);
    return;
  }
  try {
    const storage = getStorage();
    const patch = { text: nextTitle };
    if (!currentTask.completed && isTaskDeadlineOverdueForCard(currentTask.deadline)) {
      const todayKey = getTodayDeadlineKey();
      if (todayKey) {
        patch.deadline = todayKey;
      }
    }
    const updated = await storage.updateTask(currentTaskId, patch);
    if (updated) {
      currentTask = updated;
    } else if (currentTask) {
      currentTask = { ...currentTask, ...patch };
    }
    markMeaningfulProgress();
    displayTaskInfo();
    await refreshTaskLists();
  } catch (error) {
    console.error('Ошибка при сохранении названия задачи:', error);
    appendTaskCardTitleWithRecurringMarker(titleElement, currentTask);
  }
}

function cancelTitleEditor() {
  if (!isTitleEditing) return;
  const titleElement = document.getElementById('taskCardTitle');
  const titleInput = document.getElementById('taskCardTitleInput');
  if (!titleElement || !titleInput) return;
  isTitleEditing = false;
  titleInput.style.display = 'none';
  titleElement.style.display = 'block';
  appendTaskCardTitleWithRecurringMarker(titleElement, currentTask);
}

function appendTaskCardTitleWithRecurringMarker(titleElement, task) {
  titleElement.textContent = task?.text || '';
  if (task?.isRecurringParticipation !== true) {
    return;
  }
  const marker = document.createElement('span');
  marker.className = 'task-recurring-indicator';
  marker.textContent = '↻';
  marker.setAttribute('aria-hidden', 'true');
  titleElement.appendChild(marker);
}

function toggleTaskCardOptionsMenu(anchorElement) {
  const menu = document.getElementById('taskCardOptionsMenu');
  if (!menu || !anchorElement) return;
  if (menu.style.display === 'block') {
    closeTaskCardOptionsMenu();
    return;
  }
  menu.style.display = 'block';
  menu.style.left = '50%';
  menu.style.top = '';
  menu.style.bottom = '24px';
  menu.style.transform = 'translateX(-50%)';
}

function closeTaskCardOptionsMenu() {
  const menu = document.getElementById('taskCardOptionsMenu');
  if (menu) {
    menu.style.display = 'none';
  }
}

async function resetTaskPriorityWeight() {
  if (!currentTaskId) return;
  const storage = getStorage();
  await storage.updateTask(currentTaskId, { priorityRank: null });
  if (currentTask) {
    currentTask = { ...currentTask, priorityRank: null };
  }
  displayTaskInfo();
  await refreshTaskLists();
}

async function postponeTaskToNextMonday() {
  if (!currentTaskId) return;
  const storage = getStorage();
  const nextMonday = getNextMondayDateString();
  await storage.updateTask(currentTaskId, { deadline: nextMonday });
  await refreshTaskLists();
  await handleOpenNextTodayTask();
}

function getNextMondayDateString() {
  const today = new Date();
  const day = today.getDay(); // 0 = Sunday, 1 = Monday
  const daysUntilNextMonday = ((8 - day) % 7) || 7;
  const nextMonday = new Date(today);
  nextMonday.setHours(0, 0, 0, 0);
  nextMonday.setDate(today.getDate() + daysUntilNextMonday);
  return getDateKey(nextMonday);
}

// Загрузка помодоро-таймера
async function loadPomodoroTimer(settings) {
  currentPomodoroSettings = settings || {
    interval: 25,
    shortBreak: 5,
    longBreak: 15,
    longBreakAfter: 4
  };
  setIdlePomodoro();

  // Загружаем историю сессий
  const storage = getStorage();
  const cardData = await storage.getTaskCardData(currentTaskId);
  await displayPomodoroHistory(cardData.pomodoroSessions || []);
}

function clearPomodoroInterval() {
  if (pomodoroIntervalId) {
    clearInterval(pomodoroIntervalId);
    pomodoroIntervalId = null;
  }
  pomodoroTargetEndTime = null;
}

function isPomodoroActive() {
  return pomodoroState !== PomodoroState.IDLE_POMODORO;
}

function getPomodoroDurationSeconds() {
  const minutes = Math.max(0, Number(currentPomodoroSettings?.interval) || 25);
  return Math.floor(minutes * 60);
}

function getBreakDurationSeconds() {
  const minutes = Math.max(0, Number(currentPomodoroSettings?.shortBreak) || 5);
  return Math.floor(minutes * 60);
}

function formatTimerDisplay(secondsTotal) {
  const safeSeconds = Math.max(0, Math.floor(Number(secondsTotal) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function setTimerDisplay(secondsTotal) {
  const display = formatTimerDisplay(secondsTotal);
  const displayElement = document.getElementById('pomodoroTimerDisplay');
  if (displayElement) {
    displayElement.textContent = display;
  }
}

function setPomodoroState(nextState) {
  pomodoroState = nextState;
  updatePomodoroControls();
}

function updatePomodoroControls() {
  const startBtn = document.getElementById('pomodoroStartBtn');
  const pauseBtn = document.getElementById('pomodoroPauseBtn');
  const stopBtn = document.getElementById('pomodoroStopBtn');
  const startBreakBtn = document.getElementById('pomodoroStartBreakBtn');
  const resetBtn = document.getElementById('pomodoroResetBtn');
  const soundToggleBtn = document.getElementById('pomodoroSoundToggleBtn');

  if (!startBtn || !pauseBtn || !stopBtn || !startBreakBtn || !resetBtn) return;

  startBtn.style.display = 'none';
  pauseBtn.style.display = 'none';
  stopBtn.style.display = 'none';
  startBreakBtn.style.display = 'none';
  resetBtn.style.display = 'none';
  if (soundToggleBtn) {
    soundToggleBtn.style.display = 'none';
  }

  if (pomodoroState === PomodoroState.IDLE_POMODORO) {
    startBtn.textContent = 'Старт';
    startBtn.style.display = 'inline-block';
  } else if (pomodoroState === PomodoroState.RUNNING_POMODORO) {
    pauseBtn.style.display = 'inline-block';
    stopBtn.style.display = 'inline-block';
    if (soundToggleBtn) {
      soundToggleBtn.style.display = 'inline-flex';
    }
  } else if (pomodoroState === PomodoroState.PAUSED_POMODORO) {
    startBtn.textContent = 'Старт';
    startBtn.style.display = 'inline-block';
    stopBtn.style.display = 'inline-block';
  } else if (pomodoroState === PomodoroState.BREAK_READY) {
    startBreakBtn.style.display = 'inline-block';
  } else if (pomodoroState === PomodoroState.RUNNING_BREAK) {
    resetBtn.style.display = 'inline-block';
  }

  updatePomodoroSoundToggle();
}

function setIdlePomodoro() {
  clearPomodoroInterval();
  pomodoroRemainingSeconds = getPomodoroDurationSeconds();
  setTimerDisplay(pomodoroRemainingSeconds);
  pomodoroLastStartTime = null;
  setPomodoroState(PomodoroState.IDLE_POMODORO);
  stopPomodoroAudio();
}

function setBreakReady() {
  clearPomodoroInterval();
  pomodoroRemainingSeconds = getBreakDurationSeconds();
  setTimerDisplay(pomodoroRemainingSeconds);
  pomodoroLastStartTime = null;
  setPomodoroState(PomodoroState.BREAK_READY);
  stopPomodoroAudio();
}

function togglePomodoroSound() {
  if (pomodoroState !== PomodoroState.RUNNING_POMODORO) return;
  isPomodoroBgMuted = !isPomodoroBgMuted;
  if (isPomodoroBgMuted) {
    stopPomodoroAudio();
  } else {
    startPomodoroAudio();
  }
  updatePomodoroSoundToggle();
}

function updatePomodoroSoundToggle() {
  const soundToggleBtn = document.getElementById('pomodoroSoundToggleBtn');
  const soundToggleIcon = document.getElementById('pomodoroSoundToggleIcon');
  if (!soundToggleBtn || !soundToggleIcon) return;
  if (pomodoroState !== PomodoroState.RUNNING_POMODORO) {
    soundToggleBtn.style.display = 'none';
    return;
  }
  const isMuted = isPomodoroBgMuted;
  soundToggleIcon.src = isMuted ? POMODORO_SOUND_ICON_UNMUTE : POMODORO_SOUND_ICON_MUTE;
  soundToggleBtn.title = isMuted ? 'Включить звук' : 'Выключить звук';
  soundToggleBtn.setAttribute('aria-label', isMuted ? 'Включить фоновый звук' : 'Выключить фоновый звук');
}

async function startPomodoro() {
  if (pomodoroState !== PomodoroState.IDLE_POMODORO && pomodoroState !== PomodoroState.PAUSED_POMODORO) {
    return;
  }
  if (pomodoroRemainingSeconds <= 0) {
    pomodoroRemainingSeconds = getPomodoroDurationSeconds();
  }
  unlockBellAudio();
  startPomodoroAudio();
  pomodoroLastStartTime = Date.now();
  clearPomodoroInterval();
  pomodoroTargetEndTime = Date.now() + pomodoroRemainingSeconds * 1000;
  setPomodoroState(PomodoroState.RUNNING_POMODORO);
  pomodoroIntervalId = setInterval(updatePomodoroTick, 1000);
  updatePomodoroTick();
  await applyDeadlineTodayAfterEngagement();
}

async function pausePomodoro() {
  if (pomodoroState !== PomodoroState.RUNNING_POMODORO) return;
  if (pomodoroTargetEndTime) {
    pomodoroRemainingSeconds = Math.max(0, Math.ceil((pomodoroTargetEndTime - Date.now()) / 1000));
    setTimerDisplay(pomodoroRemainingSeconds);
  }
  await finalizePomodoroElapsed('pause');
  clearPomodoroInterval();
  setPomodoroState(PomodoroState.PAUSED_POMODORO);
  stopPomodoroAudio();
}

async function stopPomodoro() {
  if (pomodoroState === PomodoroState.RUNNING_POMODORO) {
    await finalizePomodoroElapsed('stop');
    setIdlePomodoro();
    return;
  }
  if (pomodoroState === PomodoroState.PAUSED_POMODORO) {
    setIdlePomodoro();
  }
}

async function startPomodoroBreak() {
  if (pomodoroState !== PomodoroState.BREAK_READY) return;
  unlockBellAudio();
  pomodoroLastStartTime = Date.now();
  clearPomodoroInterval();
  pomodoroTargetEndTime = Date.now() + pomodoroRemainingSeconds * 1000;
  setPomodoroState(PomodoroState.RUNNING_BREAK);
  pomodoroIntervalId = setInterval(updateBreakTick, 1000);
  updateBreakTick();
}

function resetPomodoroFromBreak() {
  if (pomodoroState !== PomodoroState.RUNNING_BREAK) return;
  setIdlePomodoro();
}

function updatePomodoroTick() {
  if (pomodoroState !== PomodoroState.RUNNING_POMODORO || !pomodoroTargetEndTime) return;
  const remainingSeconds = Math.max(0, Math.ceil((pomodoroTargetEndTime - Date.now()) / 1000));
  pomodoroRemainingSeconds = remainingSeconds;
  setTimerDisplay(remainingSeconds);
  if (remainingSeconds <= 0) {
    handlePomodoroComplete();
  }
}

function updateBreakTick() {
  if (pomodoroState !== PomodoroState.RUNNING_BREAK || !pomodoroTargetEndTime) return;
  const remainingSeconds = Math.max(0, Math.ceil((pomodoroTargetEndTime - Date.now()) / 1000));
  pomodoroRemainingSeconds = remainingSeconds;
  setTimerDisplay(remainingSeconds);
  if (remainingSeconds <= 0) {
    handleBreakComplete();
  }
}

async function handlePomodoroComplete() {
  if (isPomodoroTransitioning) return;
  isPomodoroTransitioning = true;
  clearPomodoroInterval();
  await finalizePomodoroElapsed('complete');
  setBreakReady();
  playBellSound();
  showPomodoroNotification('Помодор окончен!', 'Время отдыхать');
  isPomodoroTransitioning = false;
}

function handleBreakComplete() {
  clearPomodoroInterval();
  setIdlePomodoro();
  playBellSound();
  showPomodoroNotification('Отдых окончен', 'Пора за работу!');
}

function showPomodoroNotification(title, message) {
  if (!chrome?.runtime?.sendMessage) return;
  chrome.runtime.sendMessage({
    action: 'showPomodoroNotification',
    title,
    message
  }, (response) => {
    if (chrome.runtime.lastError || response?.success === false) {
      const errorMessage = chrome.runtime.lastError?.message || response?.error || 'Не удалось отправить уведомление';
      console.warn('Помодоро уведомление не отправлено:', errorMessage);
      if (chrome?.notifications?.create) {
        const iconUrl = chrome.runtime.getURL('assets/icons/icon128.png');
        chrome.notifications.create({
          type: 'basic',
          iconUrl,
          title,
          message,
          priority: 1
        });
      }
    }
  });
}

async function finalizePomodoroElapsed(type) {
  if (!pomodoroLastStartTime) return;
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - pomodoroLastStartTime) / 1000));
  pomodoroLastStartTime = null;
  if (elapsedSeconds < 1) return;
  await addPomodoroSessionRecord(elapsedSeconds, type);
}

async function addPomodoroSessionRecord(durationSeconds, type) {
  const storage = getStorage();
  const cardData = await storage.getTaskCardData(currentTaskId);
  const sessions = Array.isArray(cardData?.pomodoroSessions)
    ? [...cardData.pomodoroSessions]
    : [];
  const timestamp = Date.now();
  sessions.push({
    timestamp,
    durationSeconds,
    type
  });
  const currentTotalSeconds = Math.floor(Number(cardData?.totalTime) || 0);
  const currentActualFocusSeconds = Math.floor(
    Number.isFinite(Number(cardData?.actualFocusSeconds))
      ? Number(cardData.actualFocusSeconds)
      : Number(currentTask?.actualFocusSeconds)
  ) || 0;
  const updatedTotalSeconds = currentTotalSeconds + durationSeconds;
  const updatedActualFocusSeconds = currentActualFocusSeconds + durationSeconds;
  await storage.updateTaskCardData(
    currentTaskId,
    {
      pomodoroSessions: sessions,
      totalTime: updatedTotalSeconds,
      actualFocusSeconds: updatedActualFocusSeconds
    },
    {}
  );
  if (currentTask) {
    currentTask.totalTime = updatedTotalSeconds;
    currentTask.actualFocusSeconds = updatedActualFocusSeconds;
  }
  baseTotalSeconds = updatedTotalSeconds;
  displayTotalTime(updatedTotalSeconds);
  renderPlanFactSummary(currentTask);
  await displayPomodoroHistory(sessions);
}

// Отображение истории помодоро
async function displayPomodoroHistory(sessions) {
  const historyContainer = document.getElementById('pomodoroHistory');
  const historyList = document.getElementById('pomodoroHistoryList');
  const historyTitle = document.getElementById('pomodoroHistoryTitle');
  const historyBody = document.getElementById('pomodoroHistoryBody');
  const historyToggle = document.getElementById('pomodoroHistoryToggleBtn');
  
  const count = sessions ? sessions.length : 0;
  if (historyContainer) historyContainer.style.display = 'block';
  if (historyTitle) {
    historyTitle.textContent = `История сессий (${count})`;
  }
  if (historyToggle) {
    historyToggle.textContent = isHistoryExpanded ? 'Скрыть' : 'Показать';
    historyToggle.disabled = count === 0;
  }
  if (historyBody) {
    historyBody.style.display = isHistoryExpanded && count > 0 ? 'block' : 'none';
  }

  if (historyList) {
    historyList.innerHTML = '';
    
    (sessions || []).slice(0, 50).forEach(session => {
      const item = document.createElement('div');
      item.className = 'pomodoro-history-item';
      const timestamp = getSessionTimestamp(session);
      const date = new Date(timestamp || Date.now());
      const durationSeconds = getSessionDurationSeconds(session);
      item.textContent = `${date.toLocaleString('ru-RU')} - ${formatSessionDuration(durationSeconds)}`;
      historyList.appendChild(item);
    });
  }
}

function setHistoryExpanded(expanded) {
  isHistoryExpanded = expanded;
  const historyBody = document.getElementById('pomodoroHistoryBody');
  const historyToggle = document.getElementById('pomodoroHistoryToggleBtn');
  const historyList = document.getElementById('pomodoroHistoryList');
  const count = historyList ? historyList.children.length : 0;
  if (historyBody) {
    historyBody.style.display = expanded && count > 0 ? 'block' : 'none';
  }
  if (historyToggle) {
    historyToggle.textContent = expanded ? 'Скрыть' : 'Показать';
  }
}

function getSessionDurationSeconds(session) {
  if (session?.durationSeconds !== undefined) {
    return Math.max(0, Math.floor(Number(session.durationSeconds) || 0));
  }
  if (session?.startTime && session?.endTime) {
    const diffSeconds = Math.floor((session.endTime - session.startTime) / 1000);
    return Math.max(0, diffSeconds + 1);
  }
  if (session?.duration !== undefined) {
    return Math.max(0, Math.floor(Number(session.duration) * 60) + 1);
  }
  return 0;
}

function getSessionTimestamp(session) {
  if (session?.timestamp) return session.timestamp;
  if (session?.startTime) return session.startTime;
  if (session?.endTime) return session.endTime;
  return null;
}

function formatSessionDuration(secondsTotal) {
  const seconds = Math.max(0, Math.floor(Number(secondsTotal) || 0));
  if (seconds < 60) {
    return `${seconds} секунд`;
  }
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${String(secs).padStart(2, '0')} мин`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}:${String(minutes).padStart(2, '0')} часа`;
}

// Отображение затраченного времени (в часах, минутах и секундах)
function displayTotalTime(totalSeconds) {
  // Убеждаемся, что totalSeconds - это число
  totalSeconds = Math.floor(Number(totalSeconds) || 0);
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  // Формат: ЧЧ:ММ:СС (часы, минуты, секунды)
  const display = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const displayElement = document.getElementById('totalTimeDisplay');
  if (displayElement) {
    displayElement.textContent = display;
  }
}

// Обновление затраченного времени в реальном времени
let totalTimeUpdateInterval = null;
let baseTotalSeconds = 0;
let activePomodoroStartTime = null;

function startTotalTimeUpdate(baseSeconds, pomodoroStartTime) {
  baseTotalSeconds = baseSeconds || 0;
  activePomodoroStartTime = pomodoroStartTime;
  
  if (totalTimeUpdateInterval) {
    clearInterval(totalTimeUpdateInterval);
  }
  
  totalTimeUpdateInterval = setInterval(() => {
    updateTotalTimeDisplay();
  }, 1000);
  
  updateTotalTimeDisplay();
}

function stopTotalTimeUpdate() {
  if (totalTimeUpdateInterval) {
    clearInterval(totalTimeUpdateInterval);
    totalTimeUpdateInterval = null;
  }
  activePomodoroStartTime = null;
}

function updateTotalTimeDisplay() {
  let currentTotalSeconds = baseTotalSeconds;
  
  // Если есть активная помодоро-сессия, добавляем прошедшее время
  if (activePomodoroStartTime) {
    const elapsedSeconds = Math.floor((Date.now() - activePomodoroStartTime) / 1000);
    currentTotalSeconds += elapsedSeconds;
  }
  
  displayTotalTime(currentTotalSeconds);
}

// Добавление записи в лог
async function addLogEntry() {
  const storage = getStorage();
  const input = document.getElementById('taskLogInput');
  const text = input.value.replace(/\s+$/, '');
  
  if (!text.trim()) return;

  const updated = await storage.addLogEntry(currentTaskId, text);
  input.value = '';
  await applyTaskUpdateToCardUI(updated);
  markMeaningfulProgress();

  const cardData = await storage.getTaskCardData(currentTaskId);
  displayLog(cardData.log || []);
}

// Отображение лога
function displayLog(logEntries) {
  const container = document.getElementById('taskLogEntries');
  container.innerHTML = '';
  
  if (logEntries.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'task-log-entry';
    empty.textContent = 'Лог пуст. Добавьте первую запись!';
    container.appendChild(empty);
    setLogExpanded(false);
    return;
  }
  
  logEntries.forEach(entry => {
    const entryDiv = document.createElement('div');
    entryDiv.className = 'task-log-entry';
    
    const textDiv = document.createElement('div');
    textDiv.className = 'task-log-entry-text';
    renderLogTextWithLinks(textDiv, entry.text);
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'task-log-entry-time';
    const date = new Date(entry.timestamp);
    timeDiv.textContent = date.toLocaleString('ru-RU');
    
    entryDiv.appendChild(textDiv);
    entryDiv.appendChild(timeDiv);
    container.appendChild(entryDiv);
  });

  if (isLogExpanded === null) {
    setLogExpanded(true);
  } else {
    setLogExpanded(isLogExpanded);
  }
}

function renderLogTextWithLinks(target, text) {
  const safeText = String(text || '');
  const urlRegex = /https?:\/\/[^\s]+/g;
  let lastIndex = 0;
  let match;

  while ((match = urlRegex.exec(safeText)) !== null) {
    const { index } = match;
    const url = match[0];

    if (index > lastIndex) {
      target.appendChild(document.createTextNode(safeText.slice(lastIndex, index)));
    }

    const link = document.createElement('a');
    link.href = url;
    link.textContent = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    target.appendChild(link);

    lastIndex = index + url.length;
  }

  if (lastIndex < safeText.length) {
    target.appendChild(document.createTextNode(safeText.slice(lastIndex)));
  }
}

function setLogExpanded(expanded) {
  isLogExpanded = expanded;
  const body = document.getElementById('taskLogBody');
  const toggleBtn = document.getElementById('taskLogToggleBtn');
  if (body) {
    body.style.display = expanded ? 'block' : 'none';
  }
  if (toggleBtn) {
    toggleBtn.textContent = expanded ? 'Скрыть' : 'Показать';
  }
}

// Добавление следующего шага
async function addNextStep() {
  const storage = getStorage();
  const input = document.getElementById('nextStepInput');
  const sizeSelect = document.getElementById('nextStepSizeSelect');
  const kindSelect = document.getElementById('nextStepKindSelect');
  const text = input.value.trim();
  
  if (!text) return;
  
  const cardData = await storage.getTaskCardData(currentTaskId);
  const nextSteps = cardData.nextSteps || [];
  
  nextSteps.push({
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    text: text,
    completed: false,
    order: nextSteps.length,
    size: normalizeNextStepSizeForCard(sizeSelect?.value),
    kind: normalizeNextStepKindForCard(kindSelect?.value),
    completedAt: null
  });
  
  const updated = await storage.updateNextSteps(currentTaskId, nextSteps);
  input.value = '';
  await applyTaskUpdateToCardUI(updated);
  markMeaningfulProgress();
  displayNextSteps(nextSteps);
}

// Отображение следующих шагов
function displayNextSteps(steps) {
  const activeContainer = document.getElementById('nextStepsActive');
  const completedContainer = document.getElementById('nextStepsCompleted');
  const completedList = document.getElementById('nextStepsCompletedList');
  const completedBody = document.getElementById('nextStepsCompletedBody');
  const completedTitle = document.getElementById('nextStepsCompletedTitle');
  const completedToggle = document.getElementById('nextStepsCompletedToggleBtn');
  const emptyState = document.getElementById('nextStepsEmptyState');
  
  activeContainer.innerHTML = '';
  completedList.innerHTML = '';
  
  const activeSteps = steps.filter(s => !s.completed).sort((a, b) => a.order - b.order);
  const completedSteps = steps.filter(s => s.completed).sort((a, b) => a.order - b.order);
  
  activeSteps.forEach(step => {
    const stepElement = createNextStepElement(step);
    activeContainer.appendChild(stepElement);
  });
  
  completedSteps.forEach(step => {
    const stepElement = createNextStepElement(step);
    completedList.appendChild(stepElement);
  });
  
  if (completedSteps.length > 0) {
    completedContainer.style.display = 'block';
    if (completedTitle) {
      completedTitle.textContent = `Выполнено (${completedSteps.length})`;
    }
    if (completedBody) {
      completedBody.style.display = isCompletedExpanded ? 'block' : 'none';
    }
    if (completedToggle) {
      completedToggle.textContent = isCompletedExpanded ? 'Скрыть' : 'Показать';
    }
  } else {
    completedContainer.style.display = 'none';
  }

  if (emptyState) {
    emptyState.textContent = isRecurringRoutineTaskForCard(currentTask)
      ? 'Рутинное действие выполняется без отдельного следующего шага'
      : 'Добавьте 1–3 ближайших шага, чтобы начать работу';
    emptyState.classList.toggle('routine', isRecurringRoutineTaskForCard(currentTask));
    emptyState.style.display = activeSteps.length === 0 ? 'block' : 'none';
  }
  
  // Настраиваем drag & drop
  setupDragAndDrop();
}

function setCompletedExpanded(expanded) {
  isCompletedExpanded = expanded;
  const completedBody = document.getElementById('nextStepsCompletedBody');
  const completedToggle = document.getElementById('nextStepsCompletedToggleBtn');
  if (completedBody) {
    completedBody.style.display = expanded ? 'block' : 'none';
  }
  if (completedToggle) {
    completedToggle.textContent = expanded ? 'Скрыть' : 'Показать';
  }
}

// Создание элемента следующего шага
function createNextStepElement(step) {
  const item = document.createElement('div');
  item.className = 'next-step-item';
  item.draggable = true;
  item.dataset.stepId = step.id;
  
  if (step.completed) {
    item.classList.add('completed');
  }
  
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'next-step-checkbox';
  checkbox.checked = step.completed;
  checkbox.addEventListener('change', () => toggleNextStep(step.id));
  
  const text = document.createElement('span');
  text.className = 'next-step-text';
  text.textContent = step.text;

  const meta = document.createElement('span');
  meta.className = 'next-step-meta';
  const sizeBadge = document.createElement('span');
  sizeBadge.className = 'next-step-badge size';
  sizeBadge.textContent = formatNextStepSizeForCard(step.size);
  const kindBadge = document.createElement('span');
  kindBadge.className = 'next-step-badge kind';
  const kindLabels = {
    do: 'Сделать',
    ping: 'Пинг',
    check: 'Проверить',
    write: 'Написать',
    think: 'Подумать',
    delegate: 'Делегировать'
  };
  kindBadge.textContent = kindLabels[normalizeNextStepKindForCard(step.kind)] || 'Сделать';
  meta.appendChild(sizeBadge);
  meta.appendChild(kindBadge);
  
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'next-step-delete';
  deleteBtn.title = 'Удалить шаг';
  deleteBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="14" height="14" aria-hidden="true">
      <g fill="currentColor">
        <path d="M47 16H17c-1.1 0-2 .9-2 2s.9 2 2 2h30c1.1 0 2-.9 2-2s-.9-2-2-2z"/>
        <path d="M26 12h12c1.1 0 2-.9 2-2s-.9-2-2-2H26c-1.1 0-2 .9-2 2s.9 2 2 2z"/>
        <path d="M20 22h24l-2 30c-.1 2.2-1.9 4-4.1 4H26.1c-2.2 0-4-1.8-4.1-4L20 22z"/>
      </g>
    </svg>
  `;
  deleteBtn.addEventListener('click', () => deleteNextStep(step.id));

  item.addEventListener('click', (e) => {
    if (e.target.closest('.next-step-delete') || e.target.closest('.next-step-checkbox')) {
      return;
    }
    if (isDraggingNextStep) {
      return;
    }
    toggleNextStep(step.id);
  });
  
  item.appendChild(checkbox);
  item.appendChild(text);
  item.appendChild(meta);
  item.appendChild(deleteBtn);
  
  return item;
}

// Переключение статуса следующего шага
async function toggleNextStep(stepId) {
  const storage = getStorage();
  const cardData = await storage.getTaskCardData(currentTaskId);
  const nextSteps = cardData.nextSteps || [];
  
  const step = nextSteps.find(s => s.id === stepId);
  if (step) {
    const willComplete = !step.completed;
    step.completed = willComplete;
    step.completedAt = willComplete ? Date.now() : null;
    step.size = normalizeNextStepSizeForCard(step.size);
    step.kind = normalizeNextStepKindForCard(step.kind);
    const updatedAfterSteps = await storage.updateNextSteps(currentTaskId, nextSteps);
    await applyTaskUpdateToCardUI(updatedAfterSteps);
    markMeaningfulProgress();
    if (willComplete) {
      const settings = await storage.getSettings();
      if (settings?.logCompletedSteps === true) {
        const stepText = String(step.text || '').trim() || 'Без названия';
        const updatedAfterLog = await storage.addLogEntry(
          currentTaskId,
          `Выполнен шаг: ${stepText}`
        );
        await applyTaskUpdateToCardUI(updatedAfterLog);
        const updatedCardData = await storage.getTaskCardData(currentTaskId);
        displayLog(updatedCardData.log || []);
      }
    }
    displayNextSteps(nextSteps);
  }
}

// Удаление следующего шага
async function deleteNextStep(stepId) {
  const storage = getStorage();
  const cardData = await storage.getTaskCardData(currentTaskId);
  const nextSteps = cardData.nextSteps || [];
  
  const filtered = nextSteps.filter(s => s.id !== stepId);
  const updated = await storage.updateNextSteps(currentTaskId, filtered);
  await applyTaskUpdateToCardUI(updated);
  markMeaningfulProgress();
  displayNextSteps(filtered);
}

// Настройка drag & drop для следующих шагов
function setupDragAndDrop() {
  const items = document.querySelectorAll('.next-step-item');
  
  items.forEach(item => {
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('drop', handleDrop);
    item.addEventListener('dragend', handleDragEnd);
  });
}

let draggedElement = null;
let isDraggingNextStep = false;

function handleDragStart(e) {
  draggedElement = this;
  isDraggingNextStep = true;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  
  if (this !== draggedElement && this.classList.contains('next-step-item')) {
    this.classList.add('drag-over');
  }
}

async function handleDrop(e) {
  e.preventDefault();
  this.classList.remove('drag-over');
  
  if (draggedElement && this !== draggedElement && this.classList.contains('next-step-item')) {
    const storage = getStorage();
    const cardData = await storage.getTaskCardData(currentTaskId);
    const nextSteps = cardData.nextSteps || [];
    
    const draggedId = draggedElement.dataset.stepId;
    const targetId = this.dataset.stepId;
    
    const draggedIndex = nextSteps.findIndex(s => s.id === draggedId);
    const targetIndex = nextSteps.findIndex(s => s.id === targetId);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      const [removed] = nextSteps.splice(draggedIndex, 1);
      nextSteps.splice(targetIndex, 0, removed);
      
      // Обновляем порядок
      nextSteps.forEach((step, index) => {
        step.order = index;
      });
      
      const updated = await storage.updateNextSteps(currentTaskId, nextSteps);
      await applyTaskUpdateToCardUI(updated);
      markMeaningfulProgress();
      displayNextSteps(nextSteps);
    }
  }
}

function handleDragEnd() {
  this.classList.remove('dragging');
  document.querySelectorAll('.next-step-item').forEach(item => {
    item.classList.remove('drag-over');
  });
  draggedElement = null;
  setTimeout(() => {
    isDraggingNextStep = false;
  }, 0);
}

// Переключение режима редактирования
async function toggleEditMode(options = {}) {
  const opts = options || {};
  const editSection = document.getElementById('taskCardEditSection');
  const editBtn = document.getElementById('taskCardEditBtn');
  if (isEditing) {
    if (opts.persistBeforeClose !== false) {
      const canCloseEdit = await saveTaskEdit({ trigger: 'close', forceCommit: true });
      if (canCloseEdit === false) {
        return false;
      }
      await waitForSaveTaskEditQueue();
      await persistEstimateFieldsOnEditClose();
    }
    isEditing = false;
    editSection.style.display = 'none';
    if (editBtn) editBtn.textContent = 'Редактировать';
    return true;
  }

  isEditing = true;
  if (isEditing) {
    editSection.style.display = 'block';
    if (editBtn) editBtn.textContent = 'Отменить';
    
    // Заполняем поля редактирования
    document.getElementById('taskCardEditPriority').value = normalizePriority(currentTask.priority);
    document.getElementById('taskCardEditDeadline').value = currentTask.deadline || '';
    document.getElementById('taskCardEditLink').value = currentTask.link || '';
    const recurringToggle = document.getElementById('taskCardEditRecurringParticipation');
    const recurrenceDaysInput = document.getElementById('taskCardEditRecurrenceDays');
    if (recurringToggle) {
      recurringToggle.checked = currentTask.isRecurringParticipation === true;
    }
    if (recurrenceDaysInput) {
      recurrenceDaysInput.value = Math.max(1, Number(currentTask.recurrenceDays) || 3);
    }
    const recurrenceModeSelect = document.getElementById('taskCardEditRecurrenceMode');
    if (recurrenceModeSelect) {
      recurrenceModeSelect.value = normalizeRecurrenceExecutionModeForCard(currentTask.recurrenceExecutionMode);
    }
    updateRecurringEditControls();
    populateEstimateEditFields();
    updateEstimateEditControls();
    updateEstimatePresetSelection();
  }
  return true;
}

async function persistEstimateFieldsOnEditClose() {
  const modeEl = document.getElementById('taskCardEditEstimateMode');
  const minEl = document.getElementById('taskCardEditTimeEstimateRangeMin');
  const maxEl = document.getElementById('taskCardEditTimeEstimateRangeMax');
  if (!currentTaskId || !currentTask) return true;
  const mode = normalizeEstimateMode(modeEl?.value);
  if (mode !== 'range') return true;
  const rangeEstimate = normalizeTimeEstimateRange(minEl?.value, maxEl?.value);
  if (rangeEstimate === null) return true;
  const storage = getStorage();
  const updates = {
    estimateMode: 'range',
    timeEstimateMinRange: rangeEstimate,
    timeEstimateMin: null,
    timeEstimateUpdatedAt: Date.now()
  };
  const updated = await storage.updateTask(currentTaskId, updates);
  if (updated) {
    currentTask = updated;
  } else {
    currentTask = { ...currentTask, ...updates };
  }
  displayTaskInfo();
  await refreshTaskLists();
  return true;
}

function populateEstimateEditFields() {
  const estimateModeSelect = document.getElementById('taskCardEditEstimateMode');
  const estimateMinInput = document.getElementById('taskCardEditTimeEstimateMin');
  const estimateRangeMinInput = document.getElementById('taskCardEditTimeEstimateRangeMin');
  const estimateRangeMaxInput = document.getElementById('taskCardEditTimeEstimateRangeMax');
  if (!estimateModeSelect || !estimateMinInput || !estimateRangeMinInput || !estimateRangeMaxInput) {
    return;
  }

  estimateModeSelect.value = normalizeEstimateMode(currentTask?.estimateMode);
  estimateMinInput.value = normalizePositiveIntegerOrNull(currentTask?.timeEstimateMin) || '';
  const range = currentTask?.timeEstimateMinRange && typeof currentTask.timeEstimateMinRange === 'object'
    ? currentTask.timeEstimateMinRange
    : null;
  estimateRangeMinInput.value = normalizePositiveIntegerOrNull(range?.min) || '';
  estimateRangeMaxInput.value = normalizePositiveIntegerOrNull(range?.max) || '';
}

// Сохранение редактирования задачи
async function performSaveTaskEdit(options = {}) {
  if (!isEditing) return true;
  const opts = options || {};
  const trigger = typeof opts.trigger === 'string' ? opts.trigger : 'unknown';
  const forceCommit = opts.forceCommit === true;
  const storage = getStorage();
  const updates = {
    priority: document.getElementById('taskCardEditPriority').value,
    deadline: document.getElementById('taskCardEditDeadline').value || null
  };
  const linkInput = document.getElementById('taskCardEditLink');
  const linkValue = linkInput ? linkInput.value.trim() : '';
  if (linkValue && !isValidHttpUrl(linkValue)) {
    await window.dialogService.showAlert('Ссылка должна быть валидным URL и начинаться с http:// или https://');
    return false;
  }
  updates.link = linkValue || null;
  const recurringToggle = document.getElementById('taskCardEditRecurringParticipation');
  const recurrenceDaysInput = document.getElementById('taskCardEditRecurrenceDays');
  const recurrenceModeSelect = document.getElementById('taskCardEditRecurrenceMode');
  updates.isRecurringParticipation = recurringToggle ? recurringToggle.checked : false;
  updates.recurrenceDays = Math.max(1, Math.floor(Number(recurrenceDaysInput?.value) || 3));
  updates.recurrenceExecutionMode = updates.isRecurringParticipation
    ? normalizeRecurrenceExecutionModeForCard(recurrenceModeSelect?.value)
    : 'needs_next_action';
  const estimateModeSelect = document.getElementById('taskCardEditEstimateMode');
  const estimateMinInput = document.getElementById('taskCardEditTimeEstimateMin');
  const estimateRangeMinInput = document.getElementById('taskCardEditTimeEstimateRangeMin');
  const estimateRangeMaxInput = document.getElementById('taskCardEditTimeEstimateRangeMax');
  const estimateMode = normalizeEstimateMode(estimateModeSelect?.value);
  const fixedEstimateMin = normalizePositiveIntegerOrNull(estimateMinInput?.value);
  const rangeEstimate = normalizeTimeEstimateRange(estimateRangeMinInput?.value, estimateRangeMaxInput?.value);
  const isRangeInputIncomplete =
    estimateMode === 'range' &&
    rangeEstimate === null &&
    (
      normalizePositiveIntegerOrNull(estimateRangeMinInput?.value) !== null ||
      normalizePositiveIntegerOrNull(estimateRangeMaxInput?.value) !== null
    );
  if (isRangeInputIncomplete && trigger === 'input' && !forceCommit) {
    return true;
  }

  updates.estimateMode = estimateMode;
  if (estimateMode === 'range') {
    updates.timeEstimateMinRange = rangeEstimate;
    updates.timeEstimateMin = null;
  } else if (estimateMode === 'none') {
    updates.timeEstimateMinRange = null;
    updates.timeEstimateMin = null;
  } else {
    updates.timeEstimateMinRange = null;
    updates.timeEstimateMin = fixedEstimateMin;
  }

  const prev = currentTask;
  const priorityChanged =
    normalizePriority(updates.priority) !== normalizePriority(prev.priority);
  const linkChanged = (updates.link || null) !== (prev.link || null);
  const prevRecurrence = Math.max(1, Math.floor(Number(prev.recurrenceDays) || 3));
  const recurringChanged =
    updates.isRecurringParticipation !== (prev.isRecurringParticipation === true) ||
    updates.recurrenceDays !== prevRecurrence ||
    updates.recurrenceExecutionMode !== normalizeRecurrenceExecutionModeForCard(prev.recurrenceExecutionMode);
  const estimateModeChanged = normalizeEstimateMode(prev.estimateMode) !== updates.estimateMode;
  const estimateMinChanged = normalizePositiveIntegerOrNull(prev.timeEstimateMin) !== updates.timeEstimateMin;
  const estimateRangeChanged = !isRangeEqual(prev.timeEstimateMinRange, updates.timeEstimateMinRange);
  const deadlineChanged =
    (updates.deadline || null) !== (prev.deadline || null);
  const todayKey = getTodayDeadlineKey();
  const normalizedNextDeadline = updates.deadline ? String(updates.deadline).split('T')[0] : null;
  const shouldForceTodayCapacityCheck =
    normalizedNextDeadline &&
    todayKey &&
    normalizedNextDeadline === todayKey &&
    forceTodayCapacityCheckOnNextSave;
  forceTodayCapacityCheckOnNextSave = false;

  if (!priorityChanged && !linkChanged && !recurringChanged && !deadlineChanged && !estimateModeChanged && !estimateMinChanged && !estimateRangeChanged && !shouldForceTodayCapacityCheck) {
    return true;
  }

  if (estimateModeChanged || estimateMinChanged || estimateRangeChanged) {
    updates.timeEstimateUpdatedAt = Date.now();
  }

  if (deadlineChanged || shouldForceTodayCapacityCheck) {
    const nextDeadline = updates.deadline ? String(updates.deadline).split('T')[0] : null;
    if (nextDeadline && nextDeadline === todayKey) {
      const settings = await storage.getSettings();
      const allTasks = (await storage.getTasks()).filter((task) => task.id !== currentTaskId);
      const candidateTask = { ...prev, ...updates, deadline: nextDeadline };
      updates.deadline = await resolveTodayDeadlineWithCapacityInCard(candidateTask, allTasks, settings);
      const deadlineInput = document.getElementById('taskCardEditDeadline');
      if (deadlineInput) {
        deadlineInput.value = updates.deadline || '';
      }
    }
  }

  if (priorityChanged || linkChanged || recurringChanged) {
    if (isTaskDeadlineOverdueForCard(prev.deadline)) {
      updates.deadline = getTodayDeadlineKey();
    }
  }

  const updated = await storage.updateTask(currentTaskId, updates);
  if (updated) {
    currentTask = updated;
  } else {
    currentTask = { ...currentTask, ...updates };
  }
  markMeaningfulProgress();

  displayTaskInfo();
  await refreshTaskLists();
  return true;
}

function saveTaskEdit(options = {}) {
  const opts = options || {};
  saveTaskEditChain = saveTaskEditChain
    .catch(() => true)
    .then(() => performSaveTaskEdit(opts));
  return saveTaskEditChain;
}

function updateRecurringEditControls() {
  const recurringToggle = document.getElementById('taskCardEditRecurringParticipation');
  const recurrenceDaysInput = document.getElementById('taskCardEditRecurrenceDays');
  const recurrenceDaysWrap = document.getElementById('taskCardEditRecurrenceDaysWrap');
  const recurrenceModeSelect = document.getElementById('taskCardEditRecurrenceMode');
  const recurrenceModeWrap = document.getElementById('taskCardEditRecurrenceModeWrap');
  if (!recurringToggle || !recurrenceDaysInput) return;
  const isEnabled = recurringToggle.checked;
  recurrenceDaysInput.disabled = !isEnabled;
  if (recurrenceModeSelect) {
    recurrenceModeSelect.disabled = !isEnabled;
    if (isEnabled && !recurrenceModeSelect.value) {
      recurrenceModeSelect.value = 'routine';
    }
  }
  if (recurrenceDaysWrap) {
    recurrenceDaysWrap.style.display = isEnabled ? 'inline-flex' : 'none';
  }
  if (recurrenceModeWrap) {
    recurrenceModeWrap.style.display = isEnabled ? 'inline-flex' : 'none';
  }
}

function updateEstimateEditControls() {
  const estimateModeSelect = document.getElementById('taskCardEditEstimateMode');
  const fixedWrap = document.getElementById('taskCardEditTimeEstimateMinWrap');
  const rangeWrap = document.getElementById('taskCardEditEstimateRangeWrap');
  const presetsWrap = document.getElementById('taskCardEstimatePresets');
  if (!estimateModeSelect || !fixedWrap || !rangeWrap || !presetsWrap) return;

  const mode = normalizeEstimateMode(estimateModeSelect.value);
  const showRange = mode === 'range';
  const showFixed = mode === 'fixed' || mode === 'epic';
  fixedWrap.style.display = showFixed ? 'inline-flex' : 'none';
  presetsWrap.style.display = showFixed ? 'flex' : 'none';
  rangeWrap.style.display = showRange ? 'flex' : 'none';
}

function updateEstimatePresetSelection() {
  const estimateMinInput = document.getElementById('taskCardEditTimeEstimateMin');
  const selectedMinutes = normalizePositiveIntegerOrNull(estimateMinInput?.value);
  document.querySelectorAll('.task-card-estimate-preset').forEach((button) => {
    const presetMinutes = normalizePositiveIntegerOrNull(button.getAttribute('data-minutes'));
    const isActive = selectedMinutes !== null && presetMinutes === selectedMinutes;
    button.classList.toggle('active', isActive);
  });
}

function normalizeTaskLink(link) {
  const value = String(link || '').trim();
  return value || null;
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

async function openDeleteModal() {
  const modal = document.getElementById('taskDeleteModal');
  const message = document.getElementById('taskDeleteMessage');
  const storage = getStorage();
  const cardData = await storage.getTaskCardData(currentTaskId);
  const hasSessions = (cardData.pomodoroSessions || []).length > 0;
  const hasLog = (cardData.log || []).length > 0;
  const hasSteps = (cardData.nextSteps || []).length > 0;
  const hasData = hasSessions || hasLog || hasSteps;

  if (!hasData) {
    await confirmDeleteTask();
    return;
  }

  if (message && currentTask) {
    message.textContent = `Удалить задачу "${currentTask.text}"? Это действие нельзя отменить.`;
  }
  if (modal) {
    modal.style.display = 'block';
  }
}

function closeDeleteModal() {
  const modal = document.getElementById('taskDeleteModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

async function confirmDeleteTask() {
  const storage = getStorage();
  const deletedTaskId = currentTaskId;
  const isFlowMode = isFlowSectionActive();

  await storage.deleteTask(deletedTaskId);
  closeDeleteModal();

  // В ФЛОУ не закрываем карточку сразу: нужно перелистнуть на следующую задачу по снимку.
  if (isFlowMode) {
    await refreshTaskLists();

    const nextFlowTaskId = await resolveNextFlowTaskId(deletedTaskId);
    if (nextFlowTaskId && typeof window.openTaskCard === 'function') {
      await window.openTaskCard(nextFlowTaskId);
      return;
    }

    // Если очередь по снимку исчерпана — выходим из ФЛОУ (закроется карточка и переключится в `tasks`).
    closeTaskCard();
    return;
  }

  // Обычное поведение (без ФЛОУ): закрываем карточку и потом обновляем список задач.
  closeTaskCard();
  await refreshTaskLists();
}

/**
 * Снимок очереди ФЛОУ из popup.js или fallback из текущего порядка.
 */
async function ensureFlowSessionSnapshotForFlow() {
  if (typeof window.getFlowSessionOrderedIds === 'function' && typeof window.refreshFlowSessionSnapshot === 'function') {
    let S = window.getFlowSessionOrderedIds();
    if (!S || S.length === 0) {
      await window.refreshFlowSessionSnapshot();
      S = window.getFlowSessionOrderedIds();
    }
    if (S && S.length > 0) {
      return S;
    }
  }
  const ordered = await getFlowOrderedTasks();
  return ordered.map((t) => t.id);
}

/**
 * Следующая задача в ФЛОУ: обход по снимку; с последнего id — переснимок и первая задача нового порядка.
 * После завершения задачи вызывать уже после toggleTask (taskId не в активных).
 */
async function resolveNextFlowTaskId(taskId) {
  const S = await ensureFlowSessionSnapshotForFlow();
  if (!S || S.length === 0) {
    return null;
  }

  const activeOrdered = await getFlowOrderedTasks();
  const activeSet = new Set(activeOrdered.map((t) => t.id));
  if (activeOrdered.length === 0) {
    return null;
  }

  const lastId = S[S.length - 1];
  let i = S.indexOf(taskId);
  if (i === -1) {
    i = 0;
  }

  if (taskId === lastId) {
    if (typeof window.refreshFlowSessionSnapshot === 'function') {
      await window.refreshFlowSessionSnapshot();
    }
    const after = await getFlowOrderedTasks();
    if (after.length === 0) {
      return null;
    }
    const S2 = typeof window.getFlowSessionOrderedIds === 'function' ? window.getFlowSessionOrderedIds() : null;
    if (S2 && S2.length > 0) {
      const first = S2[0];
      if (after.some((t) => t.id === first)) {
        return first;
      }
    }
    return after[0].id;
  }

  const len = S.length;
  for (let step = 1; step <= len; step++) {
    const id = S[(i + step) % len];
    if (activeSet.has(id)) {
      return id;
    }
  }
  return null;
}

async function handleTaskCardComplete() {
  if (!currentTaskId) return;
  const isFlowMode = isFlowSectionActive();

  const storage = getStorage();
  await storage.toggleTask(currentTaskId);
  await refreshTaskLists();

  if (isFlowMode) {
    const nextFlowTaskId = await resolveNextFlowTaskId(currentTaskId);
    if (nextFlowTaskId && typeof window.openTaskCard === 'function') {
      await window.openTaskCard(nextFlowTaskId);
      return;
    }
    await closeTaskCard();
    return;
  }

  await closeTaskCard();
  if (typeof window.switchSection === 'function') {
    window.switchSection('tasks');
  } else {
    window.location.hash = 'tasks';
  }
}

async function handleTaskDoneForToday() {
  if (!currentTaskId) return;
  const storage = getStorage();
  const periodDays = Math.max(1, Math.floor(Number(currentTask?.recurrenceDays) || 3));
  const nextDeadline = getDateStringWithOffset(periodDays);
  await storage.updateTask(currentTaskId, {
    deadline: nextDeadline,
    completed: false
  });
  const tasks = await storage.getTasks();
  currentTask = tasks.find(t => t.id === currentTaskId) || currentTask;
  displayTaskInfo();
  await refreshTaskLists();

  const isFlowMode = isFlowSectionActive();
  if (isFlowMode) {
    const flowActive = await getFlowOrderedTasks();
    if (flowActive.length > 0) {
      const nextId = await resolveNextFlowTaskId(currentTaskId);
      if (nextId && typeof window.openTaskCard === 'function') {
        await window.openTaskCard(nextId);
        return;
      }
    }
    await closeTaskCard();
    return;
  }

  const queue = getTasksCardOrderedTasks(tasks);
  if (queue.length > 0 && typeof window.openTaskCard === 'function') {
    await window.openTaskCard(queue[0].id);
    return;
  }

  await closeTaskCard();
}

async function handleOpenNextTodayTask() {
  await stopActivePomodoroSession();
  const isFlowMode = isFlowSectionActive();

  if (isFlowMode) {
    const flowTasks = await getFlowOrderedTasks();
    if (flowTasks.length === 0) {
      await window.dialogService.showAlert('Нет активных задач.');
      return;
    }
    await registerFlowSkipIfNeeded();
    const nextId = await resolveNextFlowTaskId(currentTaskId);
    if (nextId && typeof window.openTaskCard === 'function') {
      await window.openTaskCard(nextId);
      return;
    }
    await closeTaskCard();
    return;
  }

  const tasks = getTasksCardOrderedTasks(await getStorage().getTasks());

  if (tasks.length === 0) {
    await window.dialogService.showAlert('Нет активных задач.');
    return;
  }

  const currentIndex = tasks.findIndex(task => task.id === currentTaskId);
  const nextIndex = currentIndex === -1 ? 0 : currentIndex + 1;
  const nextTask = tasks[nextIndex];

  if (nextTask && typeof window.openTaskCard === 'function') {
    await window.openTaskCard(nextTask.id);
  }
}

async function startPomodoroIfInactive() {
  if (pomodoroState === PomodoroState.RUNNING_POMODORO) return;
  await startPomodoro();
}

async function stopActivePomodoroSession() {
  if (isPomodoroStopping) return;
  if (!isPomodoroActive()) return;
  isPomodoroStopping = true;
  try {
    if (pomodoroState === PomodoroState.RUNNING_BREAK) {
      setIdlePomodoro();
    } else if (pomodoroState === PomodoroState.BREAK_READY) {
      setIdlePomodoro();
    } else {
      await stopPomodoro();
    }
  } finally {
    isPomodoroStopping = false;
  }
}

async function refreshTaskLists() {
  if (typeof window.loadTasks === 'function') {
    await window.loadTasks();
  }
  if (typeof window.renderActiveTasks === 'function') {
    window.renderActiveTasks();
  }
  if (typeof window.renderCompletedTasks === 'function') {
    window.renderCompletedTasks();
  }
  if (typeof window.renderCurrentWorkflowSection === 'function') {
    window.renderCurrentWorkflowSection();
  }
}

function getOverdueAndTodayTasksSorted(tasks) {
  const { overdue, todayTasks } = splitActiveTasksByDeadlineBuckets(tasks);
  return [
    ...sortByPriorityWeight(overdue),
    ...sortByPriorityWeight(todayTasks)
  ];
}

function getTasksCardOrderedTasks(tasks) {
  const { overdue, todayTasks, later, noDate } = splitActiveTasksByDeadlineBuckets(tasks);
  return [
    ...sortByPriorityWeight(overdue),
    ...sortByPriorityWeight(todayTasks),
    ...sortByDeadlineThenPriority(later),
    ...sortByPriorityWeight(noDate)
  ];
}

function isTaskBaseReadyForExecution(task) {
  const status = task && task.status === 'draft' ? 'draft' : 'ready';
  if (status !== 'ready') return false;
  if (normalizeWorkflowStatusForCard(task?.workflowStatus) !== 'active') return false;
  if (Math.floor(Number(task?.flowSkipCount) || 0) >= 2) return false;
  const action = getPrimaryNextActionForCard(task);
  if (action) return true;
  if (isRecurringRoutineTaskForCard(task)) return true;
  return false;
}

function isTaskReadyForExecution(task) {
  if (!isTaskBaseReadyForExecution(task)) return false;
  const action = getPrimaryNextActionForCard(task);
  if (action) {
    return isNextActionFitForWindow(action, getFlowTimeWindowForRanking());
  }
  if (isRecurringRoutineTaskForCard(task)) {
    const estimateMin = resolveTaskEstimateForFlow(task) || 30;
    return estimateMin <= getFlowTimeWindowForRanking();
  }
  return false;
}

function getFlowTimeWindowForRanking() {
  const provider = window.getActiveFlowTimeWindowMin;
  if (provider === getFlowTimeWindowForRanking) {
    return 30;
  }
  const fromPopup = typeof provider === 'function'
    ? Number(provider())
    : NaN;
  if ([5, 15, 30, 60, 120].includes(fromPopup)) return fromPopup;
  return 30;
}

function resolveTaskEstimateForFlow(task) {
  const primaryAction = getPrimaryNextActionForCard(task);
  const actionMinutes = getNextActionMinutesForCard(primaryAction);
  if (actionMinutes !== null) return actionMinutes;

  const mode = normalizeEstimateMode(task?.estimateMode);
  if (mode === 'none' && isRecurringRoutineTaskForCard(task)) {
    return 30;
  }
  if (mode === 'none') return null;
  if (mode === 'fixed' || mode === 'epic') {
    return normalizePositiveIntegerOrNull(task?.timeEstimateMin);
  }
  if (mode === 'range') {
    const range = task?.timeEstimateMinRange && typeof task.timeEstimateMinRange === 'object'
      ? normalizeTimeEstimateRange(task.timeEstimateMinRange.min, task.timeEstimateMinRange.max)
      : null;
    return range ? Math.round((range.min + range.max) / 2) : null;
  }
  return null;
}

function isDeepWorkWindow(windowMin) {
  return windowMin >= 60;
}

function computeFlowTimeAwareScore(task, windowMin) {
  const mode = normalizeEstimateMode(task?.estimateMode);
  const estimateMin = resolveTaskEstimateForFlow(task);
  const safeWindow = Math.max(5, Number(windowMin) || 30);
  const deepWork = isDeepWorkWindow(safeWindow);

  let fitScore = 0;
  if (estimateMin !== null && estimateMin > 0) {
    const ratio = estimateMin / safeWindow;
    if (ratio <= 1) {
      fitScore = Math.round((1 - ratio) * 40 + 10);
    } else {
      fitScore = -Math.round(Math.min(60, (ratio - 1) * 45));
    }

    if (deepWork) {
      if (ratio >= 0.8 && ratio <= 2.2) {
        fitScore += 14;
      } else if (ratio < 0.5) {
        fitScore -= 8;
      }
    }
  }

  const isEpicLike = mode === 'epic' || (estimateMin !== null && estimateMin >= 180);
  let epicPenalty = 0;
  if (isEpicLike) {
    if (safeWindow <= 15) {
      epicPenalty = -42;
    } else if (safeWindow <= 30) {
      epicPenalty = -24;
    } else if (deepWork) {
      epicPenalty = 18;
    }
  }

  return {
    fitScore,
    epicPenalty,
    finalScore: fitScore + epicPenalty
  };
}

function rankFlowBucketByTimeAwareScore(tasks, windowMin) {
  return [...(tasks || [])]
    .map((task, index) => ({
      task,
      index,
      score: computeFlowTimeAwareScore(task, windowMin).finalScore
    }))
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return a.index - b.index;
    })
    .map((item) => item.task);
}

function splitActiveTasksByDeadlineBuckets(tasks) {
  return splitTasksByDeadlineBuckets(tasks, isTaskReadyForExecution);
}

function splitTasksByDeadlineBuckets(tasks, predicate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = getDateKey(today);

  const active = (tasks || []).filter(task => !task.completed && (!predicate || predicate(task)));
  const withDeadline = active.filter(task => !!task.deadline);
  const noDate = active.filter(task => !task.deadline);
  const todayTasks = withDeadline.filter(task => isTaskDueToday(task, todayKey));
  const todayTaskIds = new Set(todayTasks.map(task => task.id));
  const overdue = withDeadline.filter(task => {
    if (todayTaskIds.has(task.id)) return false;
    const deadlineDate = parseDeadlineDate(task.deadline);
    if (!deadlineDate || Number.isNaN(deadlineDate.getTime())) return false;
    deadlineDate.setHours(0, 0, 0, 0);
    return deadlineDate < today;
  });
  const overdueIds = new Set(overdue.map(task => task.id));
  const later = withDeadline.filter(task => !todayTaskIds.has(task.id) && !overdueIds.has(task.id));

  return {
    overdue,
    todayTasks,
    later,
    noDate
  };
}

/**
 * Порядок для режима ФЛОУ: просрочено → сегодня → позже → без дедлайна.
 */
async function getFlowOrderedTasks() {
  const storage = getStorage();
  const tasks = await storage.getTasks();
  const { overdue, todayTasks, later, noDate } = splitActiveTasksByDeadlineBuckets(tasks);
  const flowWindowMin = getFlowTimeWindowForRanking();

  return [
    ...rankFlowBucketByTimeAwareScore(sortByPriorityWeight([...overdue, ...todayTasks]), flowWindowMin),
    ...rankFlowBucketByTimeAwareScore(sortByDeadlineThenPriority(later), flowWindowMin),
    ...rankFlowBucketByTimeAwareScore(sortByPriorityWeight(noDate), flowWindowMin)
  ];
}

async function getFlowAvailabilitySummary() {
  const storage = getStorage();
  const tasks = await storage.getTasks();
  const active = (tasks || []).filter(task => !task.completed);
  return {
    readyCount: active.filter(isTaskBaseReadyForExecution).length,
    fittingCount: active.filter(isTaskReadyForExecution).length,
    windowMin: getFlowTimeWindowForRanking()
  };
}

function isTaskDueToday(task, todayKey) {
  if (!task.deadline) return false;
  const deadlineDate = parseDeadlineDate(task.deadline);
  if (!deadlineDate || Number.isNaN(deadlineDate.getTime())) return false;
  deadlineDate.setHours(0, 0, 0, 0);
  return getDateKey(deadlineDate) === todayKey;
}

function sortTasksByPriorityDeadlineCreated(tasks) {
  return [...tasks].sort((a, b) => {
    const rankA = Number.isFinite(a.priorityRank) ? Number(a.priorityRank) : Number.POSITIVE_INFINITY;
    const rankB = Number.isFinite(b.priorityRank) ? Number(b.priorityRank) : Number.POSITIVE_INFINITY;
    if (rankA !== rankB) {
      return rankA - rankB;
    }

    const priorityOrder = { high: 2, medium: 1 };
    const priorityA = normalizePriority(a.priority);
    const priorityB = normalizePriority(b.priority);
    if (priorityOrder[priorityA] !== priorityOrder[priorityB]) {
      return priorityOrder[priorityB] - priorityOrder[priorityA];
    }
    if (a.deadline && b.deadline) {
      return new Date(a.deadline) - new Date(b.deadline);
    }
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    return b.createdAt - a.createdAt;
  });
}

function sortByPriorityWeight(tasks) {
  return [...tasks].sort((a, b) => {
    const rankA = Number.isFinite(a.priorityRank) ? Number(a.priorityRank) : Number.POSITIVE_INFINITY;
    const rankB = Number.isFinite(b.priorityRank) ? Number(b.priorityRank) : Number.POSITIVE_INFINITY;
    if (rankA !== rankB) {
      return rankA - rankB;
    }

    const priorityOrder = { high: 2, medium: 1 };
    const priorityA = normalizePriority(a.priority);
    const priorityB = normalizePriority(b.priority);
    if (priorityOrder[priorityA] !== priorityOrder[priorityB]) {
      return priorityOrder[priorityB] - priorityOrder[priorityA];
    }

    return b.createdAt - a.createdAt;
  });
}

function sortByDeadlineThenPriority(tasks) {
  return [...tasks].sort((a, b) => {
    const deadlineA = parseDeadlineDate(a.deadline);
    const deadlineB = parseDeadlineDate(b.deadline);
    const timeA = deadlineA && !Number.isNaN(deadlineA.getTime()) ? deadlineA.setHours(0, 0, 0, 0) : Number.POSITIVE_INFINITY;
    const timeB = deadlineB && !Number.isNaN(deadlineB.getTime()) ? deadlineB.setHours(0, 0, 0, 0) : Number.POSITIVE_INFINITY;
    if (timeA !== timeB) {
      return timeA - timeB;
    }

    const rankA = Number.isFinite(a.priorityRank) ? Number(a.priorityRank) : Number.POSITIVE_INFINITY;
    const rankB = Number.isFinite(b.priorityRank) ? Number(b.priorityRank) : Number.POSITIVE_INFINITY;
    if (rankA !== rankB) {
      return rankA - rankB;
    }

    const priorityOrder = { high: 2, medium: 1 };
    const priorityA = normalizePriority(a.priority);
    const priorityB = normalizePriority(b.priority);
    if (priorityOrder[priorityA] !== priorityOrder[priorityB]) {
      return priorityOrder[priorityB] - priorityOrder[priorityA];
    }

    return b.createdAt - a.createdAt;
  });
}

// Вспомогательные функции
function getPriorityLabel(priority) {
  const labels = {
    high: 'Высокий',
    medium: 'Обычный'
  };
  return labels[priority] || priority;
}

function parseDeadlineDate(deadline) {
  if (typeof window !== 'undefined' && window.dateUtils && window.dateUtils.parseLocalDateKey) {
    return window.dateUtils.parseLocalDateKey(deadline);
  }
  if (!deadline) return null;
  if (typeof deadline === 'string') {
    var datePart = deadline.split('T')[0];
    var parts = datePart.split('-');
    if (parts.length === 3) {
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
  }
  return new Date(deadline);
}

function getDateKey(date) {
  if (typeof window !== 'undefined' && window.dateUtils && window.dateUtils.getDateKey) {
    return window.dateUtils.getDateKey(date);
  }
  if (!date || Number.isNaN(date.getTime())) return '';
  var year = date.getFullYear();
  var month = String(date.getMonth() + 1).padStart(2, '0');
  var day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function getDateStringWithOffset(daysOffset) {
  if (typeof window !== 'undefined' && window.dateUtils && window.dateUtils.getDateStringWithOffset) {
    return window.dateUtils.getDateStringWithOffset(daysOffset);
  }
  var date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + daysOffset);
  return getDateKey(date);
}

function formatDeadline(deadline) {
  if (typeof window !== 'undefined' && window.dateUtils && window.dateUtils.formatDeadline) {
    return window.dateUtils.formatDeadline(deadline);
  }
  if (!deadline) return '';
  var deadlineDate = parseDeadlineDate(deadline);
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!deadlineDate || Number.isNaN(deadlineDate.getTime())) return '';
  deadlineDate.setHours(0, 0, 0, 0);
  var diffTime = deadlineDate - today;
  var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'Просрочено на ' + Math.abs(diffDays) + ' дн.';
  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Завтра';
  if (diffDays <= 7) return 'Через ' + diffDays + ' дн.';
  return deadlineDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

// Экспорт для popup.js (режим ФЛОУ и закрытие карточки при выходе)
window.getFlowOrderedTasks = getFlowOrderedTasks;
window.getFlowAvailabilitySummary = getFlowAvailabilitySummary;
window.closeTaskCard = closeTaskCard;

// Экспорт функции для использования в других модулях
function openTaskCard(taskId) {
  return window.openTaskCard(taskId);
}
