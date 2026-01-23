// Инициализация ТаскСвайпер при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Проверяем, находимся ли мы на странице swiper.html или на main.html с разделом swiper
    const isSwiperPage = window.location.pathname.includes('swiper.html');
    const isSwiperSection = window.location.hash === '#swiper';
    
    // Используем глобальный storage если доступен
    if (typeof window.storage !== 'undefined' && window.storage) {
      if (typeof setSwiperStorage === 'function') {
        setSwiperStorage(window.storage);
      }
    } else if (typeof StorageManager !== 'undefined') {
      swiperStorage = new StorageManager();
      await swiperStorage.init();
    }
    
    // Делаем функции глобально доступными
    if (typeof initSwiper === 'function') {
      window.initSwiper = initSwiper;
    }
    if (typeof setSwiperStorage === 'function') {
      window.setSwiperStorage = setSwiperStorage;
    }
    
    // Инициализируем ТаскСвайпер только если мы на странице swiper.html или в разделе swiper
    if (isSwiperPage || isSwiperSection) {
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
    }
  } catch (error) {
    console.error('Error initializing Swiper page:', error);
    const emptyState = document.getElementById('swiperEmptyState');
    if (emptyState) {
      emptyState.style.display = 'block';
      emptyState.innerHTML = `<p>Ошибка инициализации: ${error.message}</p>`;
    }
  }
});
