# PROBLEMS

## Executive summary
- Проект функционально богатый, но имеет высокую техническую связанность, локальные риски корректности по датам/свайперу и накопленные архитектурные долги.
- Наибольшие риски: неконсистентная обработка даты, хрупкое состояние Swiper, полный пересчет deadline alarms, конфликтующие модели Pomodoro, форсированный дедлайн при создании задач.
- Ключевая зона ценности рефакторинга: выделение общих доменных сервисов (`date`, `pomodoro`, `storage updates`) и декомпозиция монолитных UI-модулей.

### Top 5 most important problems
1. Неконсистентная обработка date-only дедлайнов (UTC/local смешение).
2. Хрупкий guard в Swiper по `lastShownIndex`, который может блокировать перерисовку.
3. Полный `checkDeadlines()` ресинк alarms на любое изменение массива задач.
4. Две несовместимые модели Pomodoro-сессий (legacy и новая) в разных слоях.
5. Добавление задачи принудительно ставит дедлайн "сегодня" при пустом поле.

### Top 5 highest-value refactor opportunities
1. Вынести единый `date-utils` и запретить ad-hoc парсинг date-only строк.
2. Переписать Swiper state machine на `taskId + index + version`.
3. Ввести инкрементальный `DeadlineAlarmManager` вместо полного clear/recreate.
4. Унифицировать Pomodoro-схему (`PomodoroSessionV2`) и один источник истины.
5. Разделить `popup/popup.js` на feature-модули с явными контрактами.

## Severity scale
Use: Critical / High / Medium / Low

## Findings

### [High] Неконсистентная обработка дедлайнов по часовым поясам
**Area:** correctness / architecture  
**Files:** `background/background.js`, `popup/popup.js`, `popup/modules/swiper/swiper.js`  
**Problem:** Date-only строки (`YYYY-MM-DD`) обрабатываются смешанно: где-то через `new Date(task.deadline)`, где-то через `toISOString().split('T')[0]`, что дает сдвиги дат относительно локальной зоны.  
**Why it matters:** Ошибки "сегодня/завтра", неверные дедлайн-уведомления и некорректная сортировка около полуночи и в разных TZ.  
**Recommendation:** Ввести единый слой `date-utils` и использовать только локальные date-key функции для сравнения/форматирования.  
**Suggested target structure:** `shared/date-utils.js` (`parseLocalDateKey`, `todayKey`, `isDueToday`, `compareDateKeys`).  
**Confidence:** high  
**Status:** Resolved (Batch 2: добавлен `shared/date-utils.js`, миграция background, popup, swiper, task-card).

### [High] Swiper может не перерисовать карточку после мутации очереди
**Area:** UI / state  
**Files:** `popup/modules/swiper/swiper.js`  
**Problem:** `showCurrentCard()` пропускает рендер при `lastShownIndex === currentTaskIndex`; после удаления/undo индекс может совпасть, но задача на индексе уже другая.  
**Why it matters:** Пользователь получает "застывшую" карточку и ошибочное состояние текущей задачи.  
**Recommendation:** Учитывать `task.id`/версию очереди, сбрасывать guard после мутаций или убрать индексный guard.  
**Suggested target structure:** `SwiperState { currentTaskId, currentTaskIndex, queueVersion }` и ререндер по `taskId || queueVersion`.  
**Confidence:** high  
**Status:** Partially resolved (Batch 1: сброс lastShownIndex при удалении/undo; полная SwiperState/taskId+version отложена).

### [High] Полный пересчет alarm-ов на любое изменение задач
**Area:** performance / background  
**Files:** `background/background.js`  
**Problem:** `chrome.storage.onChanged` на `tasks` вызывает `checkDeadlines()`, который каждый раз очищает и заново создает все `deadline_*` alarms.  
**Why it matters:** Лишняя нагрузка, риск окон гонок и возможные потери/дубли уведомлений при частых обновлениях задач.  
**Recommendation:** Делать инкрементальный sync только для изменившихся задач, добавить debounce/throttle.  
**Suggested target structure:** `DeadlineAlarmManager.sync(changedTaskIds, prevTasks, nextTasks)`.  
**Confidence:** high  
**Status:** Resolved (Batch 3: debounce 400ms, syncDeadlineAlarmsIncremental(prevTasks, nextTasks), очистка/создание алармов только по изменившимся задачам).

