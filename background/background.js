// Background Service Worker для напоминаний о дедлайнах
importScripts('../shared/logger.js', '../shared/date-utils.js');

// Обработчик клика на иконку расширения
chrome.action.onClicked.addListener((tab) => {
  // Открываем основной раздел расширения в новой вкладке
  chrome.tabs.create({
    url: chrome.runtime.getURL('main.html')
  });
});

// Обработчик установки расширения
chrome.runtime.onInstalled.addListener(() => {
  self.logger.info('Todo расширение установлено');
  checkDeadlines();
});

// Обработчик запуска расширения
chrome.runtime.onStartup.addListener(() => {
  checkDeadlines();
});

var DEADLINE_DEBOUNCE_MS = 400;
var deadlineSyncTimer = null;

function createAlarmsForTask(task, now, oneDay) {
  if (!task || !task.deadline || task.completed) return;
  var deadlineDate = dateUtils.parseLocalDateKey(task.deadline);
  if (!deadlineDate || Number.isNaN(deadlineDate.getTime())) return;
  var deadlineTime = deadlineDate.getTime();
  var timeUntilDeadline = deadlineTime - now;

  if (timeUntilDeadline > 0 && timeUntilDeadline <= oneDay * 2) {
    var reminderTime = deadlineTime - oneDay;
    if (reminderTime > now) {
      chrome.alarms.create('deadline_' + task.id + '_reminder', { when: reminderTime });
    }
  }
  if (timeUntilDeadline > 0 && timeUntilDeadline <= oneDay) {
    chrome.alarms.create('deadline_' + task.id + '_today', { when: deadlineTime });
  }
}

/**
 * Инкрементальный sync: обновляет алармы только для задач, у которых изменились deadline или completed.
 */
async function syncDeadlineAlarmsIncremental(prevTasks, nextTasks) {
  try {
    var prev = prevTasks || [];
    var next = nextTasks || [];
    var prevMap = new Map(prev.map(function (t) { return [t.id, t]; }));
    var nextMap = new Map(next.map(function (t) { return [t.id, t]; }));
    var changedIds = new Set();
    var allIds = new Set([].concat(Array.from(prevMap.keys()), Array.from(nextMap.keys())));
    allIds.forEach(function (id) {
      var p = prevMap.get(id);
      var n = nextMap.get(id);
      if (!p && n) changedIds.add(id);
      else if (p && !n) changedIds.add(id);
      else if (p && n && (p.deadline !== n.deadline || p.completed !== n.completed)) changedIds.add(id);
    });

    var alarms = await chrome.alarms.getAll();
    alarms.forEach(function (alarm) {
      if (!alarm.name.startsWith('deadline_')) return;
      var parts = alarm.name.split('_');
      var taskId = parts[1];
      if (changedIds.has(taskId)) {
        chrome.alarms.clear(alarm.name);
      }
    });

    var now = Date.now();
    var oneDay = 24 * 60 * 60 * 1000;
    changedIds.forEach(function (taskId) {
      var task = nextMap.get(taskId);
      createAlarmsForTask(task, now, oneDay);
    });
  } catch (err) {
    self.logger.error('Ошибка инкрементального sync дедлайнов:', err);
  }
}

// Полная проверка дедлайнов (при старте/установке) или инкрементальный sync при наличии old/new
async function checkDeadlines(prevTasks, nextTasks) {
  try {
    var tasks = nextTasks;
    if (!tasks) {
      var data = await chrome.storage.local.get(['tasks']);
      tasks = data.tasks || [];
    }

    if (prevTasks && nextTasks) {
      await syncDeadlineAlarmsIncremental(prevTasks, nextTasks);
      return;
    }

    var alarms = await chrome.alarms.getAll();
    alarms.forEach(function (alarm) {
      if (alarm.name.startsWith('deadline_')) {
        chrome.alarms.clear(alarm.name);
      }
    });

    var now = Date.now();
    var oneDay = 24 * 60 * 60 * 1000;
    tasks.forEach(function (task) {
      createAlarmsForTask(task, now, oneDay);
    });
  } catch (error) {
    self.logger.error('Ошибка при проверке дедлайнов:', error);
  }
}

