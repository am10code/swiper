# Структура приложения

Этот документ описывает страницы, модалки, попапы и ключевые элементы интерфейса с иерархией и ссылками на файлы/классы. Обновлять при изменениях UI.

## Точки входа и страницы

- В `manifest.json` нет `action.default_popup`.
- При клике на иконку расширения открывается `main.html` через `chrome.action.onClicked` в `background/background.js`.
- Статусы страниц:
  - `main.html` — production entrypoint.
  - `swiper.html` — secondary standalone page.
  - `popup/popup.html` — legacy page (не production runtime entrypoint).

## Правила сборки CRX

- Путь к ключу и приватная команда сборки не хранятся в публичных файлах проекта.
- Локальная инструкция сборки вынесена в `BUILD_PRIVATE.md` (файл в `.gitignore`).
- Для стабильного ID расширения сборка должна выполняться с постоянным приватным ключом.

### Главная страница расширения (вкладка) — "Задачи"
- **Файл:** `main.html`
- **Стили:** `popup/popup.css`
- **Логика:** `popup/popup.js`, `popup/task-card.js`, `popup/modules/import-export.js`, `popup/modules/prioritization.js`, `popup/modules/swiper/swiper.js`, `popup/modules/swiper/swiper-init.js`
- **Назначение:** основной интерфейс управления задачами, фильтрами, настройками и карточками.

**Хедер**
- `header.header`
  - `#burgerMenuBtn` — кнопка бургер‑меню для навигации между разделами.
  - `#flowBtn` — кнопка «ФЛОУ» (текст + ✨), овальная обводка; по клику переключает на режим ФЛОУ (`switchSection('flow')`); занимает место заголовка в центре хедера.
  - `#headerTitle` — текст названия раздела (Поиск, Настройки, ФЛОУ и т.д.); в разделе «Задачи» пустой.
  - `#priorityPromptBtn` — кнопка-индикатор приоритизации (иконка волшебной палочки), видна если есть активные задачи без ранга.
  - `#settingsBtn` — шестерёнка для "Настройки списка задач".

**Бургер‑меню**
- `#burgerMenu` / `.burger-menu-content`
  - `.burger-menu-item[data-section="tasks"]` — раздел "Задачи".
  - `.burger-menu-item[data-section="search"]` — "Поиск".
  - `.burger-menu-item[data-section="completed"]` — "Выполненные задачи".
  - `.burger-menu-item[data-section="swiper"]` — "Свайпер".
  - `.burger-menu-item[data-section="flow"]` — "ФЛОУ" (вход в режим ФЛОУ; выход — выбор любого другого раздела, например "Задачи").
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
  - `#noDateTasksSection` — "Без даты" (кат, по умолчанию свернут).
    - `#noDateTasksToggle` — заголовок‑переключатель раскрытия.
    - `#noDateTasksList` — список задач без дедлайна.
  - `#emptyState` — пустое состояние.
  - **Логика разбиения:** `popup/popup.js` (renderActiveTasks).
  - Сортировка в секциях: сначала `priorityRank` (скрытый числовой ранг), затем срочность (`high/medium`), дедлайн и дата создания.
  - **Контекстное меню задачи:** `#taskContextMenu`
    - `#taskContextTodayBtn` — перенести на сегодня.
    - `#taskContextOpenBtn` — открыть полную карточку.
    - `#taskContextDeleteBtn` — удалить задачу.
    - **Логика:** `popup/popup.js` (setupTaskContextMenu).
  - **Карточка задачи в списке:**
    - Строка следующего шага: `.task-next-step` (текст шага или плейсхолдер).
    - Индикатор фокуса: `.task-focus-indicator` (например, `⏱ 25м`, для 25м показывается по hover/focus).
      - Клик по индикатору открывает карточку и запускает таймер.
    - Инлайн-редактирование из списка отключено (кнопка карандаша скрыта); редактирование через полную карточку задачи.
    - Просрочка: `.task-item.overdue` (тонкая левая полоска).

