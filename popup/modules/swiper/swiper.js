// Модуль для работы с ТаскСвайпер

let swiperStorage;
let swiperTasks = [];
let currentTaskIndex = 0;
let actionHistory = [];
let isSwiping = false;
let startX = 0;
let startY = 0;
let currentX = 0;
let currentY = 0;
let currentCard = null;
let isProcessingSwipe = false; // Флаг для предотвращения множественных вызовов
let justFinishedSwipe = false; // Флаг для игнорирования click после завершения свайпа
let isSwiperShortcutsReady = false;
let swiperPendingDeleteTaskId = null;

// Функция для установки storage извне
function setSwiperStorage(storageInstance) {
  swiperStorage = storageInstance;
}

// Инициализация ТаскСвайпер
async function initSwiper() {
  try {
    // Используем глобальный storage если доступен, иначе создаем новый
    if (typeof storage !== 'undefined' && storage) {
      swiperStorage = storage;
    } else if (!swiperStorage) {
      swiperStorage = new StorageManager();
      await swiperStorage.init();
    }
    
    if (!swiperStorage) {
      throw new Error('Storage not initialized');
    }
    
    // Очищаем предыдущую сессию при новом открытии
    await swiperStorage.clearSessionPostponed();
    
    const allTasks = await swiperStorage.getTasks();
    
    // Фильтруем активные задачи (все, кроме выполненных)
    let activeTasks = allTasks.filter(task => {
      const isCompleted = task.completed === true || task.completed === 'true';
      return !isCompleted;
    });
    
    if (activeTasks.length === 0) {
      const container = document.getElementById('swiperCardContainer');
      if (container) {
        ensureSwiperSideButtons(container);
        clearSwiperCards(container);
      }
      setSwiperEmptyState(true, 'Нет активных задач для обработки');
      updateProgress();
      return;
    }
    
    // Случайное перемешивание
    swiperTasks = shuffleArray([...activeTasks]);
    currentTaskIndex = 0;
    actionHistory = [];
    isProcessingSwipe = false;
    
    // Сбрасываем состояние прогресса при инициализации
    lastShownIndex = -1;
    
    showSwiperHintOnce();
    // showCurrentCard() вызовет updateProgress() после корректировки индекса
    showCurrentCard();
  } catch (error) {
    console.error('Error initializing Swiper:', error);
    const container = document.getElementById('swiperCardContainer');
    const emptyState = document.getElementById('swiperEmptyState');
    if (container) container.innerHTML = '';
    if (emptyState) {
      emptyState.style.display = 'block';
      emptyState.innerHTML = `<p>Ошибка загрузки: ${error.message}</p>`;
    }
  }
}

