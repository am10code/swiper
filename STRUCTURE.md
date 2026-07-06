# Структура приложения

Этот документ описывает страницы, модалки, попапы и ключевые элементы интерфейса с иерархией и ссылками на файлы/классы. Обновлять при изменениях UI.

## Точки входа и страницы

- В `manifest.json` нет `action.default_popup`.
- При клике на иконку расширения открывается `main.html` через `chrome.action.onClicked` в `background/background.js`.
- Статусы страниц:
  - `main.html` — production entrypoint.
  - `popup/popup.html` — legacy page (не production runtime entrypoint).

## Правила сборки CRX

- Путь к ключу и приватная команда сборки не хранятся в публичных файлах проекта.
- Локальная инструкция сборки вынесена в `BUILD_PRIVATE.md` (файл в `.gitignore`).
- Для стабильного ID расширения сборка должна выполняться с постоянным приватным ключом.

### Главная страница расширения (вкладка) — "Задачи"
- **Файл:** `main.html`
- **Стили:** `popup/popup.css`
- **Логика:** `popup/popup.js`, `popup/task-card.js`, `popup/modules/import-export.js`, `popup/modules/prioritization.js`
- **Назначение:** основной интерфейс управления задачами, фильтрами, настройками и карточками.

**Хедер**
- `header.header`
  - `#burgerMenuBtn` — кнопка бургер‑меню для навигации между разделами.
  - `#flowBtn` — кнопка «ФЛОУ» (текст + ✨), овальная обводка; по клику переключает на режим ФЛОУ (`switchSection('flow')`); занимает место заголовка в центре хедера.
  - `#headerTitle` — текст названия раздела (Настройки, ФЛОУ и т.д.); в разделе «Задачи» пустой.
  - `#settingsBtn` — шестерёнка для "Настройки списка задач".

**Бургер‑меню**
- `#burgerMenu` / `.burger-menu-content`
  - `.burger-menu-item[data-section="tasks"]` — раздел "Задачи".
  - `.burger-menu-item[data-section="completed"]` — "Выполненные задачи".
  - `.burger-menu-item[data-section="flow"]` — "ФЛОУ" (вход в режим ФЛОУ; выход — выбор любого другого раздела, например "Задачи").
  - `.burger-menu-item[data-section="movement"]` — "Разобрать" (Движение + Триаж).
  - `.burger-menu-item[data-section="micro-slots"]` — "Малые слоты".
  - `.burger-menu-item[data-section="waiting"]` — "Жду".
  - `.burger-menu-item[data-section="backlog"]` — "Бэклог".
  - `.burger-menu-item[data-section="ideas"]` — "Идеи".
  - `.burger-menu-item[data-section="stale"]` — "Ревью".
  - `.burger-menu-item[data-section="analytics"]` — "Инсайты".
  - `.burger-menu-item[data-section="cookbooks"]` — "Cookbooks".
  - `.burger-menu-item[data-section="settings"]` — "Настройки".
  - **Логика переключения:** `popup/popup.js` (switchSection).

