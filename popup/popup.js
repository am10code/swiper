// Основной файл для работы с UI и CRUD операциями

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

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
  await storage.init();
  await loadCategories();
  setupEventListeners();
  
  // Обработчик изменения hash для поддержки навигации назад/вперед
  window.addEventListener('hashchange', async () => {
    // Пропускаем обработку hashchange во время инициализации
    if (isInitializing) return;
    
    const hash = window.location.hash.replace('#', '');
    if (hash && ['tasks', 'search', 'completed', 'frequently-postponed', 'swiper'].includes(hash)) {
      await loadTasks();
      switchSection(hash, false); // false = не обновлять hash
    }
  });
  
  // Проверяем hash в URL для открытия нужного раздела
  let hash = window.location.hash.replace('#', '');
  if (!hash || !['tasks', 'search', 'completed', 'frequently-postponed', 'swiper'].includes(hash)) {
    // По умолчанию устанавливаем hash для раздела "Задачи"
    hash = 'tasks';
    window.location.hash = hash;
  }
  
  await loadTasks();
  // Используем updateHash=false, так как hash уже установлен
  switchSection(hash, false);
  
  // Завершаем инициализацию
  isInitializing = false;
});

// Загрузка задач
async function loadTasks() {
  currentTasks = await storage.getTasks();
  cachedGlobalPomodoroSettings = await storage.getGlobalPomodoroSettings();
  // renderActiveTasks вызывается в switchSection после отображения раздела
  renderCompletedTasks();
}

// Загрузка категорий
async function loadCategories() {
  const categories = await storage.getCategories();
  const categorySelect = document.getElementById('categorySelect');
  const editCategorySelect = document.getElementById('editCategorySelect');
  const categoryFilter = document.getElementById('categoryFilter');

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

  if (categoryFilter) {
    const currentValue = categoryFilter.value;
    categoryFilter.innerHTML = '<option value="">Все категории</option>';
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      categoryFilter.appendChild(option);
    });
    // Не восстанавливаем значение для фильтра, всегда показываем "Все категории"
    categoryFilter.value = '';
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

  // Поиск
  document.getElementById('searchInput').addEventListener('input', handleSearchInSearchSection);

  // Фильтры
  document.getElementById('categoryFilter').addEventListener('change', handleFilterChange);
  document.getElementById('priorityFilter').addEventListener('change', handleFilterChange);

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
        if (typeof renderFrequentlyPostponed === 'function') {
          renderFrequentlyPostponed();
        }
      }
    });
  }

  const testNotificationBtn = document.getElementById('testNotificationBtn');
  if (testNotificationBtn) {
    testNotificationBtn.addEventListener('click', () => {
      if (!chrome?.runtime?.sendMessage) {
        alert('chrome.runtime.sendMessage недоступен');
        return;
      }
      chrome.runtime.sendMessage({
        action: 'showPomodoroNotification',
        title: 'Тест уведомления',
        message: 'Если вы это видите, уведомления работают.'
      }, (response) => {
        const errorMessage = chrome.runtime.lastError?.message;
        if (errorMessage) {
          alert(`Ошибка отправки: ${errorMessage}`);
          return;
        }
        if (response?.success === false) {
          alert(`Не удалось показать уведомление: ${response.error || 'неизвестная ошибка'}`);
          return;
        }
        alert('Запрос на уведомление отправлен');
      });
    });
  }

  setupDeadlineQuickButtons();
  setupTaskContextMenu();
}