// Перемешивание массива
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Показать текущую карточку
let lastShownIndex = -1;
function showCurrentCard() {
  console.log('[Swiper] showCurrentCard: called with index', currentTaskIndex, 'of', swiperTasks.length, '(lastShown:', lastShownIndex, ')');
  
  const container = document.getElementById('swiperCardContainer');
  const emptyState = document.getElementById('swiperEmptyState');
  
  if (!container) {
    console.log('[Swiper] showCurrentCard: container not found');
    return;
  }
  
  if (swiperTasks.length === 0) {
    console.log('[Swiper] showCurrentCard: no tasks');
    ensureSwiperSideButtons(container);
    clearSwiperCards(container);
    setSwiperEmptyState(true, 'Нет активных задач для обработки');
    return;
  }
  
  // Проверяем, все ли задачи обработаны (ПЕРЕД корректировкой индекса)
  if (currentTaskIndex >= swiperTasks.length) {
    console.log('[Swiper] showCurrentCard: all tasks processed!');
    // Если уже показываем сообщение о завершении, не делаем ничего
    if (emptyState && emptyState.style.display === 'block' && emptyState.textContent.includes('обработаны')) {
      console.log('[Swiper] showCurrentCard: already showing completion message');
      return;
    }
    
    ensureSwiperSideButtons(container);
    clearSwiperCards(container);
    setSwiperEmptyState(true, 'Все задачи обработаны');
    // Обновляем прогресс только один раз при завершении
    updateProgress();
    console.log('[Swiper] showCurrentCard: calling finishSwiper in 2 seconds');
    setTimeout(() => {
      finishSwiper();
    }, 2000);
    return;
  }
  
  // Убеждаемся, что индекс не превышает длину массива
  if (currentTaskIndex >= swiperTasks.length && swiperTasks.length > 0) {
    currentTaskIndex = swiperTasks.length - 1;
  }
  
  if (currentTaskIndex < 0) {
    currentTaskIndex = 0;
  }
  
  // Если индекс не изменился после корректировки, пропускаем (защита от повторных вызовов с тем же индексом)
  if (lastShownIndex === currentTaskIndex) {
    console.log('[Swiper] showCurrentCard: skipped - same index');
    return;
  }
  
  lastShownIndex = currentTaskIndex;
  console.log('[Swiper] showCurrentCard: showing card for index', currentTaskIndex);
  
  setSwiperEmptyState(false);
  const task = swiperTasks[currentTaskIndex];
  
  if (!task) {
    console.error('Task not found at index', currentTaskIndex, 'Total tasks:', swiperTasks.length);
    // Если задача не найдена, но индекс в пределах массива, попробуем перейти к следующей
    if (currentTaskIndex < swiperTasks.length - 1) {
      currentTaskIndex++;
      showCurrentCard();
      return;
    } else {
      // Если это последняя задача и она не найдена, завершаем
      setSwiperEmptyState(true, 'Все задачи обработаны');
      // Обновляем прогресс только один раз при завершении
      updateProgress();
      return;
    }
  }
  
  // Сохраняем кнопки перед очисткой контейнера
  const { postponeBtn, scheduleBtn } = ensureSwiperSideButtons(container);
  
  currentCard = createCardElement(task);
  
  clearSwiperCards(container);
  const rightAction = scheduleBtn ? scheduleBtn.closest('.swiper-side-action') : null;
  if (rightAction && rightAction.parentNode === container) {
    container.insertBefore(currentCard, rightAction);
  } else {
    container.appendChild(currentCard);
  }
  
  setupSwipeHandlers(currentCard);
  
  // Клик по карточке открывает полную карточку задачи
  currentCard.addEventListener('click', (e) => {
    const isButtonClick = e.target.closest('.swiper-action-btn') ||
      e.target.closest('.swiper-side-btn') ||
      e.target.id === 'postponeBtn' ||
      e.target.id === 'scheduleBtn';

    if (isButtonClick || isSwiping || justFinishedSwipe) {
      if (justFinishedSwipe) {
        justFinishedSwipe = false;
      }
      return;
    }

    if (typeof window.openTaskCard === 'function') {
      window.openTaskCard(task.id);
    } else {
      console.warn('openTaskCard не найдена. Убедитесь, что task-card.js загружен.');
    }
  });
  
  // Обновляем прогресс после показа карточки (когда индекс уже скорректирован)
  updateProgress();
}

// Создание элемента карточки
function createCardElement(task) {
  const card = document.createElement('div');
  card.className = 'swiper-card entering';
  card.setAttribute('data-task-id', task.id);
  card.tabIndex = 0;
  
  const content = document.createElement('div');
  content.className = 'swiper-card-content';
  
  const text = document.createElement('div');
  text.className = 'swiper-card-text';
  text.textContent = task.text;

  const nextStepText = getNextStepPreviewText(task);
  const nextStep = document.createElement('div');
  nextStep.className = 'swiper-card-next-step';
  if (nextStepText) {
    nextStep.textContent = nextStepText;
  } else {
    nextStep.classList.add('placeholder');
    nextStep.textContent = 'Добавьте следующий шаг...';
  }
  
  const meta = document.createElement('div');
  meta.className = 'swiper-card-meta';
  
  if (task.category) {
    const category = document.createElement('span');
    category.className = 'swiper-card-category';
    category.textContent = task.category;
    meta.appendChild(category);
  }
  
  if (task.priority) {
    const normalizedPriority = normalizePriority(task.priority);
    if (normalizedPriority === 'high') {
      const priority = document.createElement('span');
      priority.className = `swiper-card-priority priority-${normalizedPriority}`;
      priority.textContent = getSwiperPriorityLabel(normalizedPriority);
      meta.appendChild(priority);
    }
  }
  
  if (task.deadline) {
    const deadlineText = getSwiperDeadline(task.deadline);
    if (deadlineText && deadlineText !== 'Сегодня') {
      const deadline = document.createElement('span');
      deadline.className = 'swiper-card-deadline';
      deadline.textContent = deadlineText;
      meta.appendChild(deadline);
    }
  }
  
  if (task.postponeCount && task.postponeCount > 0) {
    const postponeCount = document.createElement('span');
    postponeCount.className = 'swiper-card-postpone-count';
    postponeCount.textContent = `Отложено: ${task.postponeCount}`;
    meta.appendChild(postponeCount);
  }
  
  content.appendChild(text);
  content.appendChild(nextStep);
  content.appendChild(meta);
  card.appendChild(content);
  
  return card;
}