**Раздел "Задачи"**
- `#tasksSection` / `.tasks-section`
  - `.tasks-toolbar`
    - `#priorityPromptBtn` — компактная кнопка «Что важнее», видна только если есть активные задачи без ранга.
    - `#priorityPromptCount` — счётчик неприоритизированных задач.
  - `#overdueTasksSection` — "Просрочено".
    - `#overdueTasksList` — список карточек задач.
  - `#todayTasksSection` — "Фокус дня" (`#focusCapacityWrap` — прогресс план/capacity).
    - `#todayTasksList` — список карточек задач.
  - `#otherTasksSection` — "Позже".
    - `#otherTasksList` — список карточек задач.
  - `#noDateTasksSection` — "Без даты" (кат, по умолчанию свернут).
    - `#noDateTasksToggle` — заголовок‑переключатель раскрытия.
    - `#noDateTasksList` — список задач без дедлайна.
  - `#emptyState` — пустое состояние.
  - **Логика разбиения:** `popup/popup.js` (renderActiveTasks).
  - В production-списках рендера участвуют только активные задачи со статусом `ready`; `draft` не попадают в рабочую очередь.
  - Сортировка в секциях: сначала `priorityRank` (скрытый числовой ранг), затем срочность (`high/medium`), дедлайн и дата создания.
  - **Контекстное меню задачи:** `#taskContextMenu`
    - `#taskContextTodayBtn` — перенести на сегодня.
    - `#taskContextOpenBtn` — открыть полную карточку.
    - `#taskContextDeleteBtn` — удалить задачу.
    - **Логика:** `popup/popup.js` (setupTaskContextMenu).
  - **Карточка задачи в списке:**
    - Строка следующего шага: `.task-next-step` (текст шага или плейсхолдер).
    - Бейдж статуса: `.task-status-badge` с модификаторами `.status-draft` / `.status-ready` (отображает `Черновик` / `Готово`).
    - Time-бейджи: `.task-time-estimate-badge` (`~15м`, `~2ч`) и бейджи ближайшего шага (`5м`, `30м`, тип действия); отдельный бейдж совместимости с текущим окном ФЛОУ не показывается.
    - Индикатор фокуса: `.task-focus-indicator` (например, `⏱ 25м`, для 25м показывается по hover/focus).
      - Клик по индикатору открывает карточку и запускает таймер.
    - Инлайн-редактирование из списка отключено (кнопка карандаша скрыта); редактирование через полную карточку задачи.
    - Просрочка: `.task-item.overdue` (тонкая левая полоска).
  - `#tasksCommandCenter` / `.tasks-command-center` — стартовый блок страницы задач.
    - `.start-time-block` — «Сколько у тебя времени?»: `.start-time-chip[5/15/30/60/120]` со счётчиками подходящих задач, CTA `.start-cta-btn` («Начать — «задача», ~оценка»; 5–15м → «Малые слоты», 30м+ → ФЛОУ) и подсказка `.start-cta-hint`.
    - Строка «Требует решения»: `.start-decision-row` с `.tasks-command-btn` — `Разобрать`, `Жду` (due из total), `Что важнее`, `Ревью`.
    - Логика: `popup/popup.js` (renderTasksCommandCenter, getRunnableTasksForWindow, startWorkForWindow).
  - `#otherTasksSection` теперь сворачиваемый (`.collapsible`, `#laterTasksToggle`), по умолчанию в состоянии `.collapsed`.

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

**Раздел "Cookbooks"**
- `#cookbooksSection` / `.cookbooks-section`
  - `.cookbooks-header` — заголовок и короткое назначение страницы.
  - `.cookbooks-map` — быстрые соответствия сценариев разделам приложения.
  - `.cookbook-grid` — сетка рецептов.
  - `.cookbook-card` — один сценарий использования с условиями, шагами и ожидаемым итогом.
  - **Логика:** статический раздел, переключается через `popup/popup.js` (`switchSection('cookbooks')`).

**Раздел "Инсайты"**
- `#analyticsSection` / `.analytics-section`
  - `.analytics-header` — заголовок, короткое назначение и переключатель периода.
  - `#analyticsPeriodTabs` / `.analytics-period-tabs` — период отчета: `7 дней`, `30 дней`, `Все время`; состояние runtime-only.
  - `#analyticsContent` / `.analytics-content` — контейнер отчета.
  - Блоки отчета: «Диагноз», «Самые проблемные», «План/факт», «Дедлайны и ожидания», «Шаги», «Время по режимам».
  - Действие `Открыть` у задач вызывает существующее открытие полной карточки; destructive actions из аналитики не запускаются.
  - **Логика UI:** `popup/popup.js` (`renderAnalyticsSection`, переключение через `switchSection('analytics')`).
  - **Агрегация:** `popup/modules/analytics.js` (`window.createAnalyticsReport(tasks, { periodDays })`), без доступа к DOM/storage.

**Раздел "Движение"**
- `#movementSection` / `.workflow-section.movement-section`
  - `#movementStats` — счётчики задач, которым нужно вмешательство из-за давления или застревания: проверить ожидание, дедлайн заблокирован, описать.
  - `#movementList` — одно-карточный разбор `.movement-card` внутри `.movement-review-shell`.
  - `#movementEmptyState` — пустое состояние.
  - Причины: `waiting_due`, `deadline_blocked`, `skipped`, `stale` плюс конкретные блокеры карточки (`draft`, `missing_next_action`, `no_estimate`, `too_large`) только когда они мешают текущему движению.
  - Действия: открыть карточку, добавить следующий шаг inline, вернуть ожидание в активные, открыть ФЛОУ, отправить в бэклог/идеи/жду, пометить простую задачу как рутину.
  - **Логика:** `popup/popup.js` (`getMovementItems`, `renderMovementSection`, `createMovementTaskCard`).