### [High] Конфликтующие модели Pomodoro между UI и background
**Area:** architecture / correctness  
**Files:** `background/background.js`, `popup/task-card.js`, `popup/storage.js`, `popup/modules/import-export.js`  
**Problem:** Используются две схемы сессий: legacy (`startTime/endTime/duration`) и новая (`timestamp/durationSeconds/type`), плюс разная семантика total time.  
**Why it matters:** Сложно сопровождать, легко сломать совместимость и статистику времени в будущих изменениях.  
**Recommendation:** Определить единую схему и источник истины, добавить миграцию старых сессий.  
**Suggested target structure:** `domain/pomodoro-schema.js` + `migrations/pomodoro-v2.js` + `PomodoroService`.  
**Confidence:** high

### [High] Создание задачи форсирует дедлайн "сегодня"
**Area:** product behavior / correctness  
**Files:** `popup/popup.js`  
**Problem:** В `handleAddTask()` используется `deadline: deadlineInput.value || defaultDeadline`, поэтому пустой дедлайн из обычного flow невозможен.  
**Why it matters:** Поведение расходится с моделью задач "Без даты", искажает пользовательский поток и распределение задач по секциям.  
**Recommendation:** Разрешить `null` дедлайн при пустом поле; "сегодня по умолчанию" оставить опцией настройки.  
**Suggested target structure:** `buildNewTaskFromForm({ defaultDeadlineMode })` + настройка `none|today`.  
**Confidence:** high  
**Status:** Not applicable (текущее требуемое поведение: при пустом поле дедлайна подставляется «Сегодня»; восстановлено по запросу пользователя).

### [Medium] Риск потерянных обновлений при read-modify-write в storage
**Area:** state / data integrity  
**Files:** `popup/storage.js`, `popup/task-card.js`, `background/background.js`  
**Problem:** Много операций читают весь массив задач, меняют локально и сохраняют обратно без версии/конфликт-контроля.  
**Why it matters:** Параллельные операции (лог, шаги, таймер, уведомления) могут перетирать изменения друг друга.  
**Recommendation:** Ввести версионирование записи или patch-style update по `taskId` с повторной попыткой.  
**Suggested target structure:** `StorageRepository.updateTask(taskId, updater, expectedVersion)`.  
**Confidence:** medium

### [Medium] Монолитные UI-модули и сильная связность через `window.*`
**Area:** architecture / maintainability / testing  
**Files:** `popup/popup.js`, `popup/task-card.js`, `popup/modules/swiper/swiper.js`, `popup/modules/swiper/swiper-init.js`  
**Problem:** Крупные файлы и кросс-вызовы через глобальные функции увеличивают связанность и скрытые зависимости.  
**Why it matters:** Любое изменение тяжелее изолировать, выше риск регрессий и ниже тестопригодность.  
**Recommendation:** Декомпозировать по фичам и заменить глобальные мосты на явные интерфейсы модулей.  
**Suggested target structure:** `popup/features/{tasks,search,settings,swiper,task-card}/` + `bootstrap/*.js`.  
**Confidence:** high

### [Medium] Чрезмерный `console.log` в hot-path и боевом коде
**Area:** performance / maintainability  
**Files:** `popup/modules/swiper/swiper.js`, `popup/popup.js`, `background/background.js`  
**Problem:** Подробные логи остаются в сценариях частых событий и рендеринга.  
**Why it matters:** Шум в диагностике и потенциальные просадки производительности при активном использовании UI.  
**Recommendation:** Централизованный logger с уровнями и флагом debug.  
**Suggested target structure:** `shared/logger.js` (`debug/info/warn/error`, ENV toggle).  
**Confidence:** high  
**Status:** Resolved (Batch 1: logger в popup/swiper; Batch 11: в background подключён `shared/logger.js` через importScripts, все вызовы console.log/error заменены на self.logger.info/error; в worker debug не выводится).