function getNextStepPreviewText(task) {
  const steps = Array.isArray(task?.nextSteps) ? task.nextSteps : [];
  const activeSteps = steps.filter(step => !step.completed)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return activeSteps[0]?.text?.trim() || '';
}

// Получение метки приоритета (используем функцию из popup.js если доступна)
function normalizePriority(priority) {
  return priority === 'high' ? 'high' : 'medium';
}

function getSwiperPriorityLabel(priority) {
  if (typeof getPriorityLabel === 'function') {
    return getPriorityLabel(priority);
  }
  const labels = {
    high: 'Высокий',
    medium: 'Обычный'
  };
  return labels[priority] || priority;
}

// Форматирование дедлайна (используем функцию из popup.js если доступна)
function getSwiperDeadline(deadline) {
  if (typeof formatDeadline === 'function') {
    return formatDeadline(deadline);
  }
  if (!deadline) return '';
  const deadlineDate = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = deadlineDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `Просрочено на ${Math.abs(diffDays)} дн.`;
  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Завтра';
  if (diffDays <= 7) return `Через ${diffDays} дн.`;
  
  return deadlineDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

// Настройка обработчиков свайпа
function setupSwipeHandlers(card) {
  // Touch события
  card.addEventListener('touchstart', handleTouchStart, { passive: true });
  card.addEventListener('touchmove', handleTouchMove, { passive: true });
  card.addEventListener('touchend', handleTouchEnd, { passive: true });
  
  // Mouse события
  card.addEventListener('mousedown', handleMouseDown);
  card.addEventListener('mousemove', handleMouseMove);
  card.addEventListener('mouseup', handleMouseUp);
  card.addEventListener('mouseleave', handleMouseUp);
}

// Обработка начала касания/клика
function handleTouchStart(e) {
  if (isSwiping) return;
  isSwiping = true;
  startX = e.touches[0].clientX;
  startY = e.touches[0].clientY;
  currentCard = e.currentTarget;
}

function handleMouseDown(e) {
  console.log('[Swiper] MOUSEDOWN:', {
    isSwiping: isSwiping,
    target: e.target.tagName,
    closestBtn: !!e.target.closest('.swiper-action-btn')
  });
  
  if (isSwiping) return;
  // Не начинаем свайп, если клик был на кнопках действий
  if (e.target.closest('.swiper-action-btn')) {
    console.log('[Swiper] MOUSEDOWN: ignored - button');
    return;
  }
  isSwiping = true;
  startX = e.clientX;
  startY = e.clientY;
  currentCard = e.currentTarget;
  console.log('[Swiper] MOUSEDOWN: started swipe, startX:', startX, 'startY:', startY);
  e.preventDefault();
}

// Обработка движения
function handleTouchMove(e) {
  if (!isSwiping || !currentCard) return;
  currentX = e.touches[0].clientX;
  currentY = e.touches[0].clientY;
  updateCardPosition();
}

function handleMouseMove(e) {
  if (!isSwiping || !currentCard) return;
  currentX = e.clientX;
  currentY = e.clientY;
  console.log('[Swiper] MOUSEMOVE: currentX:', currentX, 'startX:', startX, 'deltaX:', currentX - startX);
  updateCardPosition();
  e.preventDefault();
}

// Обновление позиции карточки при свайпе
function updateCardPosition() {
  if (!currentCard) return;
  
  const deltaX = currentX - startX;
  const deltaY = currentY - startY;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  
  if (distance > 10) {
    const rotation = deltaX * 0.1;
    currentCard.style.transform = `translateX(${deltaX}px) translateY(${deltaY}px) rotate(${rotation}deg)`;
    currentCard.style.transition = 'none';
    
    // Индикаторы направления
    if (deltaX < -50) {
      currentCard.classList.add('swiping-left');
      currentCard.classList.remove('swiping-right');
    } else if (deltaX > 50) {
      currentCard.classList.add('swiping-right');
      currentCard.classList.remove('swiping-left');
    } else {
      currentCard.classList.remove('swiping-left', 'swiping-right');
    }
  }
}

// Обработка окончания свайпа
function handleTouchEnd(e) {
  if (!isSwiping || !currentCard) return;
  finishSwipe();
}

function handleMouseUp(e) {
  console.log('[Swiper] MOUSEUP:', {
    isSwiping: isSwiping,
    hasCurrentCard: !!currentCard,
    currentX: currentX,
    startX: startX,
    deltaX: currentX - startX,
    clientX: e.clientX,
    clientY: e.clientY
  });
  
  if (!isSwiping || !currentCard) {
    console.log('[Swiper] MOUSEUP: ignored - not swiping or no card');
    return;
  }
  
  // Если currentX не обновлен (не было движения мыши), используем текущие координаты из события
  // Но только если это действительно было движение, а не просто клик
  if (currentX === 0 && startX !== 0) {
    // Это был простой клик без движения - используем координаты из события для расчета
    currentX = e.clientX;
    currentY = e.clientY;
    console.log('[Swiper] MOUSEUP: no mouse move detected, using event coordinates:', currentX);
  }
  
  finishSwipe();
}

function finishSwipe() {
  if (!currentCard || isProcessingSwipe) return;
  
  const deltaX = currentX - startX;
  const deltaY = currentY - startY;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  const minSwipeDistance = 50;
  
  console.log('[Swiper] finishSwipe:', {
    deltaX: deltaX,
    deltaY: deltaY,
    distance: distance.toFixed(2),
    minSwipeDistance: minSwipeDistance,
    wasSwipe: distance > minSwipeDistance
  });
  
  if (distance > minSwipeDistance) {
    // Был реальный свайп
    justFinishedSwipe = true; // Устанавливаем флаг, чтобы игнорировать последующий click
    if (Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX < 0) {
        // Свайп влево - отложить
        console.log('[Swiper] finishSwipe: swipe left');
        handleSwipeLeft();
      } else {
        // Свайп вправо - запланировать
        console.log('[Swiper] finishSwipe: swipe right');
        handleSwipeRight();
      }
      // Сбрасываем флаг через задержку после обработки свайпа
      setTimeout(() => {
        justFinishedSwipe = false;
        console.log('[Swiper] finishSwipe: justFinishedSwipe reset');
      }, 200);
    } else {
      // Был свайп, но не влево/вправо - просто возвращаем карточку
      console.log('[Swiper] finishSwipe: swipe but not left/right, resetting');
      currentCard.style.transform = '';
      currentCard.style.transition = 'transform 0.2s ease-out';
      currentCard.classList.remove('swiping-left', 'swiping-right');
      // Сбрасываем флаг через небольшую задержку, чтобы click успел сработать
      setTimeout(() => {
        justFinishedSwipe = false;
        console.log('[Swiper] finishSwipe: justFinishedSwipe reset (non-directional swipe)');
      }, 100);
    }
  } else {
    // Просто клик без движения - ничего не делаем
    console.log('[Swiper] finishSwipe: just click, resetting');
    currentCard.style.transform = '';
    currentCard.style.transition = 'transform 0.2s ease-out';
    currentCard.classList.remove('swiping-left', 'swiping-right');
    // НЕ устанавливаем justFinishedSwipe для простого клика - click событие должно быть заблокировано через preventDefault
  }
  
  isSwiping = false;
  startX = 0;
  startY = 0;
  currentX = 0;
  currentY = 0;
  currentCard = null;
}