**Раздел "Триаж"**
- `#triageSection` — одно-карточный режим подготовки сырых карточек к работе.
  - `#triageStats` показывает общий объём и причины подготовки: черновик, без шага, без оценки, крупные.
  - `#triageList` содержит `.triage-review-shell`, а внутри только одну `.workflow-card-triage`.
  - `.triage-review-progress` показывает позицию вида `1 из 12`.
  - `.triage-review-controls` переключает текущую карточку кнопками `Назад` / `Дальше`.
  - Карточки, уже попавшие в `Движение`, исключаются из `Триажа`, чтобы разделы не дублировали друг друга.
  - **Логика:** `popup/popup.js` (`getTriageCandidates`, `renderTriageSection`, `createTriageReviewShell`).

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
  - Блок "Планирование дня":
    - `#dailyCapacityMinInput` — дневной capacity в минутах (диапазон 60-960).
    - `#dailyCapacitySaveBtn` — сохранить capacity.
    - `#dailyCapacitySaveStatus` — статус сохранения capacity (`aria-live="polite"`).
    - Значение используется проверкой дедлайна «Сегодня» (warn + override) в создании/редактировании и в полной карточке.
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

**Раздел "ФЛОУ"**
- `#flowSection` — полноэкранный режим с одной задачей в виде полной карточки.
  - По умолчанию секция скрыта (`display: none`); при переключении на ФЛОУ показывается только она и хедер с бургером.
  - На `body` устанавливается класс `flow-mode`: overlay под хедером на весь экран; панель карточки (`#taskCardPanel`) увеличенной ширины (до ~30% шире обычной, с ограничением `max-width: 1170px`), по центру.
  - Панель окна времени `#flowTimeWindowPanel`:
    - подпись `.flow-time-window-label`,
    - группа `#flowTimeWindowButtons`,
    - кнопки `.flow-time-window-btn[data-minutes]` со значениями `5/15/30/60/120`.
    - Активное значение подсвечивается классом `.active`, сохраняется в `settings.activeFlowTimeWindowMin` и сразу пересчитывает очередь.
    - Окно времени фильтрует очередь ФЛОУ: если под выбранный слот нет задач, показывается явное пустое состояние «Нет задач под N минут».
  - `#flowEmptyState` — пустое состояние «Нет активных задач» при настоящей пустой очереди или «Нет задач под N минут», если готовые задачи есть, но они не влезают в выбранное окно.
  - В режиме исполнения (`flow`) в очередь включаются только `ready`-задачи; `draft` исключаются из production-исполнения.
  - Рутинные регулярные задачи (`recurrenceExecutionMode="routine"`) без следующего шага считаются исполнимыми как самостоятельное действие с дефолтной оценкой 30 минут; регулярные задачи `needs_next_action` без шага уходят в «Движение».
  - Внутри каждого дедлайн-бакета ФЛОУ применяет time-aware ранжирование среди задач, которые влезают в выбранное окно: `fitScore` относительно выбранного окна времени и `epicPenalty` для длинных задач (штраф в коротком окне, буст в deep-work окне `60+`).
  - Создание через FAB на странице задач после сохранения открывает полную карточку новой задачи.
  - Порядок задач: объединенный блок «просрочено + сегодня» сортируется по приоритету (`priorityRank`, затем срочность); затем идут задачи с дедлайном завтра и позже в хронологическом порядке (при равном дедлайне — по приоритету); затем задачи без дедлайна.
  - Переход между задачами в карточке: **снимок** порядка id при первом входе в ФЛОУ; внутри прохода — «следующая» по этому снимку (в т.ч. после «Выполнено на сегодня»); с **последнего** id снимка — переснимок из актуального порядка ФЛОУ и открытие первой задачи нового списка (аналог повторного входа без закрытия карточки). После «Отметить задачу выполненной» — та же логика (завершение последней в снимке → переснимок и первая в новом порядке).
  - Выход из режима только через бургер-меню (выбор любого другого раздела снимает `flow-mode`, сбрасывает снимок и закрывает карточку).

**Раздел "Движение"**
- `#movementSection` — одно-карточный режим разбора задач, которым нужен управленческий шаг из-за давления или застревания.
  - `#movementStats` показывает общий объём и ключевые причины.
  - `#movementList` содержит `.movement-review-shell`, а внутри только одну `.movement-card`.
  - `.movement-review-progress` показывает позицию вида `1 из 27`.
  - `.movement-review-controls` переключает текущую карточку кнопками `Назад` / `Дальше`.
  - Готовые к исполнению задачи в раздел не попадают.

**Раздел "Триаж"**
- `#triageSection` — одно-карточный режим подготовки карточек, которые ещё не готовы к исполнению, но не требуют срочного движения.
  - `#triageStats` показывает объём подготовки и причины.
  - `#triageList` содержит `.triage-review-shell`, а внутри одну `.workflow-card-triage`.
  - `.triage-review-progress` показывает позицию вида `1 из N`.
  - Добавление следующего шага требует текст, явный выбор времени и явный выбор типа.

