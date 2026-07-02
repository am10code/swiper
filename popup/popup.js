// Основной файл для работы с UI и CRUD операциями
var logger = (typeof window !== 'undefined' && window.logger) ? window.logger : { debug: function () {}, info: function () {}, warn: function () {}, error: function () { if (typeof console !== 'undefined' && console.error) console.error.apply(console, arguments); } };

const storage = new StorageManager();

// Функция для создания SVG иконки
function createIcon(iconName, size = 16) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.style.display = 'block';
  
  const icons = {
    'settings': { viewBox: '0 0 50 50', path: '<path style="fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;" d="M46.999,27.708v-5.5l-6.546-1.07c-0.388-1.55-0.996-3.007-1.798-4.342l3.815-5.437L38.58,7.472l-5.368,3.859c-1.338-0.81-2.805-1.428-4.366-1.817L27.706,3h-5.5l-1.06,6.492c-1.562,0.383-3.037,0.993-4.379,1.799l-5.352-3.824l-3.889,3.887l3.765,5.384c-0.814,1.347-1.433,2.82-1.826,4.392l-6.464,1.076v5.5l6.457,1.145c0.39,1.568,1.009,3.041,1.826,4.391l-3.816,5.337l3.887,3.891l5.391-3.776c1.346,0.808,2.817,1.423,4.379,1.808L22.206,47h5.5l1.156-6.513c1.554-0.394,3.022-1.013,4.355-1.824l5.428,3.809l3.888-3.891l-3.875-5.38c0.802-1.335,1.411-2.794,1.795-4.344L46.999,27.708z"/><circle style="fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;" cx="25" cy="25" r="7"/>' },
    'edit': { viewBox: '0 0 297.068 297.068', path: '<path style="fill:currentColor;" d="M288.758,46.999l-38.69-38.69c-5.347-5.354-12.455-8.303-20.02-8.303s-14.672,2.943-20.02,8.297L28.632,190.266L0,297.061l107.547-28.805L288.745,87.045c5.36-5.354,8.323-12.462,8.323-20.026S294.105,52.347,288.758,46.999z M43.478,193.583L180.71,55.823l60.554,60.541L103.761,253.866L43.478,193.583z M37.719,206.006l53.368,53.362l-42.404,11.35L26.35,248.384L37.719,206.006z M279.657,77.951l-19.493,19.505l-60.579-60.541l19.544-19.525c5.823-5.848,16.016-5.842,21.851,0l38.69,38.696c2.924,2.918,4.544,6.8,4.544,10.926C284.214,71.139,282.594,75.027,279.657,77.951z"/>' },
    'pencil': { viewBox: '0 0 297.068 297.068', path: '<path style="fill:currentColor;" d="M288.758,46.999l-38.69-38.69c-5.347-5.354-12.455-8.303-20.02-8.303s-14.672,2.943-20.02,8.297L28.632,190.266L0,297.061l107.547-28.805L288.745,87.045c5.36-5.354,8.323-12.462,8.323-20.026S294.105,52.347,288.758,46.999z M43.478,193.583L180.71,55.823l60.554,60.541L103.761,253.866L43.478,193.583z M37.719,206.006l53.368,53.362l-42.404,11.35L26.35,248.384L37.719,206.006z M279.657,77.951l-19.493,19.505l-60.579-60.541l19.544-19.525c5.823-5.848,16.016-5.842,21.851,0l38.69,38.696c2.924,2.918,4.544,6.8,4.544,10.926C284.214,71.139,282.594,75.027,279.657,77.951z"/>' },
    'trash': { viewBox: '0 0 64 64', path: '<g transform="translate(232, 228)"><polygon style="fill:currentColor;" points="-207.5,-205.1 -204.5,-205.1 -204.5,-181.1 -207.5,-181.1"/><polygon style="fill:currentColor;" points="-201.5,-205.1 -198.5,-205.1 -198.5,-181.1 -201.5,-181.1"/><polygon style="fill:currentColor;" points="-195.5,-205.1 -192.5,-205.1 -192.5,-181.1 -195.5,-181.1"/><polygon style="fill:currentColor;" points="-219.5,-214.1 -180.5,-214.1 -180.5,-211.1 -219.5,-211.1"/><path style="fill:currentColor;" d="M-192.6-212.6h-2.8v-3c0-0.9-0.7-1.6-1.6-1.6h-6c-0.9,0-1.6,0.7-1.6,1.6v3h-2.8v-3c0-2.4,2-4.4,4.4-4.4h6c2.4,0,4.4,2,4.4,4.4V-212.6"/><path style="fill:currentColor;" d="M-191-172.1h-18c-2.4,0-4.5-2-4.7-4.4l-2.8-36l3-0.2l2.8,36c0.1,0.9,0.9,1.6,1.7,1.6h18c0.9,0,1.7-0.8,1.7-1.6l2.8-36l3,0.2l-2.8,36C-186.5-174-188.6-172.1-191-172.1"/></g>' },
    'delete': { viewBox: '0 0 64 64', path: '<g transform="translate(232, 228)"><polygon style="fill:currentColor;" points="-207.5,-205.1 -204.5,-205.1 -204.5,-181.1 -207.5,-181.1"/><polygon style="fill:currentColor;" points="-201.5,-205.1 -198.5,-205.1 -198.5,-181.1 -201.5,-181.1"/><polygon style="fill:currentColor;" points="-195.5,-205.1 -192.5,-205.1 -192.5,-181.1 -195.5,-181.1"/><polygon style="fill:currentColor;" points="-219.5,-214.1 -180.5,-214.1 -180.5,-211.1 -219.5,-211.1"/><path style="fill:currentColor;" d="M-192.6-212.6h-2.8v-3c0-0.9-0.7-1.6-1.6-1.6h-6c-0.9,0-1.6,0.7-1.6,1.6v3h-2.8v-3c0-2.4,2-4.4,4.4-4.4h6c2.4,0,4.4,2,4.4,4.4V-212.6"/><path style="fill:currentColor;" d="M-191-172.1h-18c-2.4,0-4.5-2-4.7-4.4l-2.8-36l3-0.2l2.8,36c0.1,0.9,0.9,1.6,1.7,1.6h18c0.9,0,1.7-0.8,1.7-1.6l2.8-36l3,0.2l-2.8,36C-186.5-174-188.6-172.1-191-172.1"/></g>' }
  };
  
  // Алиасы для совместимости
  if (iconName === 'pencil') iconName = 'edit';
  if (iconName === 'delete') iconName = 'trash';
  
  const icon = icons[iconName];
  if (!icon) return null;
  
  svg.setAttribute('viewBox', icon.viewBox);
  svg.innerHTML = icon.path;
  return svg;
}
// Экспортируем storage для использования в других модулях
window.storage = storage;
let currentTasks = [];
let currentEditTaskId = null;
let isInitializing = true;
let currentContextTaskId = null;
let cachedGlobalPomodoroSettings = null;
let isNoDateCollapsed = true;
let isLaterTasksCollapsed = true;
let movementActiveTaskId = null;
let movementActiveIndex = 0;
let triageActiveTaskId = null;
let triageActiveIndex = 0;
let currentTaskCreationMode = 'bottom';
let isFabInputOpen = false;
let prioritizationEngine = null;
let isPrioritizationSessionActive = false;
const PAGE_KIND_MAIN = 'main';
const PAGE_KIND_LEGACY = 'legacy-popup';
let currentPageKind = PAGE_KIND_LEGACY;
let availableSections = ['tasks'];
let currentSectionName = 'tasks';
/** @type {string[]|null} Порядок id задач для текущего «цикла» режима ФЛОУ; сбрасывается при выходе из ФЛОУ. */
let flowSessionOrderedIds = null;
const FLOW_TIME_WINDOW_OPTIONS = [5, 15, 30, 60, 120];
let activeFlowTimeWindowMin = 30;
const WORKFLOW_SECTION_NAMES = ['movement', 'triage', 'micro-slots', 'waiting', 'backlog', 'ideas', 'stale'];
const WORKFLOW_UI_STATUSES = ['active', 'waiting', 'backlog', 'idea', 'killed'];
const NEXT_STEP_UI_KINDS = ['do', 'ping', 'check', 'write', 'think', 'delegate'];
const RECURRENCE_EXECUTION_MODES_UI = ['routine', 'needs_next_action'];
const ROUTINE_DEFAULT_ESTIMATE_MIN = 30;
const WORKFLOW_STATUS_LABELS = {
  active: 'Активно',
  waiting: 'Жду',
  backlog: 'Бэклог',
  idea: 'Идея',
  killed: 'Убито'
};
const NEXT_STEP_KIND_LABELS = {
  do: 'Сделать',
  ping: 'Пинг',
  check: 'Проверить',
  write: 'Написать',
  think: 'Подумать',
  delegate: 'Делегировать'
};

function normalizeWorkflowStatusForUi(value) {
  return WORKFLOW_UI_STATUSES.includes(value) ? value : 'active';
}

function normalizeRecurrenceExecutionModeForUi(value) {
  return RECURRENCE_EXECUTION_MODES_UI.includes(value) ? value : 'needs_next_action';
}

function isRecurringRoutineTask(task) {
  return task?.isRecurringParticipation === true
    && normalizeRecurrenceExecutionModeForUi(task?.recurrenceExecutionMode) === 'routine';
}

function normalizeNextStepSizeForUi(value) {
  if (value === 'deep') return 'deep';
  const parsed = Number(value);
  return [5, 15, 30, 60].includes(parsed) ? parsed : 30;
}

function normalizeNextStepKindForUi(value) {
  return NEXT_STEP_UI_KINDS.includes(value) ? value : 'do';
}

function formatNextStepSize(size) {
  const normalized = normalizeNextStepSizeForUi(size);
  return normalized === 'deep' ? 'Deep' : `${normalized}м`;
}

function getOpenNextSteps(task) {
  const steps = Array.isArray(task?.nextSteps) ? task.nextSteps : [];
  return steps
    .filter(step => step && !step.completed && typeof step.text === 'string' && step.text.trim())
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function getPrimaryNextAction(task) {
  return getOpenNextSteps(task)[0] || null;
}

function hasOpenNextAction(task) {
  return !!getPrimaryNextAction(task);
}

function taskRequiresNextAction(task) {
  return !isRecurringRoutineTask(task);
}

function isTaskInWorkflowStatus(task, status) {
  return normalizeWorkflowStatusForUi(task?.workflowStatus) === status;
}

function isTaskExecutionActive(task) {
  return !!task
    && task.completed !== true
    && normalizeTaskStatus(task.status) === 'ready'
    && isTaskInWorkflowStatus(task, 'active');
}

function isTaskBacklogLike(task) {
  const status = normalizeWorkflowStatusForUi(task?.workflowStatus);
  return status === 'backlog' || status === 'idea' || status === 'killed' || status === 'waiting';
}

function getWorkflowStatusLabel(status) {
  return WORKFLOW_STATUS_LABELS[normalizeWorkflowStatusForUi(status)] || 'Активно';
}

function createWorkflowEventForUi(type, payload) {
  return {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    type,
    timestamp: Date.now(),
    payload: payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {}
  };
}

function getWorkflowEvents(task) {
  return Array.isArray(task?.events) ? task.events : [];
}

function getTaskStalenessDays(task) {
  const timestamp = Number(task?.updatedAt) || Number(task?.createdAt) || Date.now();
  return Math.max(0, Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000)));
}

function isWorkflowStaleTask(task) {
  if (!task || task.completed) return false;
  if (!isTaskInWorkflowStatus(task, 'active')) return false;
  if (Math.floor(Number(task.flowSkipCount) || 0) >= 2) return true;
  if (taskRequiresNextAction(task) && !hasOpenNextAction(task)) return true;
  return getTaskStalenessDays(task) >= 14;
}

function isWorkflowSectionName(sectionName) {
  return WORKFLOW_SECTION_NAMES.includes(sectionName);
}

function isFlowSectionName(sectionName) {
  return sectionName === 'flow';
}

function updateFlowModeUi() {
  const panel = document.getElementById('flowTimeWindowPanel');
  if (!panel) return;
  panel.style.display = 'inline-flex';
}

function normalizeFlowTimeWindowMin(value) {
  const parsed = Number(value);
  return FLOW_TIME_WINDOW_OPTIONS.includes(parsed) ? parsed : 30;
}

function normalizeDailyCapacityMin(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 240;
  const rounded = Math.floor(parsed);
  return Math.max(60, Math.min(960, rounded));
}