// Обработка свайпа влево (отложить)
async function handleSwipeLeft() {
  if (isProcessingSwipe || currentTaskIndex >= swiperTasks.length) {
    console.log('[Swiper] handleSwipeLeft: skipped (isProcessing:', isProcessingSwipe, ', index:', currentTaskIndex, ', total:', swiperTasks.length, ')');
    return;
  }
  
  isProcessingSwipe = true;
  const task = swiperTasks[currentTaskIndex];
  const taskId = task.id;
  
  console.log('[Swiper] handleSwipeLeft: processing task', currentTaskIndex + 1, 'of', swiperTasks.length, '(id:', taskId, ')');
  
  // Сохраняем состояние для отмены
  actionHistory.push({
    type: 'postpone',
    taskId: taskId,
    previousState: {
      postponeCount: task.postponeCount || 0,
      lastPostponed: task.lastPostponed
    }
  });
  
  // Анимация исчезновения
  if (currentCard) {
    currentCard.classList.add('exiting');
    currentCard.style.transform = 'translateX(-400px) rotate(-30deg)';
    currentCard.style.opacity = '0';
  }
  
  // Обновление данных
  await postponeTask(taskId);
  
  // Переход к следующей карточке
  setTimeout(() => {
    currentTaskIndex++;
    console.log('[Swiper] handleSwipeLeft: moving to next card, new index:', currentTaskIndex, 'of', swiperTasks.length);
    showCurrentCard();
    isProcessingSwipe = false;
  }, 200);
}