**Раздел "Малые слоты"**
- `#microSlotsSection` — список коротких следующих действий на 5-15 минут.
  - `#microSlotBar` — sticky-полоска слота: `#microSlotTime` (остаток/`Слот 15м`), `#microSlotProgress` (`сделано N · Xм`), `#microSlotToggleBtn` («Начать слот Nм»/«Завершить»); классы `.running`/`.expiring`.
  - `#microSlotSummary` — сводка слота: `#microSlotSummaryTitle`, `#microSlotSummaryBody` (разбивка по задачам), `#microSlotExtendBtn` («Ещё 5 минут», только при истечении), `#microSlotFinishBtn`.
  - Конвейер: активный шаг `.micro-slot-card.active` с секундомером `#microActiveStopwatch` и кнопкой «Пропустить»; заметка после шага — `.micro-note-row`.
  - **Логика:** `popup/popup.js` (startMicroSlot, tickMicroSlot, expireMicroSlot, extendMicroSlot, finishMicroSlot, completeMicroStep, skipMicroStep, createMicroNoteRow; storage.addMicroFocusSession).
  - Карточка `.micro-slot-card` показывает название задачи, ключевое действие `.micro-slot-action`, метки времени/типа и ссылку `.micro-slot-link`, если в задаче есть валидный `http/https` URL.
  - Доступны только действия `Выполнить` и `Карточка`; быстрого переноса в `Жду` нет, чтобы задача не исчезала без оформления ожидания.
  - Подсказки `.workflow-action-btn[data-action-help]` появляются по hover/focus с задержкой `1.2s`.
  - Подтвержденное удаление задачи в полной карточке в режиме ФЛОУ: после удаления открывается следующая задача по снимку; с последнего id выполняется переснимок, а при исчерпании задач карточка закрывается и ФЛОУ завершается.
  - **Логика:** `popup/popup.js` (switchSection, enterFlowMode, `flowSessionOrderedIds`, `refreshFlowSessionSnapshot`, пропуск повторного `enterFlowMode` при уже открытом ФЛОУ), `popup/task-card.js` (`resolveNextFlowTaskId`, `getFlowOrderedTasks`, обработчики карточки в режиме flow).

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

### Popup‑страница расширения
- **Файл:** `popup/popup.html`
- **Стили:** `popup/popup.css`
- **Логика:** `popup/popup.js`, `popup/task-card.js`
- **Назначение:** compact legacy-версия интерфейса (не production entrypoint), включает:
  - "Задачи", "Выполненные задачи".
  - Форму добавления задачи и модалку редактирования.
  - "Полную карточку задачи".
  - Структура отличается от `main.html` (другие заголовки подразделов, нет `settingsSection`).
  - В режиме legacy просроченные задачи рендерятся в блоке "сегодня", так как отдельной overdue-секции в DOM нет.

## Bootstrap и page-specific инициализация

- `popup/popup.js`:
  - определяет тип страницы (`main` или `legacy popup`);
  - формирует список доступных секций для страницы;
  - запускает page-specific bootstrap `initPopupUiPage(...)`;
  - управляет запуском/рендером секции приоритизации `prioritization`.
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

### Модалка "Перевести в Жду"
- **Файл:** `main.html`
- **Контейнер:** `#taskWaitingModal` (z-index поверх карточки и ФЛОУ)
- **Содержание:** `#taskWaitingForInput` (кого/чего жду, обязательное), `#taskWaitingUntilInput` (дата проверки, по умолчанию +3 дня, обязательное), `#taskWaitingNoteInput`, кнопки `#taskWaitingCancelBtn` / `#taskWaitingConfirmBtn`.
- **Входы:** полная карточка (`#taskCardOptionWaitBtn` в «Больше опций»), контекстное меню списка (`#taskContextWaitBtn`).
- **Логика:** `popup/popup.js` (openWaitingDialog, confirmWaitingDialog, setupWaitingDialog); после перевода диспатчится `swiper:task-left-execution`, в ФЛОУ карточка переходит к следующей задаче по снимку (`popup/task-card.js`).

### Модалка подтверждения удаления задачи
- **Файл:** `main.html`, `popup/popup.html`
- **Контейнер:** `#taskDeleteModal`
- **Содержание:** `#taskDeleteMessage`, `#taskDeleteCancelBtn`, `#taskDeleteConfirmBtn`
- **Назначение:** безопасное подтверждение удаления задачи.
- **Логика:** `popup/task-card.js` (openDeleteModal, confirmDeleteTask)