function resolveTaskEstimateMinutes(task) {
  const mode = normalizeEstimateModeForBadge(task?.estimateMode);
  if (mode === 'none' && isRecurringRoutineTask(task)) {
    return ROUTINE_DEFAULT_ESTIMATE_MIN;
  }
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

function getTodayKey() {
  return window.dateUtils ? window.dateUtils.todayKey() : getDateKey(new Date());
}

function formatDeadlineKeyForHumans(deadlineKey) {
  if (!deadlineKey) return '';
  if (window.dateUtils && typeof window.dateUtils.formatDeadline === 'function') {
    return window.dateUtils.formatDeadline(deadlineKey);
  }
  const date = parseDeadlineDate(deadlineKey);
  if (!date || Number.isNaN(date.getTime())) return String(deadlineKey);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function validateDeadlineCapacity(candidateTask, allTasks, settings) {
  const deadline = candidateTask?.deadline || null;
  if (!deadline) {
    return { isOverCapacity: false, capacityMin: normalizeDailyCapacityMin(settings?.dailyCapacityMin), plannedMinutes: 0, projectedMinutes: 0 };
  }
  const targetDate = String(deadline).split('T')[0];
  const todayKey = getTodayKey();
  if (targetDate !== todayKey) {
    return { isOverCapacity: false, capacityMin: normalizeDailyCapacityMin(settings?.dailyCapacityMin), plannedMinutes: 0, projectedMinutes: 0 };
  }

  const capacityMin = normalizeDailyCapacityMin(settings?.dailyCapacityMin);
  const tasks = Array.isArray(allTasks) ? allTasks : [];
  const plannedMinutes = tasks
    .filter((task) => !task.completed && String(task.deadline || '').split('T')[0] === todayKey)
    .reduce((sum, task) => sum + (resolveTaskEstimateMinutes(task) || 0), 0);
  const candidateMinutes = resolveTaskEstimateMinutes(candidateTask) || 0;
  const projectedMinutes = plannedMinutes + candidateMinutes;
  return {
    isOverCapacity: projectedMinutes > capacityMin,
    capacityMin,
    plannedMinutes,
    candidateMinutes,
    projectedMinutes
  };
}

function findNearestDateWithinCapacity(candidateTask, allTasks, settings, fromOffsetDays) {
  const startOffset = Math.max(1, Number(fromOffsetDays) || 1);
  const maxHorizonDays = 30;
  for (let offset = startOffset; offset <= maxHorizonDays; offset++) {
    const deadline = getDateStringWithOffset(offset);
    const check = validateDeadlineCapacity(
      { ...candidateTask, deadline },
      allTasks,
      settings
    );
    if (!check.isOverCapacity) {
      return deadline;
    }
  }
  return null;
}

async function resolveTodayDeadlineWithCapacityGuard(candidateTask, allTasks, settings) {
  const todayKey = getTodayKey();
  if (!candidateTask || String(candidateTask.deadline || '').split('T')[0] !== todayKey) {
    return candidateTask?.deadline || null;
  }

  const capacityCheck = validateDeadlineCapacity(candidateTask, allTasks, settings);
  if (!capacityCheck.isOverCapacity) {
    return candidateTask.deadline;
  }

  const suggested = findNearestDateWithinCapacity(candidateTask, allTasks, settings, 1);
  const suggestedLabel = suggested ? formatDeadlineKeyForHumans(suggested) : null;
  const messageLines = [
    `План на сегодня: ${capacityCheck.projectedMinutes} мин при лимите ${capacityCheck.capacityMin} мин.`,
    'Сегодняшний день выглядит перегруженным.'
  ];
  if (suggestedLabel) {
    messageLines.push(`Предлагаю перенести на: ${suggestedLabel}.`);
  }

  if (!window.dialogService || typeof window.dialogService.showConfirm !== 'function') {
    return suggested || candidateTask.deadline;
  }

  const keepToday = await window.dialogService.showConfirm(
    'Риск перегруза дня',
    messageLines.join('\n'),
    {
      confirmLabel: 'Оставить Сегодня',
      cancelLabel: suggestedLabel ? `Перенести на ${suggestedLabel}` : 'Перенести на завтра'
    }
  );
  if (keepToday) return candidateTask.deadline;
  return suggested || getDateStringWithOffset(1);
}

function updateFlowTimeWindowUi() {
  const buttons = document.querySelectorAll('.flow-time-window-btn');
  buttons.forEach((button) => {
    const minutes = normalizeFlowTimeWindowMin(button.getAttribute('data-minutes'));
    const isActive = minutes === activeFlowTimeWindowMin;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function isTaskCardPanelOpen() {
  const panel = document.getElementById('taskCardPanel');
  return !!panel && window.getComputedStyle(panel).display !== 'none';
}

function formatFlowWindowMinutes(minutes) {
  return `${normalizeFlowTimeWindowMin(minutes)} минут`;
}

function getNextFlowTimeWindowMin(value) {
  const current = normalizeFlowTimeWindowMin(value);
  return FLOW_TIME_WINDOW_OPTIONS.find(minutes => minutes > current) || null;
}

function hideFlowEmptyState() {
  const flowEmptyState = document.getElementById('flowEmptyState');
  if (flowEmptyState) flowEmptyState.style.display = 'none';
  document.body.classList.remove('flow-empty-mode');
}

function createFlowEmptyOptionText(count, fallback) {
  const suffix = count > 0 ? ` (${count})` : '';
  return `${fallback}${suffix}`;
}

async function updateFlowEmptyStateMessage() {
  const flowEmptyState = document.getElementById('flowEmptyState');
  if (!flowEmptyState) return;
  let message = document.getElementById('flowEmptyStateMessage') || flowEmptyState.querySelector('p');
  if (!message) {
    message = document.createElement('p');
    message.id = 'flowEmptyStateMessage';
    flowEmptyState.appendChild(message);
  }

  const summary = typeof window.getFlowAvailabilitySummary === 'function'
    ? await window.getFlowAvailabilitySummary()
    : null;
  const windowMin = normalizeFlowTimeWindowMin(summary?.windowMin || activeFlowTimeWindowMin);
  const nextWindow = getNextFlowTimeWindowMin(windowMin);
  const increaseButton = document.getElementById('flowEmptyIncreaseTimeBtn');
  const movementButton = document.getElementById('flowEmptyMovementBtn');
  const triageButton = document.getElementById('flowEmptyTriageBtn');
  const movementCount = getMovementItems().length;
  const triageCount = getTriageCandidates().length;

  if (increaseButton) {
    increaseButton.style.display = nextWindow ? 'inline-flex' : 'none';
    increaseButton.textContent = nextWindow ? `Увеличить до ${formatFlowWindowMinutes(nextWindow)}` : 'Время уже максимум';
  }
  if (movementButton) {
    movementButton.textContent = createFlowEmptyOptionText(movementCount, 'В Движение');
  }
  if (triageButton) {
    triageButton.textContent = createFlowEmptyOptionText(triageCount, 'В Триаж');
  }

  if (summary && summary.readyCount > 0 && summary.fittingCount === 0) {
    message.textContent = `Нет задач под ${formatFlowWindowMinutes(windowMin)}. Увеличь доступное время или отправь карточки в разбор, чтобы нарезать более короткие шаги.`;
    return;
  }
  message.textContent = 'Нет задач, готовых к выполнению во ФЛОУ. Сначала нужно подготовить карточки: описать ближайший шаг, снять ожидание или разобрать застрявшее.';
}

async function showFlowEmptyState() {
  const flowEmptyState = document.getElementById('flowEmptyState');
  if (!flowEmptyState) return;
  await updateFlowEmptyStateMessage();
  flowEmptyState.style.display = 'block';
  document.body.classList.add('flow-empty-mode');
}

async function increaseFlowTimeWindowFromEmptyState() {
  const nextWindow = getNextFlowTimeWindowMin(activeFlowTimeWindowMin);
  if (!nextWindow) return;
  await applyFlowTimeWindow(nextWindow, { persist: true, refreshFlow: true });
}

async function applyFlowTimeWindow(minutes, options) {
  const opts = options || {};
  const nextWindow = normalizeFlowTimeWindowMin(minutes);
  const changed = nextWindow !== activeFlowTimeWindowMin;
  activeFlowTimeWindowMin = nextWindow;
  updateFlowTimeWindowUi();

  if (opts.persist !== false) {
    await storage.updateSettings({ activeFlowTimeWindowMin: activeFlowTimeWindowMin });
  }

  if (!changed || opts.refreshFlow === false || !isFlowSectionName(getCurrentSectionName())) {
    return;
  }
  await refreshFlowSessionSnapshot();
  if (typeof window.openTaskCard !== 'function' || typeof window.getFlowOrderedTasks !== 'function') {
    return;
  }
  const flowEmptyState = document.getElementById('flowEmptyState');
  const ordered = await window.getFlowOrderedTasks();
  if (ordered.length > 0) {
    hideFlowEmptyState();
    await window.openTaskCard(ordered[0].id);
    return;
  }
  if (isTaskCardPanelOpen() && typeof window.closeTaskCard === 'function') {
    await window.closeTaskCard({ goToTasksAfterClose: false });
  }
  await showFlowEmptyState();
}

function detectPageKind() {
  const pathname = window.location.pathname || '';
  if (pathname.includes('main.html')) return PAGE_KIND_MAIN;
  if (pathname.includes('popup/popup.html')) return PAGE_KIND_LEGACY;

  // Fallback для нестандартных путей: ориентируемся на DOM.
  const hasMainOnlySections = !!document.getElementById('settingsSection');
  return hasMainOnlySections ? PAGE_KIND_MAIN : PAGE_KIND_LEGACY;
}

function resolveAvailableSections(pageKind) {
  const sections = ['tasks', 'completed'];
  if (pageKind === PAGE_KIND_MAIN) {
    if (document.getElementById('settingsSection')) sections.push('settings');
    if (document.getElementById('prioritizationSection')) sections.push('prioritization');
    if (document.getElementById('flowSection')) sections.push('flow');
    if (document.getElementById('movementSection')) sections.push('movement');
    if (document.getElementById('triageSection')) sections.push('triage');
    if (document.getElementById('microSlotsSection')) sections.push('micro-slots');
    if (document.getElementById('waitingSection')) sections.push('waiting');
    if (document.getElementById('backlogSection')) sections.push('backlog');
    if (document.getElementById('ideasSection')) sections.push('ideas');
    if (document.getElementById('staleSection')) sections.push('stale');
    if (document.getElementById('cookbooksSection')) sections.push('cookbooks');
  }
  return sections;
}

function getInitialSectionFromHash() {
  const hash = window.location.hash.replace('#', '');
  return availableSections.includes(hash) ? hash : 'tasks';
}

async function initPopupUiPage(pageKind) {
  await storage.init();
  if (typeof window.createPrioritizationEngine === 'function') {
    prioritizationEngine = window.createPrioritizationEngine(storage);
  }
  currentPageKind = pageKind;
  availableSections = resolveAvailableSections(pageKind);
  const initialSettings = await storage.getSettings();
  currentTaskCreationMode = initialSettings.taskCreationMode === 'fab' ? 'fab' : 'bottom';
  activeFlowTimeWindowMin = normalizeFlowTimeWindowMin(initialSettings.activeFlowTimeWindowMin);
  await loadCategories();
  setupEventListeners();
  updateFlowTimeWindowUi();

  // Поддержка back/forward навигации.
  window.addEventListener('hashchange', async () => {
    if (isInitializing) return;
    const hash = window.location.hash.replace('#', '');
    if (hash && availableSections.includes(hash)) {
      await loadTasks();
      switchSection(hash, false);
    }
  });

  let initialSection = getInitialSectionFromHash();
  if (window.location.hash.replace('#', '') !== initialSection) {
    window.location.hash = initialSection;
  }

  await loadTasks();
  switchSection(initialSection, false);
  isInitializing = false;
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
  const pageKind = detectPageKind();
  await initPopupUiPage(pageKind);
});

// Загрузка задач
async function loadTasks() {
  currentTasks = await storage.getTasks();
  cachedGlobalPomodoroSettings = await storage.getGlobalPomodoroSettings();
  updatePriorityPromptVisibility();
  // renderActiveTasks вызывается в switchSection после отображения раздела
  renderCompletedTasks();
}

// Загрузка категорий
async function loadCategories() {
  const categories = await storage.getCategories();
  const categorySelect = document.getElementById('categorySelect');
  const editCategorySelect = document.getElementById('editCategorySelect');

  // Очистка и заполнение селектов
  if (categorySelect) {
    const currentValue = categorySelect.value;
    categorySelect.innerHTML = '<option value="">Выберите категорию</option>';
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      categorySelect.appendChild(option);
    });
    if (currentValue && categories.includes(currentValue)) {
      categorySelect.value = currentValue;
    }
  }

  if (editCategorySelect) {
    const currentValue = editCategorySelect.value;
    editCategorySelect.innerHTML = '<option value="">Выберите категорию</option>';
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      editCategorySelect.appendChild(option);
    });
    if (currentValue && categories.includes(currentValue)) {
      editCategorySelect.value = currentValue;
    }
  }

}

// Настройка обработчиков событий
function setupEventListeners() {
  // Форма добавления задачи
  const taskForm = document.getElementById('taskForm');
  taskForm.addEventListener('submit', (e) => {
    // Проверяем, что submit не был вызван кликом на кнопку шестеренки
    const toggleBtn = document.getElementById('toggleOptionsBtn');
    if (e.submitter === toggleBtn) {
      e.preventDefault();
      return false;
    }
    handleAddTask(e);
  });
  
  // Добавление задачи по Enter
  const taskInput = document.getElementById('taskInput');
  if (taskInput) {
    taskInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('taskForm').dispatchEvent(new Event('submit'));
      }
    });
    
    // Управление видимостью кнопки шестеренки при фокусе
    taskInput.addEventListener('focus', () => {
      const toggleBtn = document.getElementById('toggleOptionsBtn');
      if (toggleBtn) {
        toggleBtn.classList.add('visible');
      }
    });
    
    taskInput.addEventListener('blur', () => {
      const toggleBtn = document.getElementById('toggleOptionsBtn');
      const taskOptions = document.getElementById('taskOptions');
      // Скрываем кнопку только если дополнительные поля закрыты
      if (toggleBtn && taskOptions) {
        const isOptionsVisible = window.getComputedStyle(taskOptions).display !== 'none';
        if (!isOptionsVisible) {
          toggleBtn.classList.remove('visible');
        }
      }
    });
  }

  // Форма редактирования
  document.getElementById('editForm').addEventListener('submit', handleEditTask);

  // Форма добавления категории
  document.getElementById('categoryForm').addEventListener('submit', handleAddCategory);

  // Переключатель дополнительных полей
  const toggleOptionsBtn = document.getElementById('toggleOptionsBtn');
  if (toggleOptionsBtn) {
    toggleOptionsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      toggleTaskOptions(e);
      return false;
    });
    // Также предотвращаем submit формы при клике на кнопку
    toggleOptionsBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
    });
  }

  const addTaskFab = document.getElementById('addTaskFab');
  if (addTaskFab) {
    addTaskFab.addEventListener('click', () => {
      toggleFabTaskInput();
    });
  }

  const priorityPromptBtn = document.getElementById('priorityPromptBtn');
  if (priorityPromptBtn) {
    priorityPromptBtn.addEventListener('click', () => {
      if (document.getElementById('prioritizationSection')) {
        switchSection('prioritization');
      }
    });
  }

  const flowBtn = document.getElementById('flowBtn');
  if (flowBtn) {
    flowBtn.addEventListener('click', () => {
      if (document.getElementById('flowSection')) {
        switchSection('flow');
      }
    });
  }
  const overdueMoveAllBtn = document.getElementById('overdueMoveAllBtn');
  if (overdueMoveAllBtn) {
    overdueMoveAllBtn.addEventListener('click', async () => {
      await moveAllOverdueTasksToToday();
    });
  }
  const flowTimeWindowButtons = document.querySelectorAll('.flow-time-window-btn');
  flowTimeWindowButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const nextWindow = normalizeFlowTimeWindowMin(button.getAttribute('data-minutes'));
      await applyFlowTimeWindow(nextWindow, { persist: true, refreshFlow: true });
    });
  });
  const flowEmptyIncreaseTimeBtn = document.getElementById('flowEmptyIncreaseTimeBtn');
  if (flowEmptyIncreaseTimeBtn) {
    flowEmptyIncreaseTimeBtn.addEventListener('click', increaseFlowTimeWindowFromEmptyState);
  }
  const flowEmptyMovementBtn = document.getElementById('flowEmptyMovementBtn');
  if (flowEmptyMovementBtn) {
    flowEmptyMovementBtn.addEventListener('click', () => switchSection('movement'));
  }
  const flowEmptyTriageBtn = document.getElementById('flowEmptyTriageBtn');
  if (flowEmptyTriageBtn) {
    flowEmptyTriageBtn.addEventListener('click', () => switchSection('triage'));
  }

  document.addEventListener('mousedown', (e) => {
    if (currentTaskCreationMode !== 'fab' || !isFabInputOpen) return;
    if (getCurrentSectionName() !== 'tasks') return;

    const addTaskSection = document.querySelector('.add-task-section');
    if (!addTaskSection) return;
    if (addTaskSection.contains(e.target)) return;

    toggleFabTaskInput(false);
  });

  // Бургер-меню
  document.getElementById('burgerMenuBtn').addEventListener('click', toggleBurgerMenu);
  
  // Обработчики для пунктов меню
  document.querySelectorAll('.burger-menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const section = e.currentTarget.getAttribute('data-section');
      switchSection(section);
      closeBurgerMenu();
    });
  });

  // Закрытие меню при клике вне его
  const overlay = document.querySelector('.burger-menu-overlay');
  if (overlay) {
    overlay.addEventListener('click', closeBurgerMenu);
  }

  // Предотвращаем закрытие меню при клике на содержимое меню
  const menuContent = document.querySelector('.burger-menu-content');
  if (menuContent) {
    menuContent.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
  
  // Закрываем меню при клике в любое место вне меню
  document.addEventListener('click', (e) => {
    const burgerMenu = document.getElementById('burgerMenu');
    const burgerMenuBtn = document.getElementById('burgerMenuBtn');
    const burgerMenuContent = document.querySelector('.burger-menu-content');
    
    if (burgerMenu && burgerMenu.style.display !== 'none') {
      // Проверяем, что клик был вне меню и вне кнопки
      const clickedInsideMenu = burgerMenuContent && burgerMenuContent.contains(e.target);
      const clickedOnButton = burgerMenuBtn && (e.target === burgerMenuBtn || burgerMenuBtn.contains(e.target));
      
      if (!clickedInsideMenu && !clickedOnButton) {
        closeBurgerMenu();
      }
    }
  });

  // Модальные окна
  document.querySelector('.close-modal').addEventListener('click', closeEditModal);
  document.querySelector('.close-category-modal').addEventListener('click', closeCategoryModal);
  document.getElementById('cancelEdit').addEventListener('click', closeEditModal);
  document.getElementById('cancelCategory').addEventListener('click', closeCategoryModal);
  document.getElementById('addCategoryBtn').addEventListener('click', openCategoryModal);

  // Закрытие модальных окон при клике вне их
  window.addEventListener('click', (e) => {
    const editModal = document.getElementById('editModal');
    const categoryModal = document.getElementById('categoryModal');
    const taskSettingsModal = document.getElementById('taskSettingsModal');
    if (e.target === editModal) {
      closeEditModal();
    }
    if (e.target === categoryModal) {
      closeCategoryModal();
    }
    if (e.target === taskSettingsModal) {
      closeTaskSettingsModal();
    }
  });

  // Кнопка настроек списка задач
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', openTaskSettingsModal);
  }

  // Кнопка "Ок" в попапе настроек
  const taskSettingsOkBtn = document.getElementById('taskSettingsOkBtn');
  if (taskSettingsOkBtn) {
    taskSettingsOkBtn.addEventListener('click', saveTaskSettings);
  }

  // Сохранение настроек помодоро (в разделе настроек)
  const pomodoroSaveBtn = document.getElementById('pomodoroSaveSettingsBtn');
  if (pomodoroSaveBtn) {
    pomodoroSaveBtn.addEventListener('click', saveGlobalPomodoroSettings);
  }
  const dailyCapacitySaveBtn = document.getElementById('dailyCapacitySaveBtn');
  if (dailyCapacitySaveBtn) {
    dailyCapacitySaveBtn.addEventListener('click', saveDailyCapacitySetting);
  }
  const logCompletedStepsToggle = document.getElementById('logCompletedStepsToggle');
  if (logCompletedStepsToggle) {
    logCompletedStepsToggle.addEventListener('change', async (e) => {
      await saveLogCompletedStepsSetting(e.target.checked);
    });
  }
  const taskCreationModeRadios = document.querySelectorAll('input[name="taskCreationMode"]');
  taskCreationModeRadios.forEach(radio => {
    radio.addEventListener('change', async (e) => {
      const selectedMode = e.target.value === 'fab' ? 'fab' : 'bottom';
      currentTaskCreationMode = selectedMode;
      await storage.updateSettings({ taskCreationMode: selectedMode });
      const sectionName = getCurrentSectionName();
      applyTaskCreationMode(selectedMode, sectionName);
    });
  });

  if (typeof setupImportExport === 'function') {
    setupImportExport({
      storage,
      onAfterImport: async () => {
        await loadTasks();
        if (typeof renderActiveTasks === 'function') {
          renderActiveTasks();
        }
        if (typeof renderCompletedTasks === 'function') {
          renderCompletedTasks();
        }
        if (typeof renderCurrentWorkflowSection === 'function') {
          renderCurrentWorkflowSection();
        }
      }
    });
  }

  const testNotificationBtn = document.getElementById('testNotificationBtn');
  if (testNotificationBtn) {
    testNotificationBtn.addEventListener('click', () => {
      if (!chrome?.runtime?.sendMessage) {
        window.dialogService.showAlert('chrome.runtime.sendMessage недоступен');
        return;
      }
      chrome.runtime.sendMessage({
        action: 'showPomodoroNotification',
        title: 'Тест уведомления',
        message: 'Если вы это видите, уведомления работают.'
      }, (response) => {
        const errorMessage = chrome.runtime.lastError?.message;
        if (errorMessage) {
          window.dialogService.showAlert(`Ошибка отправки: ${errorMessage}`);
          return;
        }
        if (response?.success === false) {
          window.dialogService.showAlert(`Не удалось показать уведомление: ${response.error || 'неизвестная ошибка'}`);
          return;
        }
        window.dialogService.showAlert('Запрос на уведомление отправлен');
      });
    });
  }

  setupDeadlineQuickButtons();
  setupTaskContextMenu();

  const noDateToggle = document.getElementById('noDateTasksToggle');
  if (noDateToggle) {
    noDateToggle.addEventListener('click', () => {
      isNoDateCollapsed = !isNoDateCollapsed;
      updateNoDateSectionState();
    });
  }

  const laterToggle = document.getElementById('laterTasksToggle');
  if (laterToggle) {
    laterToggle.addEventListener('click', () => {
      isLaterTasksCollapsed = !isLaterTasksCollapsed;
      updateLaterTasksSectionState();
    });
  }
}

// Обработка добавления задачи
async function handleAddTask(e) {
  e.preventDefault();
  const taskInput = document.getElementById('taskInput');
  const categorySelect = document.getElementById('categorySelect');
  const prioritySelect = document.getElementById('prioritySelect');
  const deadlineInput = document.getElementById('deadlineInput');
  const defaultDeadline = getDateStringWithOffset(0);
  const deadlineRaw = deadlineInput.value ? deadlineInput.value.trim() : '';
  const task = {
    text: taskInput.value.trim(),
    category: categorySelect.value,
    priority: prioritySelect.value,
    deadline: deadlineRaw || defaultDeadline
  };

  if (task.text) {
    const currentSettings = await storage.getSettings();
    task.deadline = await resolveTodayDeadlineWithCapacityGuard(task, currentTasks, currentSettings);
    const capacityCheck = validateDeadlineCapacity(task, currentTasks, currentSettings);
    logger.debug('deadlineCapacityValidation:add', capacityCheck);
    const shouldOpenCreatedTaskCard = currentTaskCreationMode === 'fab'
      && isFabInputOpen
      && getCurrentSectionName() === 'tasks';
    const createdTask = await storage.addTask(task);
    taskInput.value = '';
    deadlineInput.value = '';
    categorySelect.value = '';
    prioritySelect.value = 'medium';
    // Скрываем дополнительные поля после добавления
    const taskOptions = document.getElementById('taskOptions');
    const toggleBtn = document.getElementById('toggleOptionsBtn');
    const currentDisplay = window.getComputedStyle(taskOptions).display;
    if (currentDisplay !== 'none') {
      taskOptions.style.display = 'none';
      if (toggleBtn) {
        toggleBtn.classList.remove('active');
        // Убираем класс visible, так как после добавления задачи фокус может быть потерян
        toggleBtn.classList.remove('visible');
      }
    }
    if (currentTaskCreationMode === 'fab') {
      toggleFabTaskInput(false);
    }
    await loadTasks();
    await loadCategories();
    // Обновляем отображение активных задач, если раздел задач виден
    const tasksSection = document.getElementById('tasksSection');
    if (tasksSection && window.getComputedStyle(tasksSection).display !== 'none') {
      renderActiveTasks();
    }
    updatePriorityPromptVisibility();
    if (shouldOpenCreatedTaskCard && createdTask?.id && typeof window.openTaskCard === 'function') {
      await window.openTaskCard(createdTask.id);
    }
  }
}