**Форма добавления задачи / режимы ввода**
- `.add-task-section`
  - `#taskForm` / `.task-form`
  - `#taskInput` — текст задачи.
  - `#toggleOptionsBtn` — шестерёнка параметров (inline SVG внутри кнопки).
  - `#taskOptions` — доп. поля:
    - `#categorySelect`, `#prioritySelect` (Обычный/Высокий), `#deadlineInput` (при пустом поле подставляется дедлайн «Сегодня»).
    - `#addCategoryBtn` — добавить категорию.
- `#addTaskFab` — floating action button (`+`) справа внизу для режима FAB.
- Доступны 2 режима создания задачи:
  - `bottom` — классическое закреплённое поле снизу (`.add-task-section` всегда видно в разделе "Задачи").
  - `fab` — поле снизу скрыто по умолчанию, открывается по клику на `#addTaskFab`.
- **Логика:** `popup/popup.js` (handleAddTask, toggleTaskOptions, applyTaskCreationMode, toggleFabTaskInput).

**Раздел "Поиск"**
- `#searchSection` / `.search-section`
  - `#searchInput` — строка поиска.
  - `#categoryFilter`, `#priorityFilter` (Обычный/Высокий) — фильтры.
  - **Логика:** `popup/popup.js` (handleSearchInSearchSection).

**Раздел "Настройки"**
- `#settingsSection` / `.settings-section-page`
  - Блок "Настройки помодоро":
    - Контейнер формы: `.pomodoro-settings.pomodoro-settings-form`
    - Вводные пояснения: `.pomodoro-settings-hint`
    - Сетка параметров: `.pomodoro-settings-grid`
    - Строка параметра: `.pomodoro-setting-row` (с подписью `.pomodoro-setting-title`, пояснением `.pomodoro-setting-caption` и группой ввода `.pomodoro-input-wrap`)
    - Поля настроек: `#pomodoroInterval`, `#pomodoroShortBreak`, `#pomodoroLongBreak`, `#pomodoroLongBreakAfter` (`.pomodoro-setting-input`)
    - Единицы измерения рядом с полем: `.pomodoro-input-unit` (`мин`/`сессий`)
    - Панель действий: `.pomodoro-setting-actions`
    - `#pomodoroSaveSettingsBtn` — сохранить глобальные настройки помодоро.
    - `#pomodoroSaveStatus` — текстовый статус сохранения (`aria-live="polite"`), показывает успех/предупреждение и очищается автоматически.
  - Блок "Логи":
    - `#logCompletedStepsToggle` — глобальный чекбокс "Логировать выполнение шагов" (сохраняется сразу при переключении).
  - Блок "Добавление задач":
    - radio `name="taskCreationMode"`:
      - `value="bottom"` — "Поле внизу" (режим по умолчанию).
      - `value="fab"` — "FAB".
    - Настройка сохраняется сразу при переключении.
  - Блок "Импорт и экспорт задач":
    - `#tasksExportBtn` — экспорт задач в файл `.swiper`.
    - `#tasksImportBtn`, `#tasksImportInput` — импорт `.swiper`/`.json` с заменой задач; обязательное поле только `text`, лишние поля допускаются.
  - Блок "Для разработчика":
    - `#testNotificationBtn` — тест уведомления.
  - **Логика:** `popup/popup.js` (loadSettingsSection, saveGlobalPomodoroSettings, setPomodoroSaveStatus, normalizePomodoroValue).

**Раздел "Выполненные задачи"**
- `#completedSection`
  - `#completedTasksList` — список выполненных.
  - `#completedEmptyState` — пустое состояние.
  - **Логика:** `popup/popup.js` (renderCompletedTasks, groupCompletedTasksByDate).
  - Выполненные задачи группируются по дате завершения: "Сегодня", "Вчера", либо дата.

**Раздел "Часто откладываемые"**
- `#frequentlyPostponedSection`
  - `#frequentlyPostponedList`, `#frequentlyPostponedEmptyState`.
  - **Логика:** `popup/popup.js` (renderFrequentlyPostponed).