// Обработка свайпа вправо (запланировать)
async function handleSwipeRight() {
  if (isProcessingSwipe || currentTaskIndex >= swiperTasks.length) {
    console.log('[Swiper] handleSwipeRight: skipped (isProcessing:', isProcessingSwipe, ', index:', currentTaskIndex, ', total:', swiperTasks.length, ')');
    return;
  }
  
  isProcessingSwipe = true;
  const task = swiperTasks[currentTaskIndex];
  const taskId = task.id;
  
  console.log('[Swiper] handleSwipeRight: processing task', currentTaskIndex + 1, 'of', swiperTasks.length, '(id:', taskId, ')');
  
  // Сохраняем состояние для отмены
  actionHistory.push({
    type: 'schedule',
    taskId: taskId,
    previousState: {
      deadline: task.deadline
    }
  });
  
  // Анимация исчезновения
  if (currentCard) {
    currentCard.classList.add('exiting');
    currentCard.style.transform = 'translateX(400px) rotate(30deg)';
    currentCard.style.opacity = '0';
  }
  
  // Обновление данных
  await scheduleToday(taskId);
  
  // Переход к следующей карточке
  setTimeout(() => {
    currentTaskIndex++;
    console.log('[Swiper] handleSwipeRight: moving to next card, new index:', currentTaskIndex, 'of', swiperTasks.length);
    showCurrentCard();
    isProcessingSwipe = false;
  }, 200);
}

// Отложить задачу
async function postponeTask(taskId) {
  await swiperStorage.incrementPostponeCount(taskId);
  await swiperStorage.addToSessionPostponed(taskId);
  
  // Проверка на часто откладываемые
  const task = await swiperStorage.updateTask(taskId, {});
  const settings = await swiperStorage.getSwiperSettings();
  if (task && (task.postponeCount || 0) >= settings.postponeThreshold) {
    // Задача переместится в раздел "Часто откладываемые"
  }
}

// Запланировать на сегодня
async function scheduleToday(taskId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = getDateKeyLocal(today);
  await swiperStorage.updateTask(taskId, { deadline: todayStr });
}

function getDateKeyLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Отменить последнее действие
async function undoLastAction() {
  if (actionHistory.length === 0) return;
  
  const lastAction = actionHistory.pop();
  const taskId = lastAction.taskId;
  
  if (lastAction.type === 'postpone') {
    // Откатываем отложение
    await swiperStorage.updateTask(taskId, {
      postponeCount: lastAction.previousState.postponeCount,
      lastPostponed: lastAction.previousState.lastPostponed
    });
    
    // Удаляем из сессии отложенных
    const settings = await swiperStorage.getSwiperSettings();
    const newSessionPostponed = settings.sessionPostponed.filter(id => id !== taskId);
    await swiperStorage.updateSwiperSettings({ sessionPostponed: newSessionPostponed });
    
    // Возвращаем задачу в начало списка
    const task = await swiperStorage.updateTask(taskId, {});
    if (task) {
      // Проверяем, нет ли уже этой задачи в массиве
      const existingIndex = swiperTasks.findIndex(t => t.id === taskId);
      if (existingIndex === -1) {
        // Задачи нет в массиве, добавляем в начало
        swiperTasks.unshift(task);
        currentTaskIndex = 0;
      } else {
        // Задача уже есть, просто переходим к ней
        currentTaskIndex = existingIndex;
      }
      updateProgress();
      showCurrentCard();
    }
  } else if (lastAction.type === 'schedule') {
    // Откатываем запланирование
    await swiperStorage.updateTask(taskId, {
      deadline: lastAction.previousState.deadline
    });
    
    // Возвращаем задачу в начало списка
    const task = await swiperStorage.updateTask(taskId, {});
    if (task) {
      // Проверяем, нет ли уже этой задачи в массиве
      const existingIndex = swiperTasks.findIndex(t => t.id === taskId);
      if (existingIndex === -1) {
        // Задачи нет в массиве, добавляем в начало
        swiperTasks.unshift(task);
        currentTaskIndex = 0;
      } else {
        // Задача уже есть, просто переходим к ней
        currentTaskIndex = existingIndex;
      }
      updateProgress();
      showCurrentCard();
    }
  }
}