// Обработка редактирования задачи
async function handleEditTask(e) {
  e.preventDefault();
  const editTaskInput = document.getElementById('editTaskInput');
  const editCategorySelect = document.getElementById('editCategorySelect');
  const editPrioritySelect = document.getElementById('editPrioritySelect');
  const editDeadlineInput = document.getElementById('editDeadlineInput');

  const updates = {
    text: editTaskInput.value.trim(),
    category: editCategorySelect.value,
    priority: editPrioritySelect.value,
    deadline: editDeadlineInput.value || null
  };

  if (updates.text && currentEditTaskId) {
    const currentSettings = await storage.getSettings();
    const baseTasks = currentTasks.filter((task) => task.id !== currentEditTaskId);
    const candidateTask = { ...(currentTasks.find((task) => task.id === currentEditTaskId) || {}), ...updates };
    candidateTask.deadline = await resolveTodayDeadlineWithCapacityGuard(candidateTask, baseTasks, currentSettings);
    updates.deadline = candidateTask.deadline;
    if (editDeadlineInput) {
      editDeadlineInput.value = updates.deadline || '';
    }
    const capacityCheck = validateDeadlineCapacity(candidateTask, baseTasks, currentSettings);
    logger.debug('deadlineCapacityValidation:edit', capacityCheck);
    await storage.updateTask(currentEditTaskId, updates);
    closeEditModal();
    await loadTasks();
    await loadCategories();
    // Обновляем оба списка
    renderActiveTasks();
    renderCompletedTasks();
  }
}

// Обработка добавления категории
async function handleAddCategory(e) {
  e.preventDefault();
  const categoryNameInput = document.getElementById('categoryNameInput');
  const categoryName = categoryNameInput.value.trim();

  if (categoryName) {
    await storage.addCategory(categoryName);
    categoryNameInput.value = '';
    closeCategoryModal();
    await loadCategories();
  }
}

// Удаление задачи
async function deleteTask(taskId) {
  await storage.deleteTask(taskId);
  await loadTasks();
  // Обновляем оба списка
  renderActiveTasks();
  renderCompletedTasks();
  updatePriorityPromptVisibility();
}

// Переключение статуса задачи
async function toggleTask(taskId) {
  // Находим элемент задачи
  const taskElement = document.querySelector(`.task-item[data-task-id="${taskId}"]`);
  
  if (taskElement) {
    // Получаем текущее состояние задачи
    const task = currentTasks.find(t => t.id === taskId);
    const willBeCompleted = !task?.completed;
    
    // Если задача будет отмечена как выполненная, запускаем анимацию исчезновения
    if (willBeCompleted) {
      taskElement.classList.add('fade-out');
      
      // Ждем завершения анимации перед обновлением данных
      setTimeout(async () => {
        await storage.toggleTask(taskId);
        await loadTasks();
        updatePriorityPromptVisibility();
      }, 400); // Время анимации
    } else {
      // Если задача активируется, просто обновляем без анимации
      await storage.toggleTask(taskId);
      await loadTasks();
      updatePriorityPromptVisibility();
    }
  } else {
    // Если элемент не найден, просто обновляем
    await storage.toggleTask(taskId);
    await loadTasks();
    updatePriorityPromptVisibility();
  }
}

// Открытие модального окна редактирования
function openEditModal(taskId) {
  const task = currentTasks.find(t => t.id === taskId);
  if (task) {
    currentEditTaskId = taskId;
    document.getElementById('editTaskInput').value = task.text;
    document.getElementById('editCategorySelect').value = task.category || '';
    document.getElementById('editPrioritySelect').value = normalizePriority(task.priority);
    document.getElementById('editDeadlineInput').value = task.deadline || '';
    document.getElementById('editModal').style.display = 'block';
  }
}

// Закрытие модального окна редактирования
function closeEditModal() {
  document.getElementById('editModal').style.display = 'none';
  currentEditTaskId = null;
}

// Открытие модального окна добавления категории
function openCategoryModal() {
  document.getElementById('categoryModal').style.display = 'block';
}

// Закрытие модального окна добавления категории
function closeCategoryModal() {
  document.getElementById('categoryModal').style.display = 'none';
}

let pomodoroSaveStatusTimeoutId = null;

function setPomodoroSaveStatus(message, type = null) {
  const statusElement = document.getElementById('pomodoroSaveStatus');
  if (!statusElement) return;

  statusElement.textContent = message || '';
  statusElement.classList.remove('is-success', 'is-warning');
  if (type === 'success' || type === 'warning') {
    statusElement.classList.add(`is-${type}`);
  }

  if (pomodoroSaveStatusTimeoutId) {
    clearTimeout(pomodoroSaveStatusTimeoutId);
    pomodoroSaveStatusTimeoutId = null;
  }

  if (message) {
    pomodoroSaveStatusTimeoutId = setTimeout(() => {
      statusElement.textContent = '';
      statusElement.classList.remove('is-success', 'is-warning');
      pomodoroSaveStatusTimeoutId = null;
    }, 3200);
  }
}

function normalizePomodoroValue(input, fallback) {
  const min = Number.parseInt(input?.min ?? '', 10);
  const max = Number.parseInt(input?.max ?? '', 10);
  let value = Number.parseInt(input?.value ?? '', 10);
  let adjusted = false;

  if (!Number.isFinite(value)) {
    value = fallback;
    adjusted = true;
  }
  if (Number.isFinite(min) && value < min) {
    value = min;
    adjusted = true;
  }
  if (Number.isFinite(max) && value > max) {
    value = max;
    adjusted = true;
  }

  if (input) {
    input.value = String(value);
  }

  return { value, adjusted };
}

// Загрузка настроек для раздела настроек
async function loadSettingsSection() {
  const settings = await storage.getSettings();
  const globalPomodoroSettings = settings.globalPomodoroSettings || {
    interval: 25,
    shortBreak: 5,
    longBreak: 15,
    longBreakAfter: 4
  };

  const intervalInput = document.getElementById('pomodoroInterval');
  const shortBreakInput = document.getElementById('pomodoroShortBreak');
  const longBreakInput = document.getElementById('pomodoroLongBreak');
  const longBreakAfterInput = document.getElementById('pomodoroLongBreakAfter');
  const logCompletedStepsToggle = document.getElementById('logCompletedStepsToggle');
  const taskCreationModeRadios = document.querySelectorAll('input[name="taskCreationMode"]');
  const dailyCapacityInput = document.getElementById('dailyCapacityMinInput');
  setPomodoroSaveStatus('');
  setDailyCapacitySaveStatus('');

  if (intervalInput) intervalInput.value = globalPomodoroSettings.interval;
  if (shortBreakInput) shortBreakInput.value = globalPomodoroSettings.shortBreak;
  if (longBreakInput) longBreakInput.value = globalPomodoroSettings.longBreak;
  if (longBreakAfterInput) longBreakAfterInput.value = globalPomodoroSettings.longBreakAfter;
  if (logCompletedStepsToggle) {
    logCompletedStepsToggle.checked = settings.logCompletedSteps === true;
  }
  if (dailyCapacityInput) {
    dailyCapacityInput.value = normalizeDailyCapacityMin(settings.dailyCapacityMin);
  }
  taskCreationModeRadios.forEach(radio => {
    radio.checked = radio.value === (settings.taskCreationMode === 'fab' ? 'fab' : 'bottom');
  });
}

// Открытие модального окна настроек задач
async function openTaskSettingsModal() {
  const modal = document.getElementById('taskSettingsModal');
  if (!modal) return;
  
  // Загружаем текущую настройку
  const settings = await storage.getSettings();
  const currentMode = settings.taskDisplayMode || 'all';
  
  // Устанавливаем выбранный радиобаттон
  const radioButtons = modal.querySelectorAll('input[name="taskDisplayMode"]');
  radioButtons.forEach(radio => {
    if (radio.value === currentMode) {
      radio.checked = true;
    }
  });
  
  modal.style.display = 'block';
}

// Закрытие модального окна настроек задач
function closeTaskSettingsModal() {
  const modal = document.getElementById('taskSettingsModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Сохранение настроек задач
async function saveTaskSettings() {
  const modal = document.getElementById('taskSettingsModal');
  if (!modal) return;
  
  const selectedRadio = modal.querySelector('input[name="taskDisplayMode"]:checked');
  if (!selectedRadio) return;
  
  const selectedMode = selectedRadio.value;
  
  // Сохраняем настройку
  await storage.updateSettings({ taskDisplayMode: selectedMode });
  
  // Закрываем попап
  closeTaskSettingsModal();
  
  // Перерисовываем задачи с учетом новой настройки
  const tasksSection = document.getElementById('tasksSection');
  if (tasksSection && window.getComputedStyle(tasksSection).display !== 'none') {
    renderActiveTasks();
  }
}

// Сохранение глобальных настроек помодоро
async function saveGlobalPomodoroSettings() {
  const intervalInput = document.getElementById('pomodoroInterval');
  const shortBreakInput = document.getElementById('pomodoroShortBreak');
  const longBreakInput = document.getElementById('pomodoroLongBreak');
  const longBreakAfterInput = document.getElementById('pomodoroLongBreakAfter');
  const logCompletedStepsToggle = document.getElementById('logCompletedStepsToggle');
  const saveButton = document.getElementById('pomodoroSaveSettingsBtn');

  const interval = normalizePomodoroValue(intervalInput, 25);
  const shortBreak = normalizePomodoroValue(shortBreakInput, 5);
  const longBreak = normalizePomodoroValue(longBreakInput, 15);
  const longBreakAfter = normalizePomodoroValue(longBreakAfterInput, 4);

  const settings = {
    interval: interval.value,
    shortBreak: shortBreak.value,
    longBreak: longBreak.value,
    longBreakAfter: longBreakAfter.value
  };
  const hasAdjustedValues = [interval, shortBreak, longBreak, longBreakAfter].some(item => item.adjusted);

  if (saveButton) {
    saveButton.disabled = true;
  }

  try {
    const currentSettings = await storage.getSettings();
    await storage.updateSettings({
      ...currentSettings,
      globalPomodoroSettings: {
        ...currentSettings.globalPomodoroSettings,
        ...settings
      },
      logCompletedSteps: logCompletedStepsToggle ? logCompletedStepsToggle.checked : false
    });

    if (hasAdjustedValues) {
      setPomodoroSaveStatus('Сохранено. Часть значений автоматически приведена к допустимому диапазону.', 'warning');
      return;
    }
    setPomodoroSaveStatus('Настройки помодоро сохранены.', 'success');
  } catch (error) {
    logger.error('Не удалось сохранить настройки помодоро:', error);
    setPomodoroSaveStatus('Не удалось сохранить настройки. Попробуйте еще раз.', 'warning');
  } finally {
    if (saveButton) {
      saveButton.disabled = false;
    }
  }
}

async function saveLogCompletedStepsSetting(isEnabled) {
  const currentSettings = await storage.getSettings();
  await storage.updateSettings({
    ...currentSettings,
    logCompletedSteps: isEnabled === true
  });
}

function setDailyCapacitySaveStatus(message, type) {
  const statusElement = document.getElementById('dailyCapacitySaveStatus');
  if (!statusElement) return;
  statusElement.textContent = message || '';
  statusElement.classList.remove('is-success', 'is-warning');
  if (type === 'success' || type === 'warning') {
    statusElement.classList.add(`is-${type}`);
  }
  if (!message) return;
  setTimeout(() => {
    statusElement.textContent = '';
    statusElement.classList.remove('is-success', 'is-warning');
  }, 3000);
}

async function saveDailyCapacitySetting() {
  const input = document.getElementById('dailyCapacityMinInput');
  const saveButton = document.getElementById('dailyCapacitySaveBtn');
  if (!input) return;
  const normalized = normalizeDailyCapacityMin(input.value);
  const adjusted = Number(input.value) !== normalized;
  input.value = String(normalized);
  if (saveButton) saveButton.disabled = true;
  try {
    const currentSettings = await storage.getSettings();
    await storage.updateSettings({
      ...currentSettings,
      dailyCapacityMin: normalized
    });
    if (adjusted) {
      setDailyCapacitySaveStatus('Сохранено. Значение приведено к диапазону 60-960 минут.', 'warning');
      return;
    }
    setDailyCapacitySaveStatus('Дневной capacity сохранен.', 'success');
  } catch (error) {
    logger.error('Не удалось сохранить дневной capacity:', error);
    setDailyCapacitySaveStatus('Не удалось сохранить capacity. Попробуйте еще раз.', 'warning');
  } finally {
    if (saveButton) saveButton.disabled = false;
  }
}

function getDateStringWithOffset(daysOffset) {
  return window.dateUtils ? window.dateUtils.getDateStringWithOffset(daysOffset) : (function () {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + daysOffset);
    return getDateKey(date);
  })();
}

function setupDeadlineQuickButtons() {
  const buttons = document.querySelectorAll('.deadline-quick-btn[data-target="editDeadlineInput"]');
  if (!buttons.length) return;
  buttons.forEach(button => {
    button.addEventListener('click', async () => {
      const targetId = button.getAttribute('data-target');
      const offset = Number(button.getAttribute('data-offset') || 0);
      const input = document.getElementById(targetId);
      if (!input) return;
      const rawDeadline = getDateStringWithOffset(offset);
      if (offset !== 0 || !currentEditTaskId) {
        input.value = rawDeadline;
        return;
      }
      const currentSettings = await storage.getSettings();
      const baseTasks = currentTasks.filter((task) => task.id !== currentEditTaskId);
      const candidateTask = {
        ...(currentTasks.find((task) => task.id === currentEditTaskId) || {}),
        deadline: rawDeadline
      };
      const resolvedDeadline = await resolveTodayDeadlineWithCapacityGuard(candidateTask, baseTasks, currentSettings);
      input.value = resolvedDeadline || '';
    });
  });
}

// Переключение дополнительных полей
function toggleTaskOptions(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const taskOptions = document.getElementById('taskOptions');
  const toggleBtn = document.getElementById('toggleOptionsBtn');
  const taskInput = document.getElementById('taskInput');
  
  if (!taskOptions) {
    return;
  }
  
  const currentDisplay = window.getComputedStyle(taskOptions).display;
  const isHidden = currentDisplay === 'none';
  
  if (isHidden) {
    taskOptions.style.display = 'flex';
    if (toggleBtn) {
      toggleBtn.classList.add('active');
      toggleBtn.classList.add('visible');
    }
    // Возвращаем фокус на input, чтобы кнопка оставалась видимой
    if (taskInput) {
      taskInput.focus();
    }
  } else {
    taskOptions.style.display = 'none';
    if (toggleBtn) {
      toggleBtn.classList.remove('active');
      // Убираем класс visible только если input не в фокусе
      if (!taskInput || document.activeElement !== taskInput) {
        toggleBtn.classList.remove('visible');
      }
    }
  }
}

// Переключение бургер-меню
function toggleBurgerMenu(e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  const burgerMenu = document.getElementById('burgerMenu');
  const burgerMenuBtn = document.getElementById('burgerMenuBtn');
  const burgerMenuContent = document.querySelector('.burger-menu-content');
  const currentDisplay = window.getComputedStyle(burgerMenu).display;
  
  if (currentDisplay === 'none' || !currentDisplay) {
    burgerMenu.style.display = 'block';
    
    // Позиционируем меню рядом с кнопкой (справа от неё)
    if (burgerMenuBtn && burgerMenuContent) {
      const btnRect = burgerMenuBtn.getBoundingClientRect();
      const menuWidth = 280; // Ширина меню
      const menuLeft = btnRect.right + 5; // Позиция справа от кнопки с небольшим отступом
      const menuTop = btnRect.bottom + 5;
      
      // Проверяем, не выходит ли меню за правый край экрана
      const windowWidth = window.innerWidth;
      let finalLeft = menuLeft;
      if (menuLeft + menuWidth > windowWidth - 15) {
        // Если выходит, позиционируем слева от кнопки
        finalLeft = btnRect.left - menuWidth - 5;
        // Если и слева не помещается, позиционируем по правому краю с отступом
        if (finalLeft < 15) {
          finalLeft = windowWidth - menuWidth - 15;
        }
      }
      
      burgerMenuContent.style.left = `${finalLeft}px`;
      burgerMenuContent.style.top = `${menuTop}px`;
      burgerMenuContent.style.right = 'auto'; // Сбрасываем right, если был установлен
    }
  } else {
    burgerMenu.style.display = 'none';
  }
}

// Закрытие бургер-меню
function closeBurgerMenu(e) {
  if (e) {
    e.stopPropagation();
  }
  document.getElementById('burgerMenu').style.display = 'none';
}

function activateBurgerMenuItem(sectionName) {
  const menuItem = document.querySelector(`.burger-menu-item[data-section="${sectionName}"]`);
  if (menuItem) menuItem.classList.add('active');
}

// Переключение между разделами
function switchSection(sectionName, updateHash = true) {
  if (!availableSections.includes(sectionName)) {
    sectionName = 'tasks';
  }
  const prevSection = getCurrentSectionName();
  currentSectionName = sectionName;

  // Обновляем hash в URL (когда updateHash = true)
  if (updateHash) {
    window.location.hash = sectionName;
  }
  
  // Обновляем заголовок страницы
  updatePageTitle(sectionName);

  // Показываем шестеренку только на главной странице задач
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) {
    settingsBtn.style.display = sectionName === 'tasks' ? '' : 'none';
  }
  
  // Выход из режима ФЛОУ: снять класс и закрыть карточку без принудительного возврата в tasks
  if (isFlowSectionName(prevSection) && !isFlowSectionName(sectionName)) {
    document.body.classList.remove('flow-mode');
    document.body.classList.remove('flow-empty-mode');
    flowSessionOrderedIds = null;
    updateFlowModeUi();
    if (typeof window.closeTaskCard === 'function') {
      window.closeTaskCard({ goToTasksAfterClose: false });
    }
  }

  // Скрываем все разделы
  const tasksSection = document.getElementById('tasksSection');
  if (tasksSection) tasksSection.style.display = 'none';
  const completedSection = document.getElementById('completedSection');
  if (completedSection) completedSection.style.display = 'none';
  const settingsSection = document.getElementById('settingsSection');
  if (settingsSection) settingsSection.style.display = 'none';
  const prioritizationSection = document.getElementById('prioritizationSection');
  if (prioritizationSection) prioritizationSection.style.display = 'none';
  const flowSection = document.getElementById('flowSection');
  if (flowSection) flowSection.style.display = 'none';
  const movementSection = document.getElementById('movementSection');
  if (movementSection) movementSection.style.display = 'none';
  const triageSection = document.getElementById('triageSection');
  if (triageSection) triageSection.style.display = 'none';
  const microSlotsSection = document.getElementById('microSlotsSection');
  if (microSlotsSection) microSlotsSection.style.display = 'none';
  const waitingSection = document.getElementById('waitingSection');
  if (waitingSection) waitingSection.style.display = 'none';
  const backlogSection = document.getElementById('backlogSection');
  if (backlogSection) backlogSection.style.display = 'none';
  const ideasSection = document.getElementById('ideasSection');
  if (ideasSection) ideasSection.style.display = 'none';
  const staleSection = document.getElementById('staleSection');
  if (staleSection) staleSection.style.display = 'none';
  const cookbooksSection = document.getElementById('cookbooksSection');
  if (cookbooksSection) cookbooksSection.style.display = 'none';

  // Убираем активный класс у всех пунктов меню
  document.querySelectorAll('.burger-menu-item').forEach(item => {
    item.classList.remove('active');
  });

  // Показываем выбранный раздел
  switch(sectionName) {
    case 'tasks':
      if (tasksSection) tasksSection.style.display = 'block';
      const tasksMenuItem = document.querySelector('.burger-menu-item[data-section="tasks"]');
      if (tasksMenuItem) tasksMenuItem.classList.add('active');
      // Обновляем отображение задач при переключении на раздел
      renderActiveTasks();
      break;
    case 'completed':
      if (completedSection) completedSection.style.display = 'block';
      const completedMenuItem = document.querySelector('.burger-menu-item[data-section="completed"]');
      if (completedMenuItem) completedMenuItem.classList.add('active');
      // Загружаем выполненные задачи при открытии раздела
      renderCompletedTasks();
      break;
    case 'settings':
      if (settingsSection) {
        settingsSection.style.display = 'block';
        const settingsMenuItem = document.querySelector('.burger-menu-item[data-section="settings"]');
        if (settingsMenuItem) settingsMenuItem.classList.add('active');
        // Загружаем настройки
        loadSettingsSection();
      }
      break;
    case 'prioritization':
      if (prioritizationSection) {
        prioritizationSection.style.display = 'flex';
        startPrioritizationSession();
      }
      break;
    case 'flow':
      if (flowSection) {
        updateFlowModeUi();
        flowSection.style.display = 'flex';
        document.body.classList.add('flow-mode');
        const flowMenuItem = document.querySelector(`.burger-menu-item[data-section="${sectionName}"]`);
        if (flowMenuItem) flowMenuItem.classList.add('active');
        if (prevSection !== sectionName) {
          void enterFlowMode();
        }
      }
      break;
    case 'movement':
      if (movementSection) {
        movementSection.style.display = 'block';
        activateBurgerMenuItem('movement');
        renderMovementSection();
      }
      break;
    case 'triage':
      if (triageSection) {
        triageSection.style.display = 'block';
        activateBurgerMenuItem('triage');
        renderTriageSection();
      }
      break;
    case 'micro-slots':
      if (microSlotsSection) {
        microSlotsSection.style.display = 'block';
        activateBurgerMenuItem('micro-slots');
        renderMicroSlotsSection();
      }
      break;
    case 'waiting':
      if (waitingSection) {
        waitingSection.style.display = 'block';
        activateBurgerMenuItem('waiting');
        renderWaitingSection();
      }
      break;
    case 'backlog':
      if (backlogSection) {
        backlogSection.style.display = 'block';
        activateBurgerMenuItem('backlog');
        renderBacklogSection();
      }
      break;
    case 'ideas':
      if (ideasSection) {
        ideasSection.style.display = 'block';
        activateBurgerMenuItem('ideas');
        renderIdeasSection();
      }
      break;
    case 'stale':
      if (staleSection) {
        staleSection.style.display = 'block';
        activateBurgerMenuItem('stale');
        renderStaleSection();
      }
      break;
    case 'cookbooks':
      if (cookbooksSection) {
        cookbooksSection.style.display = 'block';
        activateBurgerMenuItem('cookbooks');
      }
      break;
  }
  applyTaskCreationMode(currentTaskCreationMode, sectionName);
}

