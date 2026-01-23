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
      alert('Поддерживаются только файлы .swiper или .json');
      return;
    }

    try {
      const content = await file.text();
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed)) {
        alert('Файл должен содержать массив задач.');
        return;
      }
      const validation = validateImportedTasks(parsed);
      if (!validation.ok) {
        alert(`Файл сломан: ${validation.error}`);
        return;
      }

      const confirmed = confirm('Импорт перезапишет все текущие задачи. Продолжить?');
      if (!confirmed) return;

      await storage.saveTasks(parsed);
      if (typeof onAfterImport === 'function') {
        await onAfterImport();
      }
      alert('Задачи успешно импортированы.');
    } catch (error) {
      console.error('Ошибка при импорте задач:', error);
      alert('Не удалось импортировать задачи. Проверьте формат файла.');
    }
  }

  function validateImportedTasks(tasks) {
    const expectedKeys = [
      'id',
      'text',
      'completed',
      'category',
      'priority',
      'deadline',
      'createdAt',
      'updatedAt',
      'postponeCount',
      'lastPostponed',
      'pomodoroSessions',
      'totalTime',
      'log',
      'nextSteps',
      'pomodoroSettings'
    ];
    const expectedKeySet = new Set(expectedKeys);

    for (let i = 0; i < tasks.length; i += 1) {
      const task = tasks[i];
      if (!task || typeof task !== 'object' || Array.isArray(task)) {
        return { ok: false, error: `Задача #${i + 1} имеет неверный формат.` };
      }
      const keys = Object.keys(task);
      for (const key of keys) {
        if (!expectedKeySet.has(key)) {
          return { ok: false, error: `Лишнее поле "${key}" в задаче #${i + 1}.` };
        }
      }
      for (const requiredKey of expectedKeys) {
        if (!Object.prototype.hasOwnProperty.call(task, requiredKey)) {
          return { ok: false, error: `Отсутствует поле "${requiredKey}" в задаче #${i + 1}.` };
        }
      }
      if (typeof task.id !== 'string' || !task.id.trim()) {
        return { ok: false, error: `Поле id в задаче #${i + 1} должно быть непустой строкой.` };
      }
      if (typeof task.text !== 'string' || !task.text.trim()) {
        return { ok: false, error: `Поле text в задаче #${i + 1} должно быть непустой строкой.` };
      }
      if (typeof task.completed !== 'boolean') {
        return { ok: false, error: `Поле completed в задаче #${i + 1} должно быть boolean.` };
      }
      if (typeof task.category !== 'string') {
        return { ok: false, error: `Поле category в задаче #${i + 1} должно быть строкой.` };
      }
      if (typeof task.priority !== 'string') {
        return { ok: false, error: `Поле priority в задаче #${i + 1} должно быть строкой.` };
      }
      if (task.deadline !== null && typeof task.deadline !== 'string') {
        return { ok: false, error: `Поле deadline в задаче #${i + 1} должно быть строкой или null.` };
      }
      if (typeof task.createdAt !== 'number' || Number.isNaN(task.createdAt)) {
        return { ok: false, error: `Поле createdAt в задаче #${i + 1} должно быть числом.` };
      }
      if (typeof task.updatedAt !== 'number' || Number.isNaN(task.updatedAt)) {
        return { ok: false, error: `Поле updatedAt в задаче #${i + 1} должно быть числом.` };
      }
      if (typeof task.postponeCount !== 'number' || Number.isNaN(task.postponeCount)) {
        return { ok: false, error: `Поле postponeCount в задаче #${i + 1} должно быть числом.` };
      }
      if (task.lastPostponed !== null && typeof task.lastPostponed !== 'number') {
        return { ok: false, error: `Поле lastPostponed в задаче #${i + 1} должно быть числом или null.` };
      }
      if (!Array.isArray(task.pomodoroSessions)) {
        return { ok: false, error: `Поле pomodoroSessions в задаче #${i + 1} должно быть массивом.` };
      }
      if (typeof task.totalTime !== 'number' || Number.isNaN(task.totalTime)) {
        return { ok: false, error: `Поле totalTime в задаче #${i + 1} должно быть числом.` };
      }
      if (!Array.isArray(task.log)) {
        return { ok: false, error: `Поле log в задаче #${i + 1} должно быть массивом.` };
      }
      if (!Array.isArray(task.nextSteps)) {
        return { ok: false, error: `Поле nextSteps в задаче #${i + 1} должно быть массивом.` };
      }
      if (task.pomodoroSettings !== null && typeof task.pomodoroSettings !== 'object') {
        return { ok: false, error: `Поле pomodoroSettings в задаче #${i + 1} должно быть объектом или null.` };
      }

      const sessionsValidation = validatePomodoroSessions(task.pomodoroSessions, i + 1);
      if (!sessionsValidation.ok) return sessionsValidation;
      const logValidation = validateLogEntries(task.log, i + 1);
      if (!logValidation.ok) return logValidation;
      const stepsValidation = validateNextSteps(task.nextSteps, i + 1);
      if (!stepsValidation.ok) return stepsValidation;
      const settingsValidation = validatePomodoroSettings(task.pomodoroSettings, i + 1);
      if (!settingsValidation.ok) return settingsValidation;
    }

    return { ok: true };
  }

  function validateKeys(obj, allowedKeys, requiredKeys) {
    const keySet = new Set(allowedKeys);
    const keys = Object.keys(obj);
    for (const key of keys) {
      if (!keySet.has(key)) {
        return { ok: false, error: `Лишнее поле "${key}".` };
      }
    }
    for (const requiredKey of requiredKeys) {
      if (!Object.prototype.hasOwnProperty.call(obj, requiredKey)) {
        return { ok: false, error: `Отсутствует поле "${requiredKey}".` };
      }
    }
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
      const allowedKeys = ['id', 'text', 'completed', 'order'];
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