### [Medium] Дубли CSS-селекторов повышают риск style drift
**Area:** maintainability / UI  
**Files:** `popup/popup.css`  
**Problem:** Повторно определены одинаковые блоки (`.task-context-menu`, `.frequently-postponed-section` и др.).  
**Why it matters:** Итоговый стиль становится менее предсказуемым, сложнее безопасно править UI.  
**Recommendation:** Удалить дубли и структурировать CSS по компонентам/секциям.  
**Suggested target structure:** `popup/styles/components/*.css` или четкие секции в одном файле без повторов.  
**Confidence:** high  
**Status:** Resolved (Batch 1: удалены дубликаты блоков .task-context-menu и .frequently-postponed-section; Batch 9: объединён дубликат .task-card-column в один блок).

### [Medium] Импорт допускает слабую нормализацию доменных полей
**Area:** data quality / correctness  
**Files:** `popup/modules/import-export.js`  
**Problem:** Поля вроде `priority`, `deadline`, `category` принимаются с минимальной доменной нормализацией; уникальность ID не гарантируется.  
**Why it matters:** В данных копятся неконсистентности, усложняющие сортировку, миграции и диагностику багов.  
**Recommendation:** Явная схема валидатора/нормализатора + защита от коллизий ID и schema version.  
**Suggested target structure:** `TaskSchema.validateAndNormalize(rawTask, existingIds)`.  
**Confidence:** medium  
**Status:** Resolved (Batch 4: normalizePriority, normalizeDeadline, category trim, уникальность ID внутри импорта через usedIds).

### [Medium] Блокирующие `alert/confirm` как основной UX-механизм
**Area:** UI / testing  
**Files:** `popup/popup.js`, `popup/task-card.js`, `popup/modules/swiper/swiper.js`, `popup/modules/import-export.js`  
**Problem:** Ключевые операции подтверждения/ошибок завязаны на blocking dialogs.  
**Why it matters:** Неровный UX и трудности для e2e/автотестов и платформенной предсказуемости.  
**Recommendation:** Перейти на модальный сервис и статусные toast/inline сообщения.  
**Suggested target structure:** `ui/dialog-service.js` + `ui/toast-service.js`.  
**Confidence:** high  
**Status:** Resolved (Batch 8: введён `popup/modules/dialog-service.js` с `showAlert`/`showConfirm`; все вызовы alert/confirm заменены на модальные диалоги; разметка создаётся скриптом, стили в popup.css).

### [Medium] В репозитории отсутствуют бинарные ассеты, на которые ссылается runtime
**Area:** build / correctness  
**Files:** `manifest.json`, `background/background.js`, `popup/task-card.js`, `assets/icons/README.txt`  
**Problem:** Код ссылается на `assets/icons/icon16.png|icon48.png|icon128.png` и `assets/audio/*`, но в дереве есть только SVG и нет `assets/audio/`.  
**Why it matters:** Риск broken icons/звуков и неполноценного поведения в runtime/упаковке.  
**Recommendation:** Добавить требуемые ассеты в репозиторий или скорректировать пути/форматы в коде и манифесте.  
**Suggested target structure:** `assets/icons/*.png` и `assets/audio/*` как обязательные runtime-файлы с проверкой в pre-build.  
**Confidence:** high  
**Status:** Partially resolved (Batch 8: документировано в README и assets/audio/README.txt; добавление самих файлов вне скоупа).

### [Low] Широкий `web_accessible_resources` scope (`<all_urls>`)
**Area:** security  
**Files:** `manifest.json`  
**Problem:** Иконки объявлены web-accessible для всех URL без явной необходимости.  
**Why it matters:** Избыточная поверхность доступа и отклонение от принципа least privilege.  
**Recommendation:** Ограничить `matches` или убрать WAR для ресурсов, не требующих внешнего доступа.  
**Suggested target structure:** Минимальный WAR с конкретными сценариями использования.  
**Confidence:** medium  
**Status:** Resolved (Batch 7: блок `web_accessible_resources` удалён; иконки используются только в контексте расширения и уведомлений, внешний доступ не требуется).

