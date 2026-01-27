// Модуль для работы с chrome.storage.local

class StorageManager {
  constructor() {
    this.defaultData = {
      tasks: [],
      categories: ['Работа', 'Личное', 'Покупки'],
      settings: {
        defaultCategory: '',
        showCompleted: true,
        taskDisplayMode: 'all', // 'all' или 'today'
        globalPomodoroSettings: {
          interval: 25, // минут
          shortBreak: 5, // минут
          longBreak: 15, // минут
          longBreakAfter: 4 // количество сессий до длинного перерыва
        }
      },
      swiperSettings: {
        postponeThreshold: 5,
        sessionPostponed: []
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
            categories: data.categories || this.defaultData.categories,
            swiperSettings: data.swiperSettings || this.defaultData.swiperSettings
          };

          // Обновляем настройки, добавляя глобальные настройки помодоро если их нет
          if (!mergedData.settings.globalPomodoroSettings) {
            mergedData.settings.globalPomodoroSettings = this.defaultData.settings.globalPomodoroSettings;
          }
          
          // Добавляем taskDisplayMode если его нет
          if (!mergedData.settings.taskDisplayMode) {
            mergedData.settings.taskDisplayMode = this.defaultData.settings.taskDisplayMode;
          }

          // Инициализируем новые поля для существующих задач
          if (mergedData.tasks && Array.isArray(mergedData.tasks)) {
            mergedData.tasks = mergedData.tasks.map(task => ({
              ...task,
              pomodoroSessions: task.pomodoroSessions || [],
              totalTime: task.totalTime || 0,
              log: task.log || [],
              nextSteps: task.nextSteps || [],
              pomodoroSettings: task.pomodoroSettings !== undefined ? task.pomodoroSettings : null,
              link: task.link || null,
              completedAt: task.completedAt || null,
              swiperHiddenUntil: task.swiperHiddenUntil || null
            }));
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
          settings: data.settings || this.defaultData.settings,
          swiperSettings: data.swiperSettings || this.defaultData.swiperSettings
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
      completed: false,
      category: task.category || '',
      priority: task.priority || 'medium',
      deadline: task.deadline || null,
      createdAt: now,
      updatedAt: now,
      postponeCount: 0,
      lastPostponed: null,
      // Данные карточки задачи
      pomodoroSessions: [],
      totalTime: 0, // в секундах
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
      swiperHiddenUntil: null
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
      if (!task.hasOwnProperty('postponeCount')) {
        task.postponeCount = 0;
      }
      if (!task.hasOwnProperty('lastPostponed')) {
        task.lastPostponed = null;
      }
      // Инициализируем поля карточки задачи, если их нет
      if (!task.hasOwnProperty('pomodoroSessions')) {
        task.pomodoroSessions = [];
      }
      if (!task.hasOwnProperty('totalTime')) {
        task.totalTime = 0;
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
      if (!task.hasOwnProperty('link')) {
        task.link = null;
      }
      if (!task.hasOwnProperty('completedAt')) {
        task.completedAt = null;
      }
      if (!task.hasOwnProperty('swiperHiddenUntil')) {
        task.swiperHiddenUntil = null;
      }

      tasks[index] = {
        ...task,
        ...updates,
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
      } else {
        updates.completedAt = null;
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

  // Удалить категорию
  async removeCategory(categoryName) {
    const data = await this.getAll();
    data.categories = data.categories.filter(c => c !== categoryName);
    chrome.storage.local.set({ categories: data.categories }, () => {});
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
    const newSettings = { ...data.settings, ...settings };
    chrome.storage.local.set({ settings: newSettings }, () => {});
    return newSettings;
  }

  // Получить настройки ТаскСвайпер
  async getSwiperSettings() {
    const data = await this.getAll();
    return data.swiperSettings || this.defaultData.swiperSettings;
  }

  // Обновить настройки ТаскСвайпер
  async updateSwiperSettings(settings) {
    const data = await this.getAll();
    const newSettings = { ...data.swiperSettings || this.defaultData.swiperSettings, ...settings };
    chrome.storage.local.set({ swiperSettings: newSettings }, () => {});
    return newSettings;
  }

  // Добавить задачу в сессию отложенных
  async addToSessionPostponed(taskId) {
    const settings = await this.getSwiperSettings();
    if (!settings.sessionPostponed.includes(taskId)) {
      settings.sessionPostponed.push(taskId);
      await this.updateSwiperSettings({ sessionPostponed: settings.sessionPostponed });
    }
    return settings.sessionPostponed;
  }

  // Очистить сессию отложенных
  async clearSessionPostponed() {
    await this.updateSwiperSettings({ sessionPostponed: [] });
  }

  // Увеличить счетчик отложений задачи
  async incrementPostponeCount(taskId) {
    const tasks = await this.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const currentCount = task.postponeCount || 0;
      return await this.updateTask(taskId, {
        postponeCount: currentCount + 1,
        lastPostponed: Date.now()
      });
    }
    return null;
  }

  // Сбросить счетчик отложений задачи
  async resetPostponeCount(taskId) {
    return await this.updateTask(taskId, {
      postponeCount: 0,
      lastPostponed: null
    });
  }

  // Получить часто откладываемые задачи
  async getFrequentlyPostponed(threshold) {
    const tasks = await this.getTasks();
    const settings = await this.getSwiperSettings();
    const postponeThreshold = threshold || settings.postponeThreshold || 5;
    return tasks.filter(task => 
      (task.postponeCount || 0) >= postponeThreshold && !task.completed
    );
  }

  // Получить данные карточки задачи
  async getTaskCardData(taskId) {
    const tasks = await this.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return null;
    
    return {
      pomodoroSessions: task.pomodoroSessions || [],
      totalTime: task.totalTime || 0,
      log: task.log || [],
      nextSteps: task.nextSteps || [],
      pomodoroSettings: task.pomodoroSettings || null
    };
  }

  // Обновить данные карточки задачи
  async updateTaskCardData(taskId, data) {
    const tasks = await this.getTasks();
    const index = tasks.findIndex(t => t.id === taskId);
    if (index === -1) return null;

    const updates = {};
    if (data.pomodoroSessions !== undefined) updates.pomodoroSessions = data.pomodoroSessions;
    if (data.totalTime !== undefined) updates.totalTime = data.totalTime;
    if (data.log !== undefined) updates.log = data.log;
    if (data.nextSteps !== undefined) updates.nextSteps = data.nextSteps;
    if (data.pomodoroSettings !== undefined) updates.pomodoroSettings = data.pomodoroSettings;

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

    return await this.updateTaskCardData(taskId, {
      pomodoroSessions: sessions,
      totalTime: totalTime
    });
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

    return await this.updateTaskCardData(taskId, { log });
  }

  // Обновить следующие шаги
  async updateNextSteps(taskId, steps) {
    return await this.updateTaskCardData(taskId, { nextSteps: steps });
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
    return await this.updateTaskCardData(taskId, { pomodoroSettings: settings });
  }
}

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
}

