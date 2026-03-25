/**
 * Единый слой для работы с date-only ключами (YYYY-MM-DD) в локальной часовой зоне.
 * Использовать вместо ad-hoc new Date(deadline) и toISOString().split('T')[0] для дедлайнов.
 */
(function (global) {
  'use strict';

  function todayKey() {
    var d = new Date();
    var year = d.getFullYear();
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  /**
   * Парсит строку YYYY-MM-DD как дату в локальной полночь (без сдвига UTC).
   * Если передана дата с временем (ISO), берётся только date part.
   */
  function parseLocalDateKey(key) {
    if (!key) return null;
    var str = typeof key === 'string' ? key.split('T')[0] : String(key);
    var parts = str.split('-');
    if (parts.length !== 3) return new Date(NaN);
    var year = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10) - 1;
    var day = parseInt(parts[2], 10);
    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return new Date(NaN);
    return new Date(year, month, day);
  }

  /**
   * Возвращает ключ YYYY-MM-DD для переданной даты (локальная зона).
   */
  function getDateKey(date) {
    if (!date || !date.getTime || Number.isNaN(date.getTime())) return '';
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  function isDueToday(deadlineKey) {
    return deadlineKey === todayKey();
  }

  /**
   * true, если дедлайн задан и дата строго раньше сегодня (локально).
   * Нет дедлайна, сегодня, будущее или невалидная дата — false.
   */
  function isDeadlineOverdue(deadlineKey) {
    if (!deadlineKey) return false;
    var parsed = parseLocalDateKey(deadlineKey);
    if (!parsed || Number.isNaN(parsed.getTime())) return false;
    return compareDateKeys(getDateKey(parsed), todayKey()) < 0;
  }

  /**
   * Сравнение двух ключей YYYY-MM-DD. Возвращает -1, 0, 1.
   */
  function compareDateKeys(a, b) {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }

  /**
   * Строка даты со смещением в днях от сегодня (локально).
   */
  function getDateStringWithOffset(daysOffset) {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + daysOffset);
    return getDateKey(d);
  }

  /**
   * Человекочитаемая подпись дедлайна: Сегодня, Завтра, Просрочено на N дн., Через N дн., или дата.
   */
  function formatDeadline(deadline) {
    if (!deadline) return '';
    var deadlineDate = parseLocalDateKey(deadline);
    if (!deadlineDate || Number.isNaN(deadlineDate.getTime())) return '';
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);
    var diffTime = deadlineDate.getTime() - today.getTime();
    var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Просрочено на ' + Math.abs(diffDays) + ' дн.';
    if (diffDays === 0) return 'Сегодня';
    if (diffDays === 1) return 'Завтра';
    if (diffDays <= 7) return 'Через ' + diffDays + ' дн.';

    try {
      return deadlineDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    } catch (e) {
      return deadline;
    }
  }

  /**
   * Класс для дедлайна (overdue/today/soon) по ключу.
   */
  function getDeadlineClass(deadline) {
    if (!deadline) return '';
    var deadlineDate = parseLocalDateKey(deadline);
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!deadlineDate || Number.isNaN(deadlineDate.getTime())) return '';
    deadlineDate.setHours(0, 0, 0, 0);
    var diffTime = deadlineDate.getTime() - today.getTime();
    var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'deadline-overdue';
    if (diffDays === 0) return 'deadline-today';
    if (diffDays <= 3) return 'deadline-soon';
    return '';
  }

  var dateUtils = {
    todayKey: todayKey,
    parseLocalDateKey: parseLocalDateKey,
    getDateKey: getDateKey,
    isDueToday: isDueToday,
    isDeadlineOverdue: isDeadlineOverdue,
    compareDateKeys: compareDateKeys,
    getDateStringWithOffset: getDateStringWithOffset,
    formatDeadline: formatDeadline,
    getDeadlineClass: getDeadlineClass
  };

  if (typeof global !== 'undefined') {
    global.dateUtils = dateUtils;
  }
  if (typeof self !== 'undefined') {
    self.dateUtils = dateUtils;
  }
  if (typeof window !== 'undefined') {
    window.dateUtils = dateUtils;
  }
})(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : this);