### [Low] Кандидаты на неиспользуемые функции/ветки
**Area:** maintainability  
**Files:** `popup/storage.js`, `popup/modules/swiper/swiper.js`, `popup/popup.js`, `popup/task-card.js`  
**Problem:** Есть вероятные кандидаты на dead code (`removeCategory`, `checkIfFrequentlyPostponed`, `applyFilters`, `escapeHtml`, `getTodayTasksSorted`, часть legacy Pomodoro API).  
**Why it matters:** Ментальный шум и риск случайно активировать устаревшую логику.  
**Recommendation:** Подтвердить usage и удалить/депрекейтнуть с поэтапным планом.  
**Suggested target structure:** `docs/deprecations.md` + staged cleanup.  
**Confidence:** medium  
**Status:** Resolved (Batch 5: документировано; Batch 6: функции удалены).

### [Medium] Отсутствует тестовый контур для критичных сценариев
**Area:** testing / quality  
**Files:** `popup/*`, `background/*`, `manifest.json`  
**Problem:** В проекте нет видимой тестовой инфраструктуры для дедлайнов, импорта, Swiper и Pomodoro-потоков.  
**Why it matters:** Высокий риск регрессий при рефакторинге ключевых пользовательских сценариев.  
**Recommendation:** Добавить минимальный unit/e2e набор до крупных изменений.  
**Suggested target structure:** `tests/unit` (утилиты/нормализация) + `tests/e2e` (основные флоу).  
**Confidence:** medium

## Cross-file contradictions

### Code vs README.md
- README фиксирует отсутствие PNG-аудио ассетов в репозитории; код и манифест продолжают ссылаться на них как на рабочие runtime-ресурсы. При создании задачи по умолчанию подставляется дедлайн «Сегодня».

### Code vs STRUCTURE.md
- `STRUCTURE.md` описывает UI как стабильную структуру страниц, но часть поведения Swiper зависит от глобальных `window`-хендлеров и режима страницы, что не отражено как архитектурное ограничение. (При создании задачи пустое поле дедлайна даёт «Сегодня».)

### Duplicated/conflicting logic between modules
- Конфликт Pomodoro-схем между `background/background.js` и `popup/task-card.js`/`popup/storage.js`.
- Повтор date-логики и разных правил форматирования дат в нескольких модулях.
- Частично дублируемая навигационная логика для standalone swiper (`swiper-nav.js`) и основного UI (`popup/popup.js`).

## Priority refactor plan

### 1) Quick wins
- Убрать индексный guard `lastShownIndex` или расширить до `taskId + version`.  
  Expected benefit: устранение визуально критичного бага Swiper.  
  Risk: low.  
  Estimated difficulty: low.  
  Recommended order: 1.
- Убрать форсирование дедлайна "сегодня" при пустом поле.  
  Expected benefit: корректное поведение "Без даты".  
  Risk: low.  
  Estimated difficulty: low.  
  Recommended order: 2.
- Очистить дубли CSS-селекторов.  
  Expected benefit: более предсказуемые стили.  
  Risk: low.  
  Estimated difficulty: low.  
  Recommended order: 3.
- Ввести `logger`-обертку и отключить verbose логи по умолчанию.  
  Expected benefit: чище диагностика и меньше шума.  
  Risk: low.  
  Estimated difficulty: low.  
  Recommended order: 4.

### 2) Medium refactors
- Вынести `date-utils` и унифицировать date-only операции во всех модулях.  
  Expected benefit: снижение количества багов по дедлайнам/уведомлениям.  
  Risk: medium (широкий охват).  
  Estimated difficulty: medium.  
  Recommended order: 5.
- Перевести `checkDeadlines` на инкрементальный sync alarms.  
  Expected benefit: лучше производительность и надежность уведомлений.  
  Risk: medium.  
  Estimated difficulty: medium.  
  Recommended order: 6.
