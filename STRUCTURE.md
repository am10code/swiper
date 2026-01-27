# Структура приложения

Этот документ описывает страницы, модалки, попапы и ключевые элементы интерфейса с иерархией и ссылками на файлы/классы. Обновлять при изменениях UI.

## Точки входа и страницы

### Главная страница расширения (вкладка) — "Задачи"
- **Файл:** `main.html`
- **Стили:** `popup/popup.css`
- **Логика:** `popup/popup.js`, `popup/task-card.js`, `popup/modules/import-export.js`, `popup/modules/swiper/swiper.js`, `popup/modules/swiper/swiper-init.js`
- **Назначение:** основной интерфейс управления задачами, фильтрами, настройками и карточками.

**Хедер**
- `header.header`
  - `#burgerMenuBtn` — кнопка бургер‑меню для навигации между разделами.
  - `h1` — заголовок текущего раздела ("Задачи", "Поиск", "Настройки" и т.д.).
  - `#settingsBtn` — шестерёнка для "Настройки списка задач".

**Бургер‑меню**
- `#burgerMenu` / `.burger-menu-content`
  - `.burger-menu-item[data-section="tasks"]` — раздел "Задачи".
  - `.burger-menu-item[data-section="search"]` — "Поиск".
  - `.burger-menu-item[data-section="completed"]` — "Выполненные задачи".
  - `.burger-menu-item[data-section="swiper"]` — "Свайпер".
  - `.burger-menu-item[data-section="frequently-postponed"]` — "Часто откладываемые".
  - `.burger-menu-item[data-section="settings"]` — "Настройки".
  - **Логика переключения:** `popup/popup.js` (switchSection).

**Раздел "Задачи"**
- `#tasksSection` / `.tasks-section`
  - `#overdueTasksSection` — "Просрочено".
    - `#overdueTasksList` — список карточек задач.
  - `#todayTasksSection` — "Сегодня".
    - `#todayTasksList` — список карточек задач.
  - `#otherTasksSection` — "Позже".
    - `#otherTasksList` — список карточек задач.
  - `#emptyState` — пустое состояние.
  - **Логика разбиения:** `popup/popup.js` (renderActiveTasks).
  - **Контекстное меню задачи:** `#taskContextMenu`
    - `#taskContextTodayBtn` — перенести на сегодня.
    - `#taskContextOpenBtn` — открыть полную карточку.
    - `#taskContextDeleteBtn` — удалить задачу.
    - **Логика:** `popup/popup.js` (setupTaskContextMenu).
  - **Карточка задачи в списке:**
    - Строка следующего шага: `.task-next-step` (текст шага или плейсхолдер).
    - Индикатор фокуса: `.task-focus-indicator` (например, `⏱ 25м`, для 25м показывается по hover/focus).
      - Клик по индикатору открывает карточку и запускает таймер.
    - Просрочка: `.task-item.overdue` (тонкая левая полоска).

**Форма добавления задачи (приклеена снизу)**
- `.add-task-section`
  - `#taskForm` / `.task-form`
  - `#taskInput` — текст задачи.
  - `#toggleOptionsBtn` — шестерёнка параметров (иконка `assets/icons/icon-settings-alt.svg`).
  - `#taskOptions` — доп. поля:
    - `#categorySelect`, `#prioritySelect` (Обычный/Высокий), `#deadlineInput`
    - `#addCategoryBtn` — добавить категорию.
  - **Логика:** `popup/popup.js` (handleAddTask, toggleTaskOptions).

**Раздел "Поиск"**
- `#searchSection` / `.search-section`
  - `#searchInput` — строка поиска.
  - `#categoryFilter`, `#priorityFilter` (Обычный/Высокий) — фильтры.
  - **Логика:** `popup/popup.js` (handleSearchInSearchSection).

