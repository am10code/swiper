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

const PomodoroState = {
  IDLE_POMODORO: 'IDLE_POMODORO',
  RUNNING_POMODORO: 'RUNNING_POMODORO',
  PAUSED_POMODORO: 'PAUSED_POMODORO',
  BREAK_READY: 'BREAK_READY',
  RUNNING_BREAK: 'RUNNING_BREAK'
};

function normalizePriority(priority) {
  return priority === 'high' ? 'high' : 'medium';
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
    const nextStepInput = document.getElementById('nextStepInput');
    if (nextStepInput) {
      setTimeout(() => nextStepInput.focus(), 0);
    }
    setupFocusTrap();
  } catch (error) {
    console.error('Ошибка при открытии карточки задачи:', error);
    alert('Ошибка при открытии карточки задачи: ' + error.message);
  }
};

window.startPomodoroForTaskCard = async function() {
  await startPomodoroIfInactive();
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
  // Убеждаемся, что storage инициализирован
  const storage = getStorage();
  if (!window.storage) {
    await storage.init();
    window.storage = storage;
  }
  setupTaskCardListeners();
  setupKeyboardListeners();
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
  document.getElementById('taskCardOverlay').addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await closeTaskCard();
  });

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
  const optionHideSwiper3DaysBtn = document.getElementById('taskCardOptionHideSwiper3Days');
  const optionHideSwiper1WeekBtn = document.getElementById('taskCardOptionHideSwiper1Week');
  const optionEditBtn = document.getElementById('taskCardOptionEditBtn');
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
  if (optionDeleteBtn) {
    optionDeleteBtn.addEventListener('click', () => {
      closeTaskCardOptionsMenu();
      openDeleteModal();
    });
  }
  if (optionNextWeekBtn) {
    optionNextWeekBtn.addEventListener('click', async () => {
      closeTaskCardOptionsMenu();
      await postponeTaskToNextMonday();
    });
  }
  if (optionHideSwiper3DaysBtn) {
    optionHideSwiper3DaysBtn.addEventListener('click', async () => {
      closeTaskCardOptionsMenu();
      await hideTaskFromSwiper(3);
    });
  }
  if (optionHideSwiper1WeekBtn) {
    optionHideSwiper1WeekBtn.addEventListener('click', async () => {
      closeTaskCardOptionsMenu();
      await hideTaskFromSwiper(7);
    });
  }

  document.addEventListener('click', (e) => {
    if (!optionsMenu || optionsMenu.style.display === 'none') return;
    if (moreOptionsBtn && (e.target === moreOptionsBtn || moreOptionsBtn.contains(e.target))) {
      return;
    }
    closeTaskCardOptionsMenu();
  });

  // Быстрые действия
  const completeBtn = document.getElementById('taskCardCompleteBtn');
  if (completeBtn) {
    completeBtn.addEventListener('click', handleTaskCardComplete);
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
  document.getElementById('taskCardEditText').addEventListener('blur', saveTaskEdit);
  document.getElementById('taskCardEditPriority').addEventListener('change', saveTaskEdit);
  document.getElementById('taskCardEditDeadline').addEventListener('change', saveTaskEdit);
  document.getElementById('taskCardEditLink').addEventListener('change', saveTaskEdit);

  document.querySelectorAll('.deadline-quick-btn[data-target="taskCardEditDeadline"]').forEach(button => {
    button.addEventListener('click', () => {
      const offset = Number(button.getAttribute('data-offset') || 0);
      const input = document.getElementById('taskCardEditDeadline');
      if (!input) return;
      input.value = getDateStringWithOffset(offset);
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
async function closeTaskCard() {
  if (isPomodoroActive()) {
    const confirmed = confirm('Помодоро-таймер активен. Вы уверены, что хотите закрыть карточку? Таймер будет остановлен.');
    if (!confirmed) {
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
    isEditing = false;
    isPomodoroBgMuted = false;
    updatePomodoroSoundToggle();
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  }, 300);
}

// Проверка, открыта ли карточка
function isTaskCardOpen() {
  return document.getElementById('taskCardPanel').style.display !== 'none';
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
    titleElement.textContent = currentTask.text;
    titleElement.style.display = isTitleEditing ? 'none' : 'block';
  }
  if (titleInput) {
    titleInput.value = currentTask.text;
    titleInput.style.display = isTitleEditing ? 'block' : 'none';
  }
  
  const meta = document.getElementById('taskCardMeta');
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
    deadlineSpan.addEventListener('click', () => {
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
  updateSwiperOptionsVisibility();
}

function updateSwiperOptionsVisibility() {
  const optionHideSwiper3DaysBtn = document.getElementById('taskCardOptionHideSwiper3Days');
  const optionHideSwiper1WeekBtn = document.getElementById('taskCardOptionHideSwiper1Week');
  const shouldShow = isSwiperContext();
  if (optionHideSwiper3DaysBtn) {
    optionHideSwiper3DaysBtn.style.display = shouldShow ? '' : 'none';
  }
  if (optionHideSwiper1WeekBtn) {
    optionHideSwiper1WeekBtn.style.display = shouldShow ? '' : 'none';
  }
}

function isSwiperContext() {
  const swiperSection = document.getElementById('swiperSection');
  const isSwiperSection = swiperSection && window.getComputedStyle(swiperSection).display !== 'none';
  const isSwiperPage = window.location.pathname.includes('swiper.html');
  return isSwiperPage || isSwiperSection;
}

async function hideTaskFromSwiper(days) {
  if (!currentTaskId) return;
  const storage = getStorage();
  const until = Date.now() + days * 24 * 60 * 60 * 1000;
  await storage.updateTask(currentTaskId, { swiperHiddenUntil: until });
  await refreshTaskLists();
  await closeTaskCard();
  if (typeof window.initSwiper === 'function' && isSwiperContext()) {
    await window.initSwiper();
  }
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
    titleElement.textContent = currentTask?.text || '';
    return;
  }
  try {
    const storage = getStorage();
    await storage.updateTask(currentTaskId, { text: nextTitle });
    if (currentTask) {
      currentTask = { ...currentTask, text: nextTitle };
    }
    titleElement.textContent = nextTitle;
    if (typeof refreshTaskLists === 'function') {
      await refreshTaskLists();
    }
  } catch (error) {
    console.error('Ошибка при сохранении названия задачи:', error);
    titleElement.textContent = currentTask?.text || '';
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
  titleElement.textContent = currentTask?.text || '';
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
  const updatedTotalSeconds = currentTotalSeconds + durationSeconds;
  await storage.updateTaskCardData(currentTaskId, {
    pomodoroSessions: sessions,
    totalTime: updatedTotalSeconds
  });
  baseTotalSeconds = updatedTotalSeconds;
  displayTotalTime(updatedTotalSeconds);
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
  
  await storage.addLogEntry(currentTaskId, text);
  input.value = '';
  
  // Перезагружаем лог
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
  const text = input.value.trim();
  
  if (!text) return;
  
  const cardData = await storage.getTaskCardData(currentTaskId);
  const nextSteps = cardData.nextSteps || [];
  
  nextSteps.push({
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    text: text,
    completed: false,
    order: nextSteps.length
  });
  
  await storage.updateNextSteps(currentTaskId, nextSteps);
  input.value = '';
  
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
  
  item.appendChild(checkbox);
  item.appendChild(text);
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
    step.completed = !step.completed;
    await storage.updateNextSteps(currentTaskId, nextSteps);
    displayNextSteps(nextSteps);
  }
}

// Удаление следующего шага
async function deleteNextStep(stepId) {
  const storage = getStorage();
  const cardData = await storage.getTaskCardData(currentTaskId);
  const nextSteps = cardData.nextSteps || [];
  
  const filtered = nextSteps.filter(s => s.id !== stepId);
  await storage.updateNextSteps(currentTaskId, filtered);
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

function handleDragStart(e) {
  draggedElement = this;
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
      
      await storage.updateNextSteps(currentTaskId, nextSteps);
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
}

// Переключение режима редактирования
async function toggleEditMode() {
  const storage = getStorage();
  isEditing = !isEditing;
  const editSection = document.getElementById('taskCardEditSection');
  const editBtn = document.getElementById('taskCardEditBtn');
  
  if (isEditing) {
    editSection.style.display = 'block';
    if (editBtn) editBtn.textContent = 'Отменить';
    
    // Заполняем поля редактирования
    document.getElementById('taskCardEditText').value = currentTask.text;
    document.getElementById('taskCardEditPriority').value = normalizePriority(currentTask.priority);
    document.getElementById('taskCardEditDeadline').value = currentTask.deadline || '';
    document.getElementById('taskCardEditLink').value = currentTask.link || '';
  } else {
    editSection.style.display = 'none';
    if (editBtn) editBtn.textContent = 'Редактировать';
  }
}

// Сохранение редактирования задачи
async function saveTaskEdit() {
  if (!isEditing) return;
  
  const storage = getStorage();
  const updates = {
    text: document.getElementById('taskCardEditText').value.trim(),
    priority: document.getElementById('taskCardEditPriority').value,
    deadline: document.getElementById('taskCardEditDeadline').value || null
  };
  const linkInput = document.getElementById('taskCardEditLink');
  const linkValue = linkInput ? linkInput.value.trim() : '';
  if (linkValue && !isValidHttpUrl(linkValue)) {
    alert('Ссылка должна быть валидным URL и начинаться с http:// или https://');
    return;
  }
  updates.link = linkValue || null;
  
  if (!updates.text) {
    alert('Текст задачи не может быть пустым');
    return;
  }
  
  await storage.updateTask(currentTaskId, updates);
  currentTask = { ...currentTask, ...updates };
  
  displayTaskInfo();
  toggleEditMode();
  
  // Обновляем список задач в основном интерфейсе
  if (typeof window.renderActiveTasks === 'function') {
    window.renderActiveTasks();
  }
  if (typeof window.renderCompletedTasks === 'function') {
    window.renderCompletedTasks();
  }
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
  await storage.deleteTask(currentTaskId);
  closeDeleteModal();
  closeTaskCard();
  
  // Обновляем список задач
  await refreshTaskLists();
}

async function handleTaskCardComplete() {
  if (!currentTaskId) return;
  const storage = getStorage();
  await storage.toggleTask(currentTaskId);
  await refreshTaskLists();
  await closeTaskCard();
  const isSwiperPage = window.location.pathname.includes('swiper.html');
  if (isSwiperPage) {
    window.location.href = chrome.runtime.getURL('main.html#tasks');
    return;
  }
  if (typeof window.switchSection === 'function') {
    window.switchSection('tasks');
  } else {
    window.location.hash = 'tasks';
  }
}

async function handleOpenNextTodayTask() {
  await stopActivePomodoroSession();
  const swiperSection = document.getElementById('swiperSection');
  const isSwiperSection = swiperSection && window.getComputedStyle(swiperSection).display !== 'none';
  const isSwiperPage = window.location.pathname.includes('swiper.html');
  const useSwiperFlow = isSwiperPage || isSwiperSection;
  const tasks = useSwiperFlow ? await getActiveTasksSorted() : await getTodayTasksSorted();
  if (tasks.length === 0) {
    alert(useSwiperFlow ? 'Нет активных задач.' : 'На сегодня нет задач.');
    return;
  }

  const currentIndex = tasks.findIndex(task => task.id === currentTaskId);
  const nextIndex = currentIndex === -1
    ? 0
    : (currentIndex + 1) % tasks.length;
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
}

async function getTodayTasksSorted() {
  const storage = getStorage();
  const tasks = await storage.getTasks();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = getDateKey(today);

  const todayTasks = tasks.filter(task => (
    !task.completed && isTaskDueToday(task, todayKey)
  ));

  return sortTasksByPriorityDeadlineCreated(todayTasks);
}

async function getActiveTasksSorted() {
  const storage = getStorage();
  const tasks = await storage.getTasks();
  const activeTasks = tasks.filter(task => !task.completed);
  return sortTasksByPriorityDeadlineCreated(activeTasks);
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

// Вспомогательные функции
function getPriorityLabel(priority) {
  const labels = {
    high: 'Высокий',
    medium: 'Обычный'
  };
  return labels[priority] || priority;
}

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

function getDateStringWithOffset(daysOffset) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + daysOffset);
  return getDateKey(date);
}

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

// Экспорт функции для использования в других модулях
function openTaskCard(taskId) {
  return window.openTaskCard(taskId);
}