async function enterFlowMode() {
  const flowEmptyState = document.getElementById('flowEmptyState');
  if (!flowEmptyState) return;
  hideFlowEmptyState();
  const ordered = typeof window.getFlowOrderedTasks === 'function' ? await window.getFlowOrderedTasks() : [];
  flowSessionOrderedIds = ordered.length > 0 ? ordered.map((t) => t.id) : null;
  if (ordered.length > 0 && typeof window.openTaskCard === 'function') {
    document.body.classList.remove('flow-empty-mode');
    await window.openTaskCard(ordered[0].id);
  } else {
    await showFlowEmptyState();
  }
}

async function refreshFlowSessionSnapshot() {
  if (typeof window.getFlowOrderedTasks !== 'function') {
    flowSessionOrderedIds = null;
    return;
  }
  const ordered = await window.getFlowOrderedTasks();
  flowSessionOrderedIds = ordered.length > 0 ? ordered.map((t) => t.id) : null;
}

function getFlowSessionOrderedIds() {
  return flowSessionOrderedIds;
}

function getCurrentSectionName() {
  if (currentSectionName) {
    return currentSectionName;
  }
  const sections = {
    tasks: document.getElementById('tasksSection'),
    completed: document.getElementById('completedSection'),
    settings: document.getElementById('settingsSection'),
    prioritization: document.getElementById('prioritizationSection'),
    flow: document.getElementById('flowSection'),
    movement: document.getElementById('movementSection'),
    triage: document.getElementById('triageSection'),
    'micro-slots': document.getElementById('microSlotsSection'),
    waiting: document.getElementById('waitingSection'),
    backlog: document.getElementById('backlogSection'),
    ideas: document.getElementById('ideasSection'),
    stale: document.getElementById('staleSection'),
    cookbooks: document.getElementById('cookbooksSection')
  };
  const visibleEntry = Object.entries(sections).find(([, element]) =>
    element && window.getComputedStyle(element).display !== 'none'
  );
  return visibleEntry ? visibleEntry[0] : 'tasks';
}

function applyTaskCreationMode(mode, sectionName = 'tasks') {
  const addTaskSection = document.querySelector('.add-task-section');
  const addTaskFab = document.getElementById('addTaskFab');
  if (!addTaskSection || !addTaskFab) return;

  const normalizedMode = mode === 'fab' ? 'fab' : 'bottom';
  currentTaskCreationMode = normalizedMode;
  document.body.classList.toggle('task-creation-mode-fab', normalizedMode === 'fab');

  if (sectionName !== 'tasks') {
    isFabInputOpen = false;
    document.body.classList.remove('fab-input-open');
    addTaskSection.style.display = 'none';
    addTaskFab.style.display = 'none';
    addTaskFab.classList.remove('active');
    return;
  }

  if (normalizedMode === 'bottom') {
    isFabInputOpen = false;
    document.body.classList.remove('fab-input-open');
    addTaskSection.style.display = 'block';
    addTaskFab.style.display = 'none';
    addTaskFab.classList.remove('active');
    return;
  }

  addTaskFab.style.display = isFabInputOpen ? 'none' : 'flex';
  addTaskSection.style.display = isFabInputOpen ? 'block' : 'none';
  addTaskFab.classList.toggle('active', isFabInputOpen);
  document.body.classList.toggle('fab-input-open', isFabInputOpen);
}

function toggleFabTaskInput(forceState) {
  if (currentTaskCreationMode !== 'fab') return;
  const sectionName = getCurrentSectionName();
  if (sectionName !== 'tasks') return;

  const addTaskSection = document.querySelector('.add-task-section');
  const addTaskFab = document.getElementById('addTaskFab');
  const taskInput = document.getElementById('taskInput');
  if (!addTaskSection || !addTaskFab) return;

  const nextState = typeof forceState === 'boolean' ? forceState : !isFabInputOpen;
  isFabInputOpen = nextState;
  addTaskSection.style.display = nextState ? 'block' : 'none';
  addTaskFab.style.display = nextState ? 'none' : 'flex';
  addTaskFab.classList.toggle('active', nextState);
  document.body.classList.toggle('fab-input-open', nextState);

  if (nextState && taskInput) {
    taskInput.focus();
  }
}

// Обновление заголовка страницы (текст рядом с кнопкой ФЛОУ)
function updatePageTitle(sectionName) {
  const headerTitle = document.getElementById('headerTitle');
  if (!headerTitle) return;
  
  const titles = {
    'tasks': 'Задачи',
    'completed': 'Выполненные задачи',
    'settings': 'Настройки',
    'prioritization': 'Что важнее',
    'flow': 'ФЛОУ',
    'movement': 'Движение',
    'triage': 'Триаж',
    'micro-slots': 'Малые слоты',
    'waiting': 'Жду',
    'backlog': 'Бэклог',
    'ideas': 'Идеи',
    'stale': 'Залежалось',
    'cookbooks': 'Cookbooks'
  };
  
  headerTitle.textContent = sectionName === 'tasks' || sectionName === 'cookbooks' ? '' : (titles[sectionName] || '');
}

// Рендеринг активных задач
async function renderActiveTasks() {
  const todayTasksList = document.getElementById('todayTasksList');
  const otherTasksList = document.getElementById('otherTasksList');
  const todayTasksSection = document.getElementById('todayTasksSection');
  const otherTasksSection = document.getElementById('otherTasksSection');
  const noDateTasksList = document.getElementById('noDateTasksList');
  const noDateTasksSection = document.getElementById('noDateTasksSection');
  
  // Получаем элементы для всех разделов
  const overdueTasksList = document.getElementById('overdueTasksList');
  const overdueTasksSection = document.getElementById('overdueTasksSection');
  const hasOverdueSection = !!(overdueTasksList && overdueTasksSection);
  
  // Проверяем, что базовые элементы существуют
  if (!todayTasksList || !otherTasksList || !todayTasksSection || !otherTasksSection) {
    logger.error('Не найдены элементы для отображения задач:', {
      todayTasksList: !!todayTasksList,
      otherTasksList: !!otherTasksList,
      todayTasksSection: !!todayTasksSection,
      otherTasksSection: !!otherTasksSection,
      noDateTasksList: !!noDateTasksList,
      noDateTasksSection: !!noDateTasksSection,
      overdueTasksList: !!overdueTasksList,
      overdueTasksSection: !!overdueTasksSection
    });
    return;
  }
  
  // Загружаем настройку отображения задач
  const settings = await storage.getSettings();
  const taskDisplayMode = settings.taskDisplayMode || 'all';
  
  // Фильтруем только активные задачи production-очереди.
  let filtered = currentTasks.filter(task => isTaskExecutionActive(task));
  
  logger.debug('renderActiveTasks:', {
    totalTasks: currentTasks.length,
    activeTasks: filtered.length,
    taskDisplayMode
  });

  renderTasksCommandCenter();

  if (filtered.length === 0) {
    updateEmptyState(true);
    if (todayTasksList) todayTasksList.innerHTML = '';
    if (otherTasksList) otherTasksList.innerHTML = '';
    if (noDateTasksList) noDateTasksList.innerHTML = '';
    if (hasOverdueSection) overdueTasksList.innerHTML = '';
    if (todayTasksSection) todayTasksSection.style.display = 'none';
    if (otherTasksSection) otherTasksSection.style.display = 'none';
    if (noDateTasksSection) noDateTasksSection.style.display = 'none';
    if (hasOverdueSection) overdueTasksSection.style.display = 'none';
    return;
  }

  updateEmptyState(false);

  // Разделяем задачи на "Просрочено", "Сегодня" и "Позже"
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = getDateKey(today);
  
  // Задачи на сегодня - только те, у которых дедлайн точно сегодня
  // Сначала определяем задачи на сегодня, чтобы исключить их из просроченных
  const todayTasks = filtered.filter(task => {
    if (!task.deadline) return false;
    const deadlineDate = parseDeadlineDate(task.deadline);
    if (!deadlineDate || Number.isNaN(deadlineDate.getTime())) return false;
    deadlineDate.setHours(0, 0, 0, 0);
    return getDateKey(deadlineDate) === todayStr;
  });
  
  // Создаем Set с ID задач на сегодня для исключения из просроченных
  const todayTaskIds = new Set(todayTasks.map(t => t.id));
  
  // Просроченные задачи - те, у которых дедлайн прошел (раньше сегодня), но НЕ сегодня
  const overdueTasks = filtered.filter(task => {
    if (!task.deadline) return false;
    // Исключаем задачи на сегодня
    if (todayTaskIds.has(task.id)) return false;
    const deadlineDate = parseDeadlineDate(task.deadline);
    if (!deadlineDate || Number.isNaN(deadlineDate.getTime())) return false;
    deadlineDate.setHours(0, 0, 0, 0);
    return deadlineDate < today;
  });
  
  // Создаем Set с ID задач из "Просрочено" и "Сегодня" для исключения из "Позже"
  const overdueAndTodayTaskIds = new Set([
    ...overdueTasks.map(t => t.id),
    ...todayTasks.map(t => t.id)
  ]);
  
  // Задачи "Позже" - все задачи с дедлайном в будущем
  const laterTasks = filtered.filter(task =>
    task.deadline && !overdueAndTodayTaskIds.has(task.id)
  );
  const noDateTasks = filtered.filter(task => !task.deadline);

  // Сортировка задач
  const sortedOverdueTasks = sortTasks(overdueTasks);
  const sortedTodayTasks = sortTasks(todayTasks);
  const sortedLaterTasks = sortTasks(laterTasks);
  const sortedNoDateTasks = sortTasks(noDateTasks);

  // Применяем фильтр по настройке taskDisplayMode
  if (taskDisplayMode === 'today') {
    // Показываем только задачи на сегодня (скрываем просроченные и "Позже")
    if (sortedTodayTasks.length > 0) {
      todayTasksSection.style.display = 'block';
      renderTasksToContainer(todayTasksList, sortedTodayTasks);
    } else {
      todayTasksSection.style.display = 'none';
      todayTasksList.innerHTML = '';
      updateEmptyState(true);
    }
    // Скрываем секции "Просрочено" и "Позже"
    if (hasOverdueSection) {
      overdueTasksSection.style.display = 'none';
      overdueTasksList.innerHTML = '';
    }
    otherTasksSection.style.display = 'none';
    otherTasksList.innerHTML = '';
    if (noDateTasksSection) {
      noDateTasksSection.style.display = 'none';
      if (noDateTasksList) noDateTasksList.innerHTML = '';
    }
  } else {
    // Показываем все задачи (режим "all")
    // Рендерим просроченные задачи (если есть)
    if (hasOverdueSection) {
      if (sortedOverdueTasks.length > 0) {
        overdueTasksSection.style.display = 'block';
        renderTasksToContainer(overdueTasksList, sortedOverdueTasks, { section: 'overdue' });
      } else {
        overdueTasksSection.style.display = 'none';
        overdueTasksList.innerHTML = '';
      }
      updateOverdueSectionHeader(sortedOverdueTasks.length);
    }
    
    // Рендерим задачи на сегодня
    const todayTasksToRender = hasOverdueSection
      ? sortedTodayTasks
      : sortTasks([...sortedOverdueTasks, ...sortedTodayTasks]);

    if (todayTasksToRender.length > 0) {
      todayTasksSection.style.display = 'block';
      renderTasksToContainer(todayTasksList, todayTasksToRender, { section: 'today' });
    } else {
      todayTasksSection.style.display = 'none';
      todayTasksList.innerHTML = '';
    }

    // Рендерим задачи "Позже"
    if (sortedLaterTasks.length > 0) {
      otherTasksSection.style.display = 'block';
      renderTasksToContainer(otherTasksList, sortedLaterTasks, { section: 'later' });
      updateLaterTasksSectionState();
    } else {
      otherTasksSection.style.display = 'none';
      otherTasksList.innerHTML = '';
    }

    if (noDateTasksSection && noDateTasksList) {
      if (sortedNoDateTasks.length > 0) {
        noDateTasksSection.style.display = 'block';
        renderTasksToContainer(noDateTasksList, sortedNoDateTasks, { section: 'later' });
        updateNoDateSectionState();
      } else {
        noDateTasksSection.style.display = 'none';
        noDateTasksList.innerHTML = '';
      }
    }
  }
  
  logger.debug('Задачи отрендерены:', {
    overdueTasks: sortedOverdueTasks.length,
    todayTasks: sortedTodayTasks.length,
    laterTasks: sortedLaterTasks.length,
    totalFiltered: filtered.length,
    displayMode: taskDisplayMode
  });
}

function isTaskRunnableFromTasksPage(task) {
  if (!isTaskExecutionActive(task)) return false;
  if (Math.floor(Number(task.flowSkipCount) || 0) >= 2) return false;
  if (hasOpenNextAction(task)) return true;
  return isRecurringRoutineTask(task);
}

function getMicroSlotTasksForCommandCenter() {
  return currentTasks
    .filter(task => isTaskExecutionActive(task))
    .filter(task => {
      const action = getPrimaryNextAction(task);
      if (!action) return false;
      return [5, 15].includes(normalizeNextStepSizeForUi(action.size));
    });
}

function getUnrankedPriorityCount() {
  const priorityPool = currentTasks.filter(task =>
    task && task.completed !== true && normalizeTaskStatus(task.status) === 'ready' && !isTaskBacklogLike(task)
  );
  return priorityPool.filter(task => !Number.isFinite(task.priorityRank)).length;
}

function createTasksCommandButton(item) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `tasks-command-btn ${item.primary ? 'primary' : ''}`.trim();
  button.disabled = item.disabled === true;
  button.addEventListener('click', () => {
    if (item.disabled) return;
    if (item.section) {
      switchSection(item.section);
    } else if (typeof item.onClick === 'function') {
      item.onClick();
    }
  });

  const label = document.createElement('span');
  label.className = 'tasks-command-label';
  label.textContent = item.label;
  button.appendChild(label);

  const count = document.createElement('span');
  count.className = 'tasks-command-count';
  count.textContent = String(item.count);
  button.appendChild(count);

  const meta = document.createElement('span');
  meta.className = 'tasks-command-meta';
  meta.textContent = item.meta;
  button.appendChild(meta);

  return button;
}