**Раздел "Настройки"**
- `#settingsSection` / `.settings-section-page`
  - Блок "Настройки помодоро":
    - `#pomodoroInterval`, `#pomodoroShortBreak`, `#pomodoroLongBreak`, `#pomodoroLongBreakAfter`
    - `#pomodoroSaveSettingsBtn` — сохранить глобальные настройки помодоро.
  - Блок "Импорт и экспорт задач":
    - `#tasksExportBtn` — экспорт задач в файл `.swiper`.
    - `#tasksImportBtn`, `#tasksImportInput` — импорт `.swiper`/`.json` с заменой задач.
  - Блок "Для разработчика":
    - `#testNotificationBtn` — тест уведомления.
  - **Логика:** `popup/popup.js` (loadSettingsSection, saveGlobalPomodoroSettings).

**Раздел "Выполненные задачи"**
- `#completedSection`
  - `#completedTasksList` — список выполненных.
  - `#completedEmptyState` — пустое состояние.
  - **Логика:** `popup/popup.js` (renderCompletedTasks).

**Раздел "Часто откладываемые"**
- `#frequentlyPostponedSection`
  - `#frequentlyPostponedList`, `#frequentlyPostponedEmptyState`.
  - **Логика:** `popup/popup.js` (renderFrequentlyPostponed).

**Раздел "Свайпер"**
- `#swiperSection`
  - `#swiperCardContainer` — контейнер карточек.
  - `#postponeBtn`, `#scheduleBtn`, `#undoBtn`, `#editSwiperBtn`, `#deleteSwiperBtn`.
  - `#swiperCounter`, `#swiperHint`, `#swiperEmptyState`, `#swiperBackToTasksBtn`.
  - **Логика:** `popup/modules/swiper/swiper.js`, `popup/modules/swiper/swiper-init.js`.

### Отдельная страница "Свайпер"
- **Файл:** `swiper.html`
- **Стили:** `popup/popup.css` + локальные `<style>` в `swiper.html`
- **Логика:** `popup/modules/swiper/swiper.js`, `popup/modules/swiper/swiper-nav.js`, `popup/modules/swiper/swiper-init.js`
- **Назначение:** выделенная страница для "Свайпер" с собственным хедером и меню, навигация через `swiper-nav.js`.

### Popup‑страница расширения
- **Файл:** `popup/popup.html`
- **Стили:** `popup/popup.css`
- **Логика:** `popup/popup.js`, `popup/task-card.js`
- **Назначение:** компактная версия интерфейса (историческая), включает:
  - "Задачи", "Поиск", "Выполненные задачи", "Часто откладываемые".
  - Форму добавления задачи и модалку редактирования.
  - "Полную карточку задачи".
  - В этом файле структура может отличаться от `main.html` (например, старые названия разделов).

## Модалки и попапы

### Модалка "Редактировать задачу"
- **Файл:** `main.html`, `popup/popup.html`
- **Контейнер:** `#editModal`
- **Содержание:** `#editForm`, `#editTaskInput`, `#editCategorySelect`, `#editPrioritySelect` (Обычный/Высокий), `#editDeadlineInput`
- **Быстрые кнопки:** `.deadline-quick-btn` ("Сегодня", "Завтра")
- **Назначение:** редактирование текста/категории/приоритета/дедлайна.
- **Логика:** `popup/popup.js` (handleEditTask, setupDeadlineQuickButtons)

### Модалка "Добавить категорию"
- **Файл:** `main.html`, `popup/popup.html`
- **Контейнер:** `#categoryModal`
- **Содержание:** `#categoryForm`, `#categoryNameInput`
- **Назначение:** создание новых категорий.
- **Логика:** `popup/popup.js` (handleAddCategory)

### Попап "Настройки списка задач"
- **Файл:** `main.html`
- **Контейнер:** `#taskSettingsModal`
- **Содержание:** radio `name="taskDisplayMode"` (все/только сегодня), кнопка `#taskSettingsOkBtn`
- **Назначение:** переключение режима отображения задач.
- **Логика:** `popup/popup.js` (openTaskSettingsModal, saveTaskSettings)

### Модалка подтверждения удаления задачи
- **Файл:** `main.html`, `popup/popup.html`
- **Контейнер:** `#taskDeleteModal`
- **Содержание:** `#taskDeleteMessage`, `#taskDeleteCancelBtn`, `#taskDeleteConfirmBtn`
- **Назначение:** безопасное подтверждение удаления задачи.
- **Логика:** `popup/task-card.js` (openDeleteModal, confirmDeleteTask)