- Усилить импорт: строгая нормализация, ID-коллизии, schema version.  
  Expected benefit: более чистые данные и проще миграции.  
  Risk: medium.  
  Estimated difficulty: medium.  
  Recommended order: 7.
- Ввести storage-update контракт с версией/patch.  
  Expected benefit: меньше потерь данных в конкурентных сценариях.  
  Risk: medium.  
  Estimated difficulty: medium.  
  Recommended order: 8.

### 3) Large architectural refactors
- Унифицировать Pomodoro в единый доменный сервис и схему с миграцией legacy данных.  
  Expected benefit: предсказуемое время/история, проще развитие.  
  Risk: high (данные и UX).  
  Estimated difficulty: high.  
  Recommended order: 9.
- Декомпозировать `popup/popup.js`/`task-card.js`/`swiper.js` в feature-модули с явными API.  
  Expected benefit: масштабируемость, тестопригодность, меньше связности.  
  Risk: high.  
  Estimated difficulty: high.  
  Recommended order: 10.
- Внедрить тестовый контур (unit + e2e) и прогонять перед релизом.  
  Expected benefit: снижение регрессий при крупных изменениях.  
  Risk: medium.  
  Estimated difficulty: high.  
  Recommended order: 11.

## Proposed target architecture
- `shared/`: общие утилиты (`date-utils`, `logger`, валидаторы).
- `domain/`: бизнес-модели (`Task`, `PomodoroSession`, нормализация/миграции).
- `services/`: `StorageRepository`, `DeadlineAlarmManager`, `PomodoroService`.
- `popup/features/`: UI-фичи (`tasks`, `search`, `settings`, `swiper`, `task-card`) с явными контрактами.
- `popup/bootstrap/`: точечная инициализация страниц (`main`, `legacy popup`, `swiper`).
- `tests/`: unit для доменных слоев и e2e smoke для ключевых пользовательских сценариев.

## Safe first steps
1. Исправить guard Swiper (`lastShownIndex`) и покрыть smoke-сценарием удаления/undo.
2. Изменить создание задачи: пустой `deadline` -> `null`.
3. Ввести `date-utils` и мигрировать 2-3 самые рискованные точки (`checkDeadlines`, "на сегодня", сравнения дедлайнов).
4. Удалить дубли CSS и включить простой lint/check для повторных селекторов.
5. Добавить `logger`-обертку и отключить noisy debug в production.
6. Подготовить инвентаризацию Pomodoro-схем и план миграции без изменения UX.

---

## Refactor execution status

**Batch 1 (выполнено):**

- **Resolved:**
  - **Swiper guard (lastShownIndex):** В `popup/modules/swiper/swiper.js` в `confirmSwiperDelete()` и в обеих ветках `performUndo()` добавлен сброс `lastShownIndex = -1` перед вызовом `showCurrentCard()`, чтобы после мутации очереди карточка всегда перерисовывалась.
  - **Дубли CSS:** В `popup/popup.css` удалён второй блок `.task-context-menu` (дубликат ~2732–2766) и второй блок `.frequently-postponed-section` (дубликат ~1907–1909).
  - **Logger:** Добавлен `shared/logger.js` с API `debug`/`info`/`warn`/`error`. Флаг: `localStorage.getItem('swiper_debug') === '1'` или `window.__SWIPER_DEBUG__ === true`; при выключенном флаге `debug()` не выводит. Подключён первым скриптом в `main.html`, `swiper.html`, `popup/popup.html`. В `popup/modules/swiper/swiper.js` и `popup/popup.js` шумные `console.log` заменены на `logger.debug`, ошибки/предупреждения — на `logger.error`/`logger.warn`. Background без изменений.
- **Partially resolved:** Logger в `background/background.js` не внедрён (нет DOM/localStorage в worker); логи остаются через `console`.
- **Postponed / Not addressed:** Пункт «пустой дедлайн при создании задачи» и связанные обновления документации; единый date-utils; инкрементальный sync deadline alarms; унификация Pomodoro; storage versioning; декомпозиция popup.js; тесты; остальные пункты из списка выше.
- **Remaining risks:** Неконсистентная обработка дат (UTC/local), полный пересчёт alarms при изменении задач, конфликт схем Pomodoro, риск потери обновлений при конкурентной записи в storage.
- **Next recommended steps:** Ввести `date-utils` и мигрировать критичные места; затем инкрементальный `DeadlineAlarmManager`; далее по приоритету из PROBLEMS.md (Pomodoro, модуляризация, тесты).