function renderTasksCommandCenter() {
  const root = document.getElementById('tasksCommandCenter');
  if (!root) return;
  const runnableCount = currentTasks.filter(isTaskRunnableFromTasksPage).length;
  const movementCount = getMovementItems().length;
  const microCount = getMicroSlotTasksForCommandCenter().length;
  const todayKey = getTodayKey();
  const waitingDueCount = currentTasks.filter(task =>
    !task.completed &&
    isTaskInWorkflowStatus(task, 'waiting') &&
    task.waitingUntil &&
    task.waitingUntil <= todayKey
  ).length;
  const unrankedCount = getUnrankedPriorityCount();

  const items = [
    { label: 'Делать', count: runnableCount, meta: 'ФЛОУ', section: 'flow', primary: true, disabled: runnableCount === 0 },
    { label: 'Разобрать', count: movementCount, meta: 'Движение', section: 'movement', disabled: movementCount === 0 },
    { label: 'Короткие', count: microCount, meta: '5-15м', section: 'micro-slots', disabled: microCount === 0 },
    { label: 'Жду', count: waitingDueCount, meta: 'проверить', section: 'waiting', disabled: waitingDueCount === 0 }
  ];
  if (unrankedCount > 0) {
    items.push({ label: 'Что важнее', count: unrankedCount, meta: 'приоритет', section: 'prioritization' });
  }

  root.innerHTML = '';
  items.forEach(item => root.appendChild(createTasksCommandButton(item)));
}

function renderCurrentWorkflowSection() {
  const sectionName = getCurrentSectionName();
  switch (sectionName) {
    case 'movement':
      renderMovementSection();
      break;
    case 'triage':
      renderTriageSection();
      break;
    case 'micro-slots':
      renderMicroSlotsSection();
      break;
    case 'waiting':
      renderWaitingSection();
      break;
    case 'backlog':
      renderBacklogSection();
      break;
    case 'ideas':
      renderIdeasSection();
      break;
    case 'stale':
      renderStaleSection();
      break;
  }
}

function setWorkflowStats(elementId, parts) {
  const element = document.getElementById(elementId);
  if (!element) return;
  element.innerHTML = '';
  (parts || []).filter(Boolean).forEach(part => {
    const chip = document.createElement('span');
    chip.className = 'workflow-stat-chip';
    chip.textContent = part;
    element.appendChild(chip);
  });
}

function setWorkflowListState(listId, emptyId, tasks, mode) {
  const list = document.getElementById(listId);
  const emptyState = document.getElementById(emptyId);
  if (!list) return;
  list.innerHTML = '';
  if (!tasks.length) {
    list.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }
  list.style.display = 'grid';
  if (emptyState) emptyState.style.display = 'none';
  tasks.forEach(task => {
    list.appendChild(mode === 'micro' ? createMicroSlotTaskCard(task) : createWorkflowTaskCard(task, mode));
  });
}

const MOVEMENT_REASON_META = {
  waiting_due: {
    label: 'проверить ожидание',
    severity: 'danger',
    action: 'Верни в активные, если ход снова у тебя, или продли ожидание с новой заметкой.'
  },
  deadline_blocked: {
    label: 'дедлайн, но не готово',
    severity: 'danger',
    action: 'Сначала сформулируй ближайший шаг, иначе ФЛОУ снова упрётся в мутную карточку.'
  },
  draft: {
    label: 'черновик',
    severity: 'warning',
    action: 'Доведи карточку до готовности: приоритет, оценка, результат и ближайший шаг.'
  },
  missing_next_action: {
    label: 'нет следующего шага',
    severity: 'warning',
    action: 'Добавь физически выполнимое действие на 5-60 минут или пометь задачу как рутину.'
  },
  no_estimate: {
    label: 'нет оценки',
    severity: 'warning',
    action: 'Поставь хотя бы грубую оценку, чтобы задача начала участвовать в capacity и подборе слота.'
  },
  too_large: {
    label: 'слишком крупно',
    severity: 'warning',
    action: 'Разрежь до первого шага на 30-60 минут, а общий объём оставь в оценке или диапазоне.'
  },
  skipped: {
    label: 'пролистано',
    severity: 'warning',
    action: 'Если карточка неприятная или мутная, измени следующий шаг вместо очередного пропуска.'
  },
  stale: {
    label: 'давно без движения',
    severity: 'neutral',
    action: 'Реши судьбу: сделать сейчас, описать следующий шаг, отправить в бэклог или убить.'
  }
};

const MOVEMENT_REASON_SORT = {
  waiting_due: 0,
  deadline_blocked: 1,
  draft: 2,
  missing_next_action: 3,
  no_estimate: 4,
  too_large: 5,
  skipped: 6,
  stale: 7
};

function getTaskDeadlineKey(task) {
  return task?.deadline ? String(task.deadline).split('T')[0] : null;
}

function isTaskDueOrOverdue(task, todayKey) {
  const deadlineKey = getTaskDeadlineKey(task);
  return !!deadlineKey && !!todayKey && deadlineKey <= todayKey;
}

function isTaskTooLargeForMovement(task) {
  const mode = normalizeEstimateModeForBadge(task?.estimateMode);
  const estimate = resolveTaskEstimateMinutes(task);
  const range = task?.timeEstimateMinRange && typeof task.timeEstimateMinRange === 'object'
    ? task.timeEstimateMinRange
    : null;
  const max = Number(range?.max);
  return mode === 'epic'
    || (Number.isFinite(estimate) && estimate >= 120)
    || (Number.isFinite(max) && max > 120);
}

function taskNeedsEstimateForMovement(task) {
  if (isRecurringRoutineTask(task)) return false;
  const mode = normalizeEstimateModeForBadge(task?.estimateMode);
  if (mode !== 'none') return false;
  return !hasOpenNextAction(task) || isTaskTooLargeForMovement(task);
}

function getMovementReasonKeys(task, todayKey) {
  if (!task || task.completed) return [];
  const workflowStatus = normalizeWorkflowStatusForUi(task.workflowStatus);
  if (workflowStatus === 'waiting') {
    return task.waitingUntil && task.waitingUntil <= todayKey ? ['waiting_due'] : [];
  }
  if (workflowStatus !== 'active') return [];

  const reasons = [];
  const due = isTaskDueOrOverdue(task, todayKey);
  const isDraft = normalizeTaskStatus(task.status) === 'draft';
  const missingNextAction = taskRequiresNextAction(task) && !hasOpenNextAction(task);
  const tooLarge = isTaskTooLargeForMovement(task);
  const skipped = Math.floor(Number(task.flowSkipCount) || 0) >= 2;

  if (isDraft) reasons.push('draft');
  if (missingNextAction) reasons.push('missing_next_action');
  if (taskNeedsEstimateForMovement(task)) reasons.push('no_estimate');
  if (tooLarge) reasons.push('too_large');
  if (skipped) reasons.push('skipped');

  const hasBlocker = reasons.length > 0;
  const staleWithBlocker = getTaskStalenessDays(task) >= 14 && hasBlocker;
  const deadlineBlocked = due && hasBlocker;
  if (staleWithBlocker) {
    reasons.push('stale');
  }
  if (deadlineBlocked) {
    reasons.unshift('deadline_blocked');
  }

  if (!deadlineBlocked && !staleWithBlocker && !skipped) {
    return [];
  }

  return [...new Set(reasons)];
}

function createMovementItem(task, todayKey) {
  const reasons = getMovementReasonKeys(task, todayKey);
  if (!reasons.length) return null;
  const primaryReason = [...reasons].sort((a, b) => MOVEMENT_REASON_SORT[a] - MOVEMENT_REASON_SORT[b])[0];
  const dueBonus = isTaskDueOrOverdue(task, todayKey) ? -2 : 0;
  const priorityBonus = normalizePriority(task.priority) === 'high' ? -1 : 0;
  const sortScore = (MOVEMENT_REASON_SORT[primaryReason] ?? 99) + dueBonus + priorityBonus;
  return {
    task,
    reasons,
    primaryReason,
    severity: MOVEMENT_REASON_META[primaryReason]?.severity || 'neutral',
    sortScore
  };
}

function getMovementItems() {
  const todayKey = getTodayKey();
  return currentTasks
    .map((task) => createMovementItem(task, todayKey))
    .filter(Boolean)
    .sort((a, b) => {
      if (a.sortScore !== b.sortScore) return a.sortScore - b.sortScore;
      const deadlineA = getTaskDeadlineKey(a.task) || '9999-12-31';
      const deadlineB = getTaskDeadlineKey(b.task) || '9999-12-31';
      if (deadlineA !== deadlineB) return deadlineA.localeCompare(deadlineB);
      return (Number(a.task.updatedAt) || 0) - (Number(b.task.updatedAt) || 0);
    });
}

function resolveMovementActiveIndex(items) {
  if (!items.length) {
    movementActiveTaskId = null;
    movementActiveIndex = 0;
    return -1;
  }
  const activeIndex = items.findIndex(item => item.task.id === movementActiveTaskId);
  if (activeIndex >= 0) {
    movementActiveIndex = activeIndex;
    return activeIndex;
  }
  const fallbackIndex = Math.max(0, Math.min(items.length - 1, Math.floor(Number(movementActiveIndex) || 0)));
  movementActiveTaskId = items[fallbackIndex].task.id;
  movementActiveIndex = fallbackIndex;
  return fallbackIndex;
}

function moveMovementCursor(delta) {
  const items = getMovementItems();
  if (!items.length) return;
  const currentIndex = resolveMovementActiveIndex(items);
  const nextIndex = Math.max(0, Math.min(items.length - 1, currentIndex + delta));
  movementActiveTaskId = items[nextIndex].task.id;
  movementActiveIndex = nextIndex;
  renderMovementSection();
}

function createMovementReviewNav(items, activeIndex) {
  const nav = document.createElement('div');
  nav.className = 'movement-review-nav';

  const progress = document.createElement('div');
  progress.className = 'movement-review-progress';
  progress.textContent = `${activeIndex + 1} из ${items.length}`;
  nav.appendChild(progress);

  const controls = document.createElement('div');
  controls.className = 'movement-review-controls';

  const prevButton = createWorkflowButton('Назад', 'secondary', () => moveMovementCursor(-1));
  prevButton.disabled = activeIndex <= 0;
  controls.appendChild(prevButton);

  const nextButton = createWorkflowButton('Дальше', 'primary', () => moveMovementCursor(1));
  nextButton.disabled = activeIndex >= items.length - 1;
  controls.appendChild(nextButton);

  nav.appendChild(controls);
  return nav;
}

function createMovementReviewShell(items, activeIndex) {
  const shell = document.createElement('div');
  shell.className = 'movement-review-shell';
  shell.appendChild(createMovementReviewNav(items, activeIndex));
  shell.appendChild(createMovementTaskCard(items[activeIndex]));
  return shell;
}

function renderMovementSection() {
  const items = getMovementItems();
  const waitingDue = items.filter(item => item.reasons.includes('waiting_due')).length;
  const blockedDue = items.filter(item => item.reasons.includes('deadline_blocked')).length;
  const missing = items.filter(item => item.reasons.includes('missing_next_action')).length;
  setWorkflowStats('movementStats', [
    `в движении ${items.length}`,
    waitingDue ? `проверить ${waitingDue}` : null,
    blockedDue ? `дедлайн заблокирован ${blockedDue}` : null,
    missing ? `описать ${missing}` : null
  ]);

  const list = document.getElementById('movementList');
  const emptyState = document.getElementById('movementEmptyState');
  if (!list) return;
  list.innerHTML = '';
  if (!items.length) {
    list.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }
  const activeIndex = resolveMovementActiveIndex(items);
  list.style.display = 'block';
  if (emptyState) emptyState.style.display = 'none';
  list.appendChild(createMovementReviewShell(items, activeIndex));
}

function createMovementTaskCard(item) {
  const task = item.task;
  const card = document.createElement('div');
  card.className = `workflow-card movement-card movement-card-${item.severity}`;
  card.setAttribute('data-task-id', task.id);

  const header = document.createElement('div');
  header.className = 'workflow-card-header';
  const title = document.createElement('button');
  title.type = 'button';
  title.className = 'workflow-card-title';
  appendTaskTitleWithRecurringMarker(title, task);
  title.addEventListener('click', () => openWorkflowTask(task.id));
  header.appendChild(title);
  card.appendChild(header);

  card.appendChild(createMovementMainActionBlock(task, item));

  const meta = document.createElement('div');
  meta.className = 'workflow-card-meta movement-card-meta';
  if (task.category) meta.appendChild(createWorkflowChip(task.category));
  const workflowStatus = normalizeWorkflowStatusForUi(task.workflowStatus);
  if (workflowStatus !== 'active') {
    meta.appendChild(createWorkflowChip(getWorkflowStatusLabel(task.workflowStatus), `status-${workflowStatus}`));
  }
  if (normalizeTaskStatus(task.status) === 'draft') meta.appendChild(createWorkflowChip('Черновик', 'status-draft'));
  if (task.deadline) meta.appendChild(createWorkflowChip(formatDeadline(task.deadline), getDeadlineClass(task.deadline)));
  if (isRecurringRoutineTask(task)) meta.appendChild(createWorkflowChip('Рутина', 'kind'));
  item.reasons.forEach(reason => {
    meta.appendChild(createWorkflowChip(MOVEMENT_REASON_META[reason]?.label || reason, `movement-${MOVEMENT_REASON_META[reason]?.severity || 'neutral'}`));
  });
  if (meta.children.length > 0) {
    card.appendChild(meta);
  }

  if (item.reasons.includes('waiting_due')) {
    const waitingMeta = document.createElement('div');
    waitingMeta.className = 'workflow-waiting-meta';
    const parts = [];
    if (task.waitingFor) parts.push(`Жду: ${task.waitingFor}`);
    if (task.waitingUntil) parts.push(`До: ${formatDeadline(task.waitingUntil) || task.waitingUntil}`);
    if (task.waitingNote) parts.push(task.waitingNote);
    waitingMeta.textContent = parts.join(' · ') || 'Ожидание без деталей';
    card.appendChild(waitingMeta);
    card.appendChild(createWaitingActionRow(task));
  } else if (item.reasons.includes('missing_next_action') || item.reasons.includes('draft') || item.reasons.includes('too_large')) {
    card.appendChild(createQuickNextActionRow(task, { requireMetadata: true }));
  }

  card.appendChild(createMovementActionBar(task, item));
  return card;
}

function createMovementMainActionBlock(task, item) {
  const action = getPrimaryNextAction(task);
  const main = document.createElement('div');
  main.className = `movement-main-action movement-main-action-${item.severity}`;

  const label = document.createElement('div');
  label.className = 'movement-main-label';
  label.textContent = item.reasons.includes('waiting_due') ? 'Проверка ожидания' : 'Что сделать сейчас';
  main.appendChild(label);

  const mainText = document.createElement('div');
  mainText.className = 'movement-main-text';
  mainText.textContent = MOVEMENT_REASON_META[item.primaryReason]?.action || 'Реши ближайшее действие по задаче.';
  main.appendChild(mainText);

  if (action || isRecurringRoutineTask(task)) {
    const currentStep = document.createElement('div');
    currentStep.className = 'movement-current-step';

    const currentLabel = document.createElement('span');
    currentLabel.className = 'movement-current-step-label';
    currentLabel.textContent = action ? 'Текущий шаг' : 'Рутина';
    currentStep.appendChild(currentLabel);

    const currentText = document.createElement('span');
    currentText.className = 'movement-current-step-text';
    currentText.textContent = action ? action.text : 'Повторить рутинное действие';
    currentStep.appendChild(currentText);

    const currentMeta = document.createElement('span');
    currentMeta.className = 'movement-current-step-meta';
    if (action) {
      currentMeta.appendChild(createWorkflowChip(formatNextStepSize(action.size), 'size'));
      currentMeta.appendChild(createWorkflowChip(NEXT_STEP_KIND_LABELS[normalizeNextStepKindForUi(action.kind)], 'kind'));
    } else {
      currentMeta.appendChild(createWorkflowChip(`${ROUTINE_DEFAULT_ESTIMATE_MIN}м`, 'size'));
    }
    currentStep.appendChild(currentMeta);
    main.appendChild(currentStep);
  }

  return main;
}

function createMovementActionBar(task, item) {
  const bar = document.createElement('div');
  bar.className = 'workflow-action-bar';
  if (item.reasons.includes('waiting_due')) {
    bar.appendChild(createWorkflowButton('Вернуть в активные', 'primary', () => setTaskWorkflowState(task.id, 'active', { resetSkip: true }), {
      help: 'Снимет ожидание и вернёт задачу в активные. Если карточка готова, она снова появится в задачах и ФЛОУ.'
    }));
    bar.appendChild(createWorkflowButton('Бэклог', 'secondary', () => setTaskWorkflowState(task.id, 'backlog', {}), {
      help: 'Уберёт задачу из активной работы в «Бэклог». Во ФЛОУ она не попадёт, пока ты её не активируешь.'
    }));
    return bar;
  }
  if (item.reasons.includes('missing_next_action') && task.isRecurringParticipation !== true) {
    bar.appendChild(createWorkflowButton('Это рутина', 'secondary', () => markWorkflowTaskRecurring(task.id, 'routine'), {
      help: 'Пометит задачу как регулярную рутину. Ей не нужен отдельный следующий шаг, она сможет попадать во ФЛОУ как действие.'
    }));
  }
  bar.appendChild(createWorkflowButton('Бэклог', 'secondary', () => setTaskWorkflowState(task.id, 'backlog', {}), {
    help: 'Уберёт задачу из активной работы в «Бэклог». Во ФЛОУ она не попадёт, пока ты её не активируешь.'
  }));
  bar.appendChild(createWorkflowButton('Идея', 'secondary', () => setTaskWorkflowState(task.id, 'idea', {}), {
    help: 'Перенесёт задачу в «Идеи». Это место для возможных задумок, не для текущего плана и не для ФЛОУ.'
  }));
  bar.appendChild(createWorkflowButton('Жду', 'secondary', () => setTaskWorkflowState(task.id, 'waiting', {}), {
    help: 'Перенесёт задачу в «Жду». Она уйдёт из активных списков и вернётся к тебе через раздел ожидания.'
  }));
  return bar;
}

