// Навигация для страницы ТаскСвайпер

// Проверка hash при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  // Проверяем hash в URL
  const hash = window.location.hash.replace('#', '');
  if (!hash || hash !== 'swiper') {
    // Устанавливаем правильный hash
    window.location.hash = 'swiper';
  }
});

// Настройка обработчиков событий для навигации
document.addEventListener('DOMContentLoaded', () => {
  // Бургер-меню
  const burgerMenuBtn = document.getElementById('burgerMenuBtn');
  if (burgerMenuBtn) {
    burgerMenuBtn.addEventListener('click', toggleBurgerMenu);
  }
  
  // Обработчики для пунктов меню
  document.querySelectorAll('.burger-menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const section = e.currentTarget.getAttribute('data-section');
      navigateToSection(section);
      closeBurgerMenu();
    });
  });

  // Закрытие меню при клике на overlay
  const burgerMenuOverlay = document.querySelector('.burger-menu-overlay');
  if (burgerMenuOverlay) {
    burgerMenuOverlay.addEventListener('click', closeBurgerMenu);
  }

  // Предотвращаем закрытие меню при клике на содержимое меню
  const menuContent = document.querySelector('.burger-menu-content');
  if (menuContent) {
    menuContent.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
  
  // Закрываем меню при клике в любое место вне меню
  document.addEventListener('click', (e) => {
    const burgerMenu = document.getElementById('burgerMenu');
    const burgerMenuBtn = document.getElementById('burgerMenuBtn');
    const burgerMenuContent = document.querySelector('.burger-menu-content');
    
    if (burgerMenu && burgerMenu.style.display !== 'none') {
      // Проверяем, что клик был вне меню и вне кнопки
      const clickedInsideMenu = burgerMenuContent && burgerMenuContent.contains(e.target);
      const clickedOnButton = burgerMenuBtn && (e.target === burgerMenuBtn || burgerMenuBtn.contains(e.target));
      
      if (!clickedInsideMenu && !clickedOnButton) {
        closeBurgerMenu();
      }
    }
  });
});

// Переключение бургер-меню
function toggleBurgerMenu(e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  const burgerMenu = document.getElementById('burgerMenu');
  if (!burgerMenu) return;
  const burgerMenuBtn = document.getElementById('burgerMenuBtn');
  const burgerMenuContent = document.querySelector('.burger-menu-content');
  const currentDisplay = window.getComputedStyle(burgerMenu).display;
  
  if (currentDisplay === 'none' || !currentDisplay) {
    burgerMenu.style.display = 'block';
    
    // Позиционируем меню рядом с кнопкой (справа от неё)
    if (burgerMenuBtn && burgerMenuContent) {
      const btnRect = burgerMenuBtn.getBoundingClientRect();
      const menuWidth = 280; // Ширина меню
      const menuLeft = btnRect.right + 5; // Позиция справа от кнопки с небольшим отступом
      const menuTop = btnRect.bottom + 5;
      
      // Проверяем, не выходит ли меню за правый край экрана
      const windowWidth = window.innerWidth;
      let finalLeft = menuLeft;
      if (menuLeft + menuWidth > windowWidth - 15) {
        // Если выходит, позиционируем слева от кнопки
        finalLeft = btnRect.left - menuWidth - 5;
        // Если и слева не помещается, позиционируем по правому краю с отступом
        if (finalLeft < 15) {
          finalLeft = windowWidth - menuWidth - 15;
        }
      }
      
      burgerMenuContent.style.left = `${finalLeft}px`;
      burgerMenuContent.style.top = `${menuTop}px`;
      burgerMenuContent.style.right = 'auto'; // Сбрасываем right, если был установлен
    }
  } else {
    burgerMenu.style.display = 'none';
  }
}

// Закрытие бургер-меню
function closeBurgerMenu(e) {
  if (e) {
    e.stopPropagation();
  }
  const burgerMenu = document.getElementById('burgerMenu');
  if (burgerMenu) {
    burgerMenu.style.display = 'none';
  }
}

// Навигация между разделами
function navigateToSection(sectionName) {
  switch(sectionName) {
    case 'main':
    case 'tasks':
      // Переходим на главную страницу с hash
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.update(tabs[0].id, {
            url: chrome.runtime.getURL('main.html#tasks')
          });
        }
      });
      break;
    case 'swiper':
      // Уже на странице ТаскСвайпер, обновляем hash если нужно
      if (window.location.hash !== '#swiper') {
        window.location.hash = 'swiper';
      }
      break;
    case 'search':
    case 'completed':
    case 'frequently-postponed':
      // Эти разделы доступны только в main.html
      // Переходим на главную страницу, раздел откроется автоматически через hash
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.update(tabs[0].id, {
            url: chrome.runtime.getURL(`main.html#${sectionName}`)
          });
        }
      });
      break;
  }
}