// Обработка добавления задачи
async function handleAddTask(e) {
  e.preventDefault();
  const taskInput = document.getElementById('taskInput');
  const categorySelect = document.getElementById('categorySelect');
  const prioritySelect = document.getElementById('prioritySelect');
  const deadlineInput = document.getElementById('deadlineInput');

  const task = {
    text: taskInput.value.trim(),
    category: categorySelect.value,
    priority: prioritySelect.value,
    deadline: deadlineInput.value || null
  };

  if (task.text) {
    await storage.addTask(task);
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
    await loadTasks();
    await loadCategories();
    // Обновляем отображение активных задач, если раздел задач виден
    const tasksSection = document.getElementById('tasksSection');
    if (tasksSection && window.getComputedStyle(tasksSection).display !== 'none') {
      renderActiveTasks();
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
      }, 400); // Время анимации
    } else {
      // Если задача активируется, просто обновляем без анимации
      await storage.toggleTask(taskId);
      await loadTasks();
    }
  } else {
    // Если элемент не найден, просто обновляем
    await storage.toggleTask(taskId);
    await loadTasks();
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

  if (intervalInput) intervalInput.value = globalPomodoroSettings.interval;
  if (shortBreakInput) shortBreakInput.value = globalPomodoroSettings.shortBreak;
  if (longBreakInput) longBreakInput.value = globalPomodoroSettings.longBreak;
  if (longBreakAfterInput) longBreakAfterInput.value = globalPomodoroSettings.longBreakAfter;
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

  const settings = {
    interval: parseInt(intervalInput?.value, 10) || 25,
    shortBreak: parseInt(shortBreakInput?.value, 10) || 5,
    longBreak: parseInt(longBreakInput?.value, 10) || 15,
    longBreakAfter: parseInt(longBreakAfterInput?.value, 10) || 4
  };

  await storage.updateGlobalPomodoroSettings(settings);
}

// Поиск задач в разделе поиска
function handleSearchInSearchSection(e) {
  const searchText = e.target.value.toLowerCase();
  const categoryFilter = document.getElementById('categoryFilter').value;
  const priorityFilter = document.getElementById('priorityFilter').value;

  // Фильтруем все задачи (и активные, и выполненные)
  let filtered = [...currentTasks];

  // Фильтр по тексту
  if (searchText) {
    filtered = filtered.filter(task => 
      task.text.toLowerCase().includes(searchText)
    );
  }

  // Фильтр по категории
  if (categoryFilter) {
    filtered = filtered.filter(task => task.category === categoryFilter);
  }

  // Фильтр по приоритету
  if (priorityFilter) {
    filtered = filtered.filter(task => normalizePriority(task.priority) === priorityFilter);
  }

  // Рендерим результаты поиска
  renderSearchResults(filtered);
}

function getDateStringWithOffset(daysOffset) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + daysOffset);
  return getDateKey(date);
}

function setupDeadlineQuickButtons() {
  const buttons = document.querySelectorAll('.deadline-quick-btn[data-target="editDeadlineInput"]');
  if (!buttons.length) return;
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-target');
      const offset = Number(button.getAttribute('data-offset') || 0);
      const input = document.getElementById(targetId);
      if (!input) return;
      input.value = getDateStringWithOffset(offset);
    });
  });
}

// Рендеринг результатов поиска
function renderSearchResults(tasks) {
  const searchSection = document.getElementById('searchSection');
  let existingList = searchSection.querySelector('.search-results-list');
  let emptyState = searchSection.querySelector('.empty-state');
  
  // Удаляем старые элементы если есть
  if (existingList) {
    existingList.remove();
  }
  if (emptyState) {
    emptyState.remove();
  }

  if (tasks.length === 0) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'empty-state';
    emptyDiv.innerHTML = '<p>Задачи не найдены</p>';
    searchSection.appendChild(emptyDiv);
    return;
  }

  // Создаем новый список результатов
  const resultsList = document.createElement('div');
  resultsList.className = 'tasks-list search-results-list';
  
  const sortedTasks = sortTasks(tasks);
  sortedTasks.forEach(task => {
    const taskElement = createTaskElement(task, { section: 'mixed' });
    resultsList.appendChild(taskElement);
  });

  searchSection.appendChild(resultsList);
}

// Применение фильтров
function applyFilters() {
  renderActiveTasks();
}