function getTriageReasonLabels(task) {
  const reasons = [];
  if (normalizeTaskStatus(task.status) === 'draft') reasons.push('черновик');
  if (taskRequiresNextAction(task) && !hasOpenNextAction(task)) reasons.push('нет следующего шага');
  if (taskNeedsEstimateForMovement(task)) reasons.push('нет оценки');
  if (isTaskTooLargeForMovement(task)) reasons.push('слишком крупно');
  return reasons;
}

function getTriageCandidates() {
  const todayKey = getTodayKey();
  const candidates = currentTasks.filter(task => {
    if (!task || task.completed) return false;
    if (!isTaskInWorkflowStatus(task, 'active')) return false;
    if (createMovementItem(task, todayKey)) return false;
    return getTriageReasonLabels(task).length > 0;
  });
  return [...candidates].sort((a, b) => {
    const scoreA = getTriageReasonLabels(a).length;
    const scoreB = getTriageReasonLabels(b).length;
    if (scoreA !== scoreB) return scoreB - scoreA;
    return (Number(a.updatedAt) || 0) - (Number(b.updatedAt) || 0);
  });
}

function resolveTriageActiveIndex(tasks) {
  if (!tasks.length) {
    triageActiveTaskId = null;
    triageActiveIndex = 0;
    return -1;
  }
  const activeIndex = tasks.findIndex(task => task.id === triageActiveTaskId);
  if (activeIndex >= 0) {
    triageActiveIndex = activeIndex;
    return activeIndex;
  }
  const fallbackIndex = Math.max(0, Math.min(tasks.length - 1, Math.floor(Number(triageActiveIndex) || 0)));
  triageActiveTaskId = tasks[fallbackIndex].id;
  triageActiveIndex = fallbackIndex;
  return fallbackIndex;
}

function moveTriageCursor(delta) {
  const tasks = getTriageCandidates();
  if (!tasks.length) return;
  const currentIndex = resolveTriageActiveIndex(tasks);
  const nextIndex = Math.max(0, Math.min(tasks.length - 1, currentIndex + delta));
  triageActiveTaskId = tasks[nextIndex].id;
  triageActiveIndex = nextIndex;
  renderTriageSection();
}

function createTriageReviewNav(tasks, activeIndex) {
  const nav = document.createElement('div');
  nav.className = 'movement-review-nav triage-review-nav';

  const progress = document.createElement('div');
  progress.className = 'movement-review-progress triage-review-progress';
  progress.textContent = `${activeIndex + 1} из ${tasks.length}`;
  nav.appendChild(progress);

  const controls = document.createElement('div');
  controls.className = 'movement-review-controls triage-review-controls';

  const prevButton = createWorkflowButton('Назад', 'secondary', () => moveTriageCursor(-1));
  prevButton.disabled = activeIndex <= 0;
  controls.appendChild(prevButton);

  const nextButton = createWorkflowButton('Дальше', 'primary', () => moveTriageCursor(1));
  nextButton.disabled = activeIndex >= tasks.length - 1;
  controls.appendChild(nextButton);

  nav.appendChild(controls);
  return nav;
}

function createTriageReviewShell(tasks, activeIndex) {
  const shell = document.createElement('div');
  shell.className = 'movement-review-shell triage-review-shell';
  shell.appendChild(createTriageReviewNav(tasks, activeIndex));
  shell.appendChild(createWorkflowTaskCard(tasks[activeIndex], 'triage'));
  return shell;
}

function renderTriageSection() {
  const candidates = getTriageCandidates();
  const draftCount = candidates.filter(task => normalizeTaskStatus(task.status) === 'draft').length;
  const missingNextActionCount = candidates.filter(task => taskRequiresNextAction(task) && !hasOpenNextAction(task)).length;
  const noEstimateCount = candidates.filter(task => taskNeedsEstimateForMovement(task)).length;
  const tooLargeCount = candidates.filter(task => isTaskTooLargeForMovement(task)).length;
  const waitingCount = currentTasks.filter(task => !task.completed && isTaskInWorkflowStatus(task, 'waiting')).length;
  const backlogCount = currentTasks.filter(task => !task.completed && isTaskInWorkflowStatus(task, 'backlog')).length;
  const ideasCount = currentTasks.filter(task => !task.completed && isTaskInWorkflowStatus(task, 'idea')).length;
  setWorkflowStats('triageStats', [
    `подготовить ${candidates.length}`,
    draftCount ? `черновик ${draftCount}` : null,
    missingNextActionCount ? `без шага ${missingNextActionCount}` : null,
    noEstimateCount ? `без оценки ${noEstimateCount}` : null,
    tooLargeCount ? `крупные ${tooLargeCount}` : null,
    waitingCount ? `жду ${waitingCount}` : null,
    backlogCount ? `бэклог ${backlogCount}` : null,
    ideasCount ? `идеи ${ideasCount}` : null
  ]);

  const list = document.getElementById('triageList');
  const emptyState = document.getElementById('triageEmptyState');
  if (!list) return;
  list.innerHTML = '';
  if (!candidates.length) {
    list.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }
  const activeIndex = resolveTriageActiveIndex(candidates);
  list.style.display = 'block';
  if (emptyState) emptyState.style.display = 'none';
  list.appendChild(createTriageReviewShell(candidates, activeIndex));
}

function renderMicroSlotsSection() {
  const tasks = currentTasks
    .filter(task => isTaskExecutionActive(task))
    .map(task => ({ task, action: getPrimaryNextAction(task) }))
    .filter(item => item.action && [5, 15].includes(normalizeNextStepSizeForUi(item.action.size)))
    .sort((a, b) => {
      const sizeA = normalizeNextStepSizeForUi(a.action.size);
      const sizeB = normalizeNextStepSizeForUi(b.action.size);
      if (sizeA !== sizeB) return sizeA - sizeB;
      return sortTasks([a.task, b.task])[0].id === a.task.id ? -1 : 1;
    })
    .map(item => item.task);
  setWorkflowStats('microSlotsStats', [
    `действий ${tasks.length}`,
    `5м ${tasks.filter(task => normalizeNextStepSizeForUi(getPrimaryNextAction(task)?.size) === 5).length}`,
    `15м ${tasks.filter(task => normalizeNextStepSizeForUi(getPrimaryNextAction(task)?.size) === 15).length}`
  ]);
  setWorkflowListState('microSlotsList', 'microSlotsEmptyState', tasks, 'micro');
}

function renderWaitingSection() {
  const tasks = currentTasks
    .filter(task => !task.completed && isTaskInWorkflowStatus(task, 'waiting'))
    .sort((a, b) => {
      const dueA = a.waitingUntil || '9999-12-31';
      const dueB = b.waitingUntil || '9999-12-31';
      if (dueA !== dueB) return dueA.localeCompare(dueB);
      return (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0);
    });
  const todayKey = getTodayKey();
  const dueCount = tasks.filter(task => task.waitingUntil && task.waitingUntil <= todayKey).length;
  setWorkflowStats('waitingStats', [
    `в ожидании ${tasks.length}`,
    dueCount ? `проверить ${dueCount}` : null
  ]);
  setWorkflowListState('waitingList', 'waitingEmptyState', tasks, 'waiting');
}

function renderBacklogSection() {
  const tasks = currentTasks
    .filter(task => !task.completed && isTaskInWorkflowStatus(task, 'backlog'))
    .sort((a, b) => (Number(b.backlogAt) || Number(b.updatedAt) || 0) - (Number(a.backlogAt) || Number(a.updatedAt) || 0));
  setWorkflowStats('backlogStats', [`в бэклоге ${tasks.length}`]);
  setWorkflowListState('backlogList', 'backlogEmptyState', tasks, 'backlog');
}

function renderIdeasSection() {
  const tasks = currentTasks
    .filter(task => !task.completed && isTaskInWorkflowStatus(task, 'idea'))
    .sort((a, b) => (Number(b.ideaAt) || Number(b.updatedAt) || 0) - (Number(a.ideaAt) || Number(a.updatedAt) || 0));
  setWorkflowStats('ideasStats', [`идей ${tasks.length}`]);
  setWorkflowListState('ideasList', 'ideasEmptyState', tasks, 'idea');
}

function renderStaleSection() {
  const tasks = currentTasks
    .filter(task => !task.completed && isWorkflowStaleTask(task))
    .sort((a, b) => getTaskStalenessDays(b) - getTaskStalenessDays(a));
  setWorkflowStats('staleStats', [`залежалось ${tasks.length}`]);
  setWorkflowListState('staleList', 'staleEmptyState', tasks, 'stale');
}

function createWorkflowChip(text, className) {
  const chip = document.createElement('span');
  chip.className = `workflow-chip ${className || ''}`.trim();
  chip.textContent = text;
  return chip;
}

function normalizeWorkflowLink(link) {
  const value = String(link || '').trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.href;
  } catch (error) {
    return null;
  }
}

function createMicroSlotTaskCard(task) {
  const action = getPrimaryNextAction(task);
  const card = document.createElement('div');
  card.className = 'micro-slot-card';
  card.setAttribute('data-task-id', task.id);

  const content = document.createElement('div');
  content.className = 'micro-slot-content';

  const title = document.createElement('button');
  title.type = 'button';
  title.className = 'micro-slot-title';
  appendTaskTitleWithRecurringMarker(title, task);
  title.addEventListener('click', () => openWorkflowTask(task.id));
  content.appendChild(title);

  const actionText = document.createElement('div');
  actionText.className = 'micro-slot-action';
  actionText.textContent = action?.text || 'Нет следующего действия';
  content.appendChild(actionText);

  const meta = document.createElement('div');
  meta.className = 'micro-slot-meta';
  if (task.deadline) meta.appendChild(createWorkflowChip(formatDeadline(task.deadline), getDeadlineClass(task.deadline)));
  if (action) {
    meta.appendChild(createWorkflowChip(formatNextStepSize(action.size), 'size'));
    meta.appendChild(createWorkflowChip(NEXT_STEP_KIND_LABELS[normalizeNextStepKindForUi(action.kind)], 'kind'));
  }
  content.appendChild(meta);
  card.appendChild(content);

  const controls = document.createElement('div');
  controls.className = 'micro-slot-controls';
  const link = normalizeWorkflowLink(task.link);
  if (link) {
    const linkButton = document.createElement('a');
    linkButton.className = 'workflow-action-btn micro-slot-link';
    linkButton.href = link;
    linkButton.target = '_blank';
    linkButton.rel = 'noopener noreferrer';
    linkButton.textContent = 'Ссылка';
    linkButton.setAttribute('data-action-help', 'Откроет ссылку из карточки задачи в новой вкладке.');
    linkButton.setAttribute('aria-label', 'Ссылка. Откроет ссылку из карточки задачи в новой вкладке.');
    controls.appendChild(linkButton);
  }
  controls.appendChild(createWorkflowButton('Выполнить', 'primary', () => completeWorkflowNextAction(task.id), {
    help: 'Закроет этот короткий следующий шаг и запишет прогресс в задачу.'
  }));
  controls.appendChild(createWorkflowButton('Карточка', 'secondary', () => openWorkflowTask(task.id), {
    help: 'Откроет полную карточку. Там можно изменить задачу или оформить ожидание с деталями.'
  }));
  card.appendChild(controls);

  return card;
}

function createWorkflowTaskCard(task, mode) {
  const card = document.createElement('div');
  card.className = `workflow-card workflow-card-${mode}`;
  card.setAttribute('data-task-id', task.id);

  const header = document.createElement('div');
  header.className = 'workflow-card-header';
  const title = document.createElement('button');
  title.type = 'button';
  title.className = 'workflow-card-title';
  appendTaskTitleWithRecurringMarker(title, task);
  title.addEventListener('click', () => openWorkflowTask(task.id));
  header.appendChild(title);
  card.appendChild(header);

  const meta = document.createElement('div');
  meta.className = 'workflow-card-meta';
  if (task.category) meta.appendChild(createWorkflowChip(task.category));
  meta.appendChild(createWorkflowChip(getWorkflowStatusLabel(task.workflowStatus), `status-${normalizeWorkflowStatusForUi(task.workflowStatus)}`));
  if (normalizeTaskStatus(task.status) === 'draft') meta.appendChild(createWorkflowChip('Черновик', 'status-draft'));
  if (task.deadline) meta.appendChild(createWorkflowChip(formatDeadline(task.deadline), getDeadlineClass(task.deadline)));
  const skipCount = Math.floor(Number(task.flowSkipCount) || 0);
  if (skipCount > 0) meta.appendChild(createWorkflowChip(`skip ${skipCount}`, skipCount >= 2 ? 'danger' : 'warning'));
  card.appendChild(meta);

  const action = getPrimaryNextAction(task);
  const actionRow = document.createElement('div');
  actionRow.className = action ? 'workflow-next-action' : 'workflow-next-action missing';
  if (action) {
    const actionText = document.createElement('span');
    actionText.className = 'workflow-next-action-text';
    actionText.textContent = action.text;
    actionRow.appendChild(actionText);
    actionRow.appendChild(createWorkflowChip(formatNextStepSize(action.size), 'size'));
    actionRow.appendChild(createWorkflowChip(NEXT_STEP_KIND_LABELS[normalizeNextStepKindForUi(action.kind)], 'kind'));
  } else {
    actionRow.textContent = 'Нет следующего действия';
  }
  card.appendChild(actionRow);

  if (mode === 'triage' || mode === 'stale') {
    const reasons = getTriageReasonLabels(task);
    if (reasons.length > 0) {
      const reasonRow = document.createElement('div');
      reasonRow.className = 'workflow-reasons';
      reasons.forEach(reason => reasonRow.appendChild(createWorkflowChip(reason, 'reason')));
      card.appendChild(reasonRow);
    }
    card.appendChild(createQuickNextActionRow(task, { requireMetadata: mode === 'stale' || mode === 'triage' }));
    card.appendChild(createWaitingActionRow(task));
  } else if (mode === 'waiting') {
    const waitingMeta = document.createElement('div');
    waitingMeta.className = 'workflow-waiting-meta';
    const parts = [];
    if (task.waitingFor) parts.push(`Жду: ${task.waitingFor}`);
    if (task.waitingUntil) parts.push(`До: ${formatDeadline(task.waitingUntil) || task.waitingUntil}`);
    if (task.waitingNote) parts.push(task.waitingNote);
    waitingMeta.textContent = parts.join(' · ') || 'Без деталей ожидания';
    card.appendChild(waitingMeta);
  }

  card.appendChild(createWorkflowActionBar(task, mode));
  return card;
}

function createQuickNextActionRow(task, options = {}) {
  const opts = options || {};
  const requireMetadata = opts.requireMetadata === true;
  const row = document.createElement('div');
  row.className = 'workflow-next-action-form';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'workflow-input workflow-next-step-input';
  input.placeholder = 'Следующее действие';
  const sizeSelect = createNextStepSizeSelect(requireMetadata ? '' : '30', { includePlaceholder: requireMetadata });
  const kindSelect = createNextStepKindSelect(requireMetadata ? '' : 'do', { includePlaceholder: requireMetadata });
  const button = createWorkflowButton('Добавить шаг', 'primary', async () => {
    await addWorkflowNextAction(task.id, input, sizeSelect, kindSelect, { requireMetadata });
  });
  input.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await addWorkflowNextAction(task.id, input, sizeSelect, kindSelect, { requireMetadata });
    }
  });
  row.appendChild(input);
  row.appendChild(sizeSelect);
  row.appendChild(kindSelect);
  row.appendChild(button);
  return row;
}

function createWaitingActionRow(task, options = {}) {
  const opts = options || {};
  const requireDetails = opts.requireDetails !== false;
  const row = document.createElement('div');
  row.className = 'workflow-waiting-form';
  const waitingForInput = document.createElement('input');
  waitingForInput.type = 'text';
  waitingForInput.className = 'workflow-input';
  waitingForInput.placeholder = 'Кого/чего жду';
  waitingForInput.value = task.waitingFor || '';
  const waitingUntilInput = document.createElement('input');
  waitingUntilInput.type = 'date';
  waitingUntilInput.className = 'workflow-date-input';
  waitingUntilInput.value = task.waitingUntil || '';
  const waitingNoteInput = document.createElement('input');
  waitingNoteInput.type = 'text';
  waitingNoteInput.className = 'workflow-input';
  waitingNoteInput.placeholder = 'Заметка';
  waitingNoteInput.value = task.waitingNote || '';
  const button = createWorkflowButton(opts.buttonLabel || 'Перевести в Жду', 'secondary', async () => {
    const waitingFor = waitingForInput.value.trim();
    const waitingUntil = waitingUntilInput.value.trim();
    const missingWaitingFor = requireDetails && !waitingFor;
    const missingWaitingUntil = requireDetails && !waitingUntil;
    waitingForInput.classList.toggle('invalid', missingWaitingFor);
    waitingUntilInput.classList.toggle('invalid', missingWaitingUntil);
    if (missingWaitingFor || missingWaitingUntil) {
      return;
    }
    await setTaskWorkflowState(task.id, 'waiting', {
      waitingFor,
      waitingUntil,
      waitingNote: waitingNoteInput.value
    });
  }, {
    help: 'Запишет, кого или чего ждёшь, дату проверки и перенесёт задачу в раздел «Жду».'
  });
  row.appendChild(waitingForInput);
  row.appendChild(waitingUntilInput);
  row.appendChild(waitingNoteInput);
  row.appendChild(button);
  return row;
}

