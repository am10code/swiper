// Модуль для работы с chrome.storage.local

function normalizeTaskStatus(value) {
  return value === 'draft' || value === 'ready' ? value : 'ready';
}

const WORKFLOW_STATUSES = ['active', 'waiting', 'backlog', 'idea', 'killed'];
const NEXT_STEP_KINDS = ['do', 'ping', 'check', 'write', 'think', 'delegate'];
const RECURRENCE_EXECUTION_MODES = ['routine', 'needs_next_action'];

function createRecordId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

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
      const timestamp = normalizeNonNegativeNumber(step.completedAt, null) || null;
      return {
        ...step,
        id: typeof step.id === 'string' && step.id.trim() ? step.id.trim() : createRecordId(),
        text,
        completed: step.completed === true,
        order: Number.isFinite(Number(step.order)) ? Number(step.order) : index,
        size: normalizeNextStepSize(step.size),
        kind: normalizeNextStepKind(step.kind),
        completedAt: step.completed === true ? timestamp : null
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
      const type = typeof event.type === 'string' && event.type.trim() ? event.type.trim() : 'note';
      const timestamp = normalizeNonNegativeNumber(event.timestamp, Date.now());
      const payload = event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload)
        ? event.payload
        : {};
      return {
        id: typeof event.id === 'string' && event.id.trim() ? event.id.trim() : createRecordId(),
        type,
        timestamp,
        payload
      };
    })
    .filter(Boolean)
    .slice(-250);
}

function createTaskEvent(type, payload) {
  return {
    id: createRecordId(),
    type: typeof type === 'string' && type.trim() ? type.trim() : 'note',
    timestamp: Date.now(),
    payload: payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {}
  };
}