// Обновление прогресса
function updateProgress() {
  const total = swiperTasks.length;
  const currentIndex = currentTaskIndex;
  
  // Убеждаемся, что индекс не превышает длину массива
  let safeIndex = currentIndex;
  if (safeIndex >= total && total > 0) {
    safeIndex = total - 1;
  }
  if (safeIndex < 0) {
    safeIndex = 0;
  }
  
  // Текущая позиция (индекс начинается с 0, поэтому для отображения добавляем 1)
  // Когда мы на последней задаче (индекс 4 из 5), позиция = 5
  const currentPosition = total > 0 ? Math.min(safeIndex + 1, total) : 0;
  // Прогресс показывает, сколько задач мы просмотрели (от 0% до 100%)
  const progress = total > 0 ? Math.min((currentPosition / total) * 100, 100) : 0;
  
  const progressBar = document.getElementById('swiperProgressBar');
  const counter = document.getElementById('swiperCounter');
  
  if (progressBar) {
    progressBar.style.width = `${progress}%`;
  }
  
  if (counter) {
    counter.textContent = `${currentPosition} / ${total}`;
  }
}

// Завершение ТаскСвайпер
async function finishSwiper() {
  console.log('[Swiper] finishSwiper: called');
  if (swiperStorage) {
    await swiperStorage.clearSessionPostponed();
  }
  // Показываем финальное сообщение
  const container = document.getElementById('swiperCardContainer');
  if (container) {
    ensureSwiperSideButtons(container);
    clearSwiperCards(container);
  }
  setSwiperEmptyState(true, 'Все задачи обработаны');
  console.log('[Swiper] finishSwiper: completion message shown');
}

// Проверка на часто откладываемые
async function checkIfFrequentlyPostponed(task) {
  const settings = await swiperStorage.getSwiperSettings();
  return (task.postponeCount || 0) >= (settings.postponeThreshold || 5);
}

// Инициализация обработчиков кнопок
function setupSwiperButtons() {
  const postponeBtn = document.getElementById('postponeBtn');
  const scheduleBtn = document.getElementById('scheduleBtn');
  const undoBtn = document.getElementById('undoBtn');
  const editBtn = document.getElementById('editSwiperBtn');
  const deleteBtn = document.getElementById('deleteSwiperBtn');
  const deleteModal = document.getElementById('swiperDeleteModal');
  const deleteCancelBtn = document.getElementById('swiperDeleteCancelBtn');
  const deleteConfirmBtn = document.getElementById('swiperDeleteConfirmBtn');
  const backToTasksBtn = document.getElementById('swiperBackToTasksBtn');
  
  if (postponeBtn) {
    postponeBtn.addEventListener('click', () => {
      if (currentTaskIndex < swiperTasks.length) {
        handleSwipeLeft();
      }
    });
  }
  
  if (scheduleBtn) {
    scheduleBtn.addEventListener('click', () => {
      if (currentTaskIndex < swiperTasks.length) {
        handleSwipeRight();
      }
    });
  }
  
  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      undoLastAction();
    });
  }
  
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      if (currentTaskIndex < swiperTasks.length) {
        const task = swiperTasks[currentTaskIndex];
        // В отдельной вкладке редактирование недоступно
        alert('Для редактирования задачи откройте основное окно расширения');
      }
    });
  }
  
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      openSwiperDeleteModal();
    });
  }

  if (deleteCancelBtn) {
    deleteCancelBtn.addEventListener('click', closeSwiperDeleteModal);
  }
  if (deleteConfirmBtn) {
    deleteConfirmBtn.addEventListener('click', confirmSwiperDelete);
  }
  if (deleteModal) {
    deleteModal.addEventListener('click', (e) => {
      if (e.target === deleteModal) {
        closeSwiperDeleteModal();
      }
    });
  }

  if (backToTasksBtn) {
    backToTasksBtn.addEventListener('click', () => {
      if (window.location.pathname.includes('swiper.html')) {
        window.location.href = chrome.runtime.getURL('main.html#tasks');
      } else {
        window.location.hash = 'tasks';
      }
    });
  }
}