function createWorkflowActionBar(task, mode) {
  const bar = document.createElement('div');
  bar.className = 'workflow-action-bar';
  if (mode === 'micro') {
    bar.appendChild(createWorkflowButton('Выполнить шаг', 'primary', () => completeWorkflowNextAction(task.id), {
      help: 'Закроет текущий следующий шаг и запишет прогресс в задачу.'
    }));
    bar.appendChild(createWorkflowButton('Открыть', 'secondary', () => openWorkflowTask(task.id), {
      help: 'Откроет полную карточку. Раздел задачи не изменится.'
    }));
    return bar;
  }
  if (mode === 'waiting') {
    bar.appendChild(createWorkflowButton('Вернуть в активные', 'primary', () => setTaskWorkflowState(task.id, 'active', { resetSkip: true }), {
      help: 'Снимет ожидание и вернёт задачу в активные. Если карточка готова, она снова появится в задачах и ФЛОУ.'
    }));
    bar.appendChild(createWorkflowButton('Бэклог', 'secondary', () => setTaskWorkflowState(task.id, 'backlog', {}), {
      help: 'Уберёт задачу из ожидания в «Бэклог». Она не будет попадать в ФЛОУ.'
    }));
    bar.appendChild(createWorkflowButton('Открыть', 'secondary', () => openWorkflowTask(task.id), {
      help: 'Откроет полную карточку. Раздел задачи не изменится.'
    }));
    return bar;
  }
  if (mode === 'backlog' || mode === 'idea') {
    bar.appendChild(createWorkflowButton('Активировать', 'primary', () => setTaskWorkflowState(task.id, 'active', { resetSkip: true, ready: true }), {
      help: 'Вернёт задачу в активные и пометит готовой к работе. Она снова сможет появиться в задачах и ФЛОУ.'
    }));
    bar.appendChild(createWorkflowButton('Убить', 'danger', () => setTaskWorkflowState(task.id, 'killed', {}), {
      help: 'Перенесёт задачу в «Убито». Она исчезнет из рабочих очередей.'
    }));
    bar.appendChild(createWorkflowButton('Открыть', 'secondary', () => openWorkflowTask(task.id), {
      help: 'Откроет полную карточку. Раздел задачи не изменится.'
    }));
    return bar;
  }
  bar.appendChild(createWorkflowButton('Активно', 'secondary', () => setTaskWorkflowState(task.id, 'active', { resetSkip: true, ready: true }), {
    help: 'Вернёт задачу в активные и пометит готовой к работе. Она снова сможет появиться в задачах и ФЛОУ.'
  }));
  bar.appendChild(createWorkflowButton('Бэклог', 'secondary', () => setTaskWorkflowState(task.id, 'backlog', {}), {
    help: 'Уберёт задачу из активной работы в «Бэклог». Во ФЛОУ она не попадёт, пока ты её не активируешь.'
  }));
  bar.appendChild(createWorkflowButton('Идея', 'secondary', () => setTaskWorkflowState(task.id, 'idea', {}), {
    help: 'Перенесёт задачу в «Идеи». Это место для возможных задумок, не для текущего плана и не для ФЛОУ.'
  }));
  bar.appendChild(createWorkflowButton('Регулярка', 'secondary', () => markWorkflowTaskRecurring(task.id), {
    help: 'Сделает задачу регулярной. После этого можно выбрать, это рутина или регулярная работа со следующим шагом.'
  }));
  bar.appendChild(createWorkflowButton('Убить', 'danger', () => setTaskWorkflowState(task.id, 'killed', {}), {
    help: 'Перенесёт задачу в «Убито». Она исчезнет из рабочих очередей.'
  }));
  bar.appendChild(createWorkflowButton('Открыть', 'secondary', () => openWorkflowTask(task.id), {
    help: 'Откроет полную карточку. Раздел задачи не изменится.'
  }));
  return bar;
}

function createWorkflowButton(label, variant, onClick, options = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `workflow-action-btn ${variant || 'secondary'}`;
  button.textContent = label;
  if (options?.help) {
    button.setAttribute('data-action-help', options.help);
    button.setAttribute('aria-label', `${label}. ${options.help}`);
  }
  button.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    button.disabled = true;
    try {
      await onClick();
    } finally {
      button.disabled = false;
    }
  });
  return button;
}

function createNextStepSizeSelect(defaultValue, options = {}) {
  const select = document.createElement('select');
  select.className = 'workflow-select';
  if (options.includePlaceholder === true) {
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Время';
    select.appendChild(placeholder);
  }
  [
    ['5', '5м'],
    ['15', '15м'],
    ['30', '30м'],
    ['60', '60м'],
    ['deep', 'Deep']
  ].forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  });
  select.value = defaultValue || (options.includePlaceholder === true ? '' : '30');
  return select;
}

function createNextStepKindSelect(defaultValue, options = {}) {
  const select = document.createElement('select');
  select.className = 'workflow-select';
  if (options.includePlaceholder === true) {
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Тип';
    select.appendChild(placeholder);
  }
  Object.entries(NEXT_STEP_KIND_LABELS).forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  });
  select.value = defaultValue || (options.includePlaceholder === true ? '' : 'do');
  return select;
}

async function refreshAfterWorkflowAction() {
  await loadTasks();
  const sectionName = getCurrentSectionName();
  if (sectionName === 'tasks') renderActiveTasks();
  if (isWorkflowSectionName(sectionName)) renderCurrentWorkflowSection();
}

async function openWorkflowTask(taskId) {
  if (typeof window.openTaskCard === 'function') {
    await window.openTaskCard(taskId);
  }
}

function markWorkflowSelectInvalid(select, isInvalid) {
  if (!select) return;
  select.classList.toggle('invalid', isInvalid);
}

async function addWorkflowNextAction(taskId, input, sizeSelect, kindSelect, options = {}) {
  const text = String(input?.value || '').trim();
  if (!text) return;
  const requireMetadata = options?.requireMetadata === true;
  const sizeValue = String(sizeSelect?.value || '').trim();
  const kindValue = String(kindSelect?.value || '').trim();
  if (requireMetadata && (!sizeValue || !kindValue)) {
    markWorkflowSelectInvalid(sizeSelect, !sizeValue);
    markWorkflowSelectInvalid(kindSelect, !kindValue);
    if (!sizeValue && sizeSelect) {
      sizeSelect.focus();
    } else if (!kindValue && kindSelect) {
      kindSelect.focus();
    }
    return;
  }
  markWorkflowSelectInvalid(sizeSelect, false);
  markWorkflowSelectInvalid(kindSelect, false);
  const task = currentTasks.find(item => item.id === taskId);
  if (!task) return;
  const nextSteps = Array.isArray(task.nextSteps) ? [...task.nextSteps] : [];
  nextSteps.push({
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    text,
    completed: false,
    order: nextSteps.length,
    size: normalizeNextStepSizeForUi(sizeSelect?.value),
    kind: normalizeNextStepKindForUi(kindSelect?.value),
    completedAt: null
  });
  const events = [
    ...getWorkflowEvents(task),
    createWorkflowEventForUi('next_action_added', {
      text,
      size: normalizeNextStepSizeForUi(sizeSelect?.value),
      kind: normalizeNextStepKindForUi(kindSelect?.value)
    })
  ];
  await storage.updateTask(taskId, {
    nextSteps,
    status: 'ready',
    workflowStatus: 'active',
    flowSkipCount: 0,
    events
  });
  if (input) input.value = '';
  await refreshAfterWorkflowAction();
}

async function completeWorkflowNextAction(taskId) {
  const task = currentTasks.find(item => item.id === taskId);
  if (!task) return;
  const action = getPrimaryNextAction(task);
  if (!action) {
    await openWorkflowTask(taskId);
    return;
  }
  const now = Date.now();
  const nextSteps = (Array.isArray(task.nextSteps) ? task.nextSteps : []).map(step => {
    if (step.id !== action.id) return step;
    return { ...step, completed: true, completedAt: now };
  });
  const events = [
    ...getWorkflowEvents(task),
    createWorkflowEventForUi('next_action_completed', {
      id: action.id,
      text: action.text,
      size: normalizeNextStepSizeForUi(action.size),
      kind: normalizeNextStepKindForUi(action.kind)
    })
  ];
  await storage.updateTask(taskId, {
    nextSteps,
    flowSkipCount: 0,
    events
  });
  await storage.addLogEntry(taskId, `Выполнен шаг: ${action.text}`);
  await refreshAfterWorkflowAction();
}

async function setTaskWorkflowState(taskId, status, options) {
  const task = currentTasks.find(item => item.id === taskId);
  if (!task) return;
  const nextStatus = normalizeWorkflowStatusForUi(status);
  const opts = options || {};
  const now = Date.now();
  const updates = {
    workflowStatus: nextStatus,
    events: [
      ...getWorkflowEvents(task),
      createWorkflowEventForUi('workflow_status_changed', {
        from: normalizeWorkflowStatusForUi(task.workflowStatus),
        to: nextStatus
      })
    ]
  };
  if (opts.ready === true) {
    updates.status = 'ready';
  }
  if (opts.resetSkip === true || nextStatus !== 'active') {
    updates.flowSkipCount = 0;
  }
  if (nextStatus === 'waiting') {
    updates.waitingFor = String(opts.waitingFor || '').trim() || null;
    updates.waitingUntil = String(opts.waitingUntil || '').trim() || null;
    updates.waitingNote = String(opts.waitingNote || '').trim() || null;
  } else {
    updates.waitingFor = null;
    updates.waitingUntil = null;
    updates.waitingNote = null;
  }
  if (nextStatus === 'backlog') updates.backlogAt = now;
  if (nextStatus === 'idea') updates.ideaAt = now;
  if (nextStatus === 'killed') updates.killedAt = now;
  await storage.updateTask(taskId, updates);
  await refreshAfterWorkflowAction();
}

async function markWorkflowTaskRecurring(taskId, mode) {
  const task = currentTasks.find(item => item.id === taskId);
  if (!task) return;
  const inferredMode = mode
    ? normalizeRecurrenceExecutionModeForUi(mode)
    : (hasOpenNextAction(task) ? 'needs_next_action' : 'routine');
  await storage.updateTask(taskId, {
    isRecurringParticipation: true,
    recurrenceDays: Math.max(1, Number(task.recurrenceDays) || 3),
    recurrenceExecutionMode: inferredMode,
    status: 'ready',
    workflowStatus: 'active',
    flowSkipCount: 0,
    events: [
      ...getWorkflowEvents(task),
      createWorkflowEventForUi('recurring_enabled', {})
    ]
  });
  await refreshAfterWorkflowAction();
}

// Получаем подпись задачи для сравнения изменений
function getTaskSignature(task) {
  return JSON.stringify({
    text: task.text,
    completed: task.completed,
    priority: task.priority,
    category: task.category,
    deadline: task.deadline,
    status: normalizeTaskStatus(task.status),
    workflowStatus: normalizeWorkflowStatusForUi(task.workflowStatus),
    recurrenceExecutionMode: normalizeRecurrenceExecutionModeForUi(task.recurrenceExecutionMode),
    flowSkipCount: Math.floor(Number(task.flowSkipCount) || 0),
    nextStep: getNextStepPreviewText(task)
  });
}

// Рендеринг задач в контейнер
function renderTasksToContainer(container, tasks, options = {}) {
  // Плавное обновление списка без полного перерендера
  const existingTasks = Array.from(container.children);
  const existingTaskMap = new Map();
  existingTasks.forEach(el => {
    const taskId = el.getAttribute('data-task-id');
    if (taskId) existingTaskMap.set(taskId, el);
  });

  const newTaskIds = new Set(tasks.map(t => t.id));

  // Удаляем задачи, которых больше нет в списке (с анимацией)
  existingTasks.forEach(taskEl => {
    const taskId = taskEl.getAttribute('data-task-id');
    if (taskId && !newTaskIds.has(taskId)) {
      taskEl.classList.add('fade-out');
      setTimeout(() => {
        if (taskEl.parentNode) {
          taskEl.remove();
        }
      }, 400);
    }
  });

  // Добавляем или обновляем задачи в нужном порядке
  tasks.forEach((task, index) => {
    const signature = getTaskSignature(task);
    const existing = existingTaskMap.get(task.id);
    const referenceNode = container.children[index] || null;

    if (existing) {
      if (existing.dataset.signature !== signature) {
        const newElement = createTaskElement(task, { enableContextMenu: true, ...options });
        newElement.dataset.signature = signature;
        container.replaceChild(newElement, existing);
      } else if (referenceNode !== existing) {
        container.insertBefore(existing, referenceNode);
      }
    } else {
      const taskElement = createTaskElement(task, { enableContextMenu: true, ...options });
      taskElement.dataset.signature = signature;
      taskElement.style.opacity = '0';
      taskElement.style.transform = 'translateY(-10px)';
      container.insertBefore(taskElement, referenceNode);
      
      setTimeout(() => {
        taskElement.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
        taskElement.style.opacity = '1';
        taskElement.style.transform = 'translateY(0)';
      }, index * 30);
    }
  });
}

// Рендеринг выполненных задач
function renderCompletedTasks() {
  const completedList = document.getElementById('completedTasksList');
  const completedEmptyState = document.getElementById('completedEmptyState');
  completedList.innerHTML = '';

  // Получаем только выполненные задачи
  const completedTasks = currentTasks.filter(task => task.completed);

  if (completedTasks.length === 0) {
    completedEmptyState.style.display = 'block';
    completedList.style.display = 'none';
    return;
  }

  completedEmptyState.style.display = 'none';
  completedList.style.display = 'block';

  const grouped = groupCompletedTasksByDate(completedTasks);
  Object.keys(grouped).forEach((groupKey) => {
    const section = document.createElement('div');
    section.className = 'tasks-subsection';

    const title = document.createElement('h3');
    title.className = 'subsection-title';
    title.textContent = groupKey;
    section.appendChild(title);

    const list = document.createElement('div');
    list.className = 'tasks-list';
    grouped[groupKey].forEach(task => {
      const taskElement = createTaskElement(task, { section: 'completed' });
      list.appendChild(taskElement);
    });
    section.appendChild(list);

    completedList.appendChild(section);
  });
}

function groupCompletedTasksByDate(tasks) {
  const groups = {};
  const sorted = [...tasks].sort((a, b) => getCompletionTimestamp(b) - getCompletionTimestamp(a));
  sorted.forEach(task => {
    const completedAt = getCompletionTimestamp(task);
    const label = formatCompletedGroupLabel(completedAt);
    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(task);
  });
  return groups;
}

function getCompletionTimestamp(task) {
  return Number(task.completedAt) || Number(task.updatedAt) || Number(task.createdAt) || Date.now();
}

function formatCompletedGroupLabel(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  if (target.getTime() === today.getTime()) {
    return 'Сегодня';
  }
  if (target.getTime() === yesterday.getTime()) {
    return 'Вчера';
  }
  return target.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

// Сортировка задач (для активных задач)
function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const rankA = Number.isFinite(a.priorityRank) ? Number(a.priorityRank) : Number.POSITIVE_INFINITY;
    const rankB = Number.isFinite(b.priorityRank) ? Number(b.priorityRank) : Number.POSITIVE_INFINITY;
    if (rankA !== rankB) {
      return rankA - rankB;
    }

    // По срочности
    const priorityOrder = { high: 2, medium: 1 };
    const priorityA = normalizePriority(a.priority);
    const priorityB = normalizePriority(b.priority);
    if (priorityOrder[priorityA] !== priorityOrder[priorityB]) {
      return priorityOrder[priorityB] - priorityOrder[priorityA];
    }
    // Затем по дедлайну
    if (a.deadline && b.deadline) {
      return new Date(a.deadline) - new Date(b.deadline);
    }
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    // И наконец по дате создания
    return b.createdAt - a.createdAt;
  });
}

// Счётчик и кнопка триажа в заголовке секции «Просрочено».
function updateOverdueSectionHeader(overdueCount) {
  const countBadge = document.getElementById('overdueCountBadge');
  const moveAllBtn = document.getElementById('overdueMoveAllBtn');
  if (countBadge) {
    countBadge.textContent = String(overdueCount);
    countBadge.style.display = overdueCount > 0 ? 'inline-flex' : 'none';
  }
  if (moveAllBtn) {
    moveAllBtn.style.display = overdueCount > 1 ? 'inline-flex' : 'none';
  }
}

function updatePriorityPromptVisibility() {
  const button = document.getElementById('priorityPromptBtn');
  if (!button) return;
  const priorityPool = currentTasks.filter(task =>
    task && task.completed !== true && normalizeTaskStatus(task.status) === 'ready' && !isTaskBacklogLike(task)
  );
  const hasUnranked = prioritizationEngine
    ? prioritizationEngine.hasUnrankedTasks(priorityPool)
    : priorityPool.some(task => !Number.isFinite(task.priorityRank));
  button.style.display = hasUnranked ? 'inline-flex' : 'none';
  // Бейдж-счётчик неприоритизированных задач на «волшебной палочке».
  const countBadge = document.getElementById('priorityPromptCount');
  if (countBadge) {
    const unrankedCount = priorityPool.filter(task => !Number.isFinite(task.priorityRank)).length;
    countBadge.textContent = unrankedCount > 9 ? '9+' : String(unrankedCount);
    countBadge.style.display = hasUnranked && unrankedCount > 0 ? 'flex' : 'none';
    button.title = hasUnranked
      ? `Приоритизация задач — без приоритета: ${unrankedCount}`
      : 'Приоритизация задач';
  }
}

function getPrioritizationDeadlineText(task) {
  if (!task?.deadline) return 'Без дедлайна';
  const text = formatDeadline(task.deadline);
  return text || 'Без дедлайна';
}

function createPrioritizationCard(task) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'prioritization-card-btn';
  button.setAttribute('data-task-id', task.id);

  const title = document.createElement('p');
  title.className = 'prioritization-card-title';
  title.textContent = task.text || '';

  const deadline = document.createElement('p');
  deadline.className = 'prioritization-card-deadline';
  deadline.textContent = getPrioritizationDeadlineText(task);

  button.appendChild(title);
  button.appendChild(deadline);
  return button;
}

