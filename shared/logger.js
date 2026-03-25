/**
 * Централизованный логгер для расширения.
 * debug() выводит только при включённом флаге (localStorage 'swiper_debug' или window.__SWIPER_DEBUG__).
 * info/warn/error выводятся всегда (при необходимости можно тоже привязать к флагу).
 */
(function () {
  function isDebug() {
    try {
      if (typeof window !== 'undefined' && (window.__SWIPER_DEBUG__ === true)) return true;
      if (typeof localStorage !== 'undefined' && localStorage.getItem('swiper_debug') === '1') return true;
    } catch (e) {}
    return false;
  }

  function noop() {}
  function forward(level) {
    return function () {
      if (typeof console !== 'undefined' && console[level]) {
        console[level].apply(console, arguments);
      }
    };
  }

  function debug() {
    if (isDebug() && typeof console !== 'undefined' && console.log) {
      console.log.apply(console, arguments);
    }
  }

  var logger = {
    debug: debug,
    info: forward('info'),
    warn: forward('warn'),
    error: forward('error')
  };

  if (typeof window !== 'undefined') {
    window.logger = logger;
  }
  if (typeof self !== 'undefined' && typeof window === 'undefined') {
    self.logger = { debug: noop, info: forward('info'), warn: forward('warn'), error: forward('error') };
  }
})();