**Раздел "ФЛОУ"**
- `#flowSection` — полноэкранный режим с одной задачей в виде полной карточки.
  - По умолчанию секция скрыта (`display: none`); при переключении на ФЛОУ показывается только она и хедер с бургером.
  - На `body` устанавливается класс `flow-mode`: overlay под хедером на весь экран; панель карточки (`#taskCardPanel`) увеличенной ширины (до ~30% шире обычной, с ограничением `max-width: 1170px`), по центру.
  - `#flowEmptyState` — пустое состояние «Нет активных задач», если список задач в порядке ФЛОУ пуст.
  - Порядок задач: объединенный блок «просрочено + сегодня» сортируется по приоритету (`priorityRank`, затем срочность); затем идут задачи с дедлайном завтра и позже в хронологическом порядке (при равном дедлайне — по приоритету); затем задачи без дедлайна.
  - Переход между задачами в карточке: **снимок** порядка id при первом входе в ФЛОУ; внутри прохода — «следующая» по этому снимку (в т.ч. после «Выполнено на сегодня»); с **последнего** id снимка — переснимок из актуального порядка ФЛОУ и открытие первой задачи нового списка (аналог повторного входа без закрытия карточки). После «Отметить задачу выполненной» — та же логика (завершение последней в снимке → переснимок и первая в новом порядке).
  - Выход из режима только через бургер-меню (выбор раздела «Задачи», «Поиск» и т.д. снимает `flow-mode`, сбрасывает снимок и закрывает карточку).
  - **Логика:** `popup/popup.js` (switchSection, enterFlowMode, `flowSessionOrderedIds`, `refreshFlowSessionSnapshot`, пропуск повторного `enterFlowMode` при уже открытом ФЛОУ), `popup/task-card.js` (`resolveNextFlowTaskId`, `getFlowOrderedTasks`, обработчики карточки в режиме flow).

**Раздел "Свайпер"**
- `#swiperSection`
  - `#swiperCardContainer` — контейнер карточек.
  - `#postponeBtn`, `#scheduleBtn`, `#undoBtn`, `#editSwiperBtn`, `#deleteSwiperBtn`.
  - `#swiperCounter`, `#swiperHint`, `#swiperEmptyState`, `#swiperBackToTasksBtn`.
  - Горячие клавиши (когда секция видима): `ArrowLeft`, `ArrowRight`, `z/Z`, `Backspace`, `Delete`.
  - **Логика:** `popup/modules/swiper/swiper.js`, `popup/modules/swiper/swiper-init.js`.

**Раздел "Что важнее" (приоритизация)**
- `#prioritizationSection`
  - Заголовок: `h2.section-title` со строкой "Что важнее".
  - Подзаголовок: `.prioritization-subtitle`.
  - Контейнер сравнения: `#prioritizationStack` — две карточки одна над другой.
  - Карточка выбора: `.prioritization-card-btn` (только `.prioritization-card-title` и `.prioritization-card-deadline`).
  - Прогресс: `#prioritizationProgress`.
  - Пустое состояние: `#prioritizationEmptyState`.
  - Поведение: клик по карточке фиксирует выбор, полная карточка задачи не открывается.
  - **Логика:** `popup/popup.js`, `popup/modules/prioritization.js`.

### Отдельная страница "Свайпер"
- **Файл:** `swiper.html`
- **Стили:** `popup/popup.css` + локальные `<style>` в `swiper.html`
- **Логика:** `popup/modules/swiper/swiper.js`, `popup/modules/swiper/swiper-nav.js`, `popup/modules/swiper/swiper-init.js`
- **Назначение:** standalone-экран "Свайпер" с собственным хедером и меню.
- **Хедер:** содержит `#priorityPromptBtn`; при наличии неприоритизированных задач ведет на `main.html#prioritization`.
- **Инициализация:** через `initSwiperPage({ standalone: true })` в `popup/modules/swiper/swiper-init.js`.