// Обработка изменения фильтров
function handleFilterChange() {
  // Если открыт раздел поиска, применяем фильтры к поиску
  const searchSection = document.getElementById('searchSection');
  const searchInput = document.getElementById('searchInput');
  if (searchSection && searchInput && window.getComputedStyle(searchSection).display !== 'none') {
    handleSearchInSearchSection({ target: searchInput });
  }
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

// Переключение между разделами
function switchSection(sectionName, updateHash = true) {
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
  
  // Скрываем все разделы
  document.getElementById('tasksSection').style.display = 'none';
  document.getElementById('searchSection').style.display = 'none';
  document.getElementById('completedSection').style.display = 'none';
  const settingsSection = document.getElementById('settingsSection');
  if (settingsSection) settingsSection.style.display = 'none';
  const frequentlyPostponedSection = document.getElementById('frequentlyPostponedSection');
  if (frequentlyPostponedSection) frequentlyPostponedSection.style.display = 'none';
  const swiperSection = document.getElementById('swiperSection');
  if (swiperSection) swiperSection.style.display = 'none';
  
  // Показываем строку добавления задачи обратно
  const addTaskSection = document.querySelector('.add-task-section');
  if (addTaskSection) addTaskSection.style.display = '';
  
  // Убираем активный класс у всех пунктов меню
  document.querySelectorAll('.burger-menu-item').forEach(item => {
    item.classList.remove('active');
  });

  // Показываем выбранный раздел
  switch(sectionName) {
    case 'tasks':
      document.getElementById('tasksSection').style.display = 'block';
      const tasksMenuItem = document.querySelector('.burger-menu-item[data-section="tasks"]');
      if (tasksMenuItem) tasksMenuItem.classList.add('active');
      // Показываем форму добавления задачи на странице задач
      const addTaskSectionTasks = document.querySelector('.add-task-section');
      if (addTaskSectionTasks) addTaskSectionTasks.style.display = 'block';
      // Обновляем отображение задач при переключении на раздел
      renderActiveTasks();
      break;
    case 'search':
      document.getElementById('searchSection').style.display = 'block';
      const searchMenuItem = document.querySelector('.burger-menu-item[data-section="search"]');
      if (searchMenuItem) searchMenuItem.classList.add('active');
      // Скрываем форму добавления задачи на странице поиска
      const addTaskSection = document.querySelector('.add-task-section');
      if (addTaskSection) addTaskSection.style.display = 'none';
      // Применяем текущие фильтры при открытии раздела поиска
      handleSearchInSearchSection({ target: document.getElementById('searchInput') });
      break;
    case 'completed':
      document.getElementById('completedSection').style.display = 'block';
      const completedMenuItem = document.querySelector('.burger-menu-item[data-section="completed"]');
      if (completedMenuItem) completedMenuItem.classList.add('active');
      // Скрываем форму добавления задачи на странице выполненных задач
      const addTaskSectionCompleted = document.querySelector('.add-task-section');
      if (addTaskSectionCompleted) addTaskSectionCompleted.style.display = 'none';
      // Загружаем выполненные задачи при открытии раздела
      renderCompletedTasks();
      break;
    case 'swiper':
      const swiperSectionEl = document.getElementById('swiperSection');
      if (swiperSectionEl) {
        swiperSectionEl.style.display = 'block';
        // Скрываем строку добавления задачи
        const addTaskSection = document.querySelector('.add-task-section');
        if (addTaskSection) addTaskSection.style.display = 'none';
        const swiperMenuItem = document.querySelector('.burger-menu-item[data-section="swiper"]');
        if (swiperMenuItem) swiperMenuItem.classList.add('active');
        // Инициализируем ТаскСвайпер, если функция доступна
        if (typeof window.initSwiper === 'function') {
          // Используем глобальный storage
          if (typeof window.setSwiperStorage === 'function' && window.storage) {
            window.setSwiperStorage(window.storage);
          }
          // Настраиваем кнопки если функция доступна
          if (typeof window.setupSwiperButtons === 'function') {
            window.setupSwiperButtons();
          }
          if (typeof window.setupSwiperShortcuts === 'function') {
            window.setupSwiperShortcuts();
          }
          window.initSwiper();
        } else {
          console.warn('initSwiper function not found. Make sure swiper.js is loaded.');
        }
      }
      break;
    case 'frequently-postponed':
      if (frequentlyPostponedSection) {
        frequentlyPostponedSection.style.display = 'block';
        const postponedMenuItem = document.querySelector('.burger-menu-item[data-section="frequently-postponed"]');
        if (postponedMenuItem) postponedMenuItem.classList.add('active');
        // Скрываем форму добавления задачи на странице часто откладываемых
        const addTaskSectionPostponed = document.querySelector('.add-task-section');
        if (addTaskSectionPostponed) addTaskSectionPostponed.style.display = 'none';
        // Загружаем часто откладываемые задачи
        renderFrequentlyPostponed();
      }
      break;
    case 'settings':
      if (settingsSection) {
        settingsSection.style.display = 'block';
        const settingsMenuItem = document.querySelector('.burger-menu-item[data-section="settings"]');
        if (settingsMenuItem) settingsMenuItem.classList.add('active');
        // Скрываем форму добавления задачи на странице настроек
        const addTaskSectionSettings = document.querySelector('.add-task-section');
        if (addTaskSectionSettings) addTaskSectionSettings.style.display = 'none';
        // Загружаем настройки
        loadSettingsSection();
      }
      break;
  }
}

// Обновление заголовка страницы
function updatePageTitle(sectionName) {
  const headerTitle = document.querySelector('.header h1');
  if (!headerTitle) return;
  
  const titles = {
    'tasks': 'Задачи',
    'search': 'Поиск',
    'completed': 'Выполненные задачи',
    'swiper': 'Свайпер',
    'frequently-postponed': 'Часто откладываемые',
    'settings': 'Настройки'
  };
  
  headerTitle.textContent = titles[sectionName] || 'Мои Задачи';
}

// Рендеринг активных задач
async function renderActiveTasks() {
  const todayTasksList = document.getElementById('todayTasksList');
  const otherTasksList = document.getElementById('otherTasksList');
  const todayTasksSection = document.getElementById('todayTasksSection');
  const otherTasksSection = document.getElementById('otherTasksSection');
  
  // Получаем элементы для всех разделов
  const overdueTasksList = document.getElementById('overdueTasksList');
  const overdueTasksSection = document.getElementById('overdueTasksSection');
  
  // Проверяем, что элементы существуют
  if (!todayTasksList || !otherTasksList || !todayTasksSection || !otherTasksSection || !overdueTasksList || !overdueTasksSection) {
    console.error('Не найдены элементы для отображения задач:', {
      todayTasksList: !!todayTasksList,
      otherTasksList: !!otherTasksList,
      todayTasksSection: !!todayTasksSection,
      otherTasksSection: !!otherTasksSection,
      overdueTasksList: !!overdueTasksList,
      overdueTasksSection: !!overdueTasksSection
    });
    return;
  }
  
  // Загружаем настройку отображения задач
  const settings = await storage.getSettings();
  const taskDisplayMode = settings.taskDisplayMode || 'all';
  
  const searchInput = document.getElementById('searchInput');
  const categoryFilterEl = document.getElementById('categoryFilter');
  const priorityFilterEl = document.getElementById('priorityFilter');
  
  const searchText = searchInput ? searchInput.value.toLowerCase() : '';
  const categoryFilter = categoryFilterEl ? categoryFilterEl.value : '';
  const priorityFilter = priorityFilterEl ? priorityFilterEl.value : '';

  // Фильтруем только активные задачи
  let filtered = currentTasks.filter(task => !task.completed);
  
  console.log('renderActiveTasks:', {
    totalTasks: currentTasks.length,
    activeTasks: filtered.length,
    searchText,
    categoryFilter,
    priorityFilter,
    taskDisplayMode
  });

  // Фильтр по тексту
  if (searchText) {
    filtered = filtered.filter(task => 
      task.text.toLowerCase().includes(searchText)
    );
  }

  // Фильтр по категории
  if (categoryFilter) {
    filtered = filtered.filter(task => task.category === categoryFilter);
  }

  // Фильтр по приоритету
  if (priorityFilter) {
    filtered = filtered.filter(task => normalizePriority(task.priority) === priorityFilter);
  }

  if (filtered.length === 0) {
    updateEmptyState(true);
    if (todayTasksList) todayTasksList.innerHTML = '';
    if (otherTasksList) otherTasksList.innerHTML = '';
    if (overdueTasksList) overdueTasksList.innerHTML = '';
    if (todayTasksSection) todayTasksSection.style.display = 'none';
    if (otherTasksSection) otherTasksSection.style.display = 'none';
    if (overdueTasksSection) overdueTasksSection.style.display = 'none';
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
  
  // Задачи "Позже" - все остальные задачи (с дедлайном в будущем или без дедлайна)
  const laterTasks = filtered.filter(task => !overdueAndTodayTaskIds.has(task.id));

  // Сортировка задач
  const sortedOverdueTasks = sortTasks(overdueTasks);
  const sortedTodayTasks = sortTasks(todayTasks);
  const sortedLaterTasks = sortTasks(laterTasks);

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
    overdueTasksSection.style.display = 'none';
    overdueTasksList.innerHTML = '';
    otherTasksSection.style.display = 'none';
    otherTasksList.innerHTML = '';
  } else {
    // Показываем все задачи (режим "all")
    // Рендерим просроченные задачи (если есть)
    if (sortedOverdueTasks.length > 0) {
      overdueTasksSection.style.display = 'block';
      renderTasksToContainer(overdueTasksList, sortedOverdueTasks, { section: 'overdue' });
    } else {
      overdueTasksSection.style.display = 'none';
      overdueTasksList.innerHTML = '';
    }
    
    // Рендерим задачи на сегодня
    if (sortedTodayTasks.length > 0) {
      todayTasksSection.style.display = 'block';
      renderTasksToContainer(todayTasksList, sortedTodayTasks, { section: 'today' });
    } else {
      todayTasksSection.style.display = 'none';
      todayTasksList.innerHTML = '';
    }

    // Рендерим задачи "Позже"
    if (sortedLaterTasks.length > 0) {
      otherTasksSection.style.display = 'block';
      renderTasksToContainer(otherTasksList, sortedLaterTasks, { section: 'later' });
    } else {
      otherTasksSection.style.display = 'none';
      otherTasksList.innerHTML = '';
    }
  }
  
  console.log('Задачи отрендерены:', {
    overdueTasks: sortedOverdueTasks.length,
    todayTasks: sortedTodayTasks.length,
    laterTasks: sortedLaterTasks.length,
    totalFiltered: filtered.length,
    displayMode: taskDisplayMode
  });
}

// Получаем подпись задачи для сравнения изменений
function getTaskSignature(task) {
  return JSON.stringify({
    text: task.text,
    completed: task.completed,
    priority: task.priority,
    category: task.category,
    deadline: task.deadline,
    postponeCount: task.postponeCount || 0
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

  // Сортировка выполненных задач (по дате обновления, новые сверху)
  const sortedCompleted = [...completedTasks].sort((a, b) => b.updatedAt - a.updatedAt);

  sortedCompleted.forEach(task => {
    const taskElement = createTaskElement(task, { section: 'completed' });
    completedList.appendChild(taskElement);
  });
}

// Сортировка задач (для активных задач)
function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    // По приоритету
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
        console.error('Ошибка при открытии карточки задачи:', error);
      }
    } else {
      console.error('openTaskCard не найдена. Убедитесь, что task-card.js загружен.');
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
  taskText.textContent = task.text;

  const nextStepText = getNextStepPreviewText(task);
  const taskNextStep = document.createElement('span');
  taskNextStep.className = 'task-next-step';
  if (nextStepText) {
    taskNextStep.textContent = nextStepText;
  } else {
    taskNextStep.classList.add('placeholder');
    taskNextStep.textContent = 'Добавьте следующий шаг...';
  }

  const taskMeta = document.createElement('div');
  taskMeta.className = 'task-meta';

  if (task.category) {
    const categorySpan = document.createElement('span');
    categorySpan.className = 'task-category';
    categorySpan.textContent = task.category;
    taskMeta.appendChild(categorySpan);
  }

  // Убрано отображение приоритета в карточке задачи

  const hideTodayDeadline = section === 'today' && deadlineClass === 'deadline-today';
  if (task.deadline && !hideTodayDeadline) {
    const deadlineSpan = document.createElement('span');
    deadlineSpan.className = `task-deadline ${deadlineClass}`;
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
  if (section !== 'completed') {
    textWrapper.appendChild(taskNextStep);
  }
  textWrapper.appendChild(taskMeta);
  taskContent.appendChild(checkbox);
  taskContent.appendChild(textWrapper);

  const taskActions = document.createElement('div');
  taskActions.className = 'task-actions';

  if (section !== 'completed') {
    const editBtn = document.createElement('button');
    editBtn.className = 'btn-icon task-action-btn';
    editBtn.title = 'Редактировать';
    const editIcon = createIcon('edit', 16);
    if (editIcon) editBtn.appendChild(editIcon);
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditModal(task.id);
    });
    taskActions.appendChild(editBtn);
  }

  if (section === 'completed') {
    const timeBadge = document.createElement('span');
    timeBadge.className = 'task-time-badge';
    timeBadge.textContent = `⏱ ${formatTaskTime(task.totalTime)}`;
    taskActions.appendChild(timeBadge);
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
  
  if (task.deadline && deadlineClass === 'deadline-overdue') {
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
  return activeSteps[0]?.text?.trim() || '';
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
    const today = getDateStringWithOffset(0);
    await storage.updateTask(taskId, { deadline: today });
    await loadTasks();
    renderActiveTasks();
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

// Парсинг даты дедлайна как локальной даты (без смещения часового пояса)
function parseDeadlineDate(deadline) {
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
  if (!date || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizePriority(priority) {
  if (priority === 'high') return 'high';
  return 'medium';
}

// Получение класса для дедлайна
function getDeadlineClass(deadline) {
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
  if (!deadline) return '';
  const deadlineDate = parseDeadlineDate(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!deadlineDate || Number.isNaN(deadlineDate.getTime())) return '';
  deadlineDate.setHours(0, 0, 0, 0);
  const diffTime = deadlineDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `Просрочено на ${Math.abs(diffDays)} дн.`;
  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Завтра';
  if (diffDays <= 7) return `Через ${diffDays} дн.`;
  
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

// Экранирование HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Обновление состояния пустого списка
function updateEmptyState(isEmpty) {
  const emptyState = document.getElementById('emptyState');
  const todayTasksSection = document.getElementById('todayTasksSection');
  const otherTasksSection = document.getElementById('otherTasksSection');
  
  if (isEmpty) {
    if (emptyState) emptyState.style.display = 'block';
    if (todayTasksSection) todayTasksSection.style.display = 'none';
    if (otherTasksSection) otherTasksSection.style.display = 'none';
  } else {
    if (emptyState) emptyState.style.display = 'none';
  }
}

// Рендеринг часто откладываемых задач
async function renderFrequentlyPostponed() {
  const list = document.getElementById('frequentlyPostponedList');
  const emptyState = document.getElementById('frequentlyPostponedEmptyState');
  
  if (!list) return;
  
  list.innerHTML = '';
  
  const frequentlyPostponed = await storage.getFrequentlyPostponed();
  
  if (frequentlyPostponed.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    list.style.display = 'none';
    return;
  }
  
  if (emptyState) emptyState.style.display = 'none';
  list.style.display = 'block';
  
  // Сортировка по количеству отложений (больше первыми)
  const sorted = [...frequentlyPostponed].sort((a, b) => 
    (b.postponeCount || 0) - (a.postponeCount || 0)
  );
  
  sorted.forEach(task => {
    const taskElement = createFrequentlyPostponedElement(task);
    list.appendChild(taskElement);
  });
}

// Создание элемента для часто откладываемой задачи
function createFrequentlyPostponedElement(task) {
  const taskDiv = document.createElement('div');
  const normalizedPriority = normalizePriority(task.priority);
  taskDiv.className = `task-item priority-${normalizedPriority}`;
  taskDiv.setAttribute('data-task-id', task.id);
  
  const taskContent = document.createElement('div');
  taskContent.className = 'task-content';
  
  const textWrapper = document.createElement('div');
  textWrapper.className = 'task-text-wrapper';
  
  const taskText = document.createElement('span');
  taskText.className = 'task-text';
  taskText.textContent = task.text;
  
  const taskMeta = document.createElement('div');
  taskMeta.className = 'task-meta';
  
  if (task.category) {
    const categorySpan = document.createElement('span');
    categorySpan.className = 'task-category';
    categorySpan.textContent = task.category;
    taskMeta.appendChild(categorySpan);
  }
  
  if (normalizedPriority !== 'medium') {
    const prioritySpan = document.createElement('span');
    prioritySpan.className = `task-priority priority-${normalizedPriority}`;
    prioritySpan.textContent = getPriorityLabel(normalizedPriority);
    taskMeta.appendChild(prioritySpan);
  }
  
  const deadlineClass = getDeadlineClass(task.deadline);
  const deadlineText = formatDeadline(task.deadline);
  
  // Для просроченных задач deadline выносим в отдельную полосу внизу
  if (task.deadline && deadlineClass === 'deadline-overdue') {
    // Не добавляем в taskMeta для просроченных
  } else if (task.deadline) {
    const deadlineSpan = document.createElement('span');
    deadlineSpan.className = `task-deadline ${deadlineClass}`;
    deadlineSpan.textContent = deadlineText;
    taskMeta.appendChild(deadlineSpan);
  }
  
  textWrapper.appendChild(taskText);
  textWrapper.appendChild(taskMeta);
  taskContent.appendChild(textWrapper);
  
  // Бейдж с количеством отложений
  const postponeBadge = document.createElement('span');
  postponeBadge.className = 'postpone-count-badge';
  postponeBadge.textContent = `Отложено: ${task.postponeCount || 0}`;
  taskContent.appendChild(postponeBadge);
  
  const taskActions = document.createElement('div');
  taskActions.className = 'task-actions';
  
  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn-icon';
  resetBtn.title = 'Сбросить счетчик';
  resetBtn.textContent = '↺';
  resetBtn.addEventListener('click', async () => {
    await storage.resetPostponeCount(task.id);
    await renderFrequentlyPostponed();
  });
  
  const editBtn = document.createElement('button');
  editBtn.className = 'btn-icon';
  editBtn.title = 'Редактировать';
  const editIcon2 = createIcon('edit', 16);
  if (editIcon2) editBtn.appendChild(editIcon2);
  editBtn.addEventListener('click', () => openEditModal(task.id));
  
  const scheduleBtn = document.createElement('button');
  scheduleBtn.className = 'btn-icon';
  scheduleBtn.title = 'Запланировать на сегодня';
  scheduleBtn.textContent = '📅';
  scheduleBtn.addEventListener('click', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    await storage.updateTask(task.id, { deadline: todayStr });
    await renderFrequentlyPostponed();
    await loadTasks();
  });
  
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn-icon';
  deleteBtn.title = 'Удалить';
  const deleteIcon2 = createIcon('trash', 16);
  if (deleteIcon2) deleteBtn.appendChild(deleteIcon2);
  deleteBtn.addEventListener('click', async () => {
    if (confirm(`Удалить задачу "${task.text}"?`)) {
      await storage.deleteTask(task.id);
      await renderFrequentlyPostponed();
      await loadTasks();
    }
  });
  
  taskActions.appendChild(resetBtn);
  taskActions.appendChild(editBtn);
  taskActions.appendChild(scheduleBtn);
  taskActions.appendChild(deleteBtn);
  
  taskDiv.appendChild(taskContent);
  taskDiv.appendChild(taskActions);
  
  // Добавляем красную полосу для просроченных задач внизу карточки
  if (task.deadline && deadlineClass === 'deadline-overdue') {
    taskDiv.classList.add('has-overdue-bar');
    const overdueBar = document.createElement('div');
    overdueBar.className = 'task-deadline-overdue-bar';
    overdueBar.textContent = deadlineText;
    taskDiv.appendChild(overdueBar);
  }
  
  return taskDiv;
}

// Экспорт функций для использования в других модулях (task-card.js)
window.loadTasks = loadTasks;
window.renderActiveTasks = renderActiveTasks;
window.renderCompletedTasks = renderCompletedTasks;