function ensureSwiperSideButtons(container) {
  const ensureLabel = (action, text) => {
    let label = action.querySelector('.swiper-side-label');
    if (!label) {
      label = document.createElement('div');
      label.className = 'swiper-side-label';
      action.appendChild(label);
    }
    label.textContent = text;
  };

  let postponeBtn = document.getElementById('postponeBtn');
  let leftAction = postponeBtn ? postponeBtn.closest('.swiper-side-action') : null;
  if (!postponeBtn) {
    leftAction = document.createElement('div');
    leftAction.className = 'swiper-side-action left';
    postponeBtn = document.createElement('button');
    postponeBtn.id = 'postponeBtn';
    postponeBtn.className = 'swiper-action-btn swiper-side-btn postpone-btn';
    postponeBtn.title = 'Отложить';
    const span = document.createElement('span');
    span.textContent = '←';
    postponeBtn.appendChild(span);
    postponeBtn.addEventListener('click', () => {
      if (currentTaskIndex < swiperTasks.length) {
        handleSwipeLeft();
      }
    });
    leftAction.appendChild(postponeBtn);
    ensureLabel(leftAction, 'Позже');
    container.prepend(leftAction);
  } else if (!leftAction) {
    leftAction = document.createElement('div');
    leftAction.className = 'swiper-side-action left';
    postponeBtn.parentNode.insertBefore(leftAction, postponeBtn);
    leftAction.appendChild(postponeBtn);
    ensureLabel(leftAction, 'Позже');
  } else {
    ensureLabel(leftAction, 'Позже');
  }
  postponeBtn.style.display = '';

  let scheduleBtn = document.getElementById('scheduleBtn');
  let rightAction = scheduleBtn ? scheduleBtn.closest('.swiper-side-action') : null;
  if (!scheduleBtn) {
    rightAction = document.createElement('div');
    rightAction.className = 'swiper-side-action right';
    scheduleBtn = document.createElement('button');
    scheduleBtn.id = 'scheduleBtn';
    scheduleBtn.className = 'swiper-action-btn swiper-side-btn schedule-btn';
    scheduleBtn.title = 'Запланировать на сегодня';
    const span = document.createElement('span');
    span.textContent = '→';
    scheduleBtn.appendChild(span);
    scheduleBtn.addEventListener('click', () => {
      if (currentTaskIndex < swiperTasks.length) {
        handleSwipeRight();
      }
    });
    rightAction.appendChild(scheduleBtn);
    ensureLabel(rightAction, 'На сегодня');
    container.appendChild(rightAction);
  } else if (!rightAction) {
    rightAction = document.createElement('div');
    rightAction.className = 'swiper-side-action right';
    scheduleBtn.parentNode.insertBefore(rightAction, scheduleBtn);
    rightAction.appendChild(scheduleBtn);
    ensureLabel(rightAction, 'На сегодня');
  } else {
    ensureLabel(rightAction, 'На сегодня');
  }
  scheduleBtn.style.display = '';

  return { postponeBtn, scheduleBtn };
}

function clearSwiperCards(container) {
  const cards = container.querySelectorAll('.swiper-card');
  cards.forEach(card => card.remove());
}

function setSwiperEmptyState(isEmpty, message) {
  const emptyState = document.getElementById('swiperEmptyState');
  const controls = document.querySelector('.swiper-controls');
  const primaryLabels = document.querySelector('.swiper-actions-primary');
  const secondaryActions = document.querySelector('.swiper-actions.secondary-actions');
  const hint = document.getElementById('swiperHint');
  const postponeBtn = document.getElementById('postponeBtn');
  const scheduleBtn = document.getElementById('scheduleBtn');

  if (emptyState) {
    if (message) {
      const title = emptyState.querySelector('h3');
      const text = emptyState.querySelector('p');
      if (title) title.textContent = message;
      if (text && message === 'Нет активных задач для обработки') {
        text.textContent = 'Нет задач для разбора. Можно вернуться к списку.';
      }
    }
    emptyState.style.display = isEmpty ? 'block' : 'none';
  }

  if (controls) {
    controls.classList.toggle('is-empty', isEmpty);
  }
  if (primaryLabels) {
    primaryLabels.style.display = isEmpty ? 'none' : '';
  }
  if (secondaryActions) {
    secondaryActions.style.display = isEmpty ? 'none' : '';
  }
  if (hint) {
    hint.style.display = isEmpty ? 'none' : hint.style.display;
  }
  if (postponeBtn) {
    postponeBtn.style.display = isEmpty ? 'none' : '';
  }
  if (scheduleBtn) {
    scheduleBtn.style.display = isEmpty ? 'none' : '';
  }
}