### Popup‑страница расширения
- **Файл:** `popup/popup.html`
- **Стили:** `popup/popup.css`
- **Логика:** `popup/popup.js`, `popup/task-card.js`
- **Назначение:** compact legacy-версия интерфейса (не production entrypoint), включает:
  - "Задачи", "Поиск", "Выполненные задачи", "Часто откладываемые".
  - Форму добавления задачи и модалку редактирования.
  - "Полную карточку задачи".
  - Структура отличается от `main.html` (другие заголовки подразделов, нет `settingsSection`, нет `swiperSection`).
  - В режиме legacy просроченные задачи рендерятся в блоке "сегодня", так как отдельной overdue-секции в DOM нет.

## Bootstrap и page-specific инициализация

- `popup/popup.js`:
  - определяет тип страницы (`main` или `legacy popup`);
  - формирует список доступных секций для страницы;
  - запускает page-specific bootstrap `initPopupUiPage(...)`;
  - управляет запуском/рендером секции приоритизации `prioritization`.
- `popup/modules/swiper/swiper-init.js`:
  - экспортирует `initSwiperPage({ standalone })`;
  - автоматически инициализирует standalone только на `swiper.html`.
- `popup/modules/swiper/swiper.js`:
  - содержит ядро свайпера;
  - навеска кнопок сделана идемпотентной (`setupSwiperButtons()` вызывается безопасно повторно).
- `popup/task-card.js`:
  - использует `initTaskCardPage()` с защитой от повторной инициализации.

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

### Модальный диалог (dialog-service)
- **Создание:** контейнер создаётся скриптом при первом вызове, не в разметке HTML.
- **Контейнер:** `#dialogOverlay` (класс `.dialog-overlay`), внутри `#dialogBox` (класс `.dialog-box`).
- **Содержание:** заголовок (`.dialog-title`), текст (`.dialog-message`), кнопки (`.dialog-buttons`, `.dialog-btn`, `.dialog-btn-primary`).
- **Назначение:** сообщения и подтверждения вместо блокирующих `alert`/`confirm` (импорт, удаление задачи, закрытие карточки при активном помодоро, ошибки и подсказки).
- **Логика и стили:** `popup/modules/dialog-service.js`, стили в `popup/popup.css` (секция «Модальный диалог»). API: `window.dialogService.showAlert(message, title?)`, `window.dialogService.showConfirm(title, message, options?)`.
- **Страницы:** доступен на `main.html`, `popup/popup.html`, `swiper.html` (скрипт подключается до popup.js / task-card / swiper).

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
  - Смена названия для активной задачи с **просроченным** дедлайном переносит дедлайн на «сегодня» (README).

**Редактирование в карточке**
- При сохранении блока: если менялись приоритет, ссылка или регулярность — для **просроченной** задачи дедлайн принудительно «сегодня»; иначе дата из формы сохраняется; если меняли только дату — введённая дата (README).
- `#taskCardEditSection`
  - `#taskCardEditPriority` (Обычный/Высокий), `#taskCardEditDeadline`, `#taskCardEditLink`
  - Для `#taskCardEditLink` валидируются только URL с протоколом `http://` или `https://`.
  - `#taskCardEditRecurringParticipation` — переключатель режима "регулярное участие".
  - `#taskCardEditRecurrenceDays` — период регулярности в днях (по умолчанию 3); показывается только при активном `#taskCardEditRecurringParticipation`.
  - Быстрые кнопки дедлайна: `.deadline-quick-btn` (Сегодня/Завтра/На следующей неделе), блок расположен выше настроек регулярности.