function renderPrioritizationSnapshot(snapshot) {
  const stack = document.getElementById('prioritizationStack');
  const progress = document.getElementById('prioritizationProgress');
  const emptyState = document.getElementById('prioritizationEmptyState');
  if (!stack || !progress || !emptyState) return;

  stack.innerHTML = '';
  if (!snapshot || snapshot.done || !snapshot.pair || !snapshot.pair.first || !snapshot.pair.second) {
    stack.style.display = 'none';
    progress.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  stack.style.display = 'flex';

  const firstCard = createPrioritizationCard(snapshot.pair.first);
  const secondCard = createPrioritizationCard(snapshot.pair.second);

  firstCard.addEventListener('click', () => handlePrioritizationChoice(snapshot.pair.first.id));
  secondCard.addEventListener('click', () => handlePrioritizationChoice(snapshot.pair.second.id));

  stack.appendChild(firstCard);
  stack.appendChild(secondCard);

  progress.style.display = 'block';
  progress.textContent = `Сравнение ${snapshot.votesDone + 1} из ${Math.max(snapshot.votesPlanned, snapshot.votesDone + 1)}`;
}

async function startPrioritizationSession() {
  if (!prioritizationEngine) return;
  const priorityPool = currentTasks.filter(task =>
    task && task.completed !== true && normalizeTaskStatus(task.status) === 'ready' && !isTaskBacklogLike(task)
  );
  let snapshot;
  if (!isPrioritizationSessionActive) {
    snapshot = await prioritizationEngine.start(priorityPool);
    isPrioritizationSessionActive = snapshot.active;
  } else {
    snapshot = prioritizationEngine.getSnapshot();
  }
  renderPrioritizationSnapshot(snapshot);
}

async function handlePrioritizationChoice(taskId) {
  if (!prioritizationEngine) return;
  const snapshot = await prioritizationEngine.choose(taskId);
  if (snapshot.done) {
    isPrioritizationSessionActive = false;
    prioritizationEngine.reset();
    await loadTasks();
    renderActiveTasks();
    switchSection('tasks');
    return;
  }
  renderPrioritizationSnapshot(snapshot);
}

// Создание элемента задачи
function createTaskElement(task, options = {}) {
  const { enableContextMenu = false, section = 'mixed' } = options;
  const taskDiv = document.createElement('div');
  const normalizedPriority = normalizePriority(task.priority);
  taskDiv.className = `task-item ${task.completed ? 'completed' : ''} priority-${normalizedPriority}`;
  taskDiv.setAttribute('data-task-id', task.id);
  
  const deadlineClass = getDeadlineClass(task.deadline);
  const deadlineText = formatDeadline(task.deadline);

  // Создаем структуру через DOM API вместо innerHTML для избежания inline handlers
  const taskContent = document.createElement('div');
  taskContent.className = 'task-content';
  taskContent.style.cursor = 'pointer';
  // Обработчик клика на карточку для открытия полной карточки задачи
  taskDiv.addEventListener('click', async (e) => {
    // Не открываем карточку, если клик был на чекбоксе или кнопках действий
    if (e.target.closest('.task-checkbox') || e.target.closest('.task-actions') || e.target.closest('.task-focus-indicator')) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    
    // Используем window.openTaskCard, так как функция определена в task-card.js
    if (typeof window.openTaskCard === 'function') {
      try {
        await window.openTaskCard(task.id);
      } catch (error) {
        logger.error('Ошибка при открытии карточки задачи:', error);
      }
    } else {
      logger.error('openTaskCard не найдена. Убедитесь, что task-card.js загружен.');
    }
  });

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'task-checkbox';
  checkbox.checked = task.completed;
  checkbox.addEventListener('change', () => toggleTask(task.id));

  const textWrapper = document.createElement('div');
  textWrapper.className = 'task-text-wrapper';

  const taskText = document.createElement('span');
  taskText.className = 'task-text';
  appendTaskTitleWithRecurringMarker(taskText, task);

  // Строка следующего шага показывается только когда шаг есть:
  // плейсхолдер «Добавьте следующий шаг...» в списках не рендерим (плотность списка).
  const nextStepText = getNextStepPreviewText(task);
  let taskNextStep = null;
  if (nextStepText) {
    taskNextStep = document.createElement('span');
    taskNextStep.className = 'task-next-step';
    taskNextStep.textContent = nextStepText;
  }

  const taskMeta = document.createElement('div');
  taskMeta.className = 'task-meta';

  if (task.category) {
    const categorySpan = document.createElement('span');
    categorySpan.className = 'task-category';
    categorySpan.textContent = task.category;
    taskMeta.appendChild(categorySpan);
  }

  // Состояния по умолчанию не маркируем: бейдж статуса — только для «Черновик»,
  // бейдж оценки — только когда оценка задана (без «без оценки»).
  const status = normalizeTaskStatus(task.status);
  if (status === 'draft') {
    const statusSpan = document.createElement('span');
    statusSpan.className = `task-status-badge status-${status}`;
    statusSpan.textContent = getTaskStatusLabel(status);
    taskMeta.appendChild(statusSpan);
  }
  const workflowStatus = normalizeWorkflowStatusForUi(task.workflowStatus);
  if (workflowStatus !== 'active') {
    const workflowSpan = document.createElement('span');
    workflowSpan.className = `task-status-badge workflow-status-${workflowStatus}`;
    workflowSpan.textContent = getWorkflowStatusLabel(workflowStatus);
    taskMeta.appendChild(workflowSpan);
  }
  if (section !== 'completed') {
    const primaryAction = getPrimaryNextAction(task);
    if (primaryAction) {
      const sizeBadge = document.createElement('span');
      sizeBadge.className = 'task-time-badge task-next-size-badge';
      sizeBadge.textContent = formatNextStepSize(primaryAction.size);
      taskMeta.appendChild(sizeBadge);

      const kindBadge = document.createElement('span');
      kindBadge.className = 'task-time-badge task-next-kind-badge';
      kindBadge.textContent = NEXT_STEP_KIND_LABELS[normalizeNextStepKindForUi(primaryAction.kind)];
      taskMeta.appendChild(kindBadge);
    }
    const estimateBadge = createEstimateBadge(task);
    if (estimateBadge) {
      taskMeta.appendChild(estimateBadge);
    }
  }

  // Убрано отображение приоритета в карточке задачи

  const hideTodayDeadline = section === 'today' && deadlineClass === 'deadline-today';
  if (task.deadline && !hideTodayDeadline && section !== 'completed') {
    const deadlineSpan = document.createElement('span');
    deadlineSpan.className = `task-deadline ${deadlineClass}`;
    // Градация просрочки: 1-3 дня — мягкое предупреждение, больше — красный.
    if (deadlineClass === 'deadline-overdue' && getOverdueDays(task.deadline) <= 3) {
      deadlineSpan.classList.add('deadline-overdue-mild');
    }
    deadlineSpan.textContent = deadlineText;
    taskMeta.appendChild(deadlineSpan);
  }

  if (section !== 'completed') {
    const pomodoroInterval = getTaskPomodoroInterval(task);
    const focusIndicator = document.createElement('button');
    focusIndicator.type = 'button';
    focusIndicator.className = 'task-focus-indicator';
    focusIndicator.textContent = `⏱ ${pomodoroInterval}м`;
    focusIndicator.title = 'Открыть и начать фокус';
    if (pomodoroInterval === 25) {
      focusIndicator.classList.add('default');
    } else {
      focusIndicator.classList.add('custom');
    }
    focusIndicator.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await fastStartPomodoro(task.id);
    });
    taskMeta.appendChild(focusIndicator);
  }

  textWrapper.appendChild(taskText);
  if (section !== 'completed' && taskNextStep) {
    textWrapper.appendChild(taskNextStep);
  }
  textWrapper.appendChild(taskMeta);
  taskContent.appendChild(checkbox);
  taskContent.appendChild(textWrapper);

  const taskActions = document.createElement('div');
  taskActions.className = 'task-actions';

  if (section === 'completed') {
    const timeBadge = document.createElement('span');
    timeBadge.className = 'task-time-badge';
    timeBadge.textContent = `⏱ ${formatTaskTime(task.totalTime)}`;
    taskActions.appendChild(timeBadge);
  }

  // Быстрое действие для просроченных: перенос на сегодня прямо с карточки (по hover).
  if (!task.completed && section !== 'completed' && deadlineClass === 'deadline-overdue') {
    const todayBtn = document.createElement('button');
    todayBtn.type = 'button';
    todayBtn.className = 'task-action-btn task-today-btn';
    todayBtn.title = 'Перенести на сегодня';
    todayBtn.textContent = 'Сегодня';
    todayBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await moveTaskToToday(task.id);
    });
    taskActions.appendChild(todayBtn);
  }

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn-icon task-action-btn';
  deleteBtn.title = 'Удалить';
  const deleteIcon = createIcon('trash', 16);
  if (deleteIcon) deleteBtn.appendChild(deleteIcon);
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteTask(task.id);
  });
  taskActions.appendChild(deleteBtn);

  taskDiv.appendChild(taskContent);
  taskDiv.appendChild(taskActions);
  
  if (task.deadline && deadlineClass === 'deadline-overdue' && section !== 'completed') {
    taskDiv.classList.add('overdue');
  }

  if (enableContextMenu) {
    taskDiv.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openTaskContextMenu(task.id, e.clientX, e.clientY);
    });
  }

  return taskDiv;
}

async function fastStartPomodoro(taskId) {
  if (typeof window.openTaskCard === 'function') {
    await window.openTaskCard(taskId);
    if (typeof window.startPomodoroForTaskCard === 'function') {
      await window.startPomodoroForTaskCard();
    }
  }
}

function getNextStepPreviewText(task) {
  const steps = Array.isArray(task?.nextSteps) ? task.nextSteps : [];
  const activeSteps = steps.filter(step => !step.completed)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return activeSteps[0]?.text?.trim() || (isRecurringRoutineTask(task) ? 'Рутинное действие' : '');
}

function getTaskPomodoroInterval(task) {
  const taskInterval = Number(task?.pomodoroSettings?.interval);
  if (Number.isFinite(taskInterval) && taskInterval > 0) {
    return Math.floor(taskInterval);
  }
  const globalInterval = Number(cachedGlobalPomodoroSettings?.interval);
  if (Number.isFinite(globalInterval) && globalInterval > 0) {
    return Math.floor(globalInterval);
  }
  return 25;
}

function formatTaskTime(totalSeconds) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}ч ${minutes}м`;
  }
  if (minutes > 0) {
    return `${minutes}м`;
  }
  return '0м';
}

// Перенос задачи на сегодня (с проверкой перегруза дня) — используется
// контекстным меню и быстрой кнопкой «Сегодня» на карточке.
async function moveTaskToToday(taskId) {
  const today = getDateStringWithOffset(0);
  const allTasks = await storage.getTasks();
  const currentSettings = await storage.getSettings();
  const baseTasks = allTasks.filter((task) => task.id !== taskId);
  const sourceTask = allTasks.find((task) => task.id === taskId) || {};
  const candidateTask = { ...sourceTask, deadline: today };
  const resolvedDeadline = await resolveTodayDeadlineWithCapacityGuard(candidateTask, baseTasks, currentSettings);
  await storage.updateTask(taskId, { deadline: resolvedDeadline });
  await loadTasks();
  renderActiveTasks();
}

// Перенос всех просроченных задач на сегодня (триаж секции «Просрочено»).
async function moveAllOverdueTasksToToday() {
  const today = getDateStringWithOffset(0);
  const tasks = await storage.getTasks();
  const overdue = tasks.filter((task) => !task.completed && getDeadlineClass(task.deadline) === 'deadline-overdue');
  if (overdue.length === 0) return;
  let confirmed = true;
  if (window.dialogService && typeof window.dialogService.showConfirm === 'function') {
    confirmed = await window.dialogService.showConfirm(
      'Перенести всё на сегодня?',
      `Просроченных задач: ${overdue.length}. Дедлайн каждой станет «Сегодня».`,
      { confirmLabel: 'Перенести' }
    );
  }
  if (!confirmed) return;
  for (const task of overdue) {
    await storage.updateTask(task.id, { deadline: today });
  }
  await loadTasks();
  renderActiveTasks();
}

// Количество дней просрочки дедлайна (0 — если не просрочен).
function getOverdueDays(deadline) {
  if (!deadline) return 0;
  const deadlineDate = parseDeadlineDate(deadline);
  if (!deadlineDate || Number.isNaN(deadlineDate.getTime())) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadlineDate.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today - deadlineDate) / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

function setupTaskContextMenu() {
  const menu = document.getElementById('taskContextMenu');
  const todayBtn = document.getElementById('taskContextTodayBtn');
  const openBtn = document.getElementById('taskContextOpenBtn');
  const deleteBtn = document.getElementById('taskContextDeleteBtn');
  if (!menu || !todayBtn || !openBtn || !deleteBtn) return;

  todayBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const taskId = currentContextTaskId;
    closeTaskContextMenu();
    if (!taskId) return;
    await moveTaskToToday(taskId);
  });

  openBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const taskId = currentContextTaskId;
    closeTaskContextMenu();
    if (!taskId) return;
    if (typeof window.openTaskCard === 'function') {
      await window.openTaskCard(taskId);
    }
  });

  deleteBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const taskId = currentContextTaskId;
    closeTaskContextMenu();
    if (!taskId) return;
    await deleteTask(taskId);
  });

  document.addEventListener('click', (e) => {
    if (menu.style.display === 'none') return;
    if (!menu.contains(e.target)) {
      closeTaskContextMenu();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.style.display !== 'none') {
      closeTaskContextMenu();
    }
  });

  window.addEventListener('resize', closeTaskContextMenu);
  document.addEventListener('scroll', closeTaskContextMenu, true);
}

function openTaskContextMenu(taskId, x, y) {
  const menu = document.getElementById('taskContextMenu');
  if (!menu) return;
  currentContextTaskId = taskId;
  menu.style.display = 'block';
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;

  const rect = menu.getBoundingClientRect();
  const padding = 12;
  let left = x;
  let top = y;

  if (left + rect.width > window.innerWidth - padding) {
    left = Math.max(padding, window.innerWidth - rect.width - padding);
  }
  if (top + rect.height > window.innerHeight - padding) {
    top = Math.max(padding, window.innerHeight - rect.height - padding);
  }

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}

function closeTaskContextMenu() {
  const menu = document.getElementById('taskContextMenu');
  if (!menu) return;
  menu.style.display = 'none';
  currentContextTaskId = null;
}

// Парсинг даты дедлайна как локальной даты (делегируем в dateUtils при наличии)
function parseDeadlineDate(deadline) {
  if (window.dateUtils) return window.dateUtils.parseLocalDateKey(deadline);
  if (!deadline) return null;
  if (typeof deadline === 'string') {
    const datePart = deadline.split('T')[0];
    const parts = datePart.split('-');
    if (parts.length === 3) {
      const year = Number(parts[0]);
      const month = Number(parts[1]) - 1;
      const day = Number(parts[2]);
      return new Date(year, month, day);
    }
  }
  return new Date(deadline);
}

function getDateKey(date) {
  if (window.dateUtils) return window.dateUtils.getDateKey(date);
  if (!date || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function normalizePriority(priority) {
  if (priority === 'high') return 'high';
  return 'medium';
}

function normalizeTaskStatus(status) {
  return status === 'draft' ? 'draft' : 'ready';
}

function getTaskStatusLabel(status) {
  return normalizeTaskStatus(status) === 'draft' ? 'Черновик' : 'Готово';
}

function normalizeEstimateModeForBadge(mode) {
  return ['fixed', 'range', 'epic', 'none'].includes(mode) ? mode : 'none';
}

function formatCompactEstimateMinutes(minutes) {
  const safe = Math.max(1, Math.floor(Number(minutes) || 0));
  if (safe < 60) return `~${safe}м`;
  const roundedHours = Math.max(1, Math.round(safe / 60));
  return `~${roundedHours}ч`;
}

function resolveEstimateMinutesForBadge(task) {
  const mode = normalizeEstimateModeForBadge(task?.estimateMode);
  if (mode === 'none' && isRecurringRoutineTask(task)) {
    return ROUTINE_DEFAULT_ESTIMATE_MIN;
  }
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

function createEstimateBadge(task) {
  // Бейдж показываем только при заданной оценке; «без оценки» — шум, не рендерим.
  const mode = normalizeEstimateModeForBadge(task?.estimateMode);
  const estimateMinutes = resolveEstimateMinutesForBadge(task);
  if ((mode === 'none' && !isRecurringRoutineTask(task)) || estimateMinutes === null) {
    return null;
  }
  const badge = document.createElement('span');
  badge.className = 'task-time-badge task-time-estimate-badge';
  badge.textContent = formatCompactEstimateMinutes(estimateMinutes);
  return badge;
}

// Получение класса для дедлайна
function getDeadlineClass(deadline) {
  if (window.dateUtils) return window.dateUtils.getDeadlineClass(deadline);
  if (!deadline) return '';
  const deadlineDate = parseDeadlineDate(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!deadlineDate || Number.isNaN(deadlineDate.getTime())) return '';
  deadlineDate.setHours(0, 0, 0, 0);
  const diffTime = deadlineDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'deadline-overdue';
  if (diffDays === 0) return 'deadline-today';
  if (diffDays <= 3) return 'deadline-soon';
  return '';
}

// Форматирование дедлайна
function formatDeadline(deadline) {
  if (window.dateUtils) return window.dateUtils.formatDeadline(deadline);
  if (!deadline) return '';
  const deadlineDate = parseDeadlineDate(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!deadlineDate || Number.isNaN(deadlineDate.getTime())) return '';
  deadlineDate.setHours(0, 0, 0, 0);
  const diffTime = deadlineDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'Просрочено на ' + Math.abs(diffDays) + ' дн.';
  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Завтра';
  if (diffDays <= 7) return 'Через ' + diffDays + ' дн.';
  return deadlineDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

// Получение метки приоритета
function getPriorityLabel(priority) {
  const labels = {
    high: 'Высокий',
    medium: 'Обычный'
  };
  return labels[priority] || priority;
}

// Обновление состояния пустого списка
function updateEmptyState(isEmpty) {
  const emptyState = document.getElementById('emptyState');
  const todayTasksSection = document.getElementById('todayTasksSection');
  const otherTasksSection = document.getElementById('otherTasksSection');
  const noDateTasksSection = document.getElementById('noDateTasksSection');
  
  if (isEmpty) {
    if (emptyState) emptyState.style.display = 'block';
    if (todayTasksSection) todayTasksSection.style.display = 'none';
    if (otherTasksSection) otherTasksSection.style.display = 'none';
    if (noDateTasksSection) noDateTasksSection.style.display = 'none';
  } else {
    if (emptyState) emptyState.style.display = 'none';
  }
}

function updateNoDateSectionState() {
  const noDateTasksSection = document.getElementById('noDateTasksSection');
  if (!noDateTasksSection) return;
  noDateTasksSection.classList.toggle('collapsed', isNoDateCollapsed);
}

function updateLaterTasksSectionState() {
  const laterTasksSection = document.getElementById('otherTasksSection');
  if (!laterTasksSection) return;
  laterTasksSection.classList.toggle('collapsed', isLaterTasksCollapsed);
}

function appendTaskTitleWithRecurringMarker(container, task) {
  container.textContent = task.text || '';
  if (task?.isRecurringParticipation !== true) {
    return;
  }
  const marker = document.createElement('span');
  marker.className = 'task-recurring-indicator';
  marker.textContent = '↻';
  marker.setAttribute('aria-hidden', 'true');
  container.appendChild(marker);
}

// Экспорт функций для использования в других модулях (task-card.js)
window.loadTasks = loadTasks;
window.renderActiveTasks = renderActiveTasks;
window.renderCompletedTasks = renderCompletedTasks;
window.renderCurrentWorkflowSection = renderCurrentWorkflowSection;
window.switchSection = switchSection;
window.getCurrentSectionName = getCurrentSectionName;
window.getFlowSessionOrderedIds = getFlowSessionOrderedIds;
window.refreshFlowSessionSnapshot = refreshFlowSessionSnapshot;
window.getActiveFlowTimeWindowMin = () => activeFlowTimeWindowMin;
window.validateDeadlineCapacity = validateDeadlineCapacity;
window.getPrimaryNextAction = getPrimaryNextAction;
window.normalizeWorkflowStatusForUi = normalizeWorkflowStatusForUi;