function normalizeWorkflowTaskFields(task) {
  return {
    workflowStatus: normalizeWorkflowStatus(task.workflowStatus),
    waitingFor: normalizeNullableText(task.waitingFor),
    waitingUntil: normalizeDateKeyOrNull(task.waitingUntil),
    waitingNote: normalizeNullableText(task.waitingNote),
    killedAt: normalizeNonNegativeNumber(task.killedAt, null) || null,
    backlogAt: normalizeNonNegativeNumber(task.backlogAt, null) || null,
    ideaAt: normalizeNonNegativeNumber(task.ideaAt, null) || null,
    events: normalizeTaskEvents(task.events)
  };
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

function normalizeNonNegativeInteger(value, fallback) {
  return Math.floor(normalizeNonNegativeNumber(value, fallback));
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

function normalizeTaskEstimateMode(value, timeEstimateMin, timeEstimateMinRange) {
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

function normalizeFlowTimeWindowMin(value) {
  const parsed = Number(value);
  return [5, 15, 30, 60, 120].includes(parsed) ? parsed : 30;
}

function normalizeDailyCapacityMin(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 240;
  const rounded = Math.floor(parsed);
  return Math.max(60, Math.min(960, rounded));
}

function normalizeTaskTimeFields(task, totalTimeFallback) {
  const totalTime = normalizeNonNegativeNumber(task.totalTime, totalTimeFallback);
  const timeEstimateMin = normalizePositiveNumberOrNull(task.timeEstimateMin);
  const timeEstimateMinRange = normalizeTimeEstimateRange(task.timeEstimateMinRange);
  return {
    timeEstimateMin,
    timeEstimateUpdatedAt: normalizeNonNegativeNumber(task.timeEstimateUpdatedAt, null) || null,
    actualFocusSeconds: normalizeNonNegativeNumber(task.actualFocusSeconds, totalTime),
    estimateMode: normalizeTaskEstimateMode(task.estimateMode, timeEstimateMin, timeEstimateMinRange),
    timeEstimateMinRange
  };
}

class StorageManager {
  constructor() {
    this.defaultData = {
      tasks: [],
      categories: ['Работа', 'Личное', 'Покупки'],
      settings: {
        defaultCategory: '',
        showCompleted: true,
        taskDisplayMode: 'all', // 'all' или 'today'
        taskCreationMode: 'bottom', // 'bottom' или 'fab'
        activeFlowTimeWindowMin: 30,
        dailyCapacityMin: 240,
        logCompletedSteps: false,
        globalPomodoroSettings: {
          interval: 25, // минут
          shortBreak: 5, // минут
          longBreak: 15, // минут
          longBreakAfter: 4 // количество сессий до длинного перерыва
        }
      }
    };
  }

  // Инициализация хранилища
  async init() {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (data) => {
        if (!data.tasks) {
          chrome.storage.local.set(this.defaultData, () => {
            resolve(this.defaultData);
          });
        } else {
          // Объединяем существующие данные с дефолтными
          const mergedData = {
            ...this.defaultData,
            ...data,
            categories: data.categories || this.defaultData.categories
          };

          // Обновляем настройки, добавляя глобальные настройки помодоро если их нет
          if (!mergedData.settings.globalPomodoroSettings) {
            mergedData.settings.globalPomodoroSettings = this.defaultData.settings.globalPomodoroSettings;
          }
          
          // Добавляем taskDisplayMode если его нет
          if (!mergedData.settings.taskDisplayMode) {
            mergedData.settings.taskDisplayMode = this.defaultData.settings.taskDisplayMode;
          }
          if (!['bottom', 'fab'].includes(mergedData.settings.taskCreationMode)) {
            mergedData.settings.taskCreationMode = this.defaultData.settings.taskCreationMode;
          }
          if (typeof mergedData.settings.logCompletedSteps !== 'boolean') {
            mergedData.settings.logCompletedSteps = this.defaultData.settings.logCompletedSteps;
          }
          mergedData.settings.activeFlowTimeWindowMin = normalizeFlowTimeWindowMin(
            mergedData.settings.activeFlowTimeWindowMin
          );
          mergedData.settings.dailyCapacityMin = normalizeDailyCapacityMin(
            mergedData.settings.dailyCapacityMin
          );

          // Инициализируем новые поля для существующих задач
          if (mergedData.tasks && Array.isArray(mergedData.tasks)) {
            mergedData.tasks = mergedData.tasks.map(task => {
              const taskWithoutTimeConfidence = { ...task };
              delete taskWithoutTimeConfidence.timeConfidence;
              const nextSteps = normalizeNextSteps(task.nextSteps || []);
              const isRecurringParticipation = task.isRecurringParticipation === true;
              return {
                ...taskWithoutTimeConfidence,
                status: normalizeTaskStatus(task.status),
                priorityRank: Number.isFinite(task.priorityRank) ? Number(task.priorityRank) : null,
                pomodoroSessions: task.pomodoroSessions || [],
                totalTime: normalizeNonNegativeNumber(task.totalTime, 0),
                log: task.log || [],
                nextSteps,
                pomodoroSettings: task.pomodoroSettings !== undefined ? task.pomodoroSettings : null,
                link: task.link || null,
                completedAt: task.completedAt || null,
                isRecurringParticipation,
                recurrenceDays: Math.max(1, Number(task.recurrenceDays) || 3),
                recurrenceExecutionMode: normalizeRecurrenceExecutionMode(task.recurrenceExecutionMode, {
                  ...task,
                  isRecurringParticipation,
                  nextSteps
                }),
                flowSkipCount: normalizeNonNegativeInteger(task.flowSkipCount, 0),
                ...normalizeWorkflowTaskFields(task),
                ...normalizeTaskTimeFields(task, task.totalTime || 0)
              };
            });
          }

          chrome.storage.local.set(mergedData, () => {
            resolve(mergedData);
          });
        }
      });
    });
  }

  // Получить все данные
  async getAll() {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (data) => {
        resolve({
          tasks: data.tasks || [],
          categories: data.categories || this.defaultData.categories,
          settings: data.settings || this.defaultData.settings
        });
      });
    });
  }

  // Получить задачи
  async getTasks() {
    const data = await this.getAll();
    return data.tasks;
  }

  // Сохранить задачи
  async saveTasks(tasks) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ tasks }, () => {
        resolve();
      });
    });
  }

  // Добавить задачу
  async addTask(task) {
    const tasks = await this.getTasks();
    const now = Date.now();
    const creationText = `Создано: ${new Date(now).toLocaleString('ru-RU')}`;
    const newTask = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text: task.text,
      status: task.status === 'ready' ? 'ready' : 'draft',
      completed: false,
      category: task.category || '',
      priority: task.priority || 'medium',
      priorityRank: Number.isFinite(task.priorityRank) ? Number(task.priorityRank) : null,
      deadline: task.deadline || null,
      createdAt: now,
      updatedAt: now,
      // Данные карточки задачи
      pomodoroSessions: [],
      totalTime: 0, // в секундах
      timeEstimateMin: normalizePositiveNumberOrNull(task.timeEstimateMin),
      timeEstimateUpdatedAt: normalizeNonNegativeNumber(task.timeEstimateUpdatedAt, null) || null,
      actualFocusSeconds: normalizeNonNegativeNumber(task.actualFocusSeconds, 0),
      estimateMode: normalizeEstimateMode(task.estimateMode),
      timeEstimateMinRange: normalizeTimeEstimateRange(task.timeEstimateMinRange),
      log: [
        {
          id: now.toString() + Math.random().toString(36).substr(2, 9),
          text: creationText,
          timestamp: now
        }
      ],
      nextSteps: [],
      pomodoroSettings: null, // null означает использование глобальных настроек
      link: null,
      completedAt: null,
      isRecurringParticipation: false,
      recurrenceDays: 3,
      recurrenceExecutionMode: normalizeRecurrenceExecutionMode(task.recurrenceExecutionMode, task),
      flowSkipCount: normalizeNonNegativeInteger(task.flowSkipCount, 0),
      workflowStatus: normalizeWorkflowStatus(task.workflowStatus),
      waitingFor: normalizeNullableText(task.waitingFor),
      waitingUntil: normalizeDateKeyOrNull(task.waitingUntil),
      waitingNote: normalizeNullableText(task.waitingNote),
      killedAt: null,
      backlogAt: null,
      ideaAt: null,
      events: [
        createTaskEvent('task_created', { source: 'manual' })
      ]
    };
    tasks.push(newTask);
    await this.saveTasks(tasks);
    return newTask;
  }

  // Обновить задачу
  async updateTask(taskId, updates) {
    const tasks = await this.getTasks();
    const index = tasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
      // Убеждаемся, что задача имеет все необходимые поля
      const task = tasks[index];
      if (!task.hasOwnProperty('status') || !['draft', 'ready'].includes(task.status)) {
        task.status = 'ready';
      }
      // Инициализируем поля карточки задачи, если их нет
      if (!task.hasOwnProperty('pomodoroSessions')) {
        task.pomodoroSessions = [];
      }
      if (!task.hasOwnProperty('totalTime') || !Number.isFinite(task.totalTime) || task.totalTime < 0) {
        task.totalTime = normalizeNonNegativeNumber(task.totalTime, 0);
      }
      if (!task.hasOwnProperty('log')) {
        task.log = [];
      }
      if (!task.hasOwnProperty('nextSteps')) {
        task.nextSteps = [];
      }
      if (!task.hasOwnProperty('pomodoroSettings')) {
        task.pomodoroSettings = null;
      }
      if (!task.hasOwnProperty('priorityRank')) {
        task.priorityRank = null;
      }
      if (!task.hasOwnProperty('link')) {
        task.link = null;
      }
      if (!task.hasOwnProperty('completedAt')) {
        task.completedAt = null;
      }
      if (!task.hasOwnProperty('isRecurringParticipation')) {
        task.isRecurringParticipation = false;
      }
      if (!task.hasOwnProperty('recurrenceDays')) {
        task.recurrenceDays = 3;
      }
      if (!task.hasOwnProperty('flowSkipCount') || !Number.isFinite(task.flowSkipCount) || task.flowSkipCount < 0) {
        task.flowSkipCount = 0;
      }
      const workflowFields = normalizeWorkflowTaskFields(task);
      task.workflowStatus = workflowFields.workflowStatus;
      task.waitingFor = workflowFields.waitingFor;
      task.waitingUntil = workflowFields.waitingUntil;
      task.waitingNote = workflowFields.waitingNote;
      task.killedAt = workflowFields.killedAt;
      task.backlogAt = workflowFields.backlogAt;
      task.ideaAt = workflowFields.ideaAt;
      task.events = workflowFields.events;
      task.nextSteps = normalizeNextSteps(task.nextSteps);
      task.recurrenceExecutionMode = normalizeRecurrenceExecutionMode(task.recurrenceExecutionMode, task);
      const normalizedUpdates = { ...updates };
      const hasValidActualFocusSeconds =
        task.hasOwnProperty('actualFocusSeconds') &&
        Number.isFinite(task.actualFocusSeconds) &&
        task.actualFocusSeconds >= 0;
      const taskTimeFields = normalizeTaskTimeFields(task, task.totalTime);
      task.timeEstimateMin = taskTimeFields.timeEstimateMin;
      task.timeEstimateUpdatedAt = taskTimeFields.timeEstimateUpdatedAt;
      task.estimateMode = taskTimeFields.estimateMode;
      task.timeEstimateMinRange = taskTimeFields.timeEstimateMinRange;
      delete task.timeConfidence;
      task.actualFocusSeconds = taskTimeFields.actualFocusSeconds;

      if (Object.prototype.hasOwnProperty.call(normalizedUpdates, 'status')) {
        normalizedUpdates.status = normalizeTaskStatus(normalizedUpdates.status);
      }
      if (Object.prototype.hasOwnProperty.call(normalizedUpdates, 'workflowStatus')) {
        normalizedUpdates.workflowStatus = normalizeWorkflowStatus(normalizedUpdates.workflowStatus);
      }
      if (Object.prototype.hasOwnProperty.call(normalizedUpdates, 'waitingFor')) {
        normalizedUpdates.waitingFor = normalizeNullableText(normalizedUpdates.waitingFor);
      }
      if (Object.prototype.hasOwnProperty.call(normalizedUpdates, 'waitingUntil')) {
        normalizedUpdates.waitingUntil = normalizeDateKeyOrNull(normalizedUpdates.waitingUntil);
      }
      if (Object.prototype.hasOwnProperty.call(normalizedUpdates, 'waitingNote')) {
        normalizedUpdates.waitingNote = normalizeNullableText(normalizedUpdates.waitingNote);
      }
      if (Object.prototype.hasOwnProperty.call(normalizedUpdates, 'killedAt')) {
        normalizedUpdates.killedAt = normalizeNonNegativeNumber(normalizedUpdates.killedAt, null) || null;
      }
      if (Object.prototype.hasOwnProperty.call(normalizedUpdates, 'backlogAt')) {
        normalizedUpdates.backlogAt = normalizeNonNegativeNumber(normalizedUpdates.backlogAt, null) || null;
      }
      if (Object.prototype.hasOwnProperty.call(normalizedUpdates, 'ideaAt')) {
        normalizedUpdates.ideaAt = normalizeNonNegativeNumber(normalizedUpdates.ideaAt, null) || null;
      }
      if (Object.prototype.hasOwnProperty.call(normalizedUpdates, 'events')) {
        normalizedUpdates.events = normalizeTaskEvents(normalizedUpdates.events);
      }
      if (Object.prototype.hasOwnProperty.call(normalizedUpdates, 'nextSteps')) {
        normalizedUpdates.nextSteps = normalizeNextSteps(normalizedUpdates.nextSteps);
      }
      if (Object.prototype.hasOwnProperty.call(normalizedUpdates, 'totalTime')) {
        normalizedUpdates.totalTime = normalizeNonNegativeNumber(normalizedUpdates.totalTime, task.totalTime);
      }
      if (Object.prototype.hasOwnProperty.call(normalizedUpdates, 'timeEstimateMin')) {
        normalizedUpdates.timeEstimateMin = normalizePositiveNumberOrNull(normalizedUpdates.timeEstimateMin);
      }
      if (Object.prototype.hasOwnProperty.call(normalizedUpdates, 'timeEstimateUpdatedAt')) {
        normalizedUpdates.timeEstimateUpdatedAt = normalizeNonNegativeNumber(normalizedUpdates.timeEstimateUpdatedAt, null) || null;
      }
      if (Object.prototype.hasOwnProperty.call(normalizedUpdates, 'estimateMode')) {
        normalizedUpdates.estimateMode = normalizeEstimateMode(normalizedUpdates.estimateMode);
      }
      if (Object.prototype.hasOwnProperty.call(normalizedUpdates, 'timeEstimateMinRange')) {
        normalizedUpdates.timeEstimateMinRange = normalizeTimeEstimateRange(normalizedUpdates.timeEstimateMinRange);
      }
      delete normalizedUpdates.timeConfidence;
      if (Object.prototype.hasOwnProperty.call(normalizedUpdates, 'actualFocusSeconds')) {
        normalizedUpdates.actualFocusSeconds = normalizeNonNegativeNumber(
          normalizedUpdates.actualFocusSeconds,
          Object.prototype.hasOwnProperty.call(normalizedUpdates, 'totalTime') ? normalizedUpdates.totalTime : task.totalTime
        );
      } else if (!hasValidActualFocusSeconds) {
        normalizedUpdates.actualFocusSeconds = normalizeNonNegativeNumber(
          task.actualFocusSeconds,
          Object.prototype.hasOwnProperty.call(normalizedUpdates, 'totalTime') ? normalizedUpdates.totalTime : task.totalTime
        );
      }
      if (Object.prototype.hasOwnProperty.call(normalizedUpdates, 'flowSkipCount')) {
        normalizedUpdates.flowSkipCount = normalizeNonNegativeInteger(normalizedUpdates.flowSkipCount, task.flowSkipCount);
      }
      if (Object.prototype.hasOwnProperty.call(normalizedUpdates, 'recurrenceExecutionMode')) {
        normalizedUpdates.recurrenceExecutionMode = normalizeRecurrenceExecutionMode(
          normalizedUpdates.recurrenceExecutionMode,
          { ...task, ...normalizedUpdates }
        );
      }
      if (Object.prototype.hasOwnProperty.call(normalizedUpdates, 'isRecurringParticipation')) {
        normalizedUpdates.isRecurringParticipation = normalizedUpdates.isRecurringParticipation === true;
        if (!normalizedUpdates.isRecurringParticipation) {
          normalizedUpdates.recurrenceExecutionMode = 'needs_next_action';
        } else if (!Object.prototype.hasOwnProperty.call(normalizedUpdates, 'recurrenceExecutionMode')) {
          normalizedUpdates.recurrenceExecutionMode = normalizeRecurrenceExecutionMode(
            task.recurrenceExecutionMode,
            { ...task, ...normalizedUpdates }
          );
        }
      }

      tasks[index] = {
        ...task,
        ...normalizedUpdates,
        updatedAt: Date.now()
      };
      await this.saveTasks(tasks);
      return tasks[index];
    }
    return null;
  }

  // Удалить задачу
  async deleteTask(taskId) {
    const tasks = await this.getTasks();
    const filtered = tasks.filter(t => t.id !== taskId);
    await this.saveTasks(filtered);
    return filtered;
  }

  // Переключить статус задачи
  async toggleTask(taskId) {
    const tasks = await this.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const willComplete = !task.completed;
      const updates = { completed: willComplete };
      if (willComplete) {
        const now = Date.now();
        updates.completedAt = now;
        const log = task.log || [];
        log.unshift({
          id: now.toString() + Math.random().toString(36).substr(2, 9),
          text: `Завершено: ${new Date(now).toLocaleString('ru-RU')}`,
          timestamp: now
        });
        updates.log = log;
        updates.events = [
          ...normalizeTaskEvents(task.events),
          createTaskEvent('task_completed', {})
        ];
      } else {
        updates.completedAt = null;
        updates.events = [
          ...normalizeTaskEvents(task.events),
          createTaskEvent('task_reopened', {})
        ];
      }
      return await this.updateTask(taskId, updates);
    }
    return null;
  }

  // Получить категории
  async getCategories() {
    const data = await this.getAll();
    return data.categories;
  }

  // Добавить категорию
  async addCategory(categoryName) {
    const data = await this.getAll();
    if (!data.categories.includes(categoryName)) {
      data.categories.push(categoryName);
      chrome.storage.local.set({ categories: data.categories }, () => {});
    }
    return data.categories;
  }

  // Получить настройки
  async getSettings() {
    const data = await this.getAll();
    return data.settings;
  }

  // Обновить настройки
  async updateSettings(settings) {
    const data = await this.getAll();
    const nextSettings = { ...settings };
    if (Object.prototype.hasOwnProperty.call(nextSettings, 'activeFlowTimeWindowMin')) {
      nextSettings.activeFlowTimeWindowMin = normalizeFlowTimeWindowMin(nextSettings.activeFlowTimeWindowMin);
    }
    if (Object.prototype.hasOwnProperty.call(nextSettings, 'dailyCapacityMin')) {
      nextSettings.dailyCapacityMin = normalizeDailyCapacityMin(nextSettings.dailyCapacityMin);
    }
    const newSettings = { ...data.settings, ...nextSettings };
    chrome.storage.local.set({ settings: newSettings }, () => {});
    return newSettings;
  }

  // Получить данные карточки задачи
  async getTaskCardData(taskId) {
    const tasks = await this.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return null;
    
    return {
      pomodoroSessions: task.pomodoroSessions || [],
      totalTime: task.totalTime || 0,
      actualFocusSeconds: task.actualFocusSeconds || 0,
      log: task.log || [],
      nextSteps: normalizeNextSteps(task.nextSteps || []),
      events: normalizeTaskEvents(task.events || []),
      pomodoroSettings: task.pomodoroSettings || null
    };
  }

  // Обновить данные карточки задачи
  async updateTaskCardData(taskId, data, options) {
    const opts = options || {};
    const tasks = await this.getTasks();
    const index = tasks.findIndex(t => t.id === taskId);
    if (index === -1) return null;

    const task = tasks[index];
    const updates = {};
    if (data.pomodoroSessions !== undefined) updates.pomodoroSessions = data.pomodoroSessions;
    if (data.totalTime !== undefined) updates.totalTime = data.totalTime;
    if (data.actualFocusSeconds !== undefined) updates.actualFocusSeconds = data.actualFocusSeconds;
    if (data.log !== undefined) updates.log = data.log;
    if (data.nextSteps !== undefined) updates.nextSteps = normalizeNextSteps(data.nextSteps);
    if (data.events !== undefined) updates.events = normalizeTaskEvents(data.events);
    if (data.pomodoroSettings !== undefined) updates.pomodoroSettings = data.pomodoroSettings;

    if (opts.syncDeadlineToToday && !task.completed) {
      var todayKey =
        typeof window !== 'undefined' &&
        window.dateUtils &&
        typeof window.dateUtils.todayKey === 'function'
          ? window.dateUtils.todayKey()
          : null;
      if (!todayKey) {
        var d = new Date();
        var y = d.getFullYear();
        var m = String(d.getMonth() + 1).padStart(2, '0');
        var day = String(d.getDate()).padStart(2, '0');
        todayKey = y + '-' + m + '-' + day;
      }
      var overdue =
        typeof window !== 'undefined' &&
        window.dateUtils &&
        typeof window.dateUtils.isDeadlineOverdue === 'function'
          ? window.dateUtils.isDeadlineOverdue(task.deadline)
          : (function () {
              var part = task.deadline ? String(task.deadline).split('T')[0] : '';
              return /^\d{4}-\d{2}-\d{2}$/.test(part) && part < todayKey;
            })();
      if (overdue) {
        updates.deadline = todayKey;
      }
    }

    return await this.updateTask(taskId, updates);
  }

  // Добавить сессию помодоро
  async addPomodoroSession(taskId, session) {
    const tasks = await this.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return null;

    const sessions = task.pomodoroSessions || [];
    sessions.push({
      ...session,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    });

    // Обновляем общее время
    const sessionDuration = session.duration || 0; // в минутах
    const totalTime = (task.totalTime || 0) + sessionDuration;
    const actualFocusSeconds = (task.actualFocusSeconds || 0) + sessionDuration;

    return await this.updateTaskCardData(
      taskId,
      {
        pomodoroSessions: sessions,
        totalTime: totalTime,
        actualFocusSeconds: actualFocusSeconds
      },
      {}
    );
  }

  // Добавить запись в лог
  async addLogEntry(taskId, text) {
    const tasks = await this.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return null;

    const log = task.log || [];
    log.unshift({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text: text,
      timestamp: Date.now()
    });

    return await this.updateTaskCardData(taskId, { log }, { syncDeadlineToToday: true });
  }

  async addTaskEvent(taskId, type, payload) {
    const tasks = await this.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return null;
    const events = [
      ...normalizeTaskEvents(task.events),
      createTaskEvent(type, payload)
    ];
    return await this.updateTask(taskId, { events });
  }

  // Обновить следующие шаги
  async updateNextSteps(taskId, steps) {
    return await this.updateTaskCardData(
      taskId,
      { nextSteps: steps },
      { syncDeadlineToToday: true }
    );
  }

  // Получить глобальные настройки помодоро
  async getGlobalPomodoroSettings() {
    const settings = await this.getSettings();
    return settings.globalPomodoroSettings || this.defaultData.settings.globalPomodoroSettings;
  }

  // Обновить глобальные настройки помодоро
  async updateGlobalPomodoroSettings(newSettings) {
    const settings = await this.getSettings();
    const updatedSettings = {
      ...settings,
      globalPomodoroSettings: {
        ...settings.globalPomodoroSettings,
        ...newSettings
      }
    };
    return await this.updateSettings(updatedSettings);
  }

  // Получить настройки помодоро для задачи (с учетом глобальных)
  async getTaskPomodoroSettings(taskId) {
    const tasks = await this.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return null;

    if (task.pomodoroSettings) {
      return task.pomodoroSettings;
    }

    return await this.getGlobalPomodoroSettings();
  }

  // Обновить настройки помодоро для задачи
  async updateTaskPomodoroSettings(taskId, settings) {
    return await this.updateTaskCardData(taskId, { pomodoroSettings: settings }, {});
  }
}

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
}