// Обработчик срабатывания напоминания
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith('deadline_')) {
    const taskId = alarm.name.split('_')[1];
    
    try {
      const data = await chrome.storage.local.get(['tasks']);
      const tasks = data.tasks || [];
      const task = tasks.find(t => t.id === taskId);

      if (task && !task.completed) {
        const todayKey = dateUtils.todayKey();
        const cmp = dateUtils.compareDateKeys(task.deadline, todayKey);
        const isOverdue = cmp < 0;
        const isToday = cmp === 0;

        let message = '';
        if (isOverdue) {
          message = `Задача "${task.text}" просрочена!`;
        } else if (isToday) {
          message = `Сегодня дедлайн для задачи "${task.text}"`;
        } else {
          message = `Завтра дедлайн для задачи "${task.text}"`;
        }

        // Показ уведомления
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'assets/icons/icon48.png',
          title: 'Напоминание о дедлайне',
          message: message,
          priority: isOverdue ? 2 : 1
        });
      }
    } catch (error) {
      self.logger.error('Ошибка при обработке напоминания:', error);
    }
  } else if (alarm.name.startsWith('pomodoro_')) {
    // Обработка помодоро-таймера
    await handlePomodoroAlarm(alarm);
  }
});

// Обработка помодоро-аларма
async function handlePomodoroAlarm(alarm) {
  try {
    const alarmName = alarm.name;
    
    if (alarmName.startsWith('pomodoro_break_')) {
      // Завершение перерыва
      const taskId = alarmName.replace('pomodoro_break_', '');
      await handlePomodoroBreakEnd(taskId);
    } else if (alarmName.startsWith('pomodoro_')) {
      // Завершение помодоро-сессии
      const taskId = alarmName.replace('pomodoro_', '');
      await handlePomodoroSessionEnd(taskId);
    }
  } catch (error) {
    self.logger.error('Ошибка при обработке помодоро-аларма:', error);
  }
}

// Обработка завершения помодоро-сессии
async function handlePomodoroSessionEnd(taskId) {
  try {
    const data = await chrome.storage.local.get(['tasks']);
    const tasks = data.tasks || [];
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) return;

    // Получаем настройки помодоро
    const settings = await chrome.storage.local.get(['settings']);
    const globalSettings = settings.settings?.globalPomodoroSettings || {
      interval: 25,
      shortBreak: 5,
      longBreak: 15,
      longBreakAfter: 4
    };
    const taskSettings = task.pomodoroSettings || globalSettings;

    // Получаем данные о текущей сессии из storage
    const sessionData = await chrome.storage.local.get([`pomodoro_session_${taskId}`]);
    const sessionInfo = sessionData[`pomodoro_session_${taskId}`];
    
    if (!sessionInfo) return;

    const sessionDurationMinutes = taskSettings.interval; // в минутах
    const startTime = sessionInfo.startTime;
    const endTime = Date.now();
    
    // Вычисляем точное время сессии в секундах
    const sessionDurationSeconds = Math.floor((endTime - startTime) / 1000) + 1;

    // Добавляем сессию в историю
    const sessions = task.pomodoroSessions || [];
    sessions.push({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      startTime: startTime,
      endTime: endTime,
      duration: sessionDurationMinutes
    });

    // Обновляем общее время (накопительным итогом) в секундах
    // totalTime хранится в секундах
    const currentTotalTimeSeconds = Math.floor(Number(task.totalTime) || 0); // Убеждаемся, что это число в секундах
    const totalTimeSeconds = currentTotalTimeSeconds + sessionDurationSeconds;

    // Обновляем задачу
    const updatedTasks = tasks.map(t => 
      t.id === taskId 
            ? {
                ...t,
                pomodoroSessions: sessions,
                totalTime: totalTimeSeconds
              }
        : t
    );

    await chrome.storage.local.set({ tasks: updatedTasks });

    // Удаляем данные сессии
    await chrome.storage.local.remove([`pomodoro_session_${taskId}`]);

    // Определяем, нужен ли длинный перерыв
    const completedSessions = sessions.filter(s => s.endTime).length;
    const isLongBreak = completedSessions > 0 && completedSessions % taskSettings.longBreakAfter === 0;
    const breakDuration = isLongBreak ? taskSettings.longBreak : taskSettings.shortBreak;

    // Показываем уведомление
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icons/icon48.png',
      title: 'Помодоро завершен!',
      message: `Задача "${task.text}" - время для ${isLongBreak ? 'длинного' : 'короткого'} перерыва (${breakDuration} мин)`,
      priority: 2
    });

    // Автоматически запускаем перерыв, если нужно
    if (breakDuration > 0) {
      await startPomodoroBreak(taskId, breakDuration);
    }
  } catch (error) {
    self.logger.error('Ошибка при завершении помодоро-сессии:', error);
  }
}