### Модалка подтверждения удаления задачи (Свайпер)
- **Файл:** `main.html`, `swiper.html`
- **Контейнер:** `#swiperDeleteModal`
- **Содержание:** `#swiperDeleteMessage`, `#swiperDeleteCancelBtn`, `#swiperDeleteConfirmBtn`
- **Назначение:** подтверждение удаления задачи из очереди свайпа.
- **Логика:** `popup/modules/swiper/swiper.js` (openSwiperDeleteModal, confirmSwiperDelete)

## Полная карточка задачи

### Панель "Полная карточка задачи"
- **Файл:** `main.html`, `popup/popup.html`
- **Контейнеры:** `#taskCardOverlay`, `#taskCardPanel`
- **Назначение:** детальная работа с задачей.
- **Логика:** `popup/task-card.js`
- **Структура модалки:**
  - `.modal-header` — фиксированная шапка.
  - `.modal-body` — скроллируемая область контента.
  - `.modal-footer` — фиксированный футер с действиями.

**Шапка карточки**
- `#taskCardTitle`, `#taskCardMeta`
- Кнопка закрытия: `#taskCardCloseBtn` (×), также Esc и клик по overlay.
  - В `#taskCardMeta` показывается ссылка задачи (если задана), правее дедлайна.

**Редактирование в карточке**
- `#taskCardEditSection`
  - `#taskCardEditText`, `#taskCardEditPriority` (Обычный/Высокий), `#taskCardEditDeadline`, `#taskCardEditLink`
  - Быстрые кнопки дедлайна: `.deadline-quick-btn`

**Две колонки**
- `div.task-card-columns`
  - **Левая 65%: "Что сделать следующим?"**
    - `.next-steps-container`, `#nextStepInput`, `#nextStepAddBtn`
    - `#nextStepsActive`, `#nextStepsCompleted`
  - **Правая 35%: "Фокус (помодоро)"**
    - `#pomodoroTimerDisplay`, `#pomodoroStartBtn`, `#pomodoroPauseBtn`, `#pomodoroStopBtn`, `#pomodoroStartBreakBtn`, `#pomodoroResetBtn`
    - `#pomodoroSoundToggleBtn`, `#pomodoroSoundToggleIcon` — переключатель фонового звука.
    - Метрика времени: `#totalTimeDisplay`
    - История: `#pomodoroHistory`, `#pomodoroHistoryList`

**Лог**
- `.task-log-section`
  - `#taskLogToggleBtn`, `#taskLogBody` — сворачивание/раскрытие.
  - `.task-log-container` → `#taskLogInput`, `#taskLogAddBtn`, `#taskLogEntries`

**Действия**
- `#taskCardCompleteBtn` — отметить задачу выполненной
- `#taskCardNextBtn` — перейти к следующей задаче на сегодня
- `#taskCardMoreOptionsBtn` — меню дополнительных опций
- `#taskCardOptionsMenu`:
  - `#taskCardOptionNextWeekBtn` — перенести на следующую неделю
  - `#taskCardOptionEditBtn` — редактировать
  - `#taskCardOptionDeleteBtn` — удалить

## Служебные элементы и данные

### Хранилище и модели
- **Файл:** `popup/storage.js`
- **Назначение:** задачи, категории, настройки, сессии помодоро, учёт времени.

### Фоновый сервис
- **Файл:** `background/background.js`
- **Назначение:** напоминания по дедлайнам, алармы помодоро, уведомления.

## Ассеты

### Иконки
- **Папка:** `assets/icons/`
- **Примеры:** `icon-pencil.svg`, `icon-trash.svg`, `icon-settings.svg`, `icon-settings-alt.svg`
- **Назначение:** кнопки редактирования/удаления/настроек.

### Аудио
- **Файл:** `assets/audio/pomodoro-ambience.mp3`
- **Назначение:** фон при активном помодоро‑таймере.
- **Файл:** `assets/audio/bell.wav`
- **Назначение:** звонок завершения помодоро/отдыха.