**Batch 2 (выполнено):**

- **Resolved:**
  - **date-utils:** Добавлен `shared/date-utils.js` с API в локальной часовой зоне: `todayKey()`, `parseLocalDateKey(key)`, `getDateKey(date)`, `isDueToday(key)`, `compareDateKeys(a,b)`, `getDateStringWithOffset(daysOffset)`, `formatDeadline(deadline)`, `getDeadlineClass(deadline)`. Подключён в `main.html`, `swiper.html`, `popup/popup.html` после logger. В `background/background.js` подключён через `importScripts('shared/date-utils.js')`; в `checkDeadlines()` время дедлайна берётся как `dateUtils.parseLocalDateKey(task.deadline).getTime()` (локальная полночь); в обработчике аларма сравнение через `dateUtils.todayKey()` и `dateUtils.compareDateKeys()`. В `popup/popup.js`, `popup/modules/swiper/swiper.js`, `popup/task-card.js` функции `getDateKey`, `parseDeadlineDate`, `getDateStringWithOffset`, `formatDeadline`, `getDeadlineClass` делегируют в `window.dateUtils` при наличии; исправлено использование `toISOString().split('T')[0]` в «Запланировать на сегодня» (часто откладываемые).
- **Partially resolved:** —
- **Postponed / Not addressed:** без изменений (инкрементальный alarms, Pomodoro, storage versioning, декомпозиция, тесты, пустой дедлайн).
- **Remaining risks:** Полный пересчёт alarms при изменении задач, конфликт схем Pomodoro, риск потери обновлений при конкурентной записи в storage.
- **Next recommended steps:** Инкрементальный `DeadlineAlarmManager` (debounce + sync только по изменённым задачам); далее Pomodoro, модуляризация, тесты.

**Batch 3 (выполнено):**

- **Resolved:**
  - **Инкрементальный sync deadline alarms:** В `background/background.js` добавлен debounce 400 ms для `chrome.storage.onChanged` (tasks). При изменении передаются `oldValue` и `newValue` в `checkDeadlines(prevTasks, nextTasks)`. При наличии обоих вызывается `syncDeadlineAlarmsIncremental(prevTasks, nextTasks)`: вычисляются ID задач с изменёнными `deadline` или `completed` (или добавленных/удалённых), для них очищаются только соответствующие алармы и при необходимости создаются заново. Полный пересчёт остаётся при установке/старте и при периодическом аларме (без old/new).
- **Partially resolved:** —
- **Postponed / Not addressed:** без изменений (Pomodoro, storage versioning, декомпозиция, тесты, пустой дедлайн).
- **Remaining risks:** Конфликт схем Pomodoro, риск потери обновлений при конкурентной записи в storage.
- **Next recommended steps:** Унификация Pomodoro; storage versioning; декомпозиция popup.js; тесты.

**Batch 4 (выполнено):**

- **Resolved:**
  - **Нормализация при импорте:** В `popup/modules/import-export.js` добавлены `normalizePriority(value)` (только `high`/`medium`), `normalizeDeadline(value)` (пустая строка → null, trim, извлечение YYYY-MM-DD при наличии), нормализация `category` (trim). Уникальность ID внутри импортируемого массива: используется `usedIds`; при коллизии или пустом id подставляется новый `createTaskId()`.
- **Partially resolved:** —
- **Postponed / Not addressed:** без изменений (Pomodoro, storage versioning, декомпозиция, тесты, пустой дедлайн, alert/confirm).
- **Remaining risks:** Конфликт схем Pomodoro, риск потери обновлений при конкурентной записи в storage.
- **Next recommended steps:** Унификация Pomodoro; storage versioning; декомпозиция popup.js; тесты.