// Обработка завершения перерыва
async function handlePomodoroBreakEnd(taskId) {
  try {
    const data = await chrome.storage.local.get(['tasks']);
    const tasks = data.tasks || [];
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) return;

    // Удаляем данные перерыва
    await chrome.storage.local.remove([`pomodoro_break_${taskId}`]);

    // Показываем уведомление
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icons/icon48.png',
      title: 'Перерыв завершен',
      message: `Перерыв для задачи "${task.text}" завершен. Можно продолжать работу!`,
      priority: 1
    });
  } catch (error) {
    self.logger.error('Ошибка при завершении перерыва:', error);
  }
}

// Запуск помодоро-перерыва
async function startPomodoroBreak(taskId, durationMinutes) {
  const breakAlarmName = `pomodoro_break_${taskId}`;
  
  // Сохраняем информацию о перерыве
  await chrome.storage.local.set({
    [`pomodoro_break_${taskId}`]: {
      startTime: Date.now(),
      duration: durationMinutes
    }
  });

  // Создаем аларм для перерыва
  chrome.alarms.create(breakAlarmName, {
    delayInMinutes: durationMinutes
  });
}

// Обработчик сообщений от popup для управления помодоро
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startPomodoro') {
    startPomodoro(request.taskId, request.durationMinutes)
      .then(() => sendResponse({ success: true }))
      .catch(error => {
        self.logger.error('Ошибка при запуске помодоро:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Асинхронный ответ
  } else if (request.action === 'stopPomodoro') {
    stopPomodoro(request.taskId)
      .then(() => sendResponse({ success: true }))
      .catch(error => {
        self.logger.error('Ошибка при остановке помодоро:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  } else if (request.action === 'getPomodoroStatus') {
    getPomodoroStatus(request.taskId)
      .then(status => sendResponse({ success: true, status }))
      .catch(error => {
        self.logger.error('Ошибка при получении статуса помодоро:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  } else if (request.action === 'showPomodoroNotification') {
    const title = request.title || 'Уведомление';
    const message = request.message || '';
    const iconUrl = chrome.runtime.getURL('assets/icons/icon128.png');
    const fallbackIconUrl = `data:image/svg+xml;utf8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="24" fill="#4f6d7b"/><path d="M64 30c-15.5 0-28 12.5-28 28v16l-6 10h68l-6-10V58c0-15.5-12.5-28-28-28zm0 74c6.6 0 12-5.4 12-12H52c0 6.6 5.4 12 12 12z" fill="#fff"/></svg>'
    )}`;

    self.logger.info('showNotification via chrome.notifications');
    chrome.notifications.create({
      type: 'basic',
      iconUrl: iconUrl || fallbackIconUrl,
      title,
      message,
      priority: 1
    }, () => {
      const error = chrome.runtime.lastError;
      if (error && self?.registration?.showNotification) {
        self.logger.info('showNotification via service worker');
        self.registration.showNotification(title, {
          body: message,
          icon: iconUrl,
          badge: iconUrl
        }).catch(() => {
          self.registration.showNotification(title, {
            body: message,
            icon: fallbackIconUrl,
            badge: fallbackIconUrl
          });
        });
      }
      if (error) {
        self.logger.error('Ошибка уведомления:', error.message);
      }
      sendResponse({ success: !error, error: error?.message });
    });
    return true;
  }
});

// Запуск помодоро-таймера
async function startPomodoro(taskId, durationMinutes) {
  // Проверяем, нет ли уже активного помодоро для другой задачи
  const alarms = await chrome.alarms.getAll();
  const activePomodoro = alarms.find(a => 
    a.name.startsWith('pomodoro_') && 
    !a.name.startsWith('pomodoro_break_') &&
    a.name !== `pomodoro_${taskId}`
  );

  if (activePomodoro) {
    throw new Error('Уже запущен помодоро-таймер для другой задачи');
  }

  const alarmName = `pomodoro_${taskId}`;
  
  // Сохраняем информацию о сессии
  await chrome.storage.local.set({
    [`pomodoro_session_${taskId}`]: {
      startTime: Date.now(),
      duration: durationMinutes
    }
  });

  // Создаем аларм
  chrome.alarms.create(alarmName, {
    delayInMinutes: durationMinutes
  });
}

// Остановка помодоро-таймера
async function stopPomodoro(taskId) {
  const alarmName = `pomodoro_${taskId}`;
  const breakAlarmName = `pomodoro_break_${taskId}`;
  
  // Получаем данные о текущей сессии перед удалением
  const sessionData = await chrome.storage.local.get([`pomodoro_session_${taskId}`]);
  const sessionInfo = sessionData[`pomodoro_session_${taskId}`];
  
  // Если есть активная помодоро-сессия, сохраняем затраченное время
  if (sessionInfo) {
    const startTime = sessionInfo.startTime;
    const now = Date.now();
    const elapsedMinutes = Math.floor((now - startTime) / 60000); // время в минутах
    
    // Получаем задачу и обновляем общее время
    const data = await chrome.storage.local.get(['tasks']);
    const tasks = data.tasks || [];
    const task = tasks.find(t => t.id === taskId);
    
    if (task) {
      // Вычисляем прошедшее время в секундах (точное значение)
      const elapsedSeconds = Math.floor((now - startTime) / 1000) + 1;
      
      // Добавляем сессию в историю (незавершенную), даже если время небольшое
      const sessions = task.pomodoroSessions || [];
      if (elapsedSeconds >= 0) { // Сохраняем даже 0 секунд для точности
        const elapsedMinutes = Math.ceil(elapsedSeconds / 60); // Для истории в минутах
        sessions.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          startTime: startTime,
          endTime: now,
          duration: elapsedMinutes
        });
        
        // Обновляем общее время (накопительным итогом) в секундах
        // totalTime хранится в секундах
        const currentTotalTimeSeconds = Math.floor(Number(task.totalTime) || 0); // Убеждаемся, что это число в секундах
        const totalTimeSeconds = currentTotalTimeSeconds + elapsedSeconds;
        
        // Обновляем задачу
        const updatedTasks = tasks.map(t => 
          t.id === taskId 
            ? {
                ...t,
                pomodoroSessions: sessions,
                totalTime: totalTimeSeconds
              }
            : t
        );
        
        await chrome.storage.local.set({ tasks: updatedTasks });
        self.logger.info('Сохранено время для задачи ' + taskId + ': ' + elapsedSeconds + ' секунд. Общее время: ' + totalTimeSeconds + ' секунд (было: ' + currentTotalTimeSeconds + ')');
      }
    }
  }
  
  // Очищаем алармы
  await chrome.alarms.clear(alarmName);
  await chrome.alarms.clear(breakAlarmName);
  
  // Удаляем данные сессии
  await chrome.storage.local.remove([
    `pomodoro_session_${taskId}`,
    `pomodoro_break_${taskId}`
  ]);
}

// Получение статуса помодоро
async function getPomodoroStatus(taskId) {
  const alarms = await chrome.alarms.getAll();
  const pomodoroAlarm = alarms.find(a => a.name === `pomodoro_${taskId}`);
  const breakAlarm = alarms.find(a => a.name === `pomodoro_break_${taskId}`);
  
  const sessionData = await chrome.storage.local.get([`pomodoro_session_${taskId}`]);
  const sessionInfo = sessionData[`pomodoro_session_${taskId}`];

  if (pomodoroAlarm && sessionInfo) {
    const remaining = Math.max(0, pomodoroAlarm.scheduledTime - Date.now());
    return {
      active: true,
      type: 'pomodoro',
      startTime: sessionInfo.startTime,
      duration: sessionInfo.duration,
      remaining: remaining
    };
  } else if (breakAlarm) {
    const breakData = await chrome.storage.local.get([`pomodoro_break_${taskId}`]);
    const breakInfo = breakData[`pomodoro_break_${taskId}`];
    const remaining = Math.max(0, breakAlarm.scheduledTime - Date.now());
    return {
      active: true,
      type: 'break',
      startTime: breakInfo?.startTime || Date.now(),
      duration: breakInfo?.duration || 5,
      remaining: remaining
    };
  }

  return { active: false };
}

// Слушатель изменений в хранилище: debounce и инкрементальный sync при наличии old/new
chrome.storage.onChanged.addListener(function (changes, areaName) {
  if (areaName !== 'local' || !changes.tasks) return;
  var oldVal = changes.tasks.oldValue;
  var newVal = changes.tasks.newValue;
  if (deadlineSyncTimer) clearTimeout(deadlineSyncTimer);
  deadlineSyncTimer = setTimeout(function () {
    deadlineSyncTimer = null;
    checkDeadlines(oldVal, newVal);
  }, DEADLINE_DEBOUNCE_MS);
});

// Периодическая проверка дедлайнов (каждый час)
chrome.alarms.create('periodic_deadline_check', {
  periodInMinutes: 60
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'periodic_deadline_check') {
    checkDeadlines();
  }
});

