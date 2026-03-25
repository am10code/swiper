async function initSwiperPage(options = {}) {
  const { standalone = false } = options;

  try {
    if (typeof window.storage !== 'undefined' && window.storage) {
      if (typeof setSwiperStorage === 'function') {
        setSwiperStorage(window.storage);
      }
    } else if (typeof StorageManager !== 'undefined' && typeof setSwiperStorage === 'function') {
      const localStorageManager = new StorageManager();
      await localStorageManager.init();
      setSwiperStorage(localStorageManager);
    }

    if (typeof setupSwiperButtons === 'function') {
      setupSwiperButtons();
    }
    if (typeof setupSwiperShortcuts === 'function') {
      setupSwiperShortcuts();
    }
    if (typeof initSwiper === 'function') {
      await initSwiper();
    } else {
      console.error('initSwiper function not found');
    }
  } catch (error) {
    console.error('Error initializing Swiper page:', error);
    const emptyState = document.getElementById('swiperEmptyState');
    if (emptyState) {
      emptyState.style.display = 'block';
      emptyState.innerHTML = `<p>Ошибка инициализации: ${error.message}</p>`;
    }
  }

  if (standalone) {
    window.__swiperStandaloneInited = true;
  }
}

window.initSwiperPage = initSwiperPage;

// Автоинициализация только для standalone-страницы swiper.html.
document.addEventListener('DOMContentLoaded', async () => {
  const isSwiperPage = window.location.pathname.includes('swiper.html');
  if (!isSwiperPage) return;
  if (window.__swiperStandaloneInited) return;
  await initSwiperPage({ standalone: true });
});