**Batch 5 (выполнено):** документирование dead code. **Batch 6 (выполнено):** удаление.

- **Resolved:**
  - **Кандидаты на dead code (Batch 6):** Удалены функции `removeCategory` (storage.js), `applyFilters`, `escapeHtml` (popup.js), `checkIfFrequentlyPostponed` (swiper.js), `getTodayTasksSorted` (task-card.js). Обновлён `docs/deprecations.md` (статус «Удалено»).
- **Partially resolved:** —
- **Postponed / Not addressed:** без изменений.
- **Remaining risks:** Конфликт схем Pomodoro, риск потери обновлений при конкурентной записи в storage.
- **Next recommended steps:** Унификация Pomodoro; storage versioning; декомпозиция popup.js; тесты.

**Batch 7 (выполнено):** сужение поверхности WAR.

- **Resolved:**
  - **web_accessible_resources:** Удалён блок `web_accessible_resources` из `manifest.json`. Иконки используются только в контексте расширения (action, notifications, popup/main через getURL); доступ с произвольных URL не требуется.
- **Partially resolved:** —
- **Postponed / Not addressed:** без изменений.
- **Remaining risks:** без изменений.
- **Next recommended steps:** Унификация Pomodoro; storage versioning; декомпозиция popup.js; тесты.

**Batch 8 (выполнено):** документация, статусы, dialog-service.

- **Resolved:**
  - **Swiper (частично):** В PROBLEMS.md добавлен статус Partially resolved для пункта «Swiper может не перерисовать карточку» (Batch 1: сброс lastShownIndex при удалении/undo; полная state machine отложена).
  - **Ассеты (частично):** Документировано в README и в новом `assets/audio/README.txt`; статус Partially resolved для пункта об отсутствующих PNG/audio.
  - **alert/confirm:** Введён `popup/modules/dialog-service.js` (showAlert, showConfirm); все вызовы alert/confirm в popup.js, task-card.js, swiper.js, import-export.js заменены на модальные диалоги. Разметка создаётся скриптом, стили в popup.css.
- **Partially resolved:** —
- **Postponed / Not addressed:** без изменений.
- **Remaining risks:** без изменений.
- **Next recommended steps:** Унификация Pomodoro; storage versioning; декомпозиция popup.js; тесты.

**Batch 10 (выполнено, затем поведение скорректировано):** по запросу пользователя восстановлено поведение «все создаваемые задачи с дедлайном по умолчанию „Сегодня“»: в `handleAddTask()` при пустом поле дедлайна подставляется `getDateStringWithOffset(0)`. README и STRUCTURE обновлены; в PROBLEMS пункт «Создание задачи форсирует дедлайн сегодня» помечен Not applicable.

**Batch 9 (выполнено):** оставшиеся дубли CSS.

- **Resolved:**
  - **Дубли CSS-селекторов:** В `popup/popup.css` объединён дубликат селектора `.task-card-column` (два блока с `padding: 0` и `margin-bottom: 0` заменены одним блоком с обоими свойствами). Пункт «Дубли CSS-селекторов» помечен Resolved с учётом Batch 1 и Batch 9.
- **Partially resolved:** —
- **Postponed / Not addressed:** без изменений.
- **Remaining risks:** без изменений.
- **Next recommended steps:** Унификация Pomodoro; storage versioning; декомпозиция popup.js; тесты.

**Batch 11 (выполнено):** logger в background.

- **Resolved:**
  - **Чрезмерный console.log:** В `background/background.js` добавлен `importScripts('shared/logger.js', 'shared/date-utils.js')`; все вызовы `console.log` заменены на `self.logger.info`, все `console.error` — на `self.logger.error`. В service worker контексте `shared/logger.js` экспортирует `self.logger` с debug=noop, info/warn/error=forward. Пункт «Чрезмерный console.log» помечен Resolved.
- **Partially resolved:** —
- **Postponed / Not addressed:** без изменений.
- **Remaining risks:** без изменений.
- **Next recommended steps:** Унификация Pomodoro; storage versioning; декомпозиция popup.js; тесты.