### Модальный диалог (dialog-service)
- **Создание:** контейнер создаётся скриптом при первом вызове, не в разметке HTML.
- **Контейнер:** `#dialogOverlay` (класс `.dialog-overlay`), внутри `#dialogBox` (класс `.dialog-box`).
- **Содержание:** заголовок (`.dialog-title`), текст (`.dialog-message`), кнопки (`.dialog-buttons`, `.dialog-btn`, `.dialog-btn-primary`).
- **Назначение:** сообщения и подтверждения вместо блокирующих `alert`/`confirm` (импорт, удаление задачи, закрытие карточки при активном помодоро, ошибки и подсказки).
- **Логика и стили:** `popup/modules/dialog-service.js`, стили в `popup/popup.css` (секция «Модальный диалог»). API: `window.dialogService.showAlert(message, title?)`, `window.dialogService.showConfirm(title, message, options?)`.
- **Страницы:** доступен на `main.html`, `popup/popup.html` (скрипт подключается до popup.js / task-card).

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
  - В режиме ФЛОУ в `#taskCardMeta` добавляются компактные time-бейджи (`~Nм/~Nч`, размер и тип ближайшего шага); отдельный бейдж совместимости с окном времени не показывается.
  - Смена названия для активной задачи с **просроченным** дедлайном переносит дедлайн на «сегодня» (README).

**Редактирование в карточке**
- При сохранении блока: если менялись приоритет, ссылка или регулярность — для **просроченной** задачи дедлайн принудительно «сегодня»; иначе дата из формы сохраняется; если меняли только дату — введённая дата (README).
- При установке дедлайна «Сегодня» (в т.ч. через `.deadline-quick-btn`) проверяется capacity: при перегрузе показывается предупреждение с выбором override/переноса на предложенную дату.
- `#taskCardEditSection`
  - `#taskCardEditPriority` (Обычный/Высокий), `#taskCardEditDeadline`, `#taskCardEditLink`
  - Блок оценки времени:
    - `#taskCardEditEstimateMode` (`fixed|range|epic|none`)
    - Пресеты `.task-card-estimate-preset` (5/15/30/45/60/90/120/180/240/360 минут)
    - `#taskCardEditTimeEstimateMin` для фиксированной оценки
    - `#taskCardEditTimeEstimateRangeMin`, `#taskCardEditTimeEstimateRangeMax` для режима `range`
  - Для `#taskCardEditLink` валидируются только URL с протоколом `http://` или `https://`.
  - Блок план/факт:
    - контейнер `#taskCardPlanFact`
    - значения `#taskCardPlanValue`, `#taskCardFactValue`, `#taskCardDeviationValue`
    - строка отклонения `#taskCardDeviationRow`
    - подсказка `#taskCardPlanFactHint` (при сильном отклонении)
  - `#taskCardEditRecurringParticipation` — переключатель режима "регулярное участие".
  - `#taskCardEditRecurrenceDays` — период регулярности в днях (по умолчанию 3); показывается только при активном `#taskCardEditRecurringParticipation`.
  - `#taskCardEditRecurrenceMode` — тип регулярности: `routine` для повторяемого действия без следующего шага, `needs_next_action` для регулярной работы над темой.
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
  - для `draft`: "Пометить как готово к работе" (с чеком готовности; при провале показывается список недостающих пунктов)
  - для обычной `ready`-задачи: "Отметить задачу выполненной"
  - для регулярной `ready`-задачи: "Выполнено на сегодня" (перенос дедлайна на период регулярности)
- `#taskCardNextBtn` — перейти к следующей задаче из очереди: "Просрочено (по приоритету)" → "Сегодня (по приоритету)" → "Позже (по дедлайну, при равном дедлайне — по приоритету)" → "Без дедлайна"
- `#taskCardMoreOptionsBtn` — меню дополнительных опций
- `#taskCardOptionsMenu`:
  - `#taskCardOptionNextWeekBtn` — перенести на следующую неделю
  - `#taskCardOptionCompleteBtn` — принудительно завершить задачу
  - `#taskCardOptionEditBtn` — редактировать
  - `#taskCardOptionResetPriorityWeightBtn` — сбросить вес задачи (обнулить `priorityRank`)
  - `#taskCardOptionDeleteBtn` — удалить

**Индикатор регулярности в названиях**
- Для задач с `isRecurringParticipation = true` рядом с названием отображается серый символ `↻`.
- Индикатор отображается во всех основных местах рендера названия задачи (списки, выполненные, полная карточка) и не имеет действия по клику.

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