function setupSwiperShortcuts() {
  if (isSwiperShortcutsReady) return;
  isSwiperShortcutsReady = true;

  document.addEventListener('keydown', (e) => {
    const activeElement = document.activeElement;
    const isTypingTarget = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.tagName === 'SELECT' ||
      activeElement.isContentEditable
    );
    if (isTypingTarget) return;

    const swiperSection = document.getElementById('swiperSection');
    const isSwiperVisible = swiperSection && swiperSection.style.display !== 'none';
    if (!isSwiperVisible) return;

    const modal = document.getElementById('swiperDeleteModal');
    const isModalOpen = modal && modal.style.display !== 'none';

    if (isModalOpen) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSwiperDeleteModal();
      }
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      triggerSwiperFeedback('left');
      handleSwipeLeft();
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      triggerSwiperFeedback('right');
      handleSwipeRight();
      return;
    }
    if (e.key === 'z' || e.key === 'Z' || e.key === 'Backspace') {
      e.preventDefault();
      triggerSwiperFeedback('undo');
      undoLastAction();
      return;
    }
    if (e.key === 'Delete') {
      e.preventDefault();
      triggerSwiperFeedback('delete');
      openSwiperDeleteModal();
    }
  });
}

function triggerSwiperFeedback(direction) {
  const card = currentCard;
  if (card) {
    card.classList.remove('flash-left', 'flash-right');
    if (direction === 'left') {
      card.classList.add('flash-left');
    } else if (direction === 'right') {
      card.classList.add('flash-right');
    }
    setTimeout(() => {
      card.classList.remove('flash-left', 'flash-right');
    }, 200);
  }

  const postponeBtn = document.getElementById('postponeBtn');
  const scheduleBtn = document.getElementById('scheduleBtn');
  const undoBtn = document.getElementById('undoBtn');
  const deleteBtn = document.getElementById('deleteSwiperBtn');
  const target = direction === 'left'
    ? postponeBtn
    : direction === 'right'
      ? scheduleBtn
      : direction === 'undo'
        ? undoBtn
        : deleteBtn;
  if (target) {
    target.classList.add('flash');
    setTimeout(() => target.classList.remove('flash'), 200);
  }
}

function showSwiperHintOnce() {
  const hint = document.getElementById('swiperHint');
  if (!hint) return;
  const seen = localStorage.getItem('swiperHintSeen');
  if (seen) return;
  hint.style.display = 'block';
  localStorage.setItem('swiperHintSeen', '1');
  setTimeout(() => {
    hint.style.display = 'none';
  }, 3000);
}

function openSwiperDeleteModal() {
  if (currentTaskIndex >= swiperTasks.length) return;
  const modal = document.getElementById('swiperDeleteModal');
  const message = document.getElementById('swiperDeleteMessage');
  const task = swiperTasks[currentTaskIndex];
  if (!modal || !message || !task) return;
  swiperPendingDeleteTaskId = task.id;
  message.textContent = `Удалить задачу "${task.text}"? Это действие нельзя отменить.`;
  modal.style.display = 'block';
}

function closeSwiperDeleteModal() {
  const modal = document.getElementById('swiperDeleteModal');
  if (modal) {
    modal.style.display = 'none';
  }
  swiperPendingDeleteTaskId = null;
}

async function confirmSwiperDelete() {
  const taskId = swiperPendingDeleteTaskId;
  closeSwiperDeleteModal();
  if (!taskId) return;
  if (!swiperStorage) return;
  if (currentCard) {
    currentCard.classList.add('exiting');
    currentCard.style.opacity = '0';
    currentCard.style.transform = 'scale(0.95)';
  }
  await swiperStorage.deleteTask(taskId);
  swiperTasks = swiperTasks.filter(task => task.id !== taskId);
  if (currentTaskIndex >= swiperTasks.length && swiperTasks.length > 0) {
    currentTaskIndex = swiperTasks.length - 1;
  }
  updateProgress();
  setTimeout(() => {
    showCurrentCard();
  }, 200);
}

// Делаем функции глобально доступными (после определения функций)
window.initSwiper = initSwiper;
window.setSwiperStorage = setSwiperStorage;
window.setupSwiperButtons = setupSwiperButtons;
window.setupSwiperShortcuts = setupSwiperShortcuts;

// Инициализация при загрузке (только для swiper.html)
document.addEventListener('DOMContentLoaded', () => {
  // Инициализируем только если мы на странице swiper.html
  const isSwiperPage = window.location.pathname.includes('swiper.html');
  if (isSwiperPage) {
    if (typeof StorageManager !== 'undefined' && !swiperStorage) {
      swiperStorage = new StorageManager();
    }
    if (typeof setupSwiperButtons === 'function') {
      setupSwiperButtons();
    }
  }
});
