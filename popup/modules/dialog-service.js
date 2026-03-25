/**
 * Модальные диалоги вместо блокирующих alert/confirm.
 * Один активный overlay; создаётся при первом вызове.
 */
(function () {
  var overlay = null;
  var dialogBox = null;
  var resolveCurrent = null;

  function ensureContainer() {
    if (overlay && dialogBox) return;
    overlay = document.createElement('div');
    overlay.id = 'dialogOverlay';
    overlay.className = 'dialog-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    dialogBox = document.createElement('div');
    dialogBox.id = 'dialogBox';
    dialogBox.className = 'dialog-box';
    overlay.appendChild(dialogBox);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        closeDialog(false);
      }
    });
    document.body.appendChild(overlay);
  }

  function closeDialog(result) {
    if (!overlay) return;
    overlay.classList.remove('dialog-overlay-visible');
    overlay.setAttribute('aria-hidden', 'true');
    if (resolveCurrent !== null) {
      var r = resolveCurrent;
      resolveCurrent = null;
      r(result);
    }
  }

  function showDialog(opts) {
    ensureContainer();
    dialogBox.innerHTML = '';
    var titleEl = document.createElement('div');
    titleEl.className = 'dialog-title';
    titleEl.textContent = opts.title || '';
    if (titleEl.textContent) dialogBox.appendChild(titleEl);
    var msgEl = document.createElement('div');
    msgEl.className = 'dialog-message';
    msgEl.textContent = opts.message || '';
    dialogBox.appendChild(msgEl);
    var buttonsEl = document.createElement('div');
    buttonsEl.className = 'dialog-buttons';
    opts.buttons.forEach(function (b) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = b.primary ? 'dialog-btn dialog-btn-primary' : 'dialog-btn';
      btn.textContent = b.label;
      btn.addEventListener('click', function () {
        closeDialog(b.value);
      });
      buttonsEl.appendChild(btn);
    });
    dialogBox.appendChild(buttonsEl);
    overlay.classList.add('dialog-overlay-visible');
    overlay.setAttribute('aria-hidden', 'false');
  }

  /**
   * Показать сообщение с кнопкой «OK».
   * @param {string} message - текст сообщения
   * @param {string} [title] - заголовок (по умолчанию пусто)
   * @returns {Promise<void>}
   */
  function showAlert(message, title) {
    return new Promise(function (resolve) {
      resolveCurrent = function () { resolve(); };
      showDialog({
        title: title || '',
        message: message || '',
        buttons: [{ label: 'OK', primary: true, value: true }]
      });
    });
  }

  /**
   * Показать подтверждение с «Отмена» и второй кнопкой.
   * @param {string} title - заголовок
   * @param {string} message - текст
   * @param {{ confirmLabel?: string, cancelLabel?: string }} [options]
   * @returns {Promise<boolean>} true при нажатии подтверждения, false при отмене
   */
  function showConfirm(title, message, options) {
    options = options || {};
    var confirmLabel = options.confirmLabel || 'Продолжить';
    var cancelLabel = options.cancelLabel || 'Отмена';
    return new Promise(function (resolve) {
      resolveCurrent = resolve;
      showDialog({
        title: title || '',
        message: message || '',
        buttons: [
          { label: cancelLabel, primary: false, value: false },
          { label: confirmLabel, primary: true, value: true }
        ]
      });
    });
  }

  var dialogService = {
    showAlert: showAlert,
    showConfirm: showConfirm
  };
  if (typeof window !== 'undefined') {
    window.dialogService = dialogService;
  }
})();