**Две колонки**
- `div.task-card-columns`
  - **Левая 65%: "Что сделать следующим?"**
    - `.next-steps-container`, `#nextStepInput`, `#nextStepAddBtn`
    - `#nextStepsActive`, `#nextStepsCompleted`
    - Клик по строке шага отмечает подзадачу выполненной/невыполненной.
    - Клик по `.next-step-delete` удаляет подзадачу.
    - Изменения в шагах (включая порядок): дедлайн на «сегодня» только если он был просрочен (README).
  - **Правая 35%: "Фокус (помодоро)"**
    - `#pomodoroTimerDisplay`, `#pomodoroStartBtn`, `#pomodoroPauseBtn`, `#pomodoroStopBtn`, `#pomodoroStartBreakBtn`, `#pomodoroResetBtn`
    - Старт фокус‑сессии (`#pomodoroStartBtn`): дедлайн на «сегодня» только при просрочке; старт перерыва — без сдвига дедлайна.
    - `#pomodoroSoundToggleBtn`, `#pomodoroSoundToggleIcon` — переключатель фонового звука.
    - Метрика времени: `#totalTimeDisplay`
    - История: `#pomodoroHistory`, `#pomodoroHistoryList`

**Лог**
- `.task-log-section`
  - `#taskLogToggleBtn`, `#taskLogBody` — сворачивание/раскрытие.
  - `.task-log-container` → `#taskLogInput`, `#taskLogAddBtn`, `#taskLogEntries`
  - При включенном `#logCompletedStepsToggle` в лог автоматически добавляется запись `Выполнен шаг <название шага>` при закрытии подшага.
  - Ручная запись в лог: дедлайн на «сегодня» только если был просрочен (README).

**Действия**
- `#taskCardCompleteBtn` — основное действие:
  - для обычной задачи: "Отметить задачу выполненной"
  - для регулярной задачи: "Выполнено на сегодня" (перенос дедлайна на период регулярности)
- `#taskCardNextBtn` — перейти к следующей задаче из очереди: "Просрочено (по приоритету)" → "Сегодня (по приоритету)" → "Позже (по дедлайну, при равном дедлайне — по приоритету)" → "Без дедлайна"
- `#taskCardMoreOptionsBtn` — меню дополнительных опций
- `#taskCardOptionsMenu`:
  - `#taskCardOptionNextWeekBtn` — перенести на следующую неделю
  - `#taskCardOptionHideSwiper3Days` — скрыть из свайпера на 3 дня
  - `#taskCardOptionHideSwiper1Week` — скрыть из свайпера на 1 неделю
  - `#taskCardOptionCompleteBtn` — принудительно завершить задачу
  - `#taskCardOptionEditBtn` — редактировать
  - `#taskCardOptionResetPriorityWeightBtn` — сбросить вес задачи (обнулить `priorityRank`)
  - `#taskCardOptionDeleteBtn` — удалить

**Индикатор регулярности в названиях**
- Для задач с `isRecurringParticipation = true` рядом с названием отображается серый символ `↻`.
- Индикатор отображается во всех основных местах рендера названия задачи (списки, выполненные, часто откладываемые, полная карточка, Свайпер) и не имеет действия по клику.

## Служебные элементы и данные

### Хранилище и модели
- **Файл:** `popup/storage.js`
- **Назначение:** задачи, категории, настройки, сессии помодоро, учёт времени.
- В `settings` добавлено поле `taskCreationMode` (`bottom` | `fab`), по умолчанию `bottom`, для старых данных применяется fallback в `StorageManager.init()`.

### Фоновый сервис
- **Файл:** `background/background.js`
- **Назначение:** напоминания по дедлайнам, алармы помодоро, уведомления.
- **Деталь:** для уведомлений есть fallback-иконка через data URL при проблемах с основным icon URL.

## Ассеты

### Иконки
- **Папка:** `assets/icons/`
- **Примеры:** `icon-pencil.svg`, `icon-trash.svg`, `icon-settings.svg`, `icon-settings-alt.svg`
- **Назначение:** кнопки редактирования/удаления/настроек.
- **Дополнительно:** в `manifest.json` и уведомлениях используются пути к `icon16.png`, `icon48.png`, `icon128.png`; в репозитории сейчас присутствуют SVG и `assets/icons/README.txt` с инструкцией конвертации.

### Аудио
- В `popup/task-card.js` используются пути к `assets/audio/pomodoro-ambience.mp3` и `assets/audio/bell.wav`.
- В текущем дереве проекта папка `assets/audio/` отсутствует.

