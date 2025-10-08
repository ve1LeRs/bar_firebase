// 🔥 ТВОИ КЛЮЧИ FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyB4bD8UAu0Aj5IRK5H-uZg6kxNAIbkZc9k",
  authDomain: "bar-menu-6145c.firebaseapp.com",
  projectId: "bar-menu-6145c",
  storageBucket: "bar-menu-6145c.appspot.com",
  messagingSenderId: "493608422842",
  appId: "1:493608422842:web:3b4b6bd8a4cb681c436183"
};
// 🤖 TELEGRAM
const TELEGRAM_BOT_TOKEN = "8326139522:AAG2fwHYd1vRPx0cUXt4ATaFYTNxmzInWJo";
const TELEGRAM_CHAT_ID = "1743362083";

// 🌐 WEBHOOK SERVER
// Определяем URL webhook сервера
let WEBHOOK_SERVER_URL = "http://localhost:3000"; // По умолчанию localhost для разработки

// Отладочная информация
console.log('🔍 Отладка определения URL:');
console.log('- hostname:', window.location.hostname);
console.log('- protocol:', window.location.protocol);
console.log('- href:', window.location.href);

// Проверяем, запущены ли мы локально (для разработки)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  WEBHOOK_SERVER_URL = "http://localhost:3000";
  console.log('🔧 Режим разработки: используем localhost');
} else {
  // В продакшне пытаемся определить Railway URL автоматически
  const savedUrl = localStorage.getItem('webhook_server_url');
  console.log('💾 Сохраненный URL в localStorage:', savedUrl);
  
  if (savedUrl) {
    WEBHOOK_SERVER_URL = savedUrl;
    console.log('💾 Используем сохраненный URL:', WEBHOOK_SERVER_URL);
  } else {
    // Пытаемся автоматически определить Railway URL
    const currentHost = window.location.hostname;
    console.log('🌐 Текущий хост:', currentHost);
    
    if (currentHost.includes('railway.app')) {
      WEBHOOK_SERVER_URL = `https://${currentHost}`;
      console.log('🚀 Автоматически определен Railway URL:', WEBHOOK_SERVER_URL);
      // Сохраняем для будущего использования
      localStorage.setItem('webhook_server_url', WEBHOOK_SERVER_URL);
    } else if (currentHost.includes('github.io')) {
      // Для GitHub Pages используем дефолтный Railway URL
      WEBHOOK_SERVER_URL = "https://lucid-cat-production.up.railway.app";
      console.log('🌐 GitHub Pages обнаружен, используем дефолтный Railway URL:', WEBHOOK_SERVER_URL);
      // Сохраняем для будущего использования
      localStorage.setItem('webhook_server_url', WEBHOOK_SERVER_URL);
    } else {
      // Для локальных файлов и других случаев используем дефолтный Railway URL
      WEBHOOK_SERVER_URL = "https://lucid-cat-production.up.railway.app";
      console.log('🚀 Используем дефолтный Railway URL:', WEBHOOK_SERVER_URL);
      // Сохраняем для будущего использования
      localStorage.setItem('webhook_server_url', WEBHOOK_SERVER_URL);
    }
  }
}

console.log('🎯 Финальный URL webhook сервера:', WEBHOOK_SERVER_URL);

// Функция для обновления URL webhook сервера
function updateWebhookServerUrl(newUrl) {
  WEBHOOK_SERVER_URL = newUrl;
  // Сохраняем URL в localStorage для сохранения между перезагрузками
  localStorage.setItem('webhook_server_url', newUrl);
  console.log('🔄 URL webhook сервера обновлен и сохранен:', WEBHOOK_SERVER_URL);
}

// Функция для получения текущего URL
function getWebhookServerUrl() {
  return WEBHOOK_SERVER_URL;
}

// Функция для сброса настроек webhook сервера
function resetWebhookServerUrl() {
  localStorage.removeItem('webhook_server_url');
  // Перезагружаем страницу для применения изменений
  location.reload();
}

// Функция для принудительной настройки Railway URL
function forceRailwayUrl() {
  const railwayUrl = prompt('🌐 Принудительная настройка Railway URL\n\nВведите ваш Railway URL (например: https://lucid-cat-production.up.railway.app):');
  
  if (railwayUrl && railwayUrl.startsWith('https://')) {
    updateWebhookServerUrl(railwayUrl);
    showSuccess(`✅ Railway URL принудительно установлен: ${railwayUrl}`);
    
    // Автоматически проверяем систему
    setTimeout(async () => {
      const statusData = await monitorSystem();
      displaySystemStatus(statusData);
    }, 1000);
  } else if (railwayUrl) {
    showError('❌ URL должен начинаться с https://');
  }
}

// Инициализация Firebase
console.log('🔥 Инициализация Firebase...');
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
console.log('✅ Firebase инициализирован');

// Глобальные переменные
let audioContextEnabled = false; // Флаг для отслеживания активации звука
let queueInfo = { totalOrders: 0, orders: [] }; // Информация об очереди
let lastOrderQueuePositions = new Map(); // Отслеживание позиций в очереди для уведомлений

// === ФУНКЦИИ ДЛЯ РАБОТЫ С ОЧЕРЕДЬЮ ===

// Получение следующей позиции в очереди
async function getNextQueuePosition() {
  try {
    // Получаем количество активных заказов
    const activeOrdersSnapshot = await db.collection('orders')
      .where('status', 'in', ['pending', 'confirmed', 'preparing', 'ready'])
      .get();
    
    return activeOrdersSnapshot.size + 1;
  } catch (error) {
    console.error('❌ Ошибка получения позиции в очереди:', error);
    // Fallback: используем timestamp
    return Date.now();
  }
}

// Получение информации об очереди
async function getQueueInfo() {
  try {
    const response = await fetch(`${WEBHOOK_SERVER_URL}/queue-info`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.queueInfo;
  } catch (error) {
    console.error('❌ Ошибка получения информации об очереди:', error);
    return { totalOrders: 0, orders: [] };
  }
}

// Обновление отображения позиции в очереди
function updateQueueDisplay() {
  // Обновляем информацию в истории заказов
  const ordersList = document.getElementById('ordersList');
  if (ordersList) {
    // Перезагружаем историю заказов для обновления позиций
    if (auth.currentUser) {
      loadOrderHistory(auth.currentUser.uid);
    }
  }
  
  // Обновляем админский список заказов
  const adminOrdersList = document.getElementById('adminOrdersList');
  if (adminOrdersList) {
    loadAdminOrders();
  }
}

// Отображение позиции в очереди для заказа
function displayQueuePosition(orderData, container) {
  if (!orderData.queuePosition || !['confirmed', 'preparing', 'ready'].includes(orderData.status)) {
    return;
  }
  
  const queueElement = document.createElement('div');
  queueElement.className = 'queue-position';
  
  // Вычисляем примерное время ожидания
  const estimatedMinutes = orderData.queuePosition * 3; // Примерно 3 минуты на заказ
  const timeText = estimatedMinutes > 0 ? ` (~${estimatedMinutes} мин)` : '';
  
  // Определяем статус очереди
  let queueStatus = '';
  let statusIcon = '';
  if (orderData.queuePosition === 1) {
    queueStatus = 'Следующий в очереди';
    statusIcon = '🎯';
  } else if (orderData.queuePosition <= 3) {
    queueStatus = 'Скоро будет готов';
    statusIcon = '⏰';
  } else {
    queueStatus = 'В очереди';
    statusIcon = '📋';
  }
  
  queueElement.innerHTML = `
    <div class="queue-info">
      <i class="fas fa-list-ol"></i>
      <span>Позиция в очереди: #${orderData.queuePosition}</span>
      <span class="queue-status">${statusIcon} ${queueStatus}</span>
    </div>
    <div class="queue-progress">
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${(orderData.queuePosition <= 1 ? 100 : Math.max(10, 100 - (orderData.queuePosition - 1) * 15))}%"></div>
      </div>
      <div class="queue-time">${timeText}</div>
    </div>
  `;
  
  container.appendChild(queueElement);
}

// Уведомление о смене позиции в очереди
function showQueuePositionUpdateNotification(orderData, oldPosition, newPosition) {
  console.log('🎯 Показываем уведомление о продвижении в очереди:', {
    orderName: orderData.name,
    oldPosition,
    newPosition
  });
  
  // Создаем уведомление о продвижении в очереди
  const notification = document.createElement('div');
  notification.className = 'queue-notification';
  notification.innerHTML = `
    <div class="queue-notification-content">
      <div class="queue-notification-icon">🎯</div>
      <div class="queue-notification-text">
        <div class="queue-notification-title">Ваш заказ продвинулся в очереди!</div>
        <div class="queue-notification-details">
          ${orderData.name} - теперь #${newPosition} в очереди
        </div>
      </div>
    </div>
  `;
  
  // Добавляем уведомление на страницу
  document.body.appendChild(notification);
  
  // Анимация появления
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  // Удаляем уведомление через 5 секунд
  setTimeout(() => {
    notification.classList.add('hide');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 5000);
  
  // Звуковое уведомление
  if (audioContextEnabled) {
    playNotificationSound('queue');
  }
  
  // Вибрация
  if (navigator.vibrate) {
    navigator.vibrate([200, 100, 200]);
  }
}

// Глобальные функции для тестирования
window.testBeautifulNotifications = function() {
  console.log('🎨 Тестирование красивых уведомлений с эмодзи...');
  
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.log('❌ Пользователь не авторизован. Войдите в систему для тестирования.');
    return;
  }
  
  const testOrders = [
    { id: 'test1', name: 'Мохито', user: 'Иван Петров', userId: currentUser.uid, status: 'confirmed' },
    { id: 'test2', name: 'Космополитен', user: 'Мария Сидорова', userId: currentUser.uid, status: 'preparing' },
    { id: 'test3', name: 'Маргарита', user: 'Алексей Козлов', userId: currentUser.uid, status: 'ready' },
    { id: 'test4', name: 'Пина Колада', user: 'Елена Волкова', userId: currentUser.uid, status: 'completed' },
    { id: 'test5', name: 'Белый Русский', user: 'Дмитрий Соколов', userId: currentUser.uid, status: 'cancelled' }
  ];
  
  console.log('📤 Показываем все типы красивых уведомлений с эмодзи...');
  
  testOrders.forEach((order, index) => {
    setTimeout(() => {
      showStatusUpdateNotification(order, order.status);
      console.log(`✅ Показано красивое уведомление: ${order.name} - ${order.status}`);
    }, index * 4000); // Показываем каждое уведомление через 4 секунды
  });
  
  console.log('💡 Обратите внимание на:');
  console.log('   - Эмодзи для каждого статуса (✅👨‍🍳🍸🎉❌)');
  console.log('   - Разные цвета для разных статусов');
  console.log('   - Красивые анимации и переходы');
  console.log('   - Разные звуки для каждого статуса');
  console.log('   - Разные паттерны вибрации');
  console.log('   - Улучшенный дизайн и типографику');
};

// Другие тестовые функции
window.testAudioAndVibration = function() {
  console.log('🔊 Тестирование звука и вибрации...');
  if (navigator.vibrate) {
    navigator.vibrate([200, 100, 200]);
    console.log('📳 Вибрация активирована');
  }
  console.log('💡 Звук будет воспроизведен при следующем уведомлении');
};

window.testEmojiNotifications = function() {
  console.log('😀 Тестирование эмодзи в уведомлениях...');
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.log('❌ Пользователь не авторизован. Войдите в систему для тестирования.');
    return;
  }
  
  const testOrder = { id: 'emoji-test', name: 'Тестовый коктейль', userId: currentUser.uid };
  showStatusUpdateNotification(testOrder, 'confirmed');
  console.log('✅ Показано тестовое уведомление с эмодзи');
};

window.testEmojiDisplay = function() {
  console.log('🎭 Тестирование отображения эмодзи...');
  const emojis = ['✅', '👨‍🍳', '🍸', '🎉', '❌'];
  emojis.forEach((emoji, index) => {
    setTimeout(() => {
      console.log(`Эмодзи ${index + 1}: ${emoji}`);
    }, index * 500);
  });
};

// Тестирование системы очереди
window.testQueueSystem = function() {
  console.log('🎯 Тестирование системы очереди...');
  
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.log('❌ Пользователь не авторизован. Войдите в систему для тестирования.');
    return;
  }
  
  // Создаем тестовые данные для демонстрации очереди
  const testOrders = [
    { name: 'Мохито', user: 'Иван Петров', queuePosition: 1, status: 'confirmed' },
    { name: 'Космополитен', user: 'Мария Сидорова', queuePosition: 2, status: 'preparing' },
    { name: 'Маргарита', user: 'Алексей Козлов', queuePosition: 3, status: 'ready' },
    { name: 'Пина Колада', user: 'Елена Волкова', queuePosition: 4, status: 'confirmed' }
  ];
  
  console.log('📋 Тестовая очередь заказов:');
  testOrders.forEach((order, index) => {
    console.log(`#${order.queuePosition} - ${order.name} (${order.user}) - ${order.status}`);
  });
  
  // Демонстрируем уведомления о продвижении в очереди
  console.log('🔔 Демонстрация уведомлений о продвижении в очереди...');
  
  // Симулируем подтверждение заказа с позицией в очереди
  setTimeout(() => {
    const orderData = { 
      name: 'Мохито', 
      user: 'Иван Петров', 
      userId: currentUser.uid,
      queuePosition: 1 
    };
    showStatusUpdateNotification(orderData, 'confirmed');
    console.log('✅ Показано уведомление: Мохито подтвержден с позицией #1');
  }, 1000);
  
  // Симулируем продвижение заказа "Пина Колада" с позиции 4 на позицию 3
  setTimeout(() => {
    const orderData = { name: 'Пина Колада', user: 'Елена Волкова' };
    showQueuePositionUpdateNotification(orderData, 4, 3);
    console.log('✅ Показано уведомление: Пина Колада продвинулась с #4 на #3');
  }, 3000);
  
  // Симулируем изменение статуса заказа с отображением позиции
  setTimeout(() => {
    const orderData = { 
      name: 'Маргарита', 
      user: 'Алексей Козлов', 
      userId: currentUser.uid,
      queuePosition: 2 
    };
    showStatusUpdateNotification(orderData, 'preparing');
    console.log('✅ Показано уведомление: Маргарита готовится с позицией #2');
  }, 5000);
  
  // Симулируем завершение заказа
  setTimeout(() => {
    const orderData = { 
      name: 'Мохито', 
      user: 'Иван Петров', 
      userId: currentUser.uid
    };
    showStatusUpdateNotification(orderData, 'completed');
    console.log('✅ Показано уведомление: Мохито завершен');
  }, 7000);
  
  console.log('💡 Обратите внимание на:');
  console.log('   - Отображение позиции в очереди для каждого заказа');
  console.log('   - Уведомления о продвижении в очереди');
  console.log('   - Автоматическое обновление позиций при завершении заказов');
  console.log('   - Визуальные индикаторы статуса очереди');
  console.log('   - Сортировку заказов по позиции в очереди в админ-панели');
};

window.testConfirmedNotification = function() {
  console.log('✅ Тестирование уведомления о подтверждении заказа...');
  
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.log('❌ Пользователь не авторизован. Войдите в систему для тестирования.');
    return;
  }
  
  const testOrder = { 
    id: 'confirmed-test', 
    name: 'Мохито', 
    userId: currentUser.uid 
  };
  
  console.log('📤 Показываем тестовое уведомление...');
  showStatusUpdateNotification(testOrder, 'confirmed');
  
  if (!audioContextEnabled) {
    console.log('💡 Кликните в любом месте страницы для активации звука');
  }
};

// DOM элементы
console.log('🔍 Инициализация DOM элементов...');
const themeToggle = document.getElementById('themeToggle');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const myBillBtn = document.getElementById('myBillBtn');
const billHistoryBtn = document.getElementById('billHistoryBtn');
const adminBtn = document.getElementById('adminBtn');
const userName = document.getElementById('userName');
const authModal = document.getElementById('authModal');
const registerModal = document.getElementById('registerModal');
const successModal = document.getElementById('successModal');
const errorModal = document.getElementById('errorModal');
const billHistoryModal = document.getElementById('billHistoryModal');
const notificationModal = document.getElementById('notificationModal');
const adminPanel = document.getElementById('adminPanel');
const cocktailFormModal = document.getElementById('cocktailFormModal');
const statusModal = document.getElementById('statusModal');
const authForm = document.getElementById('authForm');
const registerForm = document.getElementById('registerForm');
const toggleForm = document.getElementById('toggleForm');
const switchToRegister = document.getElementById('switchToRegister');
const closeBtns = document.querySelectorAll('.close');
const orderButtons = document.querySelectorAll('.order-btn');
const orderModal = document.getElementById('orderModal');
const orderSummary = document.getElementById('orderSummary');
const confirmOrderBtn = document.getElementById('confirmOrder');
const ordersList = document.getElementById('ordersList');
const closeNotification = document.getElementById('closeNotification');
const closeSuccess = document.getElementById('closeSuccess');
const closeError = document.getElementById('closeError');
const champagneAnimation = document.getElementById('champagneAnimation');
const cocktailsGrid = document.querySelector('.cocktails-grid');
const errorMessage = document.getElementById('errorMessage');
const addCocktailBtn = document.getElementById('addCocktailBtn');
const cocktailForm = document.getElementById('cocktailForm');
const cocktailsList = document.getElementById('cocktailsList');
const adminOrdersList = document.getElementById('adminOrdersList');
const stoplistCocktails = document.getElementById('stoplistCocktails');
const addToStoplist = document.getElementById('addToStoplist');
const currentStoplist = document.getElementById('currentStoplist');
const stopReason = document.getElementById('stopReason');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const statusButtons = document.querySelectorAll('.status-btn');
const statusOrderInfo = document.getElementById('statusOrderInfo');
const checkSystemBtn = document.getElementById('checkSystemBtn');
const testWebhookBtn = document.getElementById('testWebhookBtn');
const cleanupOrdersBtn = document.getElementById('cleanupOrdersBtn');
const systemStatus = document.getElementById('systemStatus');
const setupWebhookBtn = document.getElementById('setupWebhookBtn');
const deleteWebhookBtn = document.getElementById('deleteWebhookBtn');
const getWebhookInfoBtn = document.getElementById('getWebhookInfoBtn');
const sendTestMessageBtn = document.getElementById('sendTestMessageBtn');
const telegramStatus = document.getElementById('telegramStatus');

// Проверяем критически важные элементы
console.log('📋 Проверка DOM элементов:');
console.log('- cocktailsGrid:', cocktailsGrid ? '✅ найден' : '❌ не найден');
console.log('- loginBtn:', loginBtn ? '✅ найден' : '❌ не найден');
console.log('- registerBtn:', registerBtn ? '✅ найден' : '❌ не найден');

let currentOrder = null;
let currentOrderId = null;
let isAdmin = false;
let cocktailsData = [];
let stoplistData = [];
let currentCategory = 'classic'; // Текущая выбранная категория
let currentAdminFilter = 'classic'; // Текущий фильтр в админке

// Переменная для хранения позиции прокрутки
let scrollY = 0;

// === ФУНКЦИИ УПРАВЛЕНИЯ МОДАЛЬНЫМИ ОКНАМИ ===

// Функция для открытия модального окна с блокировкой фона
function openModal(modalElement) {
  if (!modalElement) {
    console.warn('Попытка открыть несуществующее модальное окно');
    return;
  }
  
  // Сохраняем текущую позицию прокрутки
  scrollY = window.scrollY;
  document.body.style.setProperty('--scroll-y', `${scrollY}px`);
  document.body.classList.add('modal-open');
  modalElement.style.display = 'block';
  
  // Добавляем логирование для отладки
  console.log('🔍 Открыто модальное окно:', modalElement.id || 'без ID');
}

// Функция для закрытия модального окна
function closeModal(modalElement) {
  if (!modalElement) {
    console.warn('Попытка закрыть несуществующее модальное окно');
    return;
  }
  
  modalElement.style.display = 'none';
  document.body.classList.remove('modal-open');
  // Восстанавливаем позицию прокрутки
  window.scrollTo(0, scrollY);
}

// === КОНЕЦ ФУНКЦИЙ УПРАВЛЕНИЯ МОДАЛЬНЫМИ ОКНАМИ ===

// Создаем мерцающие огоньки
function createSparkles() {
  const sparklesContainer = document.querySelector('.sparkles');
  if (sparklesContainer) {
    sparklesContainer.innerHTML = '';
    for (let i = 1; i <= 30; i++) {
      const sparkle = document.createElement('div');
      sparkle.className = 'sparkle';
      sparkle.style.left = Math.random() * 100 + '%';
      sparkle.style.top = Math.random() * 100 + '%';
      sparkle.style.animationDelay = Math.random() * 4 + 's';
      sparkle.style.width = (Math.random() * 4 + 2) + 'px';
      sparkle.style.height = sparkle.style.width;
      sparkle.style.opacity = Math.random() * 0.8 + 0.2;
      sparklesContainer.appendChild(sparkle);
    }
  }
}

// Вызываем создание огоньков
createSparkles();

// Переключатель темы
function initThemeToggle() {
  // Проверяем сохраненную тему
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  } else {
    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
  }

  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    if (document.body.classList.contains('dark-theme')) {
      localStorage.setItem('theme', 'dark');
      themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
      localStorage.setItem('theme', 'light');
      themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
    // Пересоздаем огоньки при смене темы
    setTimeout(createSparkles, 100);
  });
}



// Проверка состояния пользователя
auth.onAuthStateChanged(async user => {
  if (user) {
    loginBtn.style.display = 'none';
    registerBtn.style.display = 'none';
    myBillBtn.style.display = 'inline-block';
    billHistoryBtn.style.display = 'inline-block';
    logoutBtn.style.display = 'inline-block';
    // Проверяем, является ли пользователь администратором
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      isAdmin = userData.role === 'admin';
      if (isAdmin) {
        adminBtn.style.display = 'inline-block';
      }
    }
    // 👇 Если displayName пуст — пробуем обновить данные
    if (!user.displayName) {
      await user.reload();
    }
    userName.textContent = user.displayName || "Гость";
    userName.style.display = 'block';
    
    // Инициализируем глобальный listener для отслеживания изменений статусов
    console.log('🔄 Инициализируем listener для пользователя:', user.uid);
    initGlobalOrderStatusListener();
  } else {
    loginBtn.style.display = 'inline-block';
    registerBtn.style.display = 'inline-block';
    myBillBtn.style.display = 'none';
    billHistoryBtn.style.display = 'none';
    adminBtn.style.display = 'none';
    logoutBtn.style.display = 'none';
    userName.textContent = '';
    userName.style.display = 'none';
    isAdmin = false;
    
    // Отключаем listener при выходе пользователя
    if (globalOrdersListener) {
      console.log('🔄 Отключаем listener при выходе пользователя');
      globalOrdersListener();
      globalOrdersListener = null;
      lastOrderStatuses.clear();
    }
  }
});

// Загрузка коктейлей
async function loadCocktails() {
  try {
    console.log('🔄 Начинаем загрузку коктейлей...');
    
    if (!cocktailsGrid) {
      console.error('❌ Элемент cocktailsGrid не найден!');
      return;
    }
    
    let cocktailsSnapshot = await db.collection('cocktails').get();
    console.log('📊 Получено коктейлей:', cocktailsSnapshot.size);
    cocktailsData = [];
    cocktailsGrid.innerHTML = '';
    
    if (cocktailsSnapshot.empty) {
      console.log('⚠️ Коллекция коктейлей пуста, добавляем тестовые данные...');
      await addTestCocktails();
      // Повторно загружаем коктейли после добавления тестовых данных
      const newSnapshot = await db.collection('cocktails').get();
      if (newSnapshot.empty) {
        cocktailsGrid.innerHTML = '<p style="text-align: center; color: #6b5c47; font-size: 1.2rem; margin: 2rem 0;">Ошибка загрузки коктейлей</p>';
        return;
      }
      // Продолжаем с новыми данными
      cocktailsSnapshot = newSnapshot;
    }
    
    cocktailsSnapshot.forEach(doc => {
      const cocktail = { id: doc.id, ...doc.data() };
      cocktailsData.push(cocktail);
      
      // Проверяем, не в стоп-листе ли коктейль
      const isInStoplist = stoplistData.some(item => item.cocktailName === cocktail.name);
      
      const cocktailCard = document.createElement('div');
      cocktailCard.className = `cocktail-card ${isInStoplist ? 'stopped' : ''}`;
      cocktailCard.setAttribute('data-name', cocktail.name);
      cocktailCard.setAttribute('data-alcohol', cocktail.alcohol || 0);
      
      // Проверяем наличие изображения
      const imageUrl = cocktail.image || 'https://i.pinimg.com/736x/5d/5d/5d/5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d.jpg';
      const hasImage = imageUrl && !imageUrl.includes('5d5d5d');
      const displayImage = hasImage ? imageUrl : '';
      
      cocktailCard.innerHTML = `
        <div class="image-container">
          ${displayImage ? 
            `<img src="${displayImage}" alt="${cocktail.name}">` : 
            `<div class="no-image-placeholder">
              <i class="fas fa-camera"></i>
              <p>Коктейль уже делает селфи,<br>скоро выложит сюда</p>
            </div>`
          }
          ${(cocktail.alcohol !== undefined && cocktail.alcohol !== null) ? `
            <div class="alcohol-indicator">
              <i class="fas fa-wine-bottle"></i>
              <span class="alcohol-percent">${cocktail.alcohol}%</span>
            </div>
          ` : ''}
          ${isInStoplist ? `
            <div class="stoplist-badge">
              <i class="fas fa-ban"></i> В стоп-листе
            </div>
          ` : ''}
          ${isAdmin ? `
            <div class="admin-actions">
              <button class="edit-btn" data-id="${cocktail.id}"><i class="fas fa-edit"></i></button>
              <button class="delete-btn" data-id="${cocktail.id}"><i class="fas fa-trash"></i></button>
            </div>
          ` : ''}
        </div>
        <div class="card-content">
          <h2>${cocktail.name}</h2>
          <!-- ИСПРАВЛЕНО: Улучшена проверка на "Состав не указан" -->
          <p class="ingredients">${(typeof cocktail.ingredients === 'string' && cocktail.ingredients.trim()) || 'Состав не указан'}</p>
          <p class="mood">${cocktail.mood || ''}</p>
          ${cocktail.price ? `<div class="cocktail-price"><i class="fas fa-ruble-sign"></i> ${cocktail.price} ₽</div>` : ''}
          ${!isInStoplist ? `
            <button class="order-btn" data-name="${cocktail.name}" data-price="${cocktail.price || 500}">
              <i class="fas fa-glass-martini-alt"></i> Заказать
            </button>
          ` : `
            <button class="order-btn disabled" disabled>
              <i class="fas fa-ban"></i> Недоступен
            </button>
          `}
        </div>
      `;
      
      cocktailsGrid.appendChild(cocktailCard);
      
      // Загружаем и отображаем рейтинг для коктейля
      getCocktailAverageRating(cocktail.name).then(ratingData => {
        if (ratingData) {
          displayCocktailRating(cocktailCard, ratingData);
        }
      });
    });
    
    // Добавляем обработчики событий для админских кнопок
    if (isAdmin) {
      document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          editCocktail(id);
        });
      });
      
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          deleteCocktail(id);
        });
      });
    }
    
    
    // Применяем фильтрацию по текущей категории
    filterCocktailsByCategory();
    
    // Обновляем админский список коктейлей
    if (isAdmin) {
      updateAdminCocktailsList();
    }
    
    console.log('✅ Коктейли успешно загружены:', cocktailsData.length);
    
  } catch (error) {
    console.error('❌ Ошибка загрузки коктейлей:', error);
    showError('Ошибка загрузки коктейлей');
  }
}

// Загрузка стоп-листа
async function loadStoplist() {
  try {
    const stoplistSnapshot = await db.collection('stoplist').get();
    stoplistData = [];
    currentStoplist.innerHTML = '';
    
    stoplistSnapshot.forEach(doc => {
      const item = { id: doc.id, ...doc.data() };
      stoplistData.push(item);
      
      const stoplistItem = document.createElement('div');
      stoplistItem.className = 'stoplist-item';
      stoplistItem.innerHTML = `
        ${isAdmin ? `<input type="checkbox" class="stoplist-checkbox" data-id="${item.id}">` : ''}
        <div class="stoplist-info" style="${isAdmin ? 'margin-left: 2rem;' : ''}">
          <strong>${item.cocktailName}</strong>
          <span>${item.reason}</span>
          <small>
            <i class="fas fa-clock"></i>
            ${item.timestamp}
            ${item.addedBy ? `<i class="fas fa-user"></i> ${item.addedBy === 'admin' ? 'Администратор' : 'Пользователь'}` : ''}
          </small>
        </div>
        ${isAdmin ? `
          <button class="remove-from-stoplist" data-id="${item.id}" title="Удалить из стоп-листа">
            <i class="fas fa-times"></i>
          </button>
        ` : ''}
      `;
      
      currentStoplist.appendChild(stoplistItem);
    });
    
    // Обновляем статистику
    updateStoplistStats();
    
    // Инициализируем фильтры
    initStoplistFilters();
    
    // Инициализируем массовые операции
    initBulkActions();
    
    // Добавляем обработчики для удаления из стоп-листа
    if (isAdmin) {
      document.querySelectorAll('.remove-from-stoplist').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          removeFromStoplist(id);
        });
      });
    }
    
    // Заполняем селект коктейлей для стоп-листа
    await populateStoplistCocktailsSelect();
    
    // Перезагружаем коктейли, чтобы обновить статусы
    await loadCocktails();
    
  } catch (error) {
    console.error('Ошибка загрузки стоп-листа:', error);
  }
}

// Заполнение селекта коктейлей для стоп-листа
async function populateStoplistCocktailsSelect() {
  if (!stoplistCocktails) return;
  
  try {
    // Очищаем селект
    stoplistCocktails.innerHTML = '<option value="">Выберите коктейль</option>';
    
    // Получаем все коктейли
    const cocktailsSnapshot = await db.collection('cocktails').get();
    
    // Сортируем коктейли по алфавиту
    const cocktails = [];
    cocktailsSnapshot.forEach(doc => {
      const cocktail = { id: doc.id, ...doc.data() };
      cocktails.push(cocktail);
    });
    
    cocktails.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    
    // Добавляем опции в селект, исключая уже находящиеся в стоп-листе
    cocktails.forEach(cocktail => {
      const isInStoplist = stoplistData.some(item => item.cocktailName === cocktail.name);
      
      if (!isInStoplist) {
        const option = document.createElement('option');
        option.value = cocktail.name;
        option.textContent = cocktail.name;
        option.setAttribute('data-alcohol', cocktail.alcohol || 0);
        stoplistCocktails.appendChild(option);
      }
    });
    
    // Если нет доступных коктейлей для добавления в стоп-лист
    if (stoplistCocktails.children.length === 1) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'Все коктейли уже в стоп-листе';
      option.disabled = true;
      stoplistCocktails.appendChild(option);
    }
    
  } catch (error) {
    console.error('Ошибка заполнения селекта коктейлей:', error);
  }
}

// Обновление статистики стоп-листа
function updateStoplistStats() {
  const stoplistStats = document.getElementById('stoplistStats');
  if (!stoplistStats) return;
  
  const totalCocktails = cocktailsData.length;
  const stoplistCount = stoplistData.length;
  const availableCount = totalCocktails - stoplistCount;
  
  stoplistStats.innerHTML = `
    <div class="stat-item">
      <i class="fas fa-ban"></i>
      <span>В стоп-листе: ${stoplistCount}</span>
    </div>
    <div class="stat-item">
      <i class="fas fa-check-circle"></i>
      <span>Доступно: ${availableCount}</span>
    </div>
    <div class="stat-item">
      <i class="fas fa-cocktail"></i>
      <span>Всего: ${totalCocktails}</span>
    </div>
  `;
}

// Переменные для фильтрации
let currentFilter = 'all';
let currentSearchTerm = '';

// Инициализация поиска и фильтров стоп-листа
function initStoplistFilters() {
  const searchInput = document.getElementById('stoplistSearch');
  const filterButtons = document.querySelectorAll('.filter-btn');
  
  // Обработчик поиска
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearchTerm = e.target.value.toLowerCase();
      filterStoplistItems();
    });
  }
  
  // Обработчики фильтров
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Убираем активный класс со всех кнопок
      filterButtons.forEach(b => b.classList.remove('active'));
      // Добавляем активный класс к нажатой кнопке
      btn.classList.add('active');
      // Устанавливаем текущий фильтр
      currentFilter = btn.getAttribute('data-filter');
      filterStoplistItems();
    });
  });
}

// Фильтрация элементов стоп-листа
function filterStoplistItems() {
  const stoplistItems = document.querySelectorAll('.stoplist-item');
  let visibleCount = 0;
  
  stoplistItems.forEach(item => {
    const cocktailName = item.querySelector('strong').textContent.toLowerCase();
    const reason = item.querySelector('span').textContent.toLowerCase();
    const addedBy = item.querySelector('small').textContent.toLowerCase();
    
    // Проверяем поиск
    const matchesSearch = !currentSearchTerm || 
      cocktailName.includes(currentSearchTerm) || 
      reason.includes(currentSearchTerm);
    
    // Проверяем фильтр
    let matchesFilter = true;
    if (currentFilter === 'admin') {
      matchesFilter = addedBy.includes('администратор');
    } else if (currentFilter === 'user') {
      matchesFilter = addedBy.includes('пользователь');
    }
    
    // Показываем или скрываем элемент
    if (matchesSearch && matchesFilter) {
      item.style.display = 'flex';
      visibleCount++;
    } else {
      item.style.display = 'none';
    }
  });
  
  // Обновляем статистику с учетом фильтров
  updateFilteredStats(visibleCount);
}

// Обновление статистики с учетом фильтров
function updateFilteredStats(visibleCount) {
  const stoplistStats = document.getElementById('stoplistStats');
  if (!stoplistStats) return;
  
  const totalCocktails = cocktailsData.length;
  const stoplistCount = stoplistData.length;
  const availableCount = totalCocktails - stoplistCount;
  
  let filterText = '';
  if (currentFilter !== 'all' || currentSearchTerm) {
    filterText = ` (показано: ${visibleCount})`;
  }
  
  stoplistStats.innerHTML = `
    <div class="stat-item">
      <i class="fas fa-ban"></i>
      <span>В стоп-листе: ${stoplistCount}${filterText}</span>
    </div>
    <div class="stat-item">
      <i class="fas fa-check-circle"></i>
      <span>Доступно: ${availableCount}</span>
    </div>
    <div class="stat-item">
      <i class="fas fa-cocktail"></i>
      <span>Всего: ${totalCocktails}</span>
    </div>
  `;
}

// Инициализация массовых операций
function initBulkActions() {
  const bulkActions = document.getElementById('bulkActions');
  const bulkRemoveBtn = document.getElementById('bulkRemoveBtn');
  const selectAllBtn = document.getElementById('selectAllBtn');
  const clearSelectionBtn = document.getElementById('clearSelectionBtn');
  
  if (!isAdmin || !bulkActions) return;
  
  // Показываем кнопки массовых операций
  bulkActions.style.display = 'flex';
  
  // Обработчик для чекбоксов
  document.addEventListener('change', (e) => {
    if (e.target.classList.contains('stoplist-checkbox')) {
      const item = e.target.closest('.stoplist-item');
      if (e.target.checked) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
      updateBulkActionsVisibility();
    }
  });
  
  // Выбрать все
  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      const checkboxes = document.querySelectorAll('.stoplist-checkbox');
      checkboxes.forEach(checkbox => {
        checkbox.checked = true;
        checkbox.closest('.stoplist-item').classList.add('selected');
      });
      updateBulkActionsVisibility();
    });
  }
  
  // Снять выбор
  if (clearSelectionBtn) {
    clearSelectionBtn.addEventListener('click', () => {
      const checkboxes = document.querySelectorAll('.stoplist-checkbox');
      checkboxes.forEach(checkbox => {
        checkbox.checked = false;
        checkbox.closest('.stoplist-item').classList.remove('selected');
      });
      updateBulkActionsVisibility();
    });
  }
  
  // Массовое удаление
  if (bulkRemoveBtn) {
    bulkRemoveBtn.addEventListener('click', () => {
      const selectedIds = getSelectedStoplistItems();
      if (selectedIds.length === 0) {
        showError('Выберите элементы для удаления');
        return;
      }
      
      const confirmed = confirm(
        `Вы уверены, что хотите удалить ${selectedIds.length} коктейлей из стоп-листа?\n\n` +
        `Это действие нельзя отменить.`
      );
      
      if (confirmed) {
        bulkRemoveFromStoplist(selectedIds);
      }
    });
  }
}

// Получение выбранных элементов стоп-листа
function getSelectedStoplistItems() {
  const checkboxes = document.querySelectorAll('.stoplist-checkbox:checked');
  return Array.from(checkboxes).map(checkbox => checkbox.getAttribute('data-id'));
}

// Обновление видимости кнопок массовых операций
function updateBulkActionsVisibility() {
  const selectedCount = getSelectedStoplistItems().length;
  const bulkRemoveBtn = document.getElementById('bulkRemoveBtn');
  
  if (bulkRemoveBtn) {
    bulkRemoveBtn.innerHTML = `<i class="fas fa-trash"></i> Удалить выбранные (${selectedCount})`;
    bulkRemoveBtn.disabled = selectedCount === 0;
  }
}

// Массовое удаление из стоп-листа
async function bulkRemoveFromStoplist(ids) {
  try {
    const batch = db.batch();
    
    ids.forEach(id => {
      const docRef = db.collection('stoplist').doc(id);
      batch.delete(docRef);
    });
    
    await batch.commit();
    
    // Перезагружаем стоп-лист
    await loadStoplist();
    showSuccess(`Удалено ${ids.length} коктейлей из стоп-листа`);
  } catch (error) {
    console.error('Ошибка массового удаления из стоп-листа:', error);
    showError('Ошибка массового удаления из стоп-листа');
  }
}

// Real-time listener для заказов пользователя
let userOrdersListener = null;

// Глобальный listener для отслеживания изменений статусов заказов
let globalOrdersListener = null;
let lastOrderStatuses = new Map(); // Храним последние статусы заказов

// Инициализация глобального listener'а для отслеживания изменений статусов
function initGlobalOrderStatusListener() {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.log('❌ initGlobalOrderStatusListener: Пользователь не авторизован');
    return;
  }
  
  console.log('🔄 Инициализация глобального listener для заказов пользователя:', currentUser.uid);
  console.log('🔍 Проверяем Firebase подключение:', !!db);
  
  // Отключаем предыдущий listener, если он есть
  if (globalOrdersListener) {
    console.log('🔄 Отключение предыдущего listener');
    globalOrdersListener();
    globalOrdersListener = null;
  }
  
  // Инициализируем listener для заказов текущего пользователя
  globalOrdersListener = db.collection('orders')
    .where('userId', '==', currentUser.uid)
    .onSnapshot((snapshot) => {
      console.log('📊 Получено обновление заказов:', snapshot.docChanges().length, 'изменений');
      console.log('📋 Всего документов в snapshot:', snapshot.docs.length);
      
      // Если это первая загрузка (нет изменений), инициализируем все заказы
      if (snapshot.docChanges().length === 0 && snapshot.docs.length > 0) {
        console.log('🔄 Первая загрузка: инициализируем существующие заказы');
        snapshot.docs.forEach(doc => {
          const orderData = { id: doc.id, ...doc.data() };
          lastOrderStatuses.set(orderData.id, orderData.status);
          lastOrderQueuePositions.set(orderData.id, orderData.queuePosition);
          console.log(`📝 Инициализирован заказ ${orderData.id} со статусом: ${orderData.status}, позиция: ${orderData.queuePosition}`);
        });
        return;
      }
      
      snapshot.docChanges().forEach((change) => {
        const orderData = { id: change.doc.id, ...change.doc.data() };
        const orderId = orderData.id;
        const newStatus = orderData.status;
        
        console.log(`📝 Изменение заказа ${orderId}:`, {
          type: change.type,
          status: newStatus,
          updatedBy: orderData.updatedBy || 'unknown'
        });
        
        if (change.type === 'modified') {
          // Проверяем, изменился ли статус
          const lastStatus = lastOrderStatuses.get(orderId);
          const lastQueuePosition = lastOrderQueuePositions.get(orderId);
          const newQueuePosition = orderData.queuePosition;
          
          console.log(`🔄 Сравнение статусов для заказа ${orderId}:`, {
            lastStatus,
            newStatus,
            statusChanged: lastStatus !== newStatus,
            lastQueuePosition,
            newQueuePosition,
            queuePositionChanged: lastQueuePosition !== newQueuePosition
          });
          
          if (lastStatus && lastStatus !== newStatus) {
            // Статус изменился, показываем уведомление
            console.log(`🔔 Показываем уведомление для заказа ${orderId}: ${lastStatus} → ${newStatus}`);
            showStatusUpdateNotification(orderData, newStatus);
          }
          
          // Проверяем, изменилась ли позиция в очереди
          if (lastQueuePosition && lastQueuePosition !== newQueuePosition && newQueuePosition < lastQueuePosition) {
            // Позиция в очереди уменьшилась (заказ продвинулся)
            console.log(`🎯 Заказ ${orderId} продвинулся в очереди: #${lastQueuePosition} → #${newQueuePosition}`);
            showQueuePositionUpdateNotification(orderData, lastQueuePosition, newQueuePosition);
          }
          
          // Обновляем последний статус и позицию
          lastOrderStatuses.set(orderId, newStatus);
          lastOrderQueuePositions.set(orderId, newQueuePosition);
        } else if (change.type === 'added') {
          // Новый заказ - сохраняем его статус и позицию
          console.log(`➕ Новый заказ ${orderId} со статусом: ${newStatus}, позиция: ${orderData.queuePosition}`);
          lastOrderStatuses.set(orderData.id, orderData.status);
          lastOrderQueuePositions.set(orderData.id, orderData.queuePosition);
        }
      });
    }, (error) => {
      console.error('❌ Ошибка глобального listener для заказов:', error);
    });
    
  console.log('✅ Глобальный listener инициализирован');
}

// Загрузка истории заказов с real-time обновлениями
async function loadOrderHistory(userId) {
  try {
    // Отключаем предыдущий listener, если он есть
    if (userOrdersListener) {
      userOrdersListener();
      userOrdersListener = null;
    }
    
    ordersList.innerHTML = '';
    
    // Устанавливаем real-time listener для заказов пользователя
    userOrdersListener = db.collection('orders')
      .where('userId', '==', userId)
      .onSnapshot((snapshot) => {
        ordersList.innerHTML = '';
        
        if (snapshot.empty) {
          ordersList.innerHTML = '<p class="no-orders">У вас пока нет заказов</p>';
          return;
        }
        
        const userOrders = [];
        snapshot.forEach(doc => {
          const order = doc.data();
          userOrders.push({ id: doc.id, ...order });
        });
        
        // Сортируем по времени (новые первыми)
        userOrders.sort((a, b) => {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.displayTime ? Date.parse(a.displayTime) : 0);
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.displayTime ? Date.parse(b.displayTime) : 0);
          return bTime - aTime;
        });
        
        userOrders.forEach(order => {
          const orderElement = document.createElement('div');
          orderElement.className = 'order-item';
          orderElement.setAttribute('data-order-id', order.id);
          
          // Определяем класс статуса для стилизации
          const statusClass = order.status || 'pending';
          const statusText = getStatusText(order.status);
          
          orderElement.innerHTML = `
            <div class="order-header">
              <span class="order-name">${order.name}</span>
              <span class="order-status ${statusClass}">${statusText}</span>
            </div>
            <div class="order-time" style="font-size: 1.1rem;">${order.displayTime || (order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString('ru-RU') : '')}</div>
          `;
          
          // Добавляем информацию о позиции в очереди, если заказ активен
          if (order.queuePosition && ['confirmed', 'preparing', 'ready'].includes(order.status)) {
            const queueContainer = document.createElement('div');
            queueContainer.className = 'order-queue-info';
            displayQueuePosition(order, queueContainer);
            orderElement.appendChild(queueContainer);
          }
          
          ordersList.appendChild(orderElement);
        });
        
        // Уведомления об изменении статусов обрабатываются в initGlobalOrderStatusListener
        // Здесь мы только обновляем отображение истории заказов
      }, (error) => {
        console.error('Ошибка real-time listener для заказов:', error);
        showError('Ошибка загрузки заказов');
      });
      
  } catch (error) {
    console.error('Ошибка загрузки истории заказов:', error);
    showError('Ошибка загрузки заказов');
  }
}

// === НОВЫЕ ФУНКЦИИ ДЛЯ АДМИН-ПАНЕЛИ ===

// Real-time listener для админских заказов
let adminOrdersListener = null;

// Загрузка заказов для админ-панели с real-time обновлениями
async function loadAdminOrders() {
  try {
    // Отключаем предыдущий listener, если он есть
    if (adminOrdersListener) {
      adminOrdersListener();
      adminOrdersListener = null;
    }

    // Проверяем, существует ли элемент adminOrdersList
    if (!adminOrdersList) {
      console.error('Элемент adminOrdersList не найден в DOM');
      return;
    }

    adminOrdersList.innerHTML = '';

    // Устанавливаем real-time listener для всех заказов
    adminOrdersListener = db.collection('orders')
      .orderBy('createdAt', 'desc')
      .onSnapshot((snapshot) => {
        adminOrdersList.innerHTML = '';

        if (snapshot.empty) {
          adminOrdersList.innerHTML = '<p class="no-orders">Заказов пока нет</p>';
          return;
        }

        // Сортируем заказы по позиции в очереди для активных заказов
        const orders = [];
        snapshot.forEach(doc => {
          orders.push({ id: doc.id, ...doc.data() });
        });
        
        // Сортируем активные заказы по позиции в очереди
        const activeOrders = orders.filter(order => 
          ['confirmed', 'preparing', 'ready'].includes(order.status)
        ).sort((a, b) => (a.queuePosition || 0) - (b.queuePosition || 0));
        
        // Остальные заказы сортируем по времени
        const otherOrders = orders.filter(order => 
          !['confirmed', 'preparing', 'ready'].includes(order.status)
        ).sort((a, b) => {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return bTime - aTime;
        });
        
        // Объединяем списки: сначала активные заказы в порядке очереди, потом остальные
        const sortedOrders = [...activeOrders, ...otherOrders];
        
        sortedOrders.forEach(order => {
          const orderElement = document.createElement('div');
          orderElement.className = 'admin-order-item';
          orderElement.setAttribute('data-order-id', order.id);
          
          // Добавляем информацию о позиции в очереди для активных заказов
          let queueInfo = '';
          if (order.queuePosition && ['confirmed', 'preparing', 'ready'].includes(order.status)) {
            queueInfo = `
              <div class="admin-queue-info">
                <i class="fas fa-list-ol"></i>
                <span>Позиция в очереди: #${order.queuePosition}</span>
                ${order.queuePosition === 1 ? '<span class="queue-next">🎯 Следующий</span>' : ''}
              </div>
            `;
          }
          
          orderElement.innerHTML = `
            <div class="admin-order-header">
              <div>
                <strong>${order.name}</strong>
                <div>Клиент: ${order.user || 'Гость'}</div>
                <small>ID: ${order.id}</small>
                <small>${order.displayTime || (order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString('ru-RU') : '')}</small>
                ${queueInfo}
              </div>
              <div>
                <div class="admin-order-status ${order.status || 'pending'}">${getStatusText(order.status)}</div>
                <button class="change-status-btn" data-id="${order.id}">
                  <i class="fas fa-edit"></i> Статус
                </button>
              </div>
            </div>
          `;
          adminOrdersList.appendChild(orderElement);
        });

        // Добавляем обработчики событий для кнопок изменения статуса
        document.querySelectorAll('.change-status-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const orderId = btn.getAttribute('data-id');
            openStatusModal(orderId);
          });
        });

        // Показываем уведомление о обновлении, если админ-панель открыта
        if (adminPanel && adminPanel.style.display === 'block') {
          showAdminStatusUpdateNotification();
        }
      }, (error) => {
        console.error('Ошибка real-time listener для админских заказов:', error);
        if (adminOrdersList) {
          adminOrdersList.innerHTML = '<p class="error">Ошибка загрузки заказов</p>';
        }
      });

  } catch (error) {
    console.error('Ошибка загрузки заказов для админ-панели:', error);
    // Проверяем, существует ли элемент adminOrdersList перед использованием
    if (adminOrdersList) {
      adminOrdersList.innerHTML = '<p class="error">Ошибка загрузки заказов</p>';
    }
  }
}

// Функция для открытия модального окна изменения статуса
function openStatusModal(orderId) {
  currentOrderId = orderId;
  // Безопасно ищем элемент заказа
  const orderElement = document.querySelector(`.change-status-btn[data-id="${orderId}"]`)?.closest('.admin-order-item');
  if (!orderElement) {
    console.error(`Элемент заказа с ID ${orderId} не найден`);
    return;
  }
  
  const orderName = orderElement.querySelector('strong')?.textContent || 'Неизвестный заказ';
  const orderUser = orderElement.querySelector('div > div:nth-child(2)')?.textContent || 'Неизвестный клиент';
  
  // Проверяем, существует ли statusOrderInfo перед использованием
  if (statusOrderInfo) {
    statusOrderInfo.innerHTML = `
      <p><strong>Коктейль:</strong> ${orderName}</p>
      <p><strong>Клиент:</strong> ${orderUser}</p>
      <p><strong>ID заказа:</strong> ${orderId}</p>
    `;
  }
  
  // Проверяем, существует ли statusModal перед использованием
  openModal(statusModal); // Используем новую функцию
}

// Функция для изменения статуса заказа
async function changeOrderStatus(orderId, newStatus) {
  if (!orderId) return;

  try {
    // Получаем информацию о заказе для уведомления
    const orderDoc = await db.collection('orders').doc(orderId).get();
    const orderData = orderDoc.data();
    const orderName = orderData?.name || 'Неизвестный заказ';
    const userName = orderData?.user || 'Неизвестный клиент';

    // Обновляем статус в Firebase
    await db.collection('orders').doc(orderId).update({
      status: newStatus,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp ? firebase.firestore.FieldValue.serverTimestamp() : new Date()
    });

    // Отправляем уведомление в Telegram
    const telegramResult = await sendStatusUpdateToTelegram(orderId, newStatus, orderName, userName);
    if (telegramResult.success) {
      console.log('✅ Уведомление отправлено в Telegram');
    } else {
      console.warn('⚠️ Не удалось отправить уведомление в Telegram:', telegramResult.error);
    }

    // Также отправляем обновление через webhook сервер для синхронизации с Telegram
    const webhookResult = await updateOrderStatusViaWebhook(orderId, newStatus);
    if (webhookResult.success) {
      console.log('✅ Статус синхронизирован с Telegram через webhook');
    } else {
      console.warn('⚠️ Не удалось синхронизировать с Telegram:', webhookResult.error);
    }

    // Закрываем модальное окно статуса
    closeModal(statusModal); // Используем новую функцию
    
    // Перезагрузить список заказов в админке
    if (adminPanel && adminPanel.style.display === 'block') {
      await loadAdminOrders();
    }
    
    showSuccess('Статус заказа успешно обновлён и отправлен в Telegram');
  } catch (error) {
    console.error('Ошибка обновления статуса:', error);
    showError('Ошибка обновления статуса заказа');
  }
}

// === КОНЕЦ НОВЫХ ФУНКЦИЙ ===

// Получение текста статуса заказа
function getStatusText(status) {
  switch(status) {
    case 'confirmed': return 'Подтверждён';
    case 'preparing': return 'Готовится';
    case 'ready': return 'Готов';
    case 'completed': return 'Выполнен';
    case 'cancelled': return 'Отменён';
    default: return 'В обработке';
  }
}

// === ОБНОВЛЕННЫЕ ОБРАБОТЧИКИ ОТКРЫТИЯ МОДАЛЬНЫХ ОКОН ===

// Открытие модалки входа
loginBtn?.addEventListener('click', () => {
  openModal(authModal);
});

// Открытие модалки регистрации
registerBtn?.addEventListener('click', () => {
  openModal(registerModal);
});

// Открытие модального окна текущего счета
myBillBtn?.addEventListener('click', async () => {
  await showMyBill();
});

// Открытие модального окна истории счетов
billHistoryBtn?.addEventListener('click', async () => {
  if (auth.currentUser) {
    await loadBillHistory(auth.currentUser.uid);
    openModal(billHistoryModal);
  }
});

// Открытие модалки админ-панели
adminBtn?.addEventListener('click', async () => {
  if (isAdmin) {
    await loadCocktails();
    await loadAdminOrders(); // Теперь эта функция существует
    await loadStoplist();
    
    // Загружаем статус мониторинга
    const statusData = await monitorSystem();
    displaySystemStatus(statusData);
    
    // Показываем базовую информацию о Telegram
    displayTelegramInfo();
    
    openModal(adminPanel);
  }
});

// Добавление коктейля (открывает модальное окно поверх админ-панели)
addCocktailBtn?.addEventListener('click', () => {
  // Сброс формы (как у вас было)
  const formTitle = document.getElementById('formTitle');
  console.log('🔍 При добавлении коктейля - элемент formTitle найден:', !!formTitle, formTitle ? formTitle.textContent : 'не найден');
  const cocktailId = document.getElementById('cocktailId');
  const cocktailName = document.getElementById('cocktailName');
  const cocktailIngredients = document.getElementById('cocktailIngredients');
  const cocktailMood = document.getElementById('cocktailMood');
  const cocktailAlcohol = document.getElementById('cocktailAlcohol');
  const cocktailCategory = document.getElementById('cocktailCategory');
  const previewImage = document.getElementById('previewImage');

  if (formTitle) {
    formTitle.innerHTML = '<i class="fas fa-cocktail"></i> Добавить коктейль';
    console.log('✅ Установлен заголовок: Добавить коктейль');
  }
  if (cocktailId) cocktailId.value = '';
  if (cocktailName) cocktailName.value = '';
  if (cocktailIngredients) cocktailIngredients.value = '';
  if (cocktailMood) cocktailMood.value = '';
  if (cocktailAlcohol) cocktailAlcohol.value = '';
  
  const cocktailPrice = document.getElementById('cocktailPrice');
  if (cocktailPrice) cocktailPrice.value = '';
  
  if (cocktailCategory) cocktailCategory.value = '';
  if (previewImage) {
    previewImage.style.display = 'none';
    previewImage.src = '';
  }
  // Открываем модальное окно формы коктейля
  console.log('🔍 Перед открытием формы коктейля - заголовок:', formTitle ? formTitle.innerHTML : 'formTitle не найден');
  openModal(cocktailFormModal); 
});

// Переключение вкладок админ-панели
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    // Убираем активный класс у всех кнопок
    tabBtns.forEach(b => b.classList.remove('active'));
    // Добавляем активный класс текущей кнопке
    btn.classList.add('active');
    
    // Скрываем все вкладки
    tabContents.forEach(content => content.classList.remove('active'));
    // Показываем нужную вкладку
    const tabId = btn.getAttribute('data-tab');
    const tabElement = document.getElementById(`${tabId}-tab`);
    if (tabElement) {
        tabElement.classList.add('active');
    }
  });
});

// Переключение на регистрацию
toggleForm?.addEventListener('click', (e) => {
  if (e.target.id === 'switchToRegister') {
    closeModal(authModal); // Закрываем окно входа
    openModal(registerModal); // Открываем окно регистрации
    e.preventDefault();
  }
});

// === ОБНОВЛЕННЫЕ ОБРАБОТЧИКИ ЗАКРЫТИЯ МОДАЛЬНЫХ ОКОН ===

// Закрытие модалок по кнопке закрытия (X)
closeBtns.forEach(btn => {
  btn?.addEventListener('click', (e) => {
    // Определяем, какое модальное окно нужно закрыть, по родительскому элементу кнопки
    const modalContent = e.target.closest('.modal-content');
    if (modalContent) {
      const modal = modalContent.parentElement;
      closeModal(modal);
    }
  });
});

// Закрытие по клику вне модального окна
window.addEventListener('click', (e) => {
  // Проверяем, кликнули ли мы вне содержимого модального окна
  if (e.target.classList.contains('modal')) {
    closeModal(e.target);
  }
});

// Закрытие специфичных модальных окон по отдельным кнопкам
closeNotification?.addEventListener('click', () => {
  closeModal(notificationModal);
  if (champagneAnimation) champagneAnimation.innerHTML = '';
});

closeSuccess?.addEventListener('click', () => {
  closeModal(successModal);
});

closeError?.addEventListener('click', () => {
  closeModal(errorModal);
});

// Закрытие модального окна подтверждения заказа
document.getElementById('closeOrderModal')?.addEventListener('click', () => {
  // Очищаем заглушку при закрытии
  const placeholder = document.querySelector('.order-image-placeholder');
  if (placeholder) {
    placeholder.style.display = 'none';
  }
  closeModal(orderModal);
});

// === ОСТАЛЬНОЙ КОД (без изменений, кроме использования openModal/closeModal где нужно) ===

// Обработка входа
authForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const phoneInput = document.getElementById('phone');
  const passwordInput = document.getElementById('password');

  if (!phoneInput || !passwordInput) {
    showError('❌ Ошибка: поля ввода не найдены.');
    return;
  }

  const phone = phoneInput.value;
  const password = passwordInput.value;

  const loader = document.getElementById('loader');
  if (loader) loader.classList.add('active');

  try {
    // Здесь должна быть логика входа по телефону
    // Пока используем email как заглушку
    const email = `${phone.replace(/\D/g, '')}@asafievbar.com`;
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    await userCredential.user.reload();
    const updatedUser = auth.currentUser;
    
    // Имитируем небольшую задержку для красивой анимации (300ms)
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (userName) {
        userName.textContent = updatedUser.displayName || "Гость";
        userName.style.display = 'block';
    }
    closeModal(authModal); // Используем новую функцию
    
    // Добавляем плавное появление контента
    document.querySelectorAll('.cocktail-card').forEach(card => {
      card.classList.add('fade-in-content');
    });
    
  } catch (error) {
    showError('❌ Ошибка входа: ' + error.message);
  } finally {
    if (loader) loader.classList.remove('active');
  }
});

// Обработка регистрации
registerForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const displayNameInput = document.getElementById('displayName');
  const regPhoneInput = document.getElementById('regPhone');
  const regPasswordInput = document.getElementById('regPassword');

  if (!displayNameInput || !regPhoneInput || !regPasswordInput) {
    showError('❌ Ошибка: поля ввода не найдены.');
    return;
  }

  const displayName = displayNameInput.value;
  const phone = regPhoneInput.value;
  const password = regPasswordInput.value;

  const loader = document.getElementById('loader');
  if (loader) loader.classList.add('active');

  try {
    // Здесь должна быть логика регистрации по телефону
    // Пока используем email как заглушку
    const email = `${phone.replace(/\D/g, '')}@asafievbar.com`;
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    await userCredential.user.updateProfile({ displayName });
    
    // Сохраняем пользователя в Firestore
    await db.collection('users').doc(userCredential.user.uid).set({
      displayName: displayName,
      phone: phone,
      role: 'user', // По умолчанию обычный пользователь
      createdAt: new Date()
    });
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Показываем модальное окно успеха
    closeModal(registerModal); // Используем новую функцию
    openModal(successModal); // Используем новую функцию
    
    document.querySelectorAll('.cocktail-card').forEach(card => {
      card.classList.add('fade-in-content');
    });
    
  } catch (error) {
    showError('❌ Ошибка регистрации: ' + error.message);
  } finally {
    if (loader) loader.classList.remove('active');
  }
});

// Выход
logoutBtn?.addEventListener('click', async () => {
  // Отключаем real-time listeners перед выходом
  if (userOrdersListener) {
    userOrdersListener();
    userOrdersListener = null;
  }
  if (adminOrdersListener) {
    adminOrdersListener();
    adminOrdersListener = null;
  }
  if (globalOrdersListener) {
    globalOrdersListener();
    globalOrdersListener = null;
  }
  lastOrderStatuses.clear();
  
  await auth.signOut();
});

// Редактирование коктейля
function editCocktail(id) {
  const cocktail = cocktailsData.find(c => c.id === id);
  if (cocktail) {
    const formTitle = document.getElementById('formTitle');
    console.log('🔍 При редактировании коктейля - элемент formTitle найден:', !!formTitle, formTitle ? formTitle.textContent : 'не найден');
    const cocktailId = document.getElementById('cocktailId');
    const cocktailName = document.getElementById('cocktailName');
    const cocktailIngredients = document.getElementById('cocktailIngredients');
    const cocktailMood = document.getElementById('cocktailMood');
    const cocktailAlcohol = document.getElementById('cocktailAlcohol');
    const cocktailCategory = document.getElementById('cocktailCategory');
    const previewImage = document.getElementById('previewImage');

    if (formTitle) {
      formTitle.innerHTML = '<i class="fas fa-edit"></i> Редактировать коктейль';
      console.log('✅ Установлен заголовок: Редактировать коктейль');
    }
    if (cocktailId) cocktailId.value = cocktail.id;
    if (cocktailName) cocktailName.value = cocktail.name;
    if (cocktailIngredients) cocktailIngredients.value = cocktail.ingredients || '';
    if (cocktailMood) cocktailMood.value = cocktail.mood || '';
    if (cocktailAlcohol) cocktailAlcohol.value = cocktail.alcohol || '';
    
    const cocktailPrice = document.getElementById('cocktailPrice');
    if (cocktailPrice) cocktailPrice.value = cocktail.price || 500;
    
    if (cocktailCategory) cocktailCategory.value = cocktail.category || 'signature';

    if (cocktail.image) {
      if (previewImage) {
        previewImage.src = cocktail.image;
        previewImage.style.display = 'block';
      }
    } else {
      if (previewImage) {
        previewImage.style.display = 'none';
      }
    }
    
    console.log('🔍 Перед открытием формы редактирования - заголовок:', formTitle ? formTitle.innerHTML : 'formTitle не найден');
    openModal(cocktailFormModal); // Используем новую функцию
  }
}

// Удаление коктейля
async function deleteCocktail(id) {
  if (confirm('Вы уверены, что хотите удалить этот коктейль?')) {
    try {
      await db.collection('cocktails').doc(id).delete();
      await loadCocktails();
      
      // Обновляем админский список после удаления
      if (isAdmin) {
        updateAdminCocktailsList();
      }
      
      showSuccess('Коктейль успешно удалён');
    } catch (error) {
      console.error('Ошибка удаления коктейля:', error);
      showError('Ошибка удаления коктейля');
    }
  }
}

// Обработка формы коктейля
cocktailForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const cocktailId = document.getElementById('cocktailId');
  const cocktailName = document.getElementById('cocktailName');
  const cocktailIngredients = document.getElementById('cocktailIngredients');
  const cocktailMood = document.getElementById('cocktailMood');
  const cocktailAlcohol = document.getElementById('cocktailAlcohol');
  const cocktailPrice = document.getElementById('cocktailPrice');
  const cocktailCategory = document.getElementById('cocktailCategory');
  const cocktailImage = document.getElementById('cocktailImage');

  if (!cocktailName || !cocktailIngredients) {
    showError('❌ Ошибка: обязательные поля не найдены.');
    return;
  }

  const id = cocktailId ? cocktailId.value : '';
  const name = cocktailName.value;
  const ingredients = cocktailIngredients.value;
  const mood = cocktailMood ? cocktailMood.value : '';
  const alcohol = cocktailAlcohol ? cocktailAlcohol.value : '';
  const price = cocktailPrice ? parseInt(cocktailPrice.value) : 500;
  const category = cocktailCategory ? cocktailCategory.value : '';
  const imageFile = cocktailImage ? cocktailImage.files[0] : null;
  
  try {
    let imageUrl = '';
    
    // Если выбран файл изображения, загружаем его
    if (imageFile) {
      const storageRef = storage.ref();
      const imageRef = storageRef.child(`cocktails/${Date.now()}_${imageFile.name}`);
      const snapshot = await imageRef.put(imageFile);
      imageUrl = await snapshot.ref.getDownloadURL();
    }
    
    const cocktailData = {
      name: name,
      ingredients: ingredients,
      mood: mood,
      alcohol: alcohol ? parseInt(alcohol) : null,
      price: price,
      category: category || 'signature', // По умолчанию авторский, если не выбрано
      updatedAt: new Date()
    };
    
    // Если есть новое изображение, добавляем его
    if (imageUrl) {
      cocktailData.image = imageUrl;
    } else if (!id) {
      // Если новый коктейль и нет изображения, ставим заглушку
      cocktailData.image = 'https://i.pinimg.com/736x/5d/5d/5d/5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d.jpg';
    }
    
    if (id) {
      // Обновление существующего коктейля
      await db.collection('cocktails').doc(id).update(cocktailData);
    } else {
      // Создание нового коктейля
      cocktailData.createdAt = new Date();
      await db.collection('cocktails').add(cocktailData);
    }
    
    closeModal(cocktailFormModal); // Используем новую функцию
    await loadCocktails();
    
    // Обновляем админский список после изменения
    if (isAdmin) {
      updateAdminCocktailsList();
    }
    showSuccess(id ? 'Коктейль успешно обновлён' : 'Коктейль успешно добавлен');
    
  } catch (error) {
    console.error('Ошибка сохранения коктейля:', error);
    showError('Ошибка сохранения коктейля');
  }
});

// Предпросмотр изображения
const cocktailImageInput = document.getElementById('cocktailImage');
if (cocktailImageInput) {
    cocktailImageInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
        const preview = document.getElementById('previewImage');
        if (preview) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        }
        };
        reader.readAsDataURL(file);
    }
    });
}

// Добавление в стоп-лист
addToStoplist?.addEventListener('click', async () => {
  if (!stoplistCocktails || !stopReason) {
    showError('❌ Ошибка: поля ввода не найдены.');
    return;
  }

  const cocktailName = stoplistCocktails.value;
  const reason = stopReason.value;
  
  if (!cocktailName || !reason) {
    showError('Заполните все поля');
    return;
  }
  
  // Проверяем, не добавлен ли уже этот коктейль в стоп-лист
  const alreadyInStoplist = stoplistData.some(item => item.cocktailName === cocktailName);
  if (alreadyInStoplist) {
    showError('Этот коктейль уже в стоп-листе');
    return;
  }
  
  // Показываем подтверждение
  const confirmed = confirm(
    `Вы уверены, что хотите добавить коктейль "${cocktailName}" в стоп-лист?\n\n` +
    `Причина: ${reason}\n\n` +
    `Это действие сделает коктейль недоступным для заказа.`
  );
  
  if (!confirmed) {
    return;
  }
  
  try {
    await db.collection('stoplist').add({
      cocktailName: cocktailName,
      reason: reason,
      timestamp: new Date().toLocaleString('ru-RU'),
      addedBy: isAdmin ? 'admin' : 'user'
    });
    
    // Очищаем поля
    stopReason.value = '';
    stoplistCocktails.value = '';
    
    // Перезагружаем стоп-лист и обновляем селект
    await loadStoplist();
    showSuccess(`Коктейль "${cocktailName}" добавлен в стоп-лист`);
  } catch (error) {
    console.error('Ошибка добавления в стоп-лист:', error);
    showError('Ошибка добавления в стоп-лист');
  }
});

// Удаление из стоп-листа
async function removeFromStoplist(id) {
  try {
    // Получаем информацию о коктейле перед удалением
    const stoplistItem = stoplistData.find(item => item.id === id);
    const cocktailName = stoplistItem ? stoplistItem.cocktailName : 'коктейль';
    const reason = stoplistItem ? stoplistItem.reason : '';
    
    // Показываем подтверждение
    const confirmed = confirm(
      `Вы уверены, что хотите удалить коктейль "${cocktailName}" из стоп-листа?\n\n` +
      `Причина добавления: ${reason}\n\n` +
      `Это действие сделает коктейль снова доступным для заказа.`
    );
    
    if (!confirmed) {
      return;
    }
    
    await db.collection('stoplist').doc(id).delete();
    await loadStoplist();
    showSuccess(`Коктейль "${cocktailName}" удалён из стоп-листа`);
  } catch (error) {
    console.error('Ошибка удаления из стоп-листа:', error);
    showError('Ошибка удаления из стоп-листа');
  }
}

// Обработка изменения статуса
statusButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const status = btn.getAttribute('data-status');
    changeOrderStatus(currentOrderId, status);
  });
});

// Обработчики для мониторинга
checkSystemBtn?.addEventListener('click', async () => {
  const statusData = await monitorSystem();
  displaySystemStatus(statusData);
});

testWebhookBtn?.addEventListener('click', testWebhookServer);

// Обработчик для диагностики
const diagnoseBtn = document.getElementById('diagnoseBtn');
diagnoseBtn?.addEventListener('click', async () => {
  try {
    showSuccess('🔍 Запуск диагностики...');
    
    const baseUrl = WEBHOOK_SERVER_URL.replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/diagnose`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('🔍 Результаты диагностики:', data);
    
    // Показываем результаты в модальном окне
    const diagnosticResults = `
      <h4>🔍 Диагностика системы</h4>
      <div class="diagnostic-results">
        <h5>🌐 Переменные окружения:</h5>
        <ul>
          <li><strong>PORT:</strong> ${data.environment.PORT || 'НЕ УСТАНОВЛЕН'}</li>
          <li><strong>RAILWAY_PUBLIC_DOMAIN:</strong> ${data.environment.RAILWAY_PUBLIC_DOMAIN || 'НЕ УСТАНОВЛЕН'}</li>
          <li><strong>TELEGRAM_BOT_TOKEN:</strong> ${data.environment.TELEGRAM_BOT_TOKEN}</li>
          <li><strong>TELEGRAM_CHAT_ID:</strong> ${data.environment.TELEGRAM_CHAT_ID}</li>
          <li><strong>FIREBASE_PRIVATE_KEY_ID:</strong> ${data.environment.FIREBASE_PRIVATE_KEY_ID}</li>
          <li><strong>FIREBASE_CLIENT_EMAIL:</strong> ${data.environment.FIREBASE_CLIENT_EMAIL}</li>
          <li><strong>FIREBASE_PRIVATE_KEY:</strong> ${data.environment.FIREBASE_PRIVATE_KEY}</li>
        </ul>
        <p><strong>Время:</strong> ${new Date(data.timestamp).toLocaleString('ru-RU')}</p>
      </div>
    `;
    
    // Создаем временное модальное окно для диагностики
    const diagnosticModal = document.createElement('div');
    diagnosticModal.className = 'modal';
    diagnosticModal.innerHTML = `
      <div class="modal-content">
        <span class="close">&times;</span>
        ${diagnosticResults}
      </div>
    `;
    
    document.body.appendChild(diagnosticModal);
    
    // Показываем модальное окно
    diagnosticModal.style.display = 'block';
    
    // Обработчик закрытия
    const closeBtn = diagnosticModal.querySelector('.close');
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(diagnosticModal);
    });
    
    // Закрытие по клику вне модального окна
    diagnosticModal.addEventListener('click', (e) => {
      if (e.target === diagnosticModal) {
        document.body.removeChild(diagnosticModal);
      }
    });
    
  } catch (error) {
    console.error('❌ Ошибка диагностики:', error);
    
    // Fallback диагностика - показываем базовую информацию
    const fallbackResults = `
      <h4>🔍 Диагностика системы (Fallback)</h4>
      <div class="diagnostic-results">
        <h5>⚠️ Endpoint /diagnose недоступен</h5>
        <p><strong>URL webhook сервера:</strong> ${WEBHOOK_SERVER_URL}</p>
        <p><strong>Статус:</strong> Endpoint не найден (404)</p>
        <p><strong>Возможные причины:</strong></p>
        <ul>
          <li>Railway развертывает не webhook-server.js</li>
          <li>Сервер не запущен</li>
          <li>Неправильная конфигурация Railway</li>
        </ul>
        <p><strong>Рекомендации:</strong></p>
        <ul>
          <li>Проверьте Railway Dashboard → Logs</li>
          <li>Убедитесь, что используется webhook-server.js</li>
          <li>Перезапустите Railway сервис</li>
        </ul>
      </div>
    `;
    
    // Создаем временное модальное окно для fallback диагностики
    const diagnosticModal = document.createElement('div');
    diagnosticModal.className = 'modal';
    diagnosticModal.innerHTML = `
      <div class="modal-content">
        <span class="close">&times;</span>
        ${fallbackResults}
      </div>
    `;
    
    document.body.appendChild(diagnosticModal);
    
    // Показываем модальное окно
    diagnosticModal.style.display = 'block';
    
    // Обработчик закрытия
    const closeBtn = diagnosticModal.querySelector('.close');
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(diagnosticModal);
    });
    
    // Закрытие по клику вне модального окна
    diagnosticModal.addEventListener('click', (e) => {
      if (e.target === diagnosticModal) {
        document.body.removeChild(diagnosticModal);
      }
    });
  }
});

// Обработчик для настройки URL webhook сервера
const setupWebhookUrlBtn = document.getElementById('setupWebhookUrlBtn');
setupWebhookUrlBtn?.addEventListener('click', () => {
  const currentUrl = getWebhookServerUrl();
  const newUrl = prompt(`🌐 Настройка URL webhook сервера\n\nТекущий URL: ${currentUrl}\n\nВведите новый URL:`, currentUrl);
  
  if (newUrl && newUrl !== currentUrl) {
    if (newUrl.startsWith('http://') || newUrl.startsWith('https://')) {
      updateWebhookServerUrl(newUrl);
      showSuccess(`✅ URL webhook сервера обновлен: ${newUrl}`);
      
      // Автоматически проверяем систему после изменения URL
      setTimeout(async () => {
        const statusData = await monitorSystem();
        displaySystemStatus(statusData);
      }, 1000);
    } else {
      showError('❌ URL должен начинаться с http:// или https://');
    }
  }
});

// Обработчик для принудительной настройки Railway URL
const forceRailwayBtn = document.getElementById('forceRailwayBtn');
forceRailwayBtn?.addEventListener('click', () => {
  forceRailwayUrl();
});

// Обработчик для сброса URL
const resetUrlBtn = document.getElementById('resetUrlBtn');
resetUrlBtn?.addEventListener('click', () => {
  const confirmed = confirm('⚠️ ВНИМАНИЕ!\n\nВы действительно хотите сбросить настройки URL webhook сервера?\n\nСтраница будет перезагружена.');
  
  if (confirmed) {
    showSuccess('🔄 Сбрасываем настройки URL...');
    resetWebhookServerUrl();
  }
});

// Обработчик для автонастройки
const autoSetupBtn = document.getElementById('autoSetupBtn');
autoSetupBtn?.addEventListener('click', async () => {
  showSuccess('🚀 Запуск автонастройки...');
  
  try {
    // Шаг 1: Настройка URL webhook сервера
    const railwayUrl = prompt('🌐 Введите ваш Railway URL (например: https://your-app.railway.app):');
    
    if (!railwayUrl) {
      showError('❌ URL не введен. Автонастройка отменена.');
      return;
    }
    
    if (!railwayUrl.startsWith('http://') && !railwayUrl.startsWith('https://')) {
      showError('❌ URL должен начинаться с http:// или https://');
      return;
    }
    
    // Обновляем URL
    updateWebhookServerUrl(railwayUrl);
    showSuccess('✅ URL webhook сервера настроен');
    
    // Шаг 2: Проверяем систему
    showSuccess('🔍 Проверяем систему...');
    const statusData = await monitorSystem();
    displaySystemStatus(statusData);
    
    // Шаг 3: Настраиваем Telegram webhook
    showSuccess('📱 Настраиваем Telegram webhook...');
    await setupTelegramWebhook();
    
    showSuccess('🎉 Автонастройка завершена!');
    
  } catch (error) {
    showError(`❌ Ошибка автонастройки: ${error.message}`);
    console.error('❌ Ошибка автонастройки:', error);
  }
});

// Обработчик для очистки заказов
cleanupOrdersBtn?.addEventListener('click', async () => {
  const confirmed = confirm('⚠️ ВНИМАНИЕ!\n\nВы действительно хотите удалить ВСЕ заказы из базы данных?\n\nЭто действие нельзя отменить!');
  
  if (!confirmed) {
    console.log('❌ Очистка заказов отменена пользователем');
    return;
  }
  
  const button = cleanupOrdersBtn;
  const originalText = button.innerHTML;
  
  try {
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Очищаем...';
    
    console.log('🧹 Начинаем очистку всех заказов...');
    
    const response = await fetch(`${WEBHOOK_SERVER_URL}/cleanup-orders`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Заказы успешно очищены:', result);
      alert(`✅ Успешно удалено ${result.deletedCount} заказов!`);
      
      // Обновляем отображение заказов
      if (auth.currentUser) {
        await loadOrderHistory(auth.currentUser.uid);
        await loadAdminOrders();
      }
    } else {
      throw new Error(result.error || 'Неизвестная ошибка');
    }
    
  } catch (error) {
    console.error('❌ Ошибка очистки заказов:', error);
    alert(`❌ Ошибка очистки заказов: ${error.message}`);
  } finally {
    button.disabled = false;
    button.innerHTML = originalText;
  }
});

// Обработчики для Telegram управления
setupWebhookBtn?.addEventListener('click', setupTelegramWebhook);
deleteWebhookBtn?.addEventListener('click', deleteTelegramWebhook);
getWebhookInfoBtn?.addEventListener('click', getTelegramWebhookInfo);
sendTestMessageBtn?.addEventListener('click', sendTestMessage);

// Заказ (кнопка)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.order-btn');
  if (btn && !btn.disabled && !btn.classList.contains('loading')) {
    const user = auth.currentUser;
    if (!user) {
      showError('🔒 Пожалуйста, войдите или зарегистрируйтесь для заказа.');
      return;
    }
    
    // Устанавливаем состояние загрузки
    btn.classList.add('loading');
    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загружаем...';
    
    const name = btn.getAttribute('data-name');
    const price = parseInt(btn.getAttribute('data-price')) || 500;
    // 👇 Безопасное получение изображения коктейля из родительской карточки
    const card = btn.closest('.cocktail-card');
    const imgElement = card?.querySelector('img');
    const imgSrc = imgElement ? imgElement.src : '';
    
    // Проверяем, есть ли реальное изображение или это заглушка
    const hasRealImage = imgSrc && !imgSrc.includes('5d5d5d') && !imgSrc.includes('placeholder');
    
    currentOrder = { 
      name, 
      user: user.displayName || "Гость", 
      userId: user.uid,
      displayTime: new Date().toLocaleString('ru-RU'),
      image: hasRealImage ? imgSrc : '',
      status: 'pending', // Статус по умолчанию
      price: price,
      originalPrice: price,
      discount: 0,
      promoCode: null
    };
    if (orderSummary) {
        orderSummary.innerHTML = `
        <strong>🍸 Коктейль:</strong> ${name}<br>
        <strong>📬 Ваше имя:</strong> ${currentOrder.user}
        `;
    }
    
    // Отображаем цену
    const orderPriceEl = document.getElementById('orderPrice');
    const totalPriceEl = document.getElementById('totalPrice');
    if (orderPriceEl) orderPriceEl.textContent = `${price} ₽`;
    if (totalPriceEl) totalPriceEl.textContent = `${price} ₽`;
    
    // Сбрасываем промокод
    const promoCodeInput = document.getElementById('promoCodeInput');
    const promoMessage = document.getElementById('promoMessage');
    const discountInfo = document.getElementById('discountInfo');
    if (promoCodeInput) promoCodeInput.value = '';
    if (promoMessage) {
      promoMessage.textContent = '';
      promoMessage.classList.remove('success', 'error');
    }
    if (discountInfo) discountInfo.style.display = 'none';
    // 👇 Показываем и подставляем изображение или заглушку
    const orderImagePreview = document.getElementById('orderImagePreview');
    if (orderImagePreview) {
        if (hasRealImage && imgSrc) {
            orderImagePreview.src = imgSrc;
            orderImagePreview.style.display = 'block';
            orderImagePreview.alt = name;
        } else {
            // Показываем заглушку для коктейлей без фото
            orderImagePreview.style.display = 'none';
            // Создаем заглушку, если её нет
            let placeholder = document.querySelector('.order-image-placeholder');
            if (!placeholder) {
                placeholder = document.createElement('div');
                placeholder.className = 'order-image-placeholder';
                placeholder.innerHTML = `
                    <i class="fas fa-camera"></i>
                    <p>Коктейль уже делает селфи,<br>скоро выложит сюда</p>
                `;
                orderImagePreview.parentNode.appendChild(placeholder);
            }
            placeholder.style.display = 'block';
        }
    }
    openModal(orderModal); // Используем новую функцию
    
    // Восстанавливаем состояние кнопки после открытия модального окна
    btn.classList.remove('loading');
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
});

// Подтверждение заказа
confirmOrderBtn?.addEventListener('click', async () => {
  if (!currentOrder) return;
  
  // Предотвращаем множественные клики
  if (confirmOrderBtn.disabled || confirmOrderBtn.classList.contains('loading')) {
    return;
  }
  
  // Устанавливаем состояние загрузки
  confirmOrderBtn.classList.add('loading');
  confirmOrderBtn.disabled = true;
  const originalText = confirmOrderBtn.innerHTML;
  confirmOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправляем заказ...';

  try {
    // Получаем следующую позицию в очереди
    const queuePosition = await getNextQueuePosition();
    
    // Сохраняем заказ в Firestore с корректными полями времени и позицией в очереди
    const now = new Date();
    const orderData = {
      ...currentOrder,
      displayTime: now.toLocaleString('ru-RU'),
      queuePosition: queuePosition, // Добавляем позицию в очереди
      status: 'pending', // Начальный статус
      createdAt: firebase.firestore.FieldValue.serverTimestamp ? firebase.firestore.FieldValue.serverTimestamp() : now
    };
    const docRef = await db.collection('orders').add(orderData);
    
    // Создаем или обновляем счет пользователя
    await createOrUpdateBill(currentOrder, docRef.id);
    
    // Если использован промокод, увеличиваем счетчик использований
    if (currentOrder.promoCode) {
      try {
        await db.collection('promocodes').doc(currentOrder.promoCode).update({
          usedCount: firebase.firestore.FieldValue.increment(1),
          lastUsedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ Промокод ${currentOrder.promoCode} использован`);
      } catch (error) {
        console.error('❌ Ошибка обновления счетчика промокода:', error);
      }
    }

    const promoInfo = currentOrder.promoCode ? `\n💳 *Промокод:* ${currentOrder.promoCode} (-${currentOrder.promoDiscount}%)` : '';
    const priceInfo = currentOrder.discount > 0 
      ? `\n💰 *Цена:* ~~${currentOrder.originalPrice}₽~~ → ${currentOrder.price}₽`
      : `\n💰 *Цена:* ${currentOrder.price}₽`;
    
    const message = `
🆕 *Новый заказ в Asafiev Bar!*
🍸 *Коктейль:* ${currentOrder.name}
👤 *Имя клиента:* ${currentOrder.user}
🕒 *Время:* ${currentOrder.displayTime}${priceInfo}${promoInfo}
🆔 *ID заказа:* ${docRef.id}
        `.trim();

    // Создаем inline-кнопки для управления заказом
    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: "✅ Подтвердить", callback_data: `confirmed_${docRef.id}` },
          { text: "❌ Отменить", callback_data: `cancelled_${docRef.id}` }
        ],
        [
          { text: "👨‍🍳 Готовится", callback_data: `preparing_${docRef.id}` },
          { text: "🍸 Готов", callback_data: `ready_${docRef.id}` }
        ],
        [
          { text: "✅ Выполнен", callback_data: `completed_${docRef.id}` }
        ]
      ]
    };

    // ИСПРАВЛЕНО: Убран лишний пробел в URL Telegram API
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
        reply_markup: inlineKeyboard
      })
    });
    
    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status}`);
    }

    // Вибрация при успешном заказе (если поддерживается)
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    } else if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      // Альтернативная вибрация для мобильных устройств
      try {
        if (window.Telegram && window.Telegram.WebApp) {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        }
      } catch (e) {
        console.log('Haptic feedback not available');
      }
    }

    // Анимация шампанского
    createChampagneAnimation();

    // Очищаем заглушку при успешном заказе
    const placeholder = document.querySelector('.order-image-placeholder');
    if (placeholder) {
      placeholder.style.display = 'none';
    }
    
    // Показываем уведомление
    closeModal(orderModal); // Используем новую функцию
    openModal(notificationModal); // Используем новую функцию
    currentOrder = null;
    
  } catch (error) {
    console.error("Ошибка:", error);
    showError('❌ Не удалось отправить заказ.');
  } finally {
    // Восстанавливаем состояние кнопки
    confirmOrderBtn.classList.remove('loading');
    confirmOrderBtn.disabled = false;
    confirmOrderBtn.innerHTML = originalText;
  }
});

// === СИСТЕМА СЧЕТОВ ===

// Функция для создания или обновления счета пользователя
async function createOrUpdateBill(orderData, orderId) {
  try {
    const user = firebase.auth().currentUser;
    if (!user) return;

    // Ищем открытый счет пользователя
    const billsSnapshot = await db.collection('bills')
      .where('userId', '==', user.uid)
      .where('status', '==', 'open')
      .get();

    const billItem = {
      orderId: orderId,
      cocktailId: orderData.cocktailId || '',
      cocktailName: orderData.name,
      cocktailImage: orderData.image || '',
      price: orderData.price,
      originalPrice: orderData.originalPrice || orderData.price,
      discount: orderData.discount || 0,
      promoCode: orderData.promoCode || null,
      promoDiscount: orderData.promoDiscount || 0,
      timestamp: new Date(), // Используем new Date() вместо serverTimestamp() для элементов массива
      status: orderData.status || 'pending',
      rated: false
    };

    if (billsSnapshot.empty) {
      // Создаем новый счет
      await db.collection('bills').add({
        userId: user.uid,
        userName: user.displayName || 'Гость',
        userPhone: user.phoneNumber || user.email || '',
        items: [billItem],
        totalAmount: orderData.price,
        status: 'open',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        paidAt: null,
        paymentMethod: null,
        paymentId: null
      });
      console.log('✅ Создан новый счет для пользователя');
    } else {
      // Обновляем существующий счет
      const billDoc = billsSnapshot.docs[0];
      const billData = billDoc.data();
      const currentItems = billData.items || [];
      const currentTotal = billData.totalAmount || 0;

      await billDoc.ref.update({
        items: firebase.firestore.FieldValue.arrayUnion(billItem),
        totalAmount: currentTotal + orderData.price,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ Счет пользователя обновлен');
    }
  } catch (error) {
    console.error('❌ Ошибка создания/обновления счета:', error);
  }
}

// Функция для отображения счета пользователя
async function showMyBill() {
  const user = firebase.auth().currentUser;
  if (!user) {
    showError('Войдите, чтобы увидеть свой счет');
    return;
  }

  try {
    // Получаем открытый счет пользователя
    const billsSnapshot = await db.collection('bills')
      .where('userId', '==', user.uid)
      .where('status', '==', 'open')
      .get();

    if (billsSnapshot.empty) {
      // Показываем модальное окно с информацией
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.style.display = 'block';
      modal.innerHTML = `
        <div class="modal-content">
          <span class="close">&times;</span>
          <div style="text-align: center; padding: 2rem;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
            <h3>Счет пуст</h3>
            <p style="color: #6c757d; margin-top: 1rem;">У вас пока нет заказов в счете</p>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      document.body.classList.add('modal-open');
      
      const closeBtn = modal.querySelector('.close');
      closeBtn.addEventListener('click', () => {
        modal.remove();
        document.body.classList.remove('modal-open');
      });
      
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove();
          document.body.classList.remove('modal-open');
        }
      });
      return;
    }

    const billDoc = billsSnapshot.docs[0];
    const billData = billDoc.data();
    const billId = billDoc.id;

    // Создаем модальное окно счета
    showBillModal(billData, billId);
  } catch (error) {
    console.error('❌ Ошибка загрузки счета:', error);
    showError('Ошибка загрузки счета');
  }
}

// Функция для отображения модального окна счета
function showBillModal(billData, billId) {
  const items = billData.items || [];
  
  // Сортируем по времени (новые сверху)
  items.sort((a, b) => {
    if (!a.timestamp || !b.timestamp) return 0;
    return b.timestamp - a.timestamp;
  });

  // Создаем HTML для элементов счета
  const itemsHTML = items.map(item => {
    const statusText = getStatusText(item.status);
    const statusIcon = getStatusIcon(item.status);
    const priceDisplay = item.discount > 0 
      ? `<span class="bill-item-original-price">${item.originalPrice} ₽</span> ${item.price} ₽`
      : `${item.price} ₽`;

    return `
      <div class="bill-item" data-status="${item.status}">
        ${item.cocktailImage ? `<img src="${item.cocktailImage}" alt="${item.cocktailName}" class="bill-item-image">` : ''}
        <div class="bill-item-info">
          <div class="bill-item-name">${item.cocktailName}</div>
          ${item.promoCode ? `<div class="bill-item-promo">🎫 ${item.promoCode} (-${item.promoDiscount}%)</div>` : ''}
          <div class="bill-item-status">
            <span class="status-icon">${statusIcon}</span>
            <span class="status-text">${statusText}</span>
          </div>
        </div>
        <div class="bill-item-price">${priceDisplay}</div>
      </div>
    `;
  }).join('');

  // Создаем модальное окно
  const modal = document.createElement('div');
  modal.id = 'billModal';
  modal.className = 'modal bill-modal';
  modal.style.display = 'block';

  modal.innerHTML = `
    <div class="modal-content bill-content">
      <span class="close">&times;</span>
      <h3><i class="fas fa-receipt"></i> Мой счет</h3>
      
      <div class="bill-header">
        <div class="bill-user-info">
          <i class="fas fa-user"></i> ${billData.userName}
        </div>
        <div class="bill-items-count">
          <i class="fas fa-shopping-bag"></i> ${items.length} ${getItemsWord(items.length)}
        </div>
      </div>

      <div class="bill-items">
        ${itemsHTML || '<p class="no-items">Нет заказов</p>'}
      </div>

      <div class="bill-total">
        <span>Итого к оплате:</span>
        <span class="total-amount">${billData.totalAmount} ₽</span>
      </div>

      <div class="bill-footer-note">
        <i class="fas fa-info-circle"></i>
        Оплата счета будет доступна в конце вечера
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.classList.add('modal-open');

  // Обработчик закрытия
  const closeBtn = modal.querySelector('.close');
  closeBtn.addEventListener('click', () => {
    modal.remove();
    document.body.classList.remove('modal-open');
  });

  // Закрытие по клику вне модального окна
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
      document.body.classList.remove('modal-open');
    }
  });
}

// Вспомогательные функции
function getStatusIcon(status) {
  const icons = {
    'pending': '⏳',
    'confirmed': '✅',
    'preparing': '👨‍🍳',
    'ready': '🍸',
    'completed': '✅',
    'cancelled': '❌'
  };
  return icons[status] || '⏳';
}

function getItemsWord(count) {
  if (count % 10 === 1 && count % 100 !== 11) return 'позиция';
  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return 'позиции';
  return 'позиций';
}

// Функция для загрузки истории счетов
async function loadBillHistory(userId) {
  try {
    const billHistoryList = document.getElementById('billHistoryList');
    if (!billHistoryList) return;
    
    billHistoryList.innerHTML = '<p style="text-align: center; padding: 2rem;">Загрузка...</p>';
    
    // Загружаем ВСЕ счета пользователя (и открытые, и оплаченные)
    const billsSnapshot = await db.collection('bills')
      .where('userId', '==', userId)
      .get();
    
    if (billsSnapshot.empty) {
      billHistoryList.innerHTML = '<p class="no-items">У вас пока нет счетов</p>';
      return;
    }
    
    billHistoryList.innerHTML = '';
    
    // Собираем все счета и сортируем на клиенте
    const bills = [];
    billsSnapshot.forEach(doc => {
      bills.push({
        id: doc.id,
        data: doc.data()
      });
    });
    
    // Сортируем по дате создания (новые сверху)
    bills.sort((a, b) => {
      const aTime = a.data.createdAt?.toDate ? a.data.createdAt.toDate().getTime() : 0;
      const bTime = b.data.createdAt?.toDate ? b.data.createdAt.toDate().getTime() : 0;
      return bTime - aTime;
    });
    
    // Создаем карточки
    bills.forEach(bill => {
      const billCard = createBillHistoryCard(bill.data, bill.id);
      billHistoryList.appendChild(billCard);
    });
    
  } catch (error) {
    console.error('❌ Ошибка загрузки истории счетов:', error);
    const billHistoryList = document.getElementById('billHistoryList');
    if (billHistoryList) {
      billHistoryList.innerHTML = '<p class="error">Ошибка загрузки истории счетов</p>';
    }
  }
}

// Функция для создания карточки счета в истории
function createBillHistoryCard(billData, billId) {
  const card = document.createElement('div');
  card.className = 'bill-history-card';
  card.setAttribute('data-status', billData.status);
  
  const items = billData.items || [];
  const createdDate = billData.createdAt?.toDate ? billData.createdAt.toDate().toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : 'Неизвестная дата';
  
  const statusText = billData.status === 'open' ? 'Открыт' : billData.status === 'paid' ? 'Оплачен' : 'Закрыт';
  const statusIcon = billData.status === 'open' ? '🟢' : billData.status === 'paid' ? '✅' : '⚪';
  
  // Создаем краткий список коктейлей (первые 3)
  const displayItems = items.slice(0, 3);
  const moreCount = items.length - 3;
  
  const itemsHTML = displayItems.map(item => `
    <div class="bill-history-item">
      <span class="item-name">${item.cocktailName}</span>
      <span class="item-price">${item.price} ₽</span>
    </div>
  `).join('');
  
  const moreText = moreCount > 0 ? `<div class="bill-history-more">+ еще ${moreCount} ${getItemsWord(moreCount)}</div>` : '';
  
  card.innerHTML = `
    <div class="bill-history-header">
      <div class="bill-history-date">${statusIcon} ${createdDate}</div>
      <div class="bill-history-status">${statusText}</div>
    </div>
    
    <div class="bill-history-items">
      ${itemsHTML}
      ${moreText}
    </div>
    
    <div class="bill-history-footer">
      <span class="bill-history-total-label">Итого:</span>
      <span class="bill-history-total-amount">${billData.totalAmount} ₽</span>
    </div>
    
    <button class="bill-history-details-btn" data-bill-id="${billId}">
      <i class="fas fa-eye"></i> Подробнее
    </button>
  `;
  
  // Обработчик для кнопки "Подробнее"
  const detailsBtn = card.querySelector('.bill-history-details-btn');
  detailsBtn.addEventListener('click', () => {
    showBillDetailsModal(billData, billId);
  });
  
  return card;
}

// Функция для показа подробностей счета
function showBillDetailsModal(billData, billId) {
  const modal = document.createElement('div');
  modal.className = 'modal bill-details-modal';
  modal.style.display = 'block';
  
  const items = billData.items || [];
  const createdDate = billData.createdAt?.toDate ? billData.createdAt.toDate().toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : 'Неизвестная дата';
  
  const statusText = billData.status === 'open' ? 'Открыт' : billData.status === 'paid' ? 'Оплачен' : 'Закрыт';
  
  // Создаем HTML для всех элементов
  const itemsHTML = items.map(item => {
    const statusIcon = getStatusIcon(item.status);
    const statusText = getStatusText(item.status);
    const priceDisplay = item.discount > 0 
      ? `<span class="bill-item-original-price">${item.originalPrice} ₽</span> ${item.price} ₽`
      : `${item.price} ₽`;
    
    return `
      <div class="bill-item" data-status="${item.status}">
        ${item.cocktailImage ? `<img src="${item.cocktailImage}" alt="${item.cocktailName}" class="bill-item-image">` : ''}
        <div class="bill-item-info">
          <div class="bill-item-name">${item.cocktailName}</div>
          ${item.promoCode ? `<div class="bill-item-promo">🎫 ${item.promoCode} (-${item.promoDiscount}%)</div>` : ''}
          <div class="bill-item-status">
            <span class="status-icon">${statusIcon}</span>
            <span class="status-text">${statusText}</span>
          </div>
        </div>
        <div class="bill-item-price">${priceDisplay}</div>
      </div>
    `;
  }).join('');
  
  modal.innerHTML = `
    <div class="modal-content bill-content">
      <span class="close">&times;</span>
      <h3><i class="fas fa-file-invoice"></i> Счет #${billId.substring(0, 8)}</h3>
      
      <div class="bill-header">
        <div class="bill-user-info">
          <i class="fas fa-user"></i> ${billData.userName}
        </div>
        <div class="bill-items-count">
          <i class="fas fa-calendar-alt"></i> ${createdDate}
        </div>
      </div>
      
      <div class="bill-status-badge ${billData.status}">
        ${statusText}
      </div>

      <div class="bill-items">
        ${itemsHTML}
      </div>

      <div class="bill-total">
        <span>Итого:</span>
        <span class="total-amount">${billData.totalAmount} ₽</span>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  document.body.classList.add('modal-open');
  
  // Обработчик закрытия
  const closeBtn = modal.querySelector('.close');
  closeBtn.addEventListener('click', () => {
    modal.remove();
    document.body.classList.remove('modal-open');
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
      document.body.classList.remove('modal-open');
    }
  });
}

// === КОНЕЦ СИСТЕМЫ СЧЕТОВ ===

// Создание анимации шампанского
function createChampagneAnimation() {
  if (!champagneAnimation) return;
  champagneAnimation.innerHTML = '';
  for (let i = 0; i < 50; i++) {
    const bubble = document.createElement('div');
    bubble.className = 'champagne-bubble';
    bubble.style.left = Math.random() * 100 + '%';
    bubble.style.animationDelay = Math.random() * 2 + 's';
    bubble.style.width = (Math.random() * 10 + 5) + 'px';
    bubble.style.height = bubble.style.width;
    champagneAnimation.appendChild(bubble);
  }
  
  // Удаляем анимацию через 3 секунды
  setTimeout(() => {
    if (champagneAnimation) champagneAnimation.innerHTML = '';
  }, 3000);
}

// Показ ошибки
function showError(message) {
  if (errorMessage) errorMessage.textContent = message;
  openModal(errorModal); // Используем новую функцию
}

// Показ успеха
function showSuccess(message) {
  const successContent = document.querySelector('.success-content p');
  if (successContent) successContent.textContent = message;
  openModal(successModal); // Используем новую функцию
}

// ============================================
// СИСТЕМА ПРОМОКОДОВ
// ============================================

// Применение промокода
const applyPromoBtn = document.getElementById('applyPromoBtn');
applyPromoBtn?.addEventListener('click', async () => {
  const promoCodeInput = document.getElementById('promoCodeInput');
  const promoMessage = document.getElementById('promoMessage');
  const promoCode = promoCodeInput?.value.trim().toUpperCase();
  
  if (!promoCode) {
    if (promoMessage) {
      promoMessage.textContent = '⚠️ Введите промокод';
      promoMessage.className = 'promo-message error';
    }
    return;
  }
  
  if (!currentOrder) {
    if (promoMessage) {
      promoMessage.textContent = '❌ Ошибка: заказ не найден';
      promoMessage.className = 'promo-message error';
    }
    return;
  }
  
  // Проверяем промокод в Firebase
  try {
    const promoRef = await db.collection('promocodes').doc(promoCode).get();
    
    if (!promoRef.exists) {
      if (promoMessage) {
        promoMessage.textContent = '❌ Промокод не найден';
        promoMessage.className = 'promo-message error';
      }
      return;
    }
    
    const promoData = promoRef.data();
    
    // Проверяем активность промокода
    if (!promoData.active) {
      if (promoMessage) {
        promoMessage.textContent = '❌ Промокод неактивен';
        promoMessage.className = 'promo-message error';
      }
      return;
    }
    
    // Проверяем срок действия
    if (promoData.expiryDate) {
      const expiryDate = promoData.expiryDate.toDate();
      if (expiryDate < new Date()) {
        if (promoMessage) {
          promoMessage.textContent = '❌ Срок действия промокода истек';
          promoMessage.className = 'promo-message error';
        }
        return;
      }
    }
    
    // Проверяем количество использований
    if (promoData.maxUses && promoData.maxUses > 0) {
      const usedCount = promoData.usedCount || 0;
      if (usedCount >= promoData.maxUses) {
        if (promoMessage) {
          promoMessage.textContent = '❌ Промокод исчерпан';
          promoMessage.className = 'promo-message error';
        }
        return;
      }
    }
    
    // Применяем скидку
    const discount = promoData.discount || 0;
    const originalPrice = currentOrder.originalPrice;
    const discountAmount = Math.round(originalPrice * discount / 100);
    const newPrice = originalPrice - discountAmount;
    
    // Обновляем currentOrder
    currentOrder.price = newPrice;
    currentOrder.discount = discountAmount;
    currentOrder.promoCode = promoCode;
    currentOrder.promoDiscount = discount;
    
    // Обновляем UI
    const discountInfo = document.getElementById('discountInfo');
    const discountAmountEl = document.getElementById('discountAmount');
    const totalPriceEl = document.getElementById('totalPrice');
    
    if (discountInfo) discountInfo.style.display = 'block';
    if (discountAmountEl) discountAmountEl.textContent = `-${discountAmount} ₽ (${discount}%)`;
    if (totalPriceEl) totalPriceEl.textContent = `${newPrice} ₽`;
    
    if (promoMessage) {
      promoMessage.textContent = `✅ Промокод применен! Скидка ${discount}%`;
      promoMessage.className = 'promo-message success';
    }
    
    // Отключаем кнопку применения
    if (applyPromoBtn) {
      applyPromoBtn.disabled = true;
      applyPromoBtn.style.opacity = '0.5';
    }
    
    console.log('✅ Промокод применен:', { promoCode, discount, newPrice });
    
  } catch (error) {
    console.error('❌ Ошибка применения промокода:', error);
    if (promoMessage) {
      promoMessage.textContent = '❌ Ошибка проверки промокода';
      promoMessage.className = 'promo-message error';
    }
  }
});

// Уведомление об обновлении статуса заказа для пользователей
function showStatusUpdateNotification(orderData = null, newStatus = null) {
  console.log('🔔 showStatusUpdateNotification вызвана:', { orderData, newStatus });
  
  // Проверяем, что уведомление показывается только владельцу заказа
  const currentUser = auth.currentUser;
  if (!currentUser || !orderData || orderData.userId !== currentUser.uid) {
    console.log('❌ Уведомление не показано: не владелец заказа или пользователь не авторизован', {
      currentUser: !!currentUser,
      orderData: !!orderData,
      userId: orderData?.userId,
      currentUserId: currentUser?.uid
    });
    return;
  }
  
  console.log('✅ Показываем уведомление для пользователя:', currentUser.uid);
  
  // Новые данные для уведомлений
  const statusConfig = {
    'confirmed': {
      emoji: '✅',
      icon: 'fas fa-check-circle',
      title: 'Заказ подтвержден!',
      subtitle: 'Бармен принял ваш заказ',
      class: 'status-confirmed'
    },
    'preparing': {
      emoji: '👨‍🍳',
      icon: 'fas fa-utensils',
      title: 'Готовится!',
      subtitle: 'Ваш коктейль готовится',
      class: 'status-preparing'
    },
    'ready': {
      emoji: '🍸',
      icon: 'fas fa-glass-cheers',
      title: 'Готов!',
      subtitle: 'Ваш заказ готов к выдаче',
      class: 'status-ready'
    },
    'completed': {
      emoji: '🎉',
      icon: 'fas fa-star',
      title: 'Завершен!',
      subtitle: 'Спасибо за заказ!',
      class: 'status-completed'
    },
    'cancelled': {
      emoji: '❌',
      icon: 'fas fa-times-circle',
      title: 'Отменен',
      subtitle: 'Заказ был отменен',
      class: 'status-cancelled'
    }
  };
  
  // Получаем конфигурацию для текущего статуса
  const config = statusConfig[newStatus] || statusConfig['confirmed'];
  const cocktailName = orderData?.name || 'Неизвестный коктейль';
  
  // Создаем новое современное уведомление
  console.log('🎨 Создаем новое уведомление с параметрами:', { config, cocktailName });
  
  const notification = document.createElement('div');
  notification.className = `status-update-notification ${config.class}`;
  
  // Добавляем информацию о позиции в очереди для активных заказов
  let queueInfo = '';
  if (orderData.queuePosition && ['confirmed', 'preparing', 'ready'].includes(newStatus)) {
    const estimatedMinutes = orderData.queuePosition * 3;
    queueInfo = `
      <div class="notification-queue-info">
        <div class="queue-position">
          <i class="fas fa-list-ol"></i>
          <span>Позиция в очереди: #${orderData.queuePosition}</span>
        </div>
        <div class="queue-time">~${estimatedMinutes} мин</div>
      </div>
    `;
  }
  
  notification.innerHTML = `
    <div class="notification-content">
      <div class="notification-icon">
        <i class="${config.icon}"></i>
      </div>
      <div class="notification-body">
        <div class="notification-title">${config.title}</div>
        <div class="notification-subtitle">${config.subtitle}</div>
        ${queueInfo}
      </div>
      <button class="notification-close" onclick="hideNotification(this.parentElement.parentElement)">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="notification-progress-bar">
      <div class="notification-progress-fill"></div>
    </div>
  `;
  
  console.log('📝 HTML уведомления создан:', notification.innerHTML);
  
  // Добавляем стили для содержимого - КРАСИВЫЙ НОВЫЙ ДИЗАЙН
  const content = notification.querySelector('.notification-content');
  content.style.cssText = `
    display: flex !important;
    align-items: center !important;
    gap: 1rem !important;
    width: 100% !important;
    padding: 2rem 2.5rem !important;
    position: relative !important;
    z-index: 2 !important;
    visibility: visible !important;
    opacity: 1 !important;
  `;
  
  // Иконка убрана - эмодзи теперь в заголовке
  
  const text = notification.querySelector('.notification-body');
  if (text) {
    text.style.cssText = `
      flex: 1 !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 0.4rem !important;
      visibility: visible !important;
      opacity: 1 !important;
    `;
  }
  
  const title = notification.querySelector('.notification-title');
  if (title) {
    // Определяем тему для правильного цвета текста
    const isDarkTheme = document.body.classList.contains('dark-theme');
    const titleColor = isDarkTheme ? 'white' : '#2d3748';
    const textShadow = isDarkTheme ? '0 2px 4px rgba(0, 0, 0, 0.3)' : '0 1px 2px rgba(0, 0, 0, 0.1)';
    
    title.style.cssText = `
      font-weight: 700 !important;
      font-size: 1.4rem !important;
      line-height: 1.3 !important;
      color: ${titleColor} !important;
      font-family: 'Inter', sans-serif !important;
      letter-spacing: 0.01em !important;
      text-shadow: ${textShadow} !important;
      visibility: visible !important;
      opacity: 1 !important;
      margin-bottom: 0 !important;
      display: flex !important;
      align-items: center !important;
    `;
  }
  
  // Стили для эмодзи в заголовке
  const emojiElement = notification.querySelector('.notification-title .emoji');
  if (emojiElement) {
    emojiElement.style.cssText = `
      font-size: 1.6em !important;
      margin-right: 0.5em !important;
      display: inline-block !important;
      animation: bounce 2s ease-in-out infinite !important;
      line-height: 1 !important;
      vertical-align: middle !important;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important;
    `;
  }
  
  // Элемент cocktail удален из HTML
  
  const status = notification.querySelector('.notification-subtitle');
  if (status) {
    // Определяем тему для правильного цвета текста
    const isDarkTheme = document.body.classList.contains('dark-theme');
    const subtitleColor = isDarkTheme ? 'rgba(255, 255, 255, 0.9)' : 'rgba(45, 55, 72, 0.8)';
    
    status.style.cssText = `
      font-weight: 500 !important;
      font-size: 1rem !important;
      line-height: 1.4 !important;
      visibility: visible !important;
      opacity: 0.9 !important;
      color: ${subtitleColor} !important;
      text-transform: none !important;
      font-family: 'Inter', sans-serif !important;
    `;
  }
  
  const closeBtn = notification.querySelector('.notification-close');
  if (closeBtn) {
    // Определяем тему для правильного цвета кнопки
    const isDarkTheme = document.body.classList.contains('dark-theme');
    const closeBtnBg = isDarkTheme ? 'rgba(255, 255, 255, 0.2)' : 'rgba(45, 55, 72, 0.1)';
    const closeBtnBorder = isDarkTheme ? 'rgba(255, 255, 255, 0.3)' : 'rgba(45, 55, 72, 0.2)';
    const closeBtnColor = isDarkTheme ? 'white' : '#2d3748';
    const closeBtnShadow = isDarkTheme ? '0 4px 15px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.1)';
    
    closeBtn.style.cssText = `
      background: ${closeBtnBg} !important;
      border: 1px solid ${closeBtnBorder} !important;
      color: ${closeBtnColor} !important;
      cursor: pointer !important;
      padding: 0.6rem !important;
      border-radius: 50% !important;
      opacity: 0.8 !important;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 40px !important;
      height: 40px !important;
      font-size: 1.1rem !important;
      backdrop-filter: blur(10px) !important;
      box-shadow: ${closeBtnShadow} !important;
      visibility: visible !important;
    `;
  }
  
  if (closeBtn) {
    const isDarkTheme = document.body.classList.contains('dark-theme');
    
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.opacity = '1';
      closeBtn.style.background = isDarkTheme ? 'rgba(255, 255, 255, 0.3)' : 'rgba(45, 55, 72, 0.2)';
      closeBtn.style.borderColor = isDarkTheme ? 'rgba(255, 255, 255, 0.5)' : 'rgba(45, 55, 72, 0.3)';
      closeBtn.style.transform = 'scale(1.1) rotate(90deg)';
      closeBtn.style.color = isDarkTheme ? 'white' : '#2d3748';
      closeBtn.style.boxShadow = isDarkTheme ? '0 6px 20px rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.15)';
    });
    
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.opacity = '0.8';
      closeBtn.style.background = isDarkTheme ? 'rgba(255, 255, 255, 0.2)' : 'rgba(45, 55, 72, 0.1)';
      closeBtn.style.borderColor = isDarkTheme ? 'rgba(255, 255, 255, 0.3)' : 'rgba(45, 55, 72, 0.2)';
      closeBtn.style.transform = 'scale(1) rotate(0deg)';
      closeBtn.style.color = isDarkTheme ? 'white' : '#2d3748';
      closeBtn.style.boxShadow = isDarkTheme ? '0 4px 15px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.1)';
    });
  }
  
  // Прогресс-бар удален в новом дизайне
  
  document.body.appendChild(notification);
  console.log('✅ Уведомление добавлено в DOM');
  
  // Уведомление готово
  console.log('🎨 Уведомление создано без иконки');
  
  // Проверяем, что уведомление действительно видимо
  setTimeout(() => {
    const rect = notification.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(notification);
    console.log('🔍 Проверка видимости уведомления:', {
      element: notification,
      rect: rect,
      display: computedStyle.display,
      visibility: computedStyle.visibility,
      opacity: computedStyle.opacity,
      zIndex: computedStyle.zIndex,
      position: computedStyle.position,
      top: computedStyle.top,
      right: computedStyle.right,
      width: computedStyle.width,
      height: computedStyle.height
    });
    
    // Проверяем, есть ли уведомление в DOM
    const foundNotification = document.querySelector('.status-update-notification');
    console.log('🔍 Найдено уведомлений в DOM:', document.querySelectorAll('.status-update-notification').length);
    console.log('🔍 Последнее уведомление:', foundNotification);
  }, 100);
  
  // Звуковое уведомление (если поддерживается и разрешено)
  if (typeof Audio !== 'undefined' && audioContextEnabled) {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Проверяем состояние AudioContext
      if (audioContext.state === 'suspended') {
        // Пытаемся возобновить контекст (требует пользовательского взаимодействия)
        audioContext.resume().then(() => {
          playNotificationSound(audioContext, newStatus);
        }).catch(() => {
          console.log('Звуковое уведомление заблокировано браузером');
        });
      } else {
        playNotificationSound(audioContext, newStatus);
      }
    } catch (e) {
      console.log('Звуковое уведомление недоступно:', e.message);
    }
  } else if (!audioContextEnabled) {
    // Активируем звук при первом пользовательском взаимодействии
    enableAudioOnUserInteraction();
  }
  
  // Вибрация (если поддерживается и разрешена)
  if (navigator.vibrate && 'vibrate' in navigator) {
    try {
      // Разные паттерны вибрации для разных статусов
      let vibrationPattern = [200, 100, 200]; // Стандартный паттерн
      
      switch(newStatus) {
        case 'confirmed':
          vibrationPattern = [100, 50, 100]; // Короткая радостная вибрация
          break;
        case 'preparing':
          vibrationPattern = [300, 100, 300]; // Долгая вибрация
          break;
        case 'ready':
          vibrationPattern = [150, 50, 150, 50, 150]; // Серия коротких
          break;
        case 'completed':
          vibrationPattern = [200, 100, 200, 100, 200]; // Торжественная серия
          break;
        case 'cancelled':
          vibrationPattern = [500]; // Одна долгая вибрация
          break;
      }
      
      navigator.vibrate(vibrationPattern);
      console.log(`📳 Вибрация для статуса ${newStatus}:`, vibrationPattern);
    } catch (e) {
      console.log('Вибрация заблокирована браузером:', e.message);
    }
  }
  
  // Определяем время отображения уведомления в зависимости от статуса
  const durationConfig = {
    'confirmed': 8000,    // 8 секунд - важное уведомление о подтверждении
    'preparing': 6000,    // 6 секунд - уведомление о начале приготовления
    'ready': 10000,       // 10 секунд - важное уведомление о готовности
    'completed': 12000,   // 12 секунд - финальное уведомление
    'cancelled': 8000     // 8 секунд - важное уведомление об отмене
  };
  
  const duration = durationConfig[newStatus] || 6000; // По умолчанию 6 секунд
  
  console.log(`⏰ Уведомление будет автоматически скрыто через ${duration/1000} секунд`);
  
  // Запускаем анимацию прогресс-бара с JavaScript
  const progressFill = notification.querySelector('.notification-progress-fill');
  if (progressFill) {
    progressFill.style.width = '0%';
    progressFill.style.transition = 'none'; // Отключаем CSS transition
    
    // JavaScript анимация прогресс-бара
    const startTime = Date.now();
    const animateProgress = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const width = progress * 100;
      
      progressFill.style.width = `${width}%`;
      
      if (progress < 1) {
        requestAnimationFrame(animateProgress);
      }
    };
    
    // Запускаем анимацию через небольшую задержку
    setTimeout(() => {
      requestAnimationFrame(animateProgress);
    }, 100);
  }
  
  // Автоматическое удаление уведомления с более надежным подходом
  console.log(`⏰ Запускаем таймер на ${duration}ms для автоматического удаления`);
  
  const startTime = Date.now();
  
  const autoHideTimer = setInterval(() => {
    const elapsed = Date.now() - startTime;
    
    if (elapsed >= duration) {
      clearInterval(autoHideTimer);
      
      if (notification.parentNode) {
        console.log('🗑️ Автоматически скрываем уведомление (таймер сработал)');
        
        // Добавляем класс для анимации исчезновения
        notification.classList.add('notification-hiding');
        
        // Применяем анимацию исчезновения
        notification.style.animation = 'notificationSlideOut 0.6s ease forwards';
        
        // Удаляем уведомление после завершения анимации
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
            console.log('✅ Уведомление удалено из DOM');
          }
        }, 600);
      } else {
        console.log('⚠️ Уведомление уже было удалено');
      }
    }
  }, 100); // Проверяем каждые 100мс
  
  // Сохраняем ссылку на таймер для возможной отмены
  notification._autoHideTimer = autoHideTimer;
}

// Функция для скрытия уведомления с анимацией
function hideNotification(notification) {
  if (!notification || !notification.parentNode) return;
  
  console.log('🗑️ Скрываем уведомление вручную');
  
  // Отменяем автоматический таймер, если он есть
  if (notification._autoHideTimer) {
    clearInterval(notification._autoHideTimer);
    console.log('⏰ Автоматический таймер отменен');
  }
  
  // Добавляем класс для анимации исчезновения
  notification.classList.add('notification-hiding');
  
  // Применяем анимацию исчезновения
  notification.style.animation = 'notificationSlideOut 0.6s ease forwards';
  
  // Удаляем уведомление после завершения анимации
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
      console.log('✅ Уведомление удалено из DOM');
    }
  }, 600);
}

// Вспомогательная функция для изменения цвета
function adjustColor(color, amount) {
  const usePound = color[0] === '#';
  const col = usePound ? color.slice(1) : color;
  const num = parseInt(col, 16);
  let r = (num >> 16) + amount;
  let g = (num >> 8 & 0x00FF) + amount;
  let b = (num & 0x0000FF) + amount;
  r = r > 255 ? 255 : r < 0 ? 0 : r;
  g = g > 255 ? 255 : g < 0 ? 0 : g;
  b = b > 255 ? 255 : b < 0 ? 0 : b;
  return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
}

// Функция для активации звука при первом пользовательском взаимодействии
function enableAudioOnUserInteraction() {
  if (audioContextEnabled) return;
  
  const enableAudio = () => {
    audioContextEnabled = true;
    console.log('🔊 Звук активирован пользовательским взаимодействием');
    
    // Удаляем слушатели после активации
    document.removeEventListener('click', enableAudio);
    document.removeEventListener('keydown', enableAudio);
    document.removeEventListener('touchstart', enableAudio);
  };
  
  // Добавляем слушатели для различных типов взаимодействия
  document.addEventListener('click', enableAudio, { once: true });
  document.addEventListener('keydown', enableAudio, { once: true });
  document.addEventListener('touchstart', enableAudio, { once: true });
}

// Функция для воспроизведения звука уведомления
function playNotificationSound(audioContext, status = 'default') {
  try {
    // Создаем разные звуки для разных статусов
    let frequencies = [];
    let duration = 0.2;
    
    switch(status) {
      case 'confirmed':
        // Приятный восходящий звук
        frequencies = [400, 600, 800];
        duration = 0.3;
        break;
      case 'preparing':
        // Средний тон
        frequencies = [500, 700];
        duration = 0.25;
        break;
      case 'ready':
        // Радостный звук
        frequencies = [600, 800, 1000, 800];
        duration = 0.4;
        break;
      case 'completed':
        // Торжественный звук
        frequencies = [800, 1000, 1200, 1000, 800];
        duration = 0.5;
        break;
      case 'cancelled':
        // Нисходящий звук
        frequencies = [800, 600, 400];
        duration = 0.3;
        break;
      default:
        // Стандартный звук
        frequencies = [600, 800];
        duration = 0.2;
    }
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Устанавливаем тип волны
    oscillator.type = 'sine';
    
    // Создаем мелодию из частот
    const timeStep = duration / frequencies.length;
    frequencies.forEach((freq, index) => {
      const time = audioContext.currentTime + (index * timeStep);
      oscillator.frequency.setValueAtTime(freq, time);
    });
    
    // Настройка громкости
    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
    
    console.log(`🔊 Воспроизведен звук для статуса: ${status}`);
  } catch (e) {
    console.log('Ошибка воспроизведения звука:', e.message);
  }
}

// Уведомление об обновлении статуса для админов - НОВЫЙ ДИЗАЙН
function showAdminStatusUpdateNotification() {
  // Создаем временное уведомление для админа
  const notification = document.createElement('div');
  notification.className = 'admin-status-update-notification';
  notification.innerHTML = `
    <div class="notification-content">
      <div class="notification-text">
        <div class="notification-title">
          <span class="emoji">🔔</span> Обновление через Telegram
        </div>
        <div class="notification-subtitle">
          <span class="emoji">📱</span> Статус заказа изменен
        </div>
      </div>
      <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="notification-progress"></div>
  `;
  
  // Добавляем стили для уведомления - КРАСИВЫЙ НОВЫЙ ДИЗАЙН
  notification.style.cssText = `
    position: fixed !important;
    top: 20px !important;
    right: 20px !important;
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%) !important;
    color: white !important;
    border-radius: 20px !important;
    box-shadow: 
      0 20px 60px rgba(0, 0, 0, 0.15),
      0 8px 25px rgba(0, 0, 0, 0.1),
      0 0 0 1px rgba(255, 255, 255, 0.2) !important;
    z-index: 10000 !important;
    animation: notificationSlideIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
    display: flex !important;
    flex-direction: column !important;
    font-family: 'Inter', sans-serif !important;
    font-weight: 500 !important;
    min-width: 380px !important;
    max-width: 480px !important;
    backdrop-filter: blur(20px) !important;
    border: 1px solid rgba(255, 255, 255, 0.3) !important;
    overflow: hidden !important;
  `;
  
  // Добавляем стили для содержимого админского уведомления
  const content = notification.querySelector('.notification-content');
  content.style.cssText = `
    display: flex !important;
    align-items: center !important;
    gap: 1rem !important;
    width: 100% !important;
    padding: 2rem 2.5rem !important;
    position: relative !important;
    z-index: 2 !important;
  `;
  
  const text = notification.querySelector('.notification-text');
  text.style.cssText = `
    flex: 1 !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 0.4rem !important;
  `;
  
  const title = notification.querySelector('.notification-title');
  title.style.cssText = `
    font-weight: 700 !important;
    font-size: 1.4rem !important;
    line-height: 1.3 !important;
    color: white !important;
    font-family: 'Inter', sans-serif !important;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important;
    display: flex !important;
    align-items: center !important;
  `;
  
  const subtitle = notification.querySelector('.notification-subtitle');
  subtitle.style.cssText = `
    font-weight: 500 !important;
    font-size: 1rem !important;
    line-height: 1.4 !important;
    color: rgba(255, 255, 255, 0.9) !important;
    font-family: 'Inter', sans-serif !important;
    display: flex !important;
    align-items: center !important;
  `;
  
  // Стили для эмодзи в админских уведомлениях
  const emojis = notification.querySelectorAll('.emoji');
  emojis.forEach(emoji => {
    emoji.style.cssText = `
      font-size: 1.4em !important;
      margin-right: 0.4em !important;
      display: inline-block !important;
      animation: bounce 2s ease-in-out infinite !important;
      line-height: 1 !important;
      vertical-align: middle !important;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important;
    `;
  });
  
  const closeBtn = notification.querySelector('.notification-close');
  closeBtn.style.cssText = `
    background: rgba(255, 255, 255, 0.2) !important;
    border: 1px solid rgba(255, 255, 255, 0.3) !important;
    color: white !important;
    cursor: pointer !important;
    padding: 0.6rem !important;
    border-radius: 50% !important;
    opacity: 0.8 !important;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 40px !important;
    height: 40px !important;
    font-size: 1.1rem !important;
    backdrop-filter: blur(10px) !important;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2) !important;
  `;
  
  // Прогресс-бар для админского уведомления
  const progress = notification.querySelector('.notification-progress');
  progress.style.cssText = `
    position: absolute !important;
    bottom: 0 !important;
    left: 0 !important;
    height: 3px !important;
    background: linear-gradient(90deg, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.8)) !important;
    background-size: 200% 100% !important;
    width: 100% !important;
    animation: progressBar 5000ms linear, shimmer 2s ease-in-out infinite !important;
    border-radius: 0 0 20px 20px !important;
  `;

  document.body.appendChild(notification);
  
  // Удаляем уведомление через 5 секунд с анимацией "уезжания направо"
  setTimeout(() => {
    notification.style.animation = 'notificationSlideOut 0.6s ease';
    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 600);
  }, 5000);
}

// === ФУНКЦИИ МОНИТОРИНГА WEBHOOK СЕРВЕРА ===

// Проверка статуса webhook сервера
async function checkWebhookServerStatus() {
  try {
    // Убираем лишние слеши из URL
    const baseUrl = WEBHOOK_SERVER_URL.replace(/\/+$/, ''); // Убираем слеши в конце
    const response = await fetch(`${baseUrl}/health`);
    
    if (!response.ok) {
      console.warn(`⚠️ HTTP ${response.status}: ${response.statusText}`);
      return { status: 'offline', error: `HTTP ${response.status}: ${response.statusText}` };
    }
    
    const data = await response.json();
    
    if (data.status === 'OK') {
      console.log('✅ Webhook сервер работает:', data);
      return { status: 'online', data };
    } else {
      console.warn('⚠️ Webhook сервер отвечает, но статус не OK:', data);
      return { status: 'warning', data };
    }
  } catch (error) {
    console.error('❌ Webhook сервер недоступен:', error);
    return { status: 'offline', error: error.message };
  }
}

// Проверка Firebase через webhook сервер
async function checkWebhookFirebase() {
  try {
    // Убираем лишние слеши из URL
    const baseUrl = WEBHOOK_SERVER_URL.replace(/\/+$/, ''); // Убираем слеши в конце
    const response = await fetch(`${baseUrl}/test-firebase`);
    
    if (!response.ok) {
      console.warn(`⚠️ HTTP ${response.status}: ${response.statusText}`);
      return { status: 'offline', error: `HTTP ${response.status}: ${response.statusText}` };
    }
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Firebase через webhook работает:', data);
      return { status: 'online', data };
    } else {
      console.warn('⚠️ Firebase через webhook не работает:', data);
      return { status: 'error', data };
    }
  } catch (error) {
    console.error('❌ Ошибка проверки Firebase через webhook:', error);
    return { status: 'offline', error: error.message };
  }
}

// Проверка webhook в Telegram
async function checkTelegramWebhook() {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`);
    const data = await response.json();
    
    console.log('📡 Ответ от Telegram API:', data);
    
    if (data.ok) {
      if (data.result.url && data.result.url !== '') {
        console.log('✅ Telegram webhook настроен:', data.result.url);
        return { status: 'online', data: data.result };
      } else {
        console.warn('⚠️ Telegram webhook не настроен (пустой URL)');
        return { status: 'warning', data: data.result, error: 'Webhook URL пустой - нажмите "Настроить Webhook"' };
      }
    } else {
      console.warn('⚠️ Ошибка Telegram API:', data.description);
      return { status: 'error', data, error: data.description };
    }
  } catch (error) {
    console.error('❌ Ошибка проверки Telegram webhook:', error);
    return { status: 'offline', error: error.message };
  }
}

// Обновление статуса заказа через webhook сервер
async function updateOrderStatusViaWebhook(orderId, newStatus) {
  try {
    // Создаем тестовый callback для webhook сервера
    const callbackData = `${newStatus}_${orderId}`;
    
    const response = await fetch(`${WEBHOOK_SERVER_URL}/telegram-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        callback_query: {
          id: `test_${Date.now()}`,
          data: callbackData,
          message: {
            message_id: 1
          },
          from: {
            username: 'admin',
            first_name: 'Admin'
          }
        }
      })
    });
    
    if (response.ok) {
      console.log('✅ Статус заказа обновлен через webhook:', orderId, newStatus);
      return { success: true };
    } else {
      console.error('❌ Ошибка обновления статуса через webhook:', response.status);
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    console.error('❌ Ошибка отправки на webhook сервер:', error);
    return { success: false, error: error.message };
  }
}

// Отправка уведомления об изменении статуса в Telegram
async function sendStatusUpdateToTelegram(orderId, newStatus, orderName, userName) {
  try {
    const statusEmojis = {
      'confirmed': '✅',
      'preparing': '👨‍🍳',
      'ready': '🍸',
      'completed': '🎉',
      'cancelled': '❌'
    };
    
    const statusTexts = {
      'confirmed': 'Подтвержден',
      'preparing': 'Готовится',
      'ready': 'Готов',
      'completed': 'Выполнен',
      'cancelled': 'Отменен'
    };
    
    const emoji = statusEmojis[newStatus] || '📝';
    const statusText = statusTexts[newStatus] || newStatus;
    
    const message = `
${emoji} *Статус заказа обновлен*

🍸 *Коктейль:* ${orderName}
👤 *Клиент:* ${userName}
📊 *Новый статус:* ${statusText}
🕒 *Время:* ${new Date().toLocaleString('ru-RU')}
🆔 *ID заказа:* ${orderId}
    `.trim();
    
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    });
    
    if (response.ok) {
      console.log('✅ Уведомление о статусе отправлено в Telegram');
      return { success: true };
    } else {
      console.error('❌ Ошибка отправки уведомления в Telegram:', response.status);
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    console.error('❌ Ошибка отправки уведомления в Telegram:', error);
    return { success: false, error: error.message };
  }
}

// Мониторинг системы (вызывается периодически)
async function monitorSystem() {
  console.log('🔍 Проверка системы...');
  
  const [serverStatus, firebaseStatus, webhookStatus] = await Promise.all([
    checkWebhookServerStatus(),
    checkWebhookFirebase(),
    checkTelegramWebhook()
  ]);
  
  // Логируем результаты
  console.log('📊 Статус системы:', {
    server: serverStatus.status,
    firebase: firebaseStatus.status,
    webhook: webhookStatus.status
  });
  
  // Если есть проблемы, показываем уведомление
  if (serverStatus.status === 'offline' || firebaseStatus.status === 'offline' || webhookStatus.status === 'offline') {
    console.warn('⚠️ Обнаружены проблемы с системой');
    // Можно добавить визуальное уведомление
  }
  
  return { serverStatus, firebaseStatus, webhookStatus };
}

// Отображение статуса системы в админ-панели
function displaySystemStatus(statusData) {
  if (!systemStatus) return;
  
  const { serverStatus, firebaseStatus, webhookStatus } = statusData;
  
  systemStatus.innerHTML = `
    <div class="status-item ${serverStatus.status}">
      <div class="status-header">
        <div class="status-title">🌐 Webhook Сервер</div>
        <div class="status-indicator ${serverStatus.status}">${getMonitoringStatusText(serverStatus.status)}</div>
      </div>
      <div class="status-details">
        ${serverStatus.status === 'online' ? 
          `✅ Сервер работает<br>URL: ${WEBHOOK_SERVER_URL}` : 
          `❌ Сервер недоступен<br>Ошибка: ${serverStatus.error || 'Неизвестная ошибка'}`
        }
      </div>
    </div>
    
    <div class="status-item ${firebaseStatus.status}">
      <div class="status-header">
        <div class="status-title">🔥 Firebase (через webhook)</div>
        <div class="status-indicator ${firebaseStatus.status}">${getMonitoringStatusText(firebaseStatus.status)}</div>
      </div>
      <div class="status-details">
        ${firebaseStatus.status === 'online' ? 
          `✅ Firebase подключен<br>Проект: ${firebaseStatus.data?.projectId || 'bar-menu-6145c'}` : 
          `❌ Firebase недоступен<br>Ошибка: ${firebaseStatus.error || 'Неизвестная ошибка'}`
        }
      </div>
    </div>
    
    <div class="status-item ${webhookStatus.status}">
      <div class="status-header">
        <div class="status-title">📱 Telegram Webhook</div>
        <div class="status-indicator ${webhookStatus.status}">${getMonitoringStatusText(webhookStatus.status)}</div>
      </div>
      <div class="status-details">
        ${webhookStatus.status === 'online' ? 
          `✅ Webhook настроен<br>URL: ${webhookStatus.data?.url || 'Неизвестно'}` : 
          `❌ Webhook не настроен<br>Ошибка: ${webhookStatus.error || 'Неизвестная ошибка'}`
        }
      </div>
    </div>
  `;
}

// Получение текста статуса для мониторинга
function getMonitoringStatusText(status) {
  switch(status) {
    case 'online': return 'Онлайн';
    case 'warning': return 'Предупреждение';
    case 'error': return 'Ошибка';
    case 'offline': return 'Офлайн';
    default: return 'Неизвестно';
  }
}

// Тест webhook сервера
async function testWebhookServer() {
  try {
    // Тестируем callback_query напрямую
    const testCallback = {
      callback_query: {
        id: `test_${Date.now()}`,
        from: {
          id: 123456789,
          is_bot: false,
          first_name: 'Test Admin',
          username: 'testadmin'
        },
        message: {
          message_id: 1,
          from: {
            id: 123456789,
            is_bot: true,
            first_name: 'Asafiev Bar Bot',
            username: 'asafiev_bar_bot'
          },
          chat: {
            id: parseInt(TELEGRAM_CHAT_ID),
            type: 'private'
          },
          date: Math.floor(Date.now() / 1000),
          text: 'Тестовое сообщение'
        },
        data: 'confirmed_test_order_123'
      }
    };
    
    const response = await fetch(`${WEBHOOK_SERVER_URL}/telegram-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testCallback)
    });
    
    const result = await response.text();
    console.log('📤 Ответ webhook сервера:', response.status, result);
    
    if (response.ok) {
      showSuccess('✅ Webhook сервер работает корректно! Проверьте логи сервера.');
    } else {
      showError(`❌ Ошибка webhook сервера: ${response.status} - ${result}`);
    }
  } catch (error) {
    showError(`❌ Ошибка тестирования webhook: ${error.message}`);
  }
}

// === ФУНКЦИИ УПРАВЛЕНИЯ TELEGRAM ===

// Настройка webhook для Telegram
async function setupTelegramWebhook() {
  try {
    // Проверяем, что у нас есть правильный URL
    if (WEBHOOK_SERVER_URL.includes('localhost') || WEBHOOK_SERVER_URL.includes('your-railway-app')) {
      showError('❌ Необходимо настроить URL webhook сервера!');
      showError('📝 Используйте кнопку "Настроить URL сервера" в админ панели');
      showError('💡 Введите ваш Railway URL (например: https://your-app.railway.app)');
      return;
    }
    
    const webhookUrl = `${WEBHOOK_SERVER_URL.replace(/\/+$/, '')}/telegram-webhook`;
    console.log('🔗 Настраиваем webhook для URL:', webhookUrl);
    
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query']
      })
    });
    
    const data = await response.json();
    console.log('📡 Ответ от Telegram API:', data);
    
    if (data.ok) {
      showSuccess('✅ Webhook успешно настроен!');
      showSuccess(`🔗 URL: ${webhookUrl}`);
      displayTelegramInfo();
      
      // Автоматически проверяем систему после настройки webhook
      setTimeout(async () => {
        const statusData = await monitorSystem();
        displaySystemStatus(statusData);
      }, 1000);
    } else {
      showError(`❌ Ошибка настройки webhook: ${data.description}`);
      console.error('❌ Детали ошибки:', data);
    }
  } catch (error) {
    showError(`❌ Ошибка настройки webhook: ${error.message}`);
    console.error('❌ Полная ошибка:', error);
  }
}

// Удаление webhook
async function deleteTelegramWebhook() {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        drop_pending_updates: true
      })
    });
    
    const data = await response.json();
    
    if (data.ok) {
      showSuccess('✅ Webhook успешно удален!');
      displayTelegramInfo();
    } else {
      showError(`❌ Ошибка удаления webhook: ${data.description}`);
    }
  } catch (error) {
    showError(`❌ Ошибка удаления webhook: ${error.message}`);
  }
}

// Получение информации о webhook
async function getTelegramWebhookInfo() {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`);
    const data = await response.json();
    
    if (data.ok) {
      displayTelegramInfo(data.result);
    } else {
      showError(`❌ Ошибка получения информации: ${data.description}`);
    }
  } catch (error) {
    showError(`❌ Ошибка получения информации: ${error.message}`);
  }
}

// Отправка тестового сообщения
async function sendTestMessage() {
  try {
    const message = `
🧪 *Тестовое сообщение от Asafiev Bar*

✅ Webhook сервер работает
✅ Firebase подключен
✅ Telegram бот активен

🕒 Время: ${new Date().toLocaleString('ru-RU')}
🌐 Сервер: ${WEBHOOK_SERVER_URL}
    `.trim();
    
    // Создаем тестовые кнопки
    const testKeyboard = {
      inline_keyboard: [
        [
          { text: "🧪 Тест кнопка 1", callback_data: "test_button_1" },
          { text: "🧪 Тест кнопка 2", callback_data: "test_button_2" }
        ],
        [
          { text: "✅ Система работает", callback_data: "system_ok" }
        ]
      ]
    };
    
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
        reply_markup: testKeyboard
      })
    });
    
    const data = await response.json();
    
    if (data.ok) {
      showSuccess('✅ Тестовое сообщение с кнопками отправлено!');
    } else {
      showError(`❌ Ошибка отправки сообщения: ${data.description}`);
    }
  } catch (error) {
    showError(`❌ Ошибка отправки сообщения: ${error.message}`);
  }
}

// Отображение информации о Telegram
function displayTelegramInfo(webhookInfo = null) {
  if (!telegramStatus) return;
  
  if (!webhookInfo) {
    telegramStatus.innerHTML = `
      <div class="telegram-info">
        <h5>📱 Информация о Telegram боте</h5>
        <p><strong>Токен бота:</strong> <code>${TELEGRAM_BOT_TOKEN.substring(0, 10)}...</code></p>
        <p><strong>Chat ID:</strong> <code>${TELEGRAM_CHAT_ID}</code></p>
        <p><strong>Webhook URL:</strong> <code>${WEBHOOK_SERVER_URL}/telegram-webhook</code></p>
        <p><em>Нажмите "Информация о Webhook" для получения актуальных данных</em></p>
      </div>
    `;
    return;
  }
  
  const hasWebhook = webhookInfo.url && webhookInfo.url.length > 0;
  const webhookStatus = hasWebhook ? '✅ Настроен' : '❌ Не настроен';
  const webhookUrl = hasWebhook ? webhookInfo.url : 'Не установлен';
  
  telegramStatus.innerHTML = `
    <div class="telegram-info">
      <h5>📱 Информация о Telegram боте</h5>
      <p><strong>Токен бота:</strong> <code>${TELEGRAM_BOT_TOKEN.substring(0, 10)}...</code></p>
      <p><strong>Chat ID:</strong> <code>${TELEGRAM_CHAT_ID}</code></p>
      <p><strong>Статус webhook:</strong> ${webhookStatus}</p>
      <p><strong>Webhook URL:</strong> <code>${webhookUrl}</code></p>
      ${hasWebhook ? `
        <p><strong>Последняя ошибка:</strong> ${webhookInfo.last_error_message || 'Нет ошибок'}</p>
        <p><strong>Количество ошибок:</strong> ${webhookInfo.pending_update_count || 0}</p>
        <p><strong>Максимум соединений:</strong> ${webhookInfo.max_connections || 'Не указано'}</p>
      ` : ''}
    </div>
  `;
}

// === КОНЕЦ ФУНКЦИЙ МОНИТОРИНГА ===

// === ФУНКЦИИ ДЛЯ ТЕСТИРОВАНИЯ УВЕДОМЛЕНИЙ ===

// Функция для тестирования уведомлений (для разработки)
function testNotifications() {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.log('❌ Пользователь не авторизован. Войдите в систему для тестирования уведомлений.');
    return;
  }
  
  const testOrders = [
    { id: 'test1', name: 'Мохито', user: 'Иван Петров', userId: currentUser.uid, status: 'confirmed' },
    { id: 'test2', name: 'Космополитен', user: 'Мария Сидорова', userId: currentUser.uid, status: 'preparing' },
    { id: 'test3', name: 'Маргарита', user: 'Алексей Козлов', userId: currentUser.uid, status: 'ready' },
    { id: 'test4', name: 'Пина Колада', user: 'Елена Волкова', userId: currentUser.uid, status: 'completed' },
    { id: 'test5', name: 'Белый Русский', user: 'Дмитрий Соколов', userId: currentUser.uid, status: 'cancelled' }
  ];
  
  console.log('🧪 Тестирование уведомлений...');
  
  testOrders.forEach((order, index) => {
    setTimeout(() => {
      showStatusUpdateNotification(order, order.status);
      console.log(`✅ Показано уведомление: ${order.name} - ${order.status}`);
    }, index * 2000); // Показываем каждое уведомление через 2 секунды
  });
}

// Функция для тестирования новых уведомлений
function testNewNotifications() {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.log('❌ Пользователь не авторизован. Войдите в систему для тестирования уведомлений.');
    return;
  }
  
  const testOrders = [
    { id: 'test1', name: 'Мохито', user: 'Иван Петров', userId: currentUser.uid, status: 'confirmed' },
    { id: 'test2', name: 'Космополитен', user: 'Мария Сидорова', userId: currentUser.uid, status: 'preparing' },
    { id: 'test3', name: 'Маргарита', user: 'Алексей Козлов', userId: currentUser.uid, status: 'ready' },
    { id: 'test4', name: 'Пина Колада', user: 'Елена Волкова', userId: currentUser.uid, status: 'completed' },
    { id: 'test5', name: 'Белый Русский', user: 'Дмитрий Соколов', userId: currentUser.uid, status: 'cancelled' }
  ];
  
  console.log('🧪 Тестирование новых уведомлений...');
  
  testOrders.forEach((order, index) => {
    setTimeout(() => {
      showStatusUpdateNotification(order, order.status);
      console.log(`✅ Показано новое уведомление: ${order.name} - ${order.status}`);
    }, index * 3000); // Показываем каждое уведомление через 3 секунды
  });
}

// Функция для тестирования модальных окон из админ-панели
function testModalLayers() {
  console.log('🧪 Тестирование слоев модальных окон...');
  
  // Сначала открываем админ-панель
  if (adminPanel) {
    openModal(adminPanel);
    console.log('✅ Открыта админ-панель (z-index: 3000)');
    
    // Через 2 секунды открываем форму коктейля поверх админ-панели
    setTimeout(() => {
      if (cocktailFormModal) {
        openModal(cocktailFormModal);
        console.log('✅ Открыта форма коктейля поверх админ-панели (z-index: 3001)');
        
        // Через 3 секунды закрываем форму
        setTimeout(() => {
          closeModal(cocktailFormModal);
          console.log('✅ Закрыта форма коктейля');
          
          // Через 1 секунду открываем модальное окно статуса
          setTimeout(() => {
            if (statusModal) {
              openModal(statusModal);
              console.log('✅ Открыто модальное окно статуса поверх админ-панели (z-index: 3001)');
              
              // Через 3 секунды закрываем все
              setTimeout(() => {
                closeModal(statusModal);
                closeModal(adminPanel);
                console.log('✅ Все модальные окна закрыты');
              }, 3000);
            }
          }, 1000);
        }, 3000);
      }
    }, 2000);
  }
}

// Функция для тестирования, что уведомления показываются только владельцу заказа
function testUserNotificationTargeting() {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.log('❌ Пользователь не авторизован. Войдите в систему для тестирования.');
    return;
  }
  
  console.log('🧪 Тестирование таргетинга уведомлений...');
  console.log(`👤 Текущий пользователь: ${currentUser.displayName || currentUser.email} (${currentUser.uid})`);
  
  // Тест 1: Уведомление для текущего пользователя (должно показаться)
  const ownOrder = {
    id: 'test_own',
    name: 'Мохито',
    user: currentUser.displayName || 'Текущий пользователь',
    userId: currentUser.uid, // Свой заказ
    status: 'confirmed'
  };
  
  console.log('📤 Тест 1: Уведомление для собственного заказа (должно показаться)');
  showStatusUpdateNotification(ownOrder, 'confirmed');
  
  // Тест 2: Уведомление для другого пользователя (НЕ должно показаться)
  setTimeout(() => {
    const otherUserOrder = {
      id: 'test_other',
      name: 'Космополитен',
      user: 'Другой пользователь',
      userId: 'other_user_id_123', // Чужой заказ
      status: 'preparing'
    };
    
    console.log('📤 Тест 2: Уведомление для чужого заказа (НЕ должно показаться)');
    showStatusUpdateNotification(otherUserOrder, 'preparing');
  }, 2000);
  
  // Тест 3: Уведомление без userId (НЕ должно показаться)
  setTimeout(() => {
    const noUserIdOrder = {
      id: 'test_no_user',
      name: 'Маргарита',
      user: 'Пользователь без ID',
      // userId отсутствует
      status: 'ready'
    };
    
    console.log('📤 Тест 3: Уведомление без userId (НЕ должно показаться)');
    showStatusUpdateNotification(noUserIdOrder, 'ready');
  }, 4000);
  
  console.log('✅ Тесты запущены. Проверьте консоль и уведомления на экране.');
}

// Функция для тестирования исправлений AudioContext и вибрации
function testAudioAndVibration() {
  console.log('🧪 Тестирование исправлений AudioContext и вибрации...');
  console.log(`🔊 Состояние звука: ${audioContextEnabled ? 'активирован' : 'не активирован'}`);
  
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.log('❌ Пользователь не авторизован. Войдите в систему для тестирования.');
    return;
  }
  
  const testOrder = {
    id: 'test_audio',
    name: 'Тестовый коктейль',
    user: currentUser.displayName || 'Тестовый пользователь',
    userId: currentUser.uid,
    status: 'confirmed'
  };
  
  console.log('📤 Показываем тестовое уведомление...');
  showStatusUpdateNotification(testOrder, 'confirmed');
  
  if (!audioContextEnabled) {
    console.log('💡 Кликните в любом месте страницы для активации звука');
  }
}

// Функция для тестирования всех новых красивых уведомлений
function testBeautifulNotifications() {
  console.log('🎨 Тестирование красивых уведомлений с эмодзи...');
  
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.log('❌ Пользователь не авторизован. Войдите в систему для тестирования.');
    return;
  }
  
  const testOrders = [
    { id: 'test1', name: 'Мохито', user: 'Иван Петров', userId: currentUser.uid, status: 'confirmed' },
    { id: 'test2', name: 'Космополитен', user: 'Мария Сидорова', userId: currentUser.uid, status: 'preparing' },
    { id: 'test3', name: 'Маргарита', user: 'Алексей Козлов', userId: currentUser.uid, status: 'ready' },
    { id: 'test4', name: 'Пина Колада', user: 'Елена Волкова', userId: currentUser.uid, status: 'completed' },
    { id: 'test5', name: 'Белый Русский', user: 'Дмитрий Соколов', userId: currentUser.uid, status: 'cancelled' }
  ];
  
  console.log('📤 Показываем все типы красивых уведомлений с эмодзи...');
  
  testOrders.forEach((order, index) => {
    setTimeout(() => {
      showStatusUpdateNotification(order, order.status);
      console.log(`✅ Показано красивое уведомление: ${order.name} - ${order.status}`);
    }, index * 4000); // Показываем каждое уведомление через 4 секунды
  });
  
  console.log('💡 Обратите внимание на:');
  console.log('   - Эмодзи для каждого статуса (✅👨‍🍳🍸🎉❌)');
  console.log('   - Разные цвета для разных статусов');
  console.log('   - Красивые анимации и переходы');
  console.log('   - Разные звуки для каждого статуса');
  console.log('   - Разные паттерны вибрации');
  console.log('   - Улучшенный дизайн и типографику');
}

// Функция для быстрого тестирования уведомления о подтверждении
function testConfirmedNotification() {
  console.log('✅ Тестирование уведомления о подтверждении заказа...');
  
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.log('❌ Пользователь не авторизован. Войдите в систему для тестирования.');
    return;
  }
  
  const testOrder = {
    id: 'test_confirmed',
    name: 'Мохито',
    user: currentUser.displayName || 'Тестовый пользователь',
    userId: currentUser.uid,
    status: 'confirmed'
  };
  
  console.log('📤 Показываем уведомление о подтверждении...');
  showStatusUpdateNotification(testOrder, 'confirmed');
  
  console.log('💡 Проверьте:');
  console.log('   - Эмодзи ✅ должен отображаться в заголовке');
  console.log('   - Текст "Статус заказа обновлен"');
  console.log('   - Название коктейля "Мохито"');
  console.log('   - Статус "подтвержден"');
}

// Функция для тестирования отображения эмодзи
function testEmojiDisplay() {
  console.log('🧪 Тестирование отображения эмодзи...');
  
  const testEmojis = ['✅', '❌', '👨‍🍳', '🍸', '🎉'];
  
  testEmojis.forEach((emoji, index) => {
    setTimeout(() => {
      const notification = document.createElement('div');
      notification.className = 'status-update-notification';
      notification.innerHTML = `
        <div class="notification-content">
          <div class="notification-text">
            <div class="notification-title">${emoji} Тест эмодзи</div>
            <div class="notification-cocktail">"Тестовый коктейль"</div>
            <div class="notification-subtitle">тест</div>
          </div>
          <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="notification-progress"></div>
      `;
      
      // Эмодзи теперь в заголовке
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.remove();
      }, 3000);
      
      console.log(`📱 Тест эмодзи ${index + 1}: ${emoji}`);
    }, index * 1000);
  });
}

// Функция для быстрого тестирования исправленных уведомлений
function testEmojiNotifications() {
  console.log('🎨 Тестирование исправленных уведомлений...');
  
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.log('❌ Пользователь не авторизован. Войдите в систему для тестирования.');
    return;
  }
  
  const testOrder = {
    id: 'test_emoji',
    name: 'Мохито',
    user: currentUser.displayName || 'Тестовый пользователь',
    userId: currentUser.uid,
    status: 'confirmed'
  };
  
  console.log('📤 Показываем уведомление о подтверждении заказа...');
  showStatusUpdateNotification(testOrder, 'confirmed');
  
  setTimeout(() => {
    testOrder.status = 'preparing';
    testOrder.name = 'Космополитен';
    showStatusUpdateNotification(testOrder, 'preparing');
  }, 3000);
  
  setTimeout(() => {
    testOrder.status = 'ready';
    testOrder.name = 'Маргарита';
    showStatusUpdateNotification(testOrder, 'ready');
  }, 6000);
  
  console.log('✅ Тестируем:');
  console.log('   - ✅ Подтверждение заказа');
  console.log('   - 👨‍🍳 Готовится');
  console.log('   - 🍸 Готов');
}

// Функция для диагностики проблемы с уведомлениями
function debugNotificationIssue() {
  console.log('🔍 ДИАГНОСТИКА ПРОБЛЕМЫ С УВЕДОМЛЕНИЯМИ');
  console.log('=' .repeat(50));
  
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.log('❌ Пользователь не авторизован');
    return;
  }
  
  console.log('👤 Пользователь:', currentUser.displayName || currentUser.email);
  console.log('🆔 User ID:', currentUser.uid);
  
  // 1. Проверяем listener
  console.log('\n1️⃣ ПРОВЕРКА LISTENER:');
  console.log('📊 Глобальный listener активен:', !!globalOrdersListener);
  console.log('📊 Отслеживаемых заказов:', lastOrderStatuses.size);
  console.log('📊 Список отслеживаемых заказов:', Array.from(lastOrderStatuses.entries()));
  
  // 2. Проверяем функцию уведомления
  console.log('\n2️⃣ ПРОВЕРКА ФУНКЦИИ УВЕДОМЛЕНИЯ:');
  console.log('📊 showStatusUpdateNotification доступна:', typeof showStatusUpdateNotification === 'function');
  
  // 3. Тестируем уведомление напрямую
  console.log('\n3️⃣ ТЕСТ УВЕДОМЛЕНИЯ:');
  const testOrder = {
    id: 'debug_test',
    name: 'Тестовый коктейль',
    user: currentUser.displayName || 'Тестовый пользователь',
    userId: currentUser.uid,
    status: 'confirmed'
  };
  
  console.log('📤 Показываем тестовое уведомление...');
  showStatusUpdateNotification(testOrder, 'confirmed');
  
  // 4. Проверяем DOM
  console.log('\n4️⃣ ПРОВЕРКА DOM:');
  const notifications = document.querySelectorAll('.status-update-notification');
  console.log('📊 Уведомлений на странице:', notifications.length);
  
  // 5. Проверяем Firebase подключение
  console.log('\n5️⃣ ПРОВЕРКА FIREBASE:');
  console.log('📊 Firebase app:', !!firebase.apps.length);
  console.log('📊 Firestore:', !!db);
  console.log('📊 Auth:', !!auth);
  
  console.log('\n✅ Диагностика завершена. Проверьте результаты выше.');
}

// Функция для принудительной переинициализации listener
function reinitializeListener() {
  console.log('🔄 Принудительная переинициализация listener...');
  
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.log('❌ Пользователь не авторизован');
    return;
  }
  
  // Отключаем текущий listener
  if (globalOrdersListener) {
    console.log('🔄 Отключаем текущий listener');
    globalOrdersListener();
    globalOrdersListener = null;
  }
  
  // Очищаем кэш статусов
  lastOrderStatuses.clear();
  console.log('🧹 Кэш статусов очищен');
  
  // Переинициализируем listener
  console.log('🔄 Переинициализируем listener...');
  initGlobalOrderStatusListener();
  
  console.log('✅ Listener переинициализирован');
}

// Функция для тестирования интеграции Telegram с сайтом
async function testTelegramIntegration() {
  console.log('🧪 Тестирование интеграции Telegram с сайтом...');
  
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.log('❌ Пользователь не авторизован. Войдите в систему для тестирования.');
    return;
  }
  
  // 1. Проверяем статус webhook сервера
  console.log('1️⃣ Проверка webhook сервера...');
  try {
    const response = await fetch(`${WEBHOOK_SERVER_URL}/health`);
    const data = await response.json();
    
    if (data.status === 'OK') {
      console.log('✅ Webhook сервер работает:', data);
    } else {
      console.log('❌ Webhook сервер не работает:', data);
      return;
    }
  } catch (error) {
    console.log('❌ Ошибка подключения к webhook серверу:', error.message);
    return;
  }
  
  // 2. Проверяем Firebase подключение webhook сервера
  console.log('2️⃣ Проверка Firebase подключения webhook сервера...');
  try {
    const response = await fetch(`${WEBHOOK_SERVER_URL}/test-firebase`);
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Firebase подключение webhook сервера работает:', data);
    } else {
      console.log('❌ Firebase подключение webhook сервера не работает:', data);
      return;
    }
  } catch (error) {
    console.log('❌ Ошибка проверки Firebase:', error.message);
    return;
  }
  
  // 3. Создаем тестовый заказ
  console.log('3️⃣ Создание тестового заказа...');
  const testOrderData = {
    name: 'Тестовый коктейль для Telegram',
    user: currentUser.displayName || 'Тестовый пользователь',
    userId: currentUser.uid,
    status: 'pending',
    createdAt: new Date(),
    displayTime: new Date().toLocaleString('ru-RU')
  };
  
  try {
    const orderRef = await db.collection('orders').add(testOrderData);
    const orderId = orderRef.id;
    console.log('✅ Тестовый заказ создан:', orderId);
    
    // 4. Симулируем изменение статуса через webhook
    console.log('4️⃣ Симуляция изменения статуса через webhook...');
    
    // Обновляем статус заказа (как это делает webhook сервер)
    await db.collection('orders').doc(orderId).update({
      status: 'confirmed',
      updatedAt: new Date(),
      updatedBy: 'telegram_admin'
    });
    
    console.log('✅ Статус заказа обновлен на "confirmed"');
    console.log('👀 Следите за уведомлением на сайте...');
    
    // 5. Проверяем, что listener работает
    console.log('5️⃣ Проверка listener...');
    console.log(`📊 Активных listeners: ${globalOrdersListener ? '1' : '0'}`);
    console.log(`📊 Отслеживаемых заказов: ${lastOrderStatuses.size}`);
    
    // 6. Очищаем тестовый заказ через 10 секунд
    setTimeout(async () => {
      try {
        await db.collection('orders').doc(orderId).delete();
        console.log('🧹 Тестовый заказ удален');
      } catch (error) {
        console.log('⚠️ Не удалось удалить тестовый заказ:', error.message);
      }
    }, 10000);
    
  } catch (error) {
    console.log('❌ Ошибка создания тестового заказа:', error.message);
  }
}

// Функция для быстрого тестирования одного уведомления
function testSingleNotification(status = 'confirmed') {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.log('❌ Для тестирования уведомлений необходимо войти в систему');
    return;
  }
  
  // Список реальных коктейлей для тестирования
  const testCocktails = [
    'Мохито',
    'Космополитен', 
    'Маргарита',
    'Пина Колада',
    'Дайкири',
    'Мартини',
    'Лонг Айленд',
    'Б-52'
  ];
  
  const randomCocktail = testCocktails[Math.floor(Math.random() * testCocktails.length)];
  
  const testOrder = {
    id: 'test-single',
    name: randomCocktail,
    status: status,
    userId: currentUser.uid
  };
  
  console.log('🧪 Тестирование уведомления:', randomCocktail, '-', status);
  showStatusUpdateNotification(testOrder, status);
}

// Функция для проверки состояния listener'а
function checkListenerStatus() {
  console.log('🔍 Проверка состояния listener\'а:');
  console.log('- globalOrdersListener:', !!globalOrdersListener);
  console.log('- lastOrderStatuses size:', lastOrderStatuses.size);
  console.log('- currentUser:', !!auth.currentUser);
  console.log('- Firebase db:', !!db);
  
  if (globalOrdersListener) {
    console.log('✅ Listener активен');
  } else {
    console.log('❌ Listener не активен');
  }
  
  return {
    listenerActive: !!globalOrdersListener,
    ordersCount: lastOrderStatuses.size,
    userLoggedIn: !!auth.currentUser,
    firebaseConnected: !!db
  };
}

// Функция для принудительного показа уведомления с отладкой
function forceShowNotification(status = 'confirmed') {
  console.log('🔧 Принудительный показ уведомления:', status);
  
  const testCocktails = ['Мохито', 'Космополитен', 'Маргарита', 'Пина Колада'];
  const randomCocktail = testCocktails[Math.floor(Math.random() * testCocktails.length)];
  
  // Создаем простое уведомление для тестирования
  const notification = document.createElement('div');
  notification.id = 'force-notification-test';
  notification.innerHTML = `
    <div style="padding: 20px; background: red; color: white; font-size: 18px; font-weight: bold; text-align: center;">
      <div style="font-size: 16px; margin-bottom: 5px;">Ваш заказ</div>
      <div style="font-size: 20px; font-style: italic; margin-bottom: 5px;">"${randomCocktail}"</div>
      <div style="font-size: 18px; text-transform: capitalize;">${status}</div>
    </div>
  `;
  
  // Принудительные стили
  notification.style.cssText = `
    position: fixed !important;
    top: 50px !important;
    right: 50px !important;
    z-index: 999999 !important;
    background: red !important;
    color: white !important;
    padding: 20px !important;
    border-radius: 10px !important;
    font-size: 18px !important;
    font-weight: bold !important;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5) !important;
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
    width: 350px !important;
    height: auto !important;
  `;
  
  // Добавляем в DOM
  document.body.appendChild(notification);
  console.log('🔧 Принудительное уведомление добавлено в DOM');
  
  // Проверяем через секунду
  setTimeout(() => {
    const rect = notification.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(notification);
    console.log('🔧 Проверка принудительного уведомления:', {
      rect: rect,
      display: computedStyle.display,
      visibility: computedStyle.visibility,
      opacity: computedStyle.opacity,
      zIndex: computedStyle.zIndex,
      position: computedStyle.position
    });
    
    // Удаляем через 5 секунд
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
        console.log('🔧 Принудительное уведомление удалено');
      }
    }, 5000);
  }, 1000);
}

// Простая функция для тестирования уведомлений
function testSimpleNotification() {
  console.log('🧪 Тестируем простое уведомление...');
  
  // Создаем тестовые данные
  const testOrder = {
    id: 'test_' + Date.now(),
    name: 'Тестовый коктейль 🍸',
    userId: auth.currentUser ? auth.currentUser.uid : 'test_user',
    status: 'confirmed'
  };
  
  console.log('📊 Данные для теста:', testOrder);
  console.log('👤 Текущий пользователь:', auth.currentUser ? auth.currentUser.uid : 'Нет пользователя');
  
  // Вызываем функцию уведомления
  showStatusUpdateNotification(testOrder, 'confirmed');
  
  console.log('✅ Тестовое уведомление отправлено');
}

// Принудительное создание уведомления для тестирования
function forceCreateNotification() {
  console.log('🔧 Принудительно создаем уведомление...');
  
  // Создаем уведомление напрямую
  const notification = document.createElement('div');
  notification.className = 'status-update-notification';
  notification.innerHTML = `
    <div class="notification-content">
      <div class="notification-text">
        <div class="notification-title">Статус заказа обновлен</div>
        <div class="notification-cocktail">"Мохито"</div>
        <div class="notification-subtitle">✅ подтвержден</div>
      </div>
      <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="notification-progress"></div>
  `;
  
  // Добавляем стили
  notification.style.cssText = `
    position: fixed !important;
    top: 20px !important;
    right: 20px !important;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
    color: white !important;
    border-radius: 20px !important;
    box-shadow: 
      0 20px 60px rgba(0, 0, 0, 0.15),
      0 8px 25px rgba(0, 0, 0, 0.1),
      0 0 0 1px rgba(255, 255, 255, 0.2) !important;
    z-index: 99999 !important;
    animation: notificationSlideIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
    display: flex !important;
    flex-direction: column !important;
    font-family: 'Inter', sans-serif !important;
    font-weight: 500 !important;
    min-width: 380px !important;
    max-width: 480px !important;
    backdrop-filter: blur(20px) !important;
    border: 1px solid rgba(255, 255, 255, 0.3) !important;
    overflow: hidden !important;
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
  `;
  
  document.body.appendChild(notification);
  console.log('✅ Принудительное уведомление создано');
  
  // Удаляем через 5 секунд
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'notificationSlideOut 0.6s ease';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 600);
    }
  }, 5000);
}

// Простая функция для быстрого тестирования
function quickTest() {
  console.log('🚀 Быстрый тест уведомления...');
  
  // Создаем уведомление напрямую
  const notification = document.createElement('div');
  notification.className = 'status-update-notification';
  notification.innerHTML = `
    <div class="notification-content">
      <div class="notification-icon">
        <i class="fas fa-check-circle"></i>
      </div>
      <div class="notification-text">
        <div class="notification-title">Тест уведомления</div>
        <div class="notification-cocktail">"Мохито"</div>
        <div class="notification-subtitle">✅ подтвержден</div>
      </div>
      <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="notification-progress"></div>
  `;
  
  document.body.appendChild(notification);
  console.log('✅ Уведомление добавлено в DOM');
  
  // Удаляем через 5 секунд
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'notificationSlideOut 0.6s ease';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 600);
    }
  }, 5000);
}

// Функция для принудительного обновления стилей
function forceReloadStyles() {
  console.log('🔄 Принудительно обновляем стили...');
  
  // Удаляем старые стили
  const oldStyles = document.querySelectorAll('link[href*="style.css"]');
  oldStyles.forEach(link => link.remove());
  
  // Добавляем новые стили с timestamp
  const newLink = document.createElement('link');
  newLink.rel = 'stylesheet';
  newLink.href = `style.css?v=${Date.now()}`;
  document.head.appendChild(newLink);
  
  console.log('✅ Стили обновлены');
}

// Функция для проверки загрузки стилей
function checkStyles() {
  console.log('🔍 Проверяем загрузку стилей...');
  
  const testEl = document.createElement('div');
  testEl.className = 'status-update-notification';
  testEl.style.position = 'fixed';
  testEl.style.top = '-1000px';
  testEl.style.left = '-1000px';
  testEl.style.visibility = 'hidden';
  document.body.appendChild(testEl);
  
  const styles = window.getComputedStyle(testEl);
  console.log('📊 Стили уведомления:', {
    background: styles.background,
    borderRadius: styles.borderRadius,
    boxShadow: styles.boxShadow,
    zIndex: styles.zIndex
  });
  
  document.body.removeChild(testEl);
}

// Функция для тестирования автоматического исчезновения уведомлений
window.testAutoHideNotifications = function() {
  console.log('🧪 Тестируем автоматическое исчезновение уведомлений...');
  
  const testOrder = {
    id: 'auto-hide-test',
    name: 'Тестовый коктейль',
    userId: auth.currentUser?.uid || 'test-user'
  };
  
  // Тестируем разные статусы с разными временами отображения
  const statuses = [
    { status: 'confirmed', time: 8000, name: 'Подтвержден (8 сек)' },
    { status: 'preparing', time: 6000, name: 'Готовится (6 сек)' },
    { status: 'ready', time: 10000, name: 'Готов (10 сек)' },
    { status: 'completed', time: 12000, name: 'Завершен (12 сек)' },
    { status: 'cancelled', time: 8000, name: 'Отменен (8 сек)' }
  ];
  
  statuses.forEach((test, index) => {
    setTimeout(() => {
      console.log(`📱 Показываем уведомление: ${test.name}`);
      showStatusUpdateNotification(testOrder, test.status);
    }, index * 15000); // Показываем каждое уведомление через 15 секунд
  });
  
  console.log('✅ Тест запущен! Уведомления будут появляться каждые 15 секунд');
  console.log('⏰ Времена отображения:');
  console.log('   - Подтвержден: 8 секунд');
  console.log('   - Готовится: 6 секунд');
  console.log('   - Готов: 10 секунд');
  console.log('   - Завершен: 12 секунд');
  console.log('   - Отменен: 8 секунд');
};

// Быстрый тест анимации исчезновения
window.testNotificationHide = function() {
  console.log('🧪 Быстрый тест анимации исчезновения...');
  
  const testOrder = {
    id: 'hide-test',
    name: 'Тест исчезновения',
    userId: auth.currentUser?.uid || 'test-user'
  };
  
  // Показываем уведомление с коротким временем (3 секунды)
  showStatusUpdateNotification(testOrder, 'confirmed');
  
  console.log('✅ Уведомление показано! Оно исчезнет через 8 секунд с анимацией');
  console.log('💡 Вы также можете закрыть его вручную кнопкой "×"');
};

// Диагностический тест таймера
window.testTimerDiagnostic = function() {
  console.log('🔍 Диагностический тест таймера...');
  
  const testOrder = {
    id: 'timer-test',
    name: 'Диагностика таймера',
    userId: auth.currentUser?.uid || 'test-user'
  };
  
  // Показываем уведомление
  showStatusUpdateNotification(testOrder, 'confirmed');
  
  // Логируем каждую секунду
  let seconds = 0;
  const logInterval = setInterval(() => {
    seconds++;
    console.log(`⏰ Прошло ${seconds} секунд с момента показа уведомления`);
    
    if (seconds >= 10) {
      clearInterval(logInterval);
      console.log('🔍 Диагностика завершена. Если уведомление не исчезло, есть проблема с таймером.');
    }
  }, 1000);
  
  console.log('✅ Уведомление показано! Следите за логами в консоли.');
  console.log('💡 НЕ ДВИГАЙТЕ МЫШЬЮ - это поможет выявить проблему с таймером.');
};

// Добавляем функции в глобальную область для тестирования
if (typeof window !== 'undefined') {
  window.testNotifications = testNotifications;
  window.testNewNotifications = testNewNotifications;
  window.testModalLayers = testModalLayers;
  window.testUserNotificationTargeting = testUserNotificationTargeting;
  window.testAudioAndVibration = testAudioAndVibration;
  window.testTelegramIntegration = testTelegramIntegration;
  window.debugNotificationIssue = debugNotificationIssue;
  window.reinitializeListener = reinitializeListener;
  window.addTestCocktails = addTestCocktails;
  window.loadCocktails = loadCocktails;
  window.loadStoplist = loadStoplist;
  window.testSingleNotification = testSingleNotification;
  window.checkListenerStatus = checkListenerStatus;
  window.forceShowNotification = forceShowNotification;
  window.testSimpleNotification = testSimpleNotification;
  window.forceCreateNotification = forceCreateNotification;
  window.quickTest = quickTest;
  window.forceReloadStyles = forceReloadStyles;
  window.checkStyles = checkStyles;
}

// === КОНЕЦ ФУНКЦИЙ ДЛЯ ТЕСТИРОВАНИЯ ===

// Функция для добавления тестовых коктейлей
async function addTestCocktails() {
  try {
    console.log('🍸 Добавляем тестовые коктейли...');
    
    const testCocktails = [
      {
        name: "Мохито",
        ingredients: "Белый ром, свежая мята, лайм, сахар, содовая",
        mood: "Освежающий и бодрящий",
        alcohol: 15,
        category: "classic",
        createdAt: new Date()
      },
      {
        name: "Маргарита",
        ingredients: "Текила, лаймовый сок, трипл-сек, соль",
        mood: "Классический и элегантный",
        alcohol: 20,
        category: "classic",
        createdAt: new Date()
      },
      {
        name: "Космополитен",
        ingredients: "Водка, клюквенный сок, лайм, трипл-сек",
        mood: "Современный и стильный",
        alcohol: 18,
        category: "classic",
        createdAt: new Date()
      },
      {
        name: "Пина Колада",
        ingredients: "Белый ром, кокосовое молоко, ананасовый сок",
        mood: "Тропический и расслабляющий",
        alcohol: 12,
        category: "classic",
        createdAt: new Date()
      },
      {
        name: "Белый Русский",
        ingredients: "Водка, кофейный ликер, сливки",
        mood: "Кремовый и уютный",
        alcohol: 16,
        category: "classic",
        createdAt: new Date()
      },
      {
        name: "Дайкири",
        ingredients: "Белый ром, лаймовый сок, сахар",
        mood: "Простой и изысканный",
        alcohol: 22,
        category: "classic",
        createdAt: new Date()
      },
      {
        name: "Огненный Шот",
        ingredients: "Текила, табаско, соль",
        mood: "Острый и бодрящий",
        alcohol: 40,
        category: "shots",
        createdAt: new Date()
      },
      {
        name: "Б-52",
        ingredients: "Кофейный ликер, ирландский крем, тройной сек",
        mood: "Слоистый и сладкий",
        alcohol: 25,
        category: "shots",
        createdAt: new Date()
      },
      {
        name: "Асафьев Спешл",
        ingredients: "Джин, лимонный сок, мед, розмарин",
        mood: "Авторский и уникальный",
        alcohol: 18,
        category: "signature",
        createdAt: new Date()
      },
      {
        name: "Золотой Закат",
        ingredients: "Водка, апельсиновый сок, гренадин, золотая пыльца",
        mood: "Роскошный и загадочный",
        alcohol: 16,
        category: "signature",
        createdAt: new Date()
      }
    ];
    
    const batch = db.batch();
    
    testCocktails.forEach(cocktail => {
      const docRef = db.collection('cocktails').doc();
      batch.set(docRef, cocktail);
    });
    
    await batch.commit();
    console.log('✅ Тестовые коктейли добавлены');
    
  } catch (error) {
    console.error('❌ Ошибка добавления тестовых коктейлей:', error);
  }
}

// Инициализация функций
initThemeToggle();

// Инициализация вкладок категорий
function initCategoryTabs() {
  const categoryTabs = document.querySelectorAll('.category-tab');
  
  categoryTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const category = tab.getAttribute('data-category');
      switchCategory(category);
      
      // Обновляем активную вкладку
      categoryTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });
}

// Переключение категории
function switchCategory(category) {
  currentCategory = category;
  filterCocktailsByCategory();
}

// Фильтрация коктейлей по категории
function filterCocktailsByCategory() {
  const cards = document.querySelectorAll('.cocktail-card');
  
  cards.forEach(card => {
    const cocktailName = card.getAttribute('data-name');
    const cocktail = cocktailsData.find(c => c.name === cocktailName);
    
    if (!cocktail) return;
    
    const shouldShow = shouldShowCocktail(cocktail, currentCategory);
    
    if (shouldShow) {
      card.style.display = 'block';
      card.style.animation = 'fadeInUp 0.6s ease forwards';
    } else {
      card.style.display = 'none';
    }
  });
}

// Определение, должен ли коктейль отображаться в данной категории
function shouldShowCocktail(cocktail, category) {
  // Определяем категорию коктейля на основе его характеристик
  const cocktailCategory = getCocktailCategory(cocktail);
  return cocktailCategory === category;
}

// Определение категории коктейля
function getCocktailCategory(cocktail) {
  // Если категория уже задана в базе данных, используем её
  if (cocktail.category) {
    return cocktail.category;
  }
  
  const name = cocktail.name.toLowerCase();
  const ingredients = (cocktail.ingredients || '').toLowerCase();
  const alcohol = cocktail.alcohol || 0;
  
  // Шоты - крепкие коктейли (обычно 25%+ алкоголя)
  if (alcohol >= 25) {
    return 'shots';
  }
  
  // Классические коктейли - известные традиционные рецепты
  const classicCocktails = [
    'мохито', 'маргарита', 'космополитен', 'пина колада', 'джин тоник',
    'виски сауэр', 'май тай', 'лонг айленд', 'секс на пляже', 'кровавая мэри',
    'негрони', 'апероль шприц', 'джин физз', 'том коллинз', 'виски кола',
    'ром кола', 'водка с тоником', 'джин с тоником', 'текила санрайз',
    'белый русский', 'черный русский', 'мартини', 'манихаттен', 'дайкири'
  ];
  
  if (classicCocktails.some(classic => name.includes(classic))) {
    return 'classic';
  }
  
  // Авторские коктейли - все остальные
  return 'signature';
}

// Инициализация фильтров админки
function initAdminFilters() {
  const adminFilterBtns = document.querySelectorAll('.admin-filter-btn');
  
  adminFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute('data-admin-filter');
      switchAdminFilter(filter);
      
      // Обновляем активную кнопку
      adminFilterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

// Переключение фильтра админки
function switchAdminFilter(filter) {
  currentAdminFilter = filter;
  filterAdminCocktails();
}

// Фильтрация коктейлей в админке
function filterAdminCocktails() {
  const adminCocktailItems = document.querySelectorAll('.admin-cocktail-item');
  
  adminCocktailItems.forEach(item => {
    const cocktailName = item.getAttribute('data-name');
    const cocktail = cocktailsData.find(c => c.name === cocktailName);
    
    if (!cocktail) return;
    
    const shouldShow = shouldShowCocktail(cocktail, currentAdminFilter);
    
    if (shouldShow) {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }
  });
}

// Обновление списка коктейлей в админке
function updateAdminCocktailsList() {
  const cocktailsList = document.getElementById('cocktailsList');
  if (!cocktailsList) return;
  
  cocktailsList.innerHTML = '';
  
  cocktailsData.forEach(cocktail => {
    const category = getCocktailCategory(cocktail);
    const categoryName = getCategoryDisplayName(category);
    const categoryIcon = getCategoryIcon(category);
    
    const adminCocktailItem = document.createElement('div');
    adminCocktailItem.className = 'admin-cocktail-item';
    adminCocktailItem.setAttribute('data-name', cocktail.name);
    adminCocktailItem.setAttribute('data-category', category);
    
    adminCocktailItem.innerHTML = `
      <div class="admin-cocktail-info">
        <div class="admin-cocktail-header">
          <h5>${cocktail.name}</h5>
          <div class="admin-cocktail-category">
            <div class="category-badge category-badge-${category}">
              <i class="${categoryIcon}"></i>
              <span>${categoryName}</span>
            </div>
            <button class="change-category-btn" data-id="${cocktail.id}" data-current="${category}" title="Изменить категорию">
              <i class="fas fa-exchange-alt"></i>
            </button>
          </div>
        </div>
        <div class="admin-cocktail-details">
          <p><strong>Состав:</strong> ${cocktail.ingredients || 'Не указан'}</p>
          <p><strong>Настроение:</strong> ${cocktail.mood || 'Не указано'}</p>
          <p><strong>Крепость:</strong> ${cocktail.alcohol ? cocktail.alcohol + '%' : 'Не указана'}</p>
        </div>
      </div>
      <div class="admin-cocktail-actions">
        <button class="edit-btn" data-id="${cocktail.id}" title="Редактировать">
          <i class="fas fa-edit"></i>
        </button>
        <button class="delete-btn" data-id="${cocktail.id}" title="Удалить">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
    
    cocktailsList.appendChild(adminCocktailItem);
  });
  
  // Добавляем обработчики для кнопок редактирования и удаления
  document.querySelectorAll('.admin-cocktail-item .edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      editCocktail(id);
    });
  });
  
  document.querySelectorAll('.admin-cocktail-item .delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      deleteCocktail(id);
    });
  });
  
  // Добавляем обработчики для кнопок изменения категории
  document.querySelectorAll('.admin-cocktail-item .change-category-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const currentCategory = btn.getAttribute('data-current');
      showCategoryChangeModal(id, currentCategory);
    });
  });
  
}




// Применяем текущий фильтр
filterAdminCocktails();

// Показать модальное окно изменения категории
function showCategoryChangeModal(cocktailId, currentCategory) {
  const cocktail = cocktailsData.find(c => c.id === cocktailId);
  if (!cocktail) return;
  
  // Создаем модальное окно
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content category-change-modal">
      <div class="modal-header">
        <h3>Изменить категорию коктейля</h3>
        <button class="modal-close" type="button">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="cocktail-info">
          <h4>${cocktail.name}</h4>
          <p>Текущая категория: <span class="current-category">${getCategoryDisplayName(currentCategory)}</span></p>
        </div>
        <div class="category-options">
          <h5>Выберите новую категорию:</h5>
          <div class="category-options-list">
            <div class="category-option-item ${currentCategory === 'classic' ? 'current' : ''}" data-category="classic">
              <div class="category-option-badge category-badge-classic">
                <i class="fas fa-crown"></i>
              </div>
              <div class="category-option-content">
                <span class="category-option-name">Классические</span>
                <span class="category-option-desc">Традиционные рецепты</span>
              </div>
              ${currentCategory === 'classic' ? '<div class="current-indicator">Текущая</div>' : ''}
            </div>
            <div class="category-option-item ${currentCategory === 'signature' ? 'current' : ''}" data-category="signature">
              <div class="category-option-badge category-badge-signature">
                <i class="fas fa-star"></i>
              </div>
              <div class="category-option-content">
                <span class="category-option-name">Авторские</span>
                <span class="category-option-desc">Уникальные коктейли</span>
              </div>
              ${currentCategory === 'signature' ? '<div class="current-indicator">Текущая</div>' : ''}
            </div>
            <div class="category-option-item ${currentCategory === 'shots' ? 'current' : ''}" data-category="shots">
              <div class="category-option-badge category-badge-shots">
                <i class="fas fa-bolt"></i>
              </div>
              <div class="category-option-content">
                <span class="category-option-name">Шоты</span>
                <span class="category-option-desc">Крепкие коктейли</span>
              </div>
              ${currentCategory === 'shots' ? '<div class="current-indicator">Текущая</div>' : ''}
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" type="button" data-action="cancel">Отмена</button>
        <button class="btn btn-primary" type="button" data-action="save" disabled>Сохранить</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Добавляем обработчики событий
  const closeBtn = modal.querySelector('.modal-close');
  const cancelBtn = modal.querySelector('[data-action="cancel"]');
  const saveBtn = modal.querySelector('[data-action="save"]');
  const categoryOptions = modal.querySelectorAll('.category-option-item');
  
  let selectedCategory = null;
  
  // Обработчик закрытия модального окна
  const closeModal = () => {
    document.body.removeChild(modal);
  };
  
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  
  // Обработчик клика вне модального окна
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
  
  // Обработчики выбора категории
  categoryOptions.forEach(option => {
    option.addEventListener('click', () => {
      const category = option.getAttribute('data-category');
      
      // Убираем выделение с других опций
      categoryOptions.forEach(opt => opt.classList.remove('selected'));
      
      // Выделяем выбранную опцию
      option.classList.add('selected');
      selectedCategory = category;
      
      // Активируем кнопку сохранения
      saveBtn.disabled = false;
    });
  });
  
  // Обработчик сохранения
  saveBtn.addEventListener('click', async () => {
    if (!selectedCategory || selectedCategory === currentCategory) {
      return;
    }
    
    try {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';
      
      // Обновляем категорию в базе данных
      await db.collection('cocktails').doc(cocktailId).update({
        category: selectedCategory,
        updatedAt: new Date()
      });
      
      // Обновляем локальные данные
      cocktail.category = selectedCategory;
      
      // Обновляем отображение
      await loadCocktails();
      updateAdminCocktailsList();
      
      // Показываем уведомление об успехе
      showSuccess(`Категория коктейля "${cocktail.name}" изменена на "${getCategoryDisplayName(selectedCategory)}"`);
      
      // Закрываем модальное окно
      closeModal();
      
    } catch (error) {
      console.error('Ошибка изменения категории:', error);
      showError('Ошибка изменения категории коктейля');
      saveBtn.disabled = false;
      saveBtn.innerHTML = 'Сохранить';
    }
  });
  
  // Показываем модальное окно
  setTimeout(() => {
    modal.classList.add('show');
  }, 10);
}

// Получение отображаемого названия категории
function getCategoryDisplayName(category) {
  const names = {
    'classic': 'Классические',
    'signature': 'Авторские',
    'shots': 'Шоты'
  };
  return names[category] || 'Неизвестно';
}

// Получение иконки категории
function getCategoryIcon(category) {
  const icons = {
    'classic': 'fas fa-crown',
    'signature': 'fas fa-star',
    'shots': 'fas fa-bolt'
  };
  return icons[category] || 'fas fa-question';
}




// Загружаем начальные данные последовательно, чтобы статусы стоп-листа применились к карточкам
(async () => {
  console.log('🚀 Начинаем инициализацию приложения...');
  
  try {
    console.log('📋 Загружаем стоп-лист...');
    await loadStoplist();
    
    console.log('🍸 Загружаем коктейли...');
    await loadCocktails();
    
    console.log('🔍 Проверяем статус системы...');
    await monitorSystem();
    
    console.log('🏷️ Инициализируем вкладки категорий...');
    initCategoryTabs();
    
    console.log('🔧 Инициализируем фильтры админки...');
    initAdminFilters();
    
    console.log('✅ Инициализация завершена');
  } catch (error) {
    console.error('❌ Ошибка инициализации:', error);
  }
  
  // Периодическая проверка системы каждые 5 минут
  setInterval(monitorSystem, 5 * 60 * 1000);
})();

// Новая функция для тестирования современного дизайна уведомлений
window.testNewNotificationDesign = function() {
  console.log('🎨 Тестируем новый современный дизайн уведомлений...');
  
  const testOrder = {
    id: 'test-' + Date.now(),
    name: 'Мохито',
    userId: 'test-user',
    status: 'confirmed'
  };
  
  // Тестируем все статусы по очереди
  showStatusUpdateNotification(testOrder, 'confirmed');
  
  setTimeout(() => {
    showStatusUpdateNotification(testOrder, 'preparing');
  }, 2000);
  
  setTimeout(() => {
    showStatusUpdateNotification(testOrder, 'ready');
  }, 4000);
  
  setTimeout(() => {
    showStatusUpdateNotification(testOrder, 'completed');
  }, 6000);
  
  console.log('✅ Тест запущен! Смотрите уведомления справа вверху');
};

// Простая функция для быстрого тестирования
window.testQuickNotification = function() {
  console.log('🚀 Быстрый тест уведомления...');
  
  const testOrder = {
    id: 'quick-test',
    name: 'Маргарита',
    userId: 'test-user',
    status: 'confirmed'
  };
  
  showStatusUpdateNotification(testOrder, 'confirmed');
};

// Функция для тестирования центрированного дизайна
window.testCenteredNotification = function() {
  console.log('🎯 Тестируем центрированный дизайн...');
  
  const testOrder = {
    id: 'centered-test',
    name: 'Мохито',
    userId: 'test-user',
    status: 'confirmed'
  };
  
  // Показываем все статусы по очереди
  showStatusUpdateNotification(testOrder, 'confirmed');
  
  setTimeout(() => {
    showStatusUpdateNotification(testOrder, 'preparing');
  }, 2000);
  
  setTimeout(() => {
    showStatusUpdateNotification(testOrder, 'ready');
  }, 4000);
  
  setTimeout(() => {
    showStatusUpdateNotification(testOrder, 'completed');
  }, 6000);
  
  console.log('✅ Тест центрированного дизайна запущен!');
};

// Функция для тестирования нового дизайна уведомления о заказе
window.testNewOrderNotification = function() {
  console.log('🎨 Тестирование нового дизайна уведомления о заказе...');
  
  // Показываем модальное окно уведомления
  openModal(notificationModal);
  
  console.log('✅ Показано новое модальное окно уведомления');
  console.log('📝 Новые функции:');
  console.log('   - Простая и понятная иконка успеха');
  console.log('   - Прогресс-бар этапов заказа');
  console.log('   - Улучшенная типографика');
  console.log('   - Плавные анимации появления');
  console.log('   - Современный дизайн с градиентами');
  console.log('   - Адаптивность для мобильных устройств');
};

// ============================================
// АДМИН-ПАНЕЛЬ ПРОМОКОДОВ
// ============================================

// Создание промокода
const createPromoBtn = document.getElementById('createPromoBtn');
createPromoBtn?.addEventListener('click', async () => {
  const promoCode = document.getElementById('promoCode')?.value.trim().toUpperCase();
  const promoDiscount = parseInt(document.getElementById('promoDiscount')?.value || '0');
  const promoDescription = document.getElementById('promoDescription')?.value.trim();
  const promoMaxUses = parseInt(document.getElementById('promoMaxUses')?.value || '0');
  const promoExpiryDate = document.getElementById('promoExpiryDate')?.value;
  const promoActive = document.getElementById('promoActive')?.checked;
  
  if (!promoCode || !promoDiscount) {
    showError('❌ Заполните обязательные поля: код и скидка');
    return;
  }
  
  if (promoDiscount < 1 || promoDiscount > 100) {
    showError('❌ Скидка должна быть от 1 до 100%');
    return;
  }
  
  try {
    // Проверяем, существует ли уже такой промокод
    const existingPromo = await db.collection('promocodes').doc(promoCode).get();
    if (existingPromo.exists) {
      showError('❌ Промокод с таким кодом уже существует');
      return;
    }
    
    // Создаем промокод
    const promoData = {
      code: promoCode,
      discount: promoDiscount,
      description: promoDescription || '',
      maxUses: promoMaxUses,
      usedCount: 0,
      active: promoActive,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (promoExpiryDate) {
      promoData.expiryDate = firebase.firestore.Timestamp.fromDate(new Date(promoExpiryDate));
    }
    
    await db.collection('promocodes').doc(promoCode).set(promoData);
    
    showSuccess(`✅ Промокод ${promoCode} создан успешно!`);
    
    // Очищаем форму
    document.getElementById('promoCode').value = '';
    document.getElementById('promoDiscount').value = '';
    document.getElementById('promoDescription').value = '';
    document.getElementById('promoMaxUses').value = '0';
    document.getElementById('promoExpiryDate').value = '';
    document.getElementById('promoActive').checked = true;
    
    // Перезагружаем список промокодов
    loadPromocodes();
    
  } catch (error) {
    console.error('❌ Ошибка создания промокода:', error);
    showError('❌ Ошибка создания промокода');
  }
});

// Загрузка списка промокодов
async function loadPromocodes() {
  try {
    const promocodesSnapshot = await db.collection('promocodes')
      .orderBy('createdAt', 'desc')
      .get();
    
    const promocodesList = document.getElementById('promocodesList');
    if (!promocodesList) return;
    
    if (promocodesSnapshot.empty) {
      promocodesList.innerHTML = '<p style="text-align: center; color: #999;">Промокоды не найдены</p>';
      return;
    }
    
    promocodesList.innerHTML = '';
    
    promocodesSnapshot.forEach(doc => {
      const promo = doc.data();
      const promoCode = doc.id;
      
      const expiryDate = promo.expiryDate ? promo.expiryDate.toDate().toLocaleDateString('ru-RU') : 'Без ограничений';
      const maxUsesText = promo.maxUses > 0 ? promo.maxUses : '∞';
      const usedCount = promo.usedCount || 0;
      
      const promoItem = document.createElement('div');
      promoItem.className = 'promo-item';
      promoItem.innerHTML = `
        <div class="promo-item-header">
          <div class="promo-code-display">${promoCode}</div>
          <div class="promo-discount">-${promo.discount}%</div>
        </div>
        <div class="promo-item-details">
          <div class="promo-detail">
            <div class="promo-detail-label">Описание:</div>
            <div class="promo-detail-value">${promo.description || 'Нет описания'}</div>
          </div>
          <div class="promo-detail">
            <div class="promo-detail-label">Статус:</div>
            <div class="promo-detail-value">
              <span class="promo-status ${promo.active ? 'active' : 'inactive'}">
                ${promo.active ? 'Активен' : 'Неактивен'}
              </span>
            </div>
          </div>
          <div class="promo-detail">
            <div class="promo-detail-label">Использовано:</div>
            <div class="promo-detail-value">${usedCount} / ${maxUsesText}</div>
          </div>
          <div class="promo-detail">
            <div class="promo-detail-label">Срок действия:</div>
            <div class="promo-detail-value">${expiryDate}</div>
          </div>
        </div>
        <div class="promo-item-actions">
          <button class="admin-btn ${promo.active ? 'warning' : 'primary'}" onclick="togglePromoStatus('${promoCode}', ${!promo.active})">
            <i class="fas fa-${promo.active ? 'ban' : 'check'}"></i> ${promo.active ? 'Деактивировать' : 'Активировать'}
          </button>
          <button class="admin-btn danger" onclick="deletePromo('${promoCode}')">
            <i class="fas fa-trash"></i> Удалить
          </button>
        </div>
      `;
      
      promocodesList.appendChild(promoItem);
    });
    
  } catch (error) {
    console.error('❌ Ошибка загрузки промокодов:', error);
  }
}

// Переключение статуса промокода
window.togglePromoStatus = async function(promoCode, newStatus) {
  try {
    await db.collection('promocodes').doc(promoCode).update({
      active: newStatus,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    showSuccess(`✅ Промокод ${promoCode} ${newStatus ? 'активирован' : 'деактивирован'}`);
    loadPromocodes();
    
  } catch (error) {
    console.error('❌ Ошибка изменения статуса промокода:', error);
    showError('❌ Ошибка изменения статуса');
  }
};

// Удаление промокода
window.deletePromo = async function(promoCode) {
  if (!confirm(`Вы уверены, что хотите удалить промокод ${promoCode}?`)) {
    return;
  }
  
  try {
    await db.collection('promocodes').doc(promoCode).delete();
    showSuccess(`✅ Промокод ${promoCode} удален`);
    loadPromocodes();
    
  } catch (error) {
    console.error('❌ Ошибка удаления промокода:', error);
    showError('❌ Ошибка удаления промокода');
  }
};

// Загружаем промокоды при открытии вкладки
const promocodesTab = document.querySelector('[data-tab="promocodes"]');
promocodesTab?.addEventListener('click', () => {
  loadPromocodes();
});

console.log('💳 Система промокодов инициализирована');

// ============= СИСТЕМА ОЦЕНКИ КОКТЕЙЛЕЙ =============

console.log('⭐ Инициализация системы оценки коктейлей...');

// Глобальные переменные для системы оценки
let currentRatingData = null;
let ratedOrders = new Set(); // Множество ID заказов, которые уже были оценены или пропущены
let userOrdersListener = null; // Слушатель для заказов пользователя

// Получаем элементы модального окна оценки
const ratingModal = document.getElementById('ratingModal');
const ratingCocktailName = document.getElementById('ratingCocktailName');
const starsContainer = document.getElementById('starsContainer');
const ratingText = document.getElementById('ratingText');
const ratingComment = document.getElementById('ratingComment');
const submitRatingBtn = document.getElementById('submitRating');
const skipRatingBtn = document.getElementById('skipRating');
const stars = document.querySelectorAll('.star');

// Переменная для хранения выбранного рейтинга
let selectedRating = 0;

// Функция для отслеживания заказов пользователя
function startTrackingUserOrders(userId) {
  console.log('🔍 Начинаем отслеживание заказов пользователя:', userId);
  
  // Отключаем предыдущий слушатель, если он есть
  if (userOrdersListener) {
    userOrdersListener();
    userOrdersListener = null;
  }
  
  // Устанавливаем слушатель для заказов текущего пользователя
  userOrdersListener = db.collection('orders')
    .where('userId', '==', userId)
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const order = change.doc.data();
        const orderId = change.doc.id;
        
        // Проверяем, если заказ только что стал готов (статус "ready")
        if (change.type === 'modified' && order.status === 'ready') {
          // Проверяем, не был ли этот заказ уже оценен или пропущен
          if (!ratedOrders.has(orderId)) {
            console.log('🍸 Заказ готов! Показываем окно оценки:', order.cocktailName);
            showRatingModal(orderId, order.cocktailName);
          }
        }
      });
    }, (error) => {
      console.error('❌ Ошибка отслеживания заказов:', error);
    });
}

// Функция для остановки отслеживания заказов
function stopTrackingUserOrders() {
  if (userOrdersListener) {
    userOrdersListener();
    userOrdersListener = null;
    console.log('🛑 Отслеживание заказов остановлено');
  }
}

// Функция для показа модального окна оценки
function showRatingModal(orderId, cocktailName) {
  currentRatingData = {
    orderId: orderId,
    cocktailName: cocktailName,
    timestamp: new Date()
  };
  
  // Заполняем данные
  ratingCocktailName.textContent = cocktailName;
  selectedRating = 0;
  ratingComment.value = '';
  
  // Сбрасываем звезды
  resetStars();
  
  // Обновляем текст
  ratingText.textContent = 'Выберите оценку';
  ratingText.classList.remove('has-rating');
  
  // Отключаем кнопку отправки
  submitRatingBtn.disabled = true;
  
  // Показываем модальное окно
  ratingModal.style.display = 'flex';
  
  console.log('📝 Показано окно оценки для:', cocktailName);
}

// Функция для сброса звезд
function resetStars() {
  stars.forEach(star => {
    star.classList.remove('active', 'hovered');
  });
}

// Обработчики для звезд
stars.forEach((star, index) => {
  // Наведение мыши
  star.addEventListener('mouseenter', () => {
    resetStars();
    for (let i = 0; i <= index; i++) {
      stars[i].classList.add('hovered');
    }
  });
  
  // Клик по звезде
  star.addEventListener('click', () => {
    selectedRating = index + 1;
    resetStars();
    for (let i = 0; i <= index; i++) {
      stars[i].classList.add('active');
    }
    
    // Обновляем текст оценки
    const ratingTexts = [
      'Ужасно',
      'Плохо',
      'Нормально',
      'Хорошо',
      'Отлично!'
    ];
    ratingText.textContent = ratingTexts[selectedRating - 1];
    ratingText.classList.add('has-rating');
    
    // Включаем кнопку отправки
    submitRatingBtn.disabled = false;
    
    console.log('⭐ Выбрана оценка:', selectedRating);
  });
});

// Возвращение к нормальному виду при уходе мыши
starsContainer.addEventListener('mouseleave', () => {
  resetStars();
  if (selectedRating > 0) {
    for (let i = 0; i < selectedRating; i++) {
      stars[i].classList.add('active');
    }
  }
});

// Функция для сохранения оценки
async function saveRating() {
  if (!currentRatingData || selectedRating === 0) {
    console.warn('⚠️ Нет данных для сохранения оценки');
    return;
  }
  
  if (!currentUser) {
    console.warn('⚠️ Пользователь не авторизован');
    return;
  }
  
  try {
    // Сохраняем оценку в коллекцию ratings
    const ratingData = {
      cocktailName: currentRatingData.cocktailName,
      rating: selectedRating,
      comment: ratingComment.value.trim() || null,
      userId: currentUser.uid,
      userName: currentUser.displayName || 'Аноним',
      orderId: currentRatingData.orderId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('ratings').add(ratingData);
    
    // Добавляем ID заказа в множество оцененных
    ratedOrders.add(currentRatingData.orderId);
    
    // Обновляем статус заказа на "completed"
    await db.collection('orders').doc(currentRatingData.orderId).update({
      status: 'completed',
      rated: true,
      ratingValue: selectedRating
    });
    
    console.log('✅ Оценка сохранена:', ratingData);
    
    // Показываем уведомление
    showSuccess('Спасибо за вашу оценку! 🌟');
    
    // Закрываем модальное окно
    closeRatingModal();
    
    // Обновляем рейтинги на карточках
    await loadCocktails();
    
  } catch (error) {
    console.error('❌ Ошибка сохранения оценки:', error);
    showError('Ошибка сохранения оценки');
  }
}

// Функция для пропуска оценки
function skipRating() {
  if (currentRatingData) {
    // Добавляем ID заказа в множество оцененных (чтобы не показывать снова)
    ratedOrders.add(currentRatingData.orderId);
    
    // Обновляем статус заказа на "completed" без оценки
    db.collection('orders').doc(currentRatingData.orderId).update({
      status: 'completed',
      rated: false
    }).catch(error => {
      console.error('❌ Ошибка обновления статуса заказа:', error);
    });
    
    console.log('⏭️ Оценка пропущена');
  }
  
  closeRatingModal();
}

// Функция для закрытия модального окна оценки
function closeRatingModal() {
  ratingModal.style.display = 'none';
  currentRatingData = null;
  selectedRating = 0;
  ratingComment.value = '';
  resetStars();
}

// Обработчики событий для кнопок
submitRatingBtn.addEventListener('click', saveRating);
skipRatingBtn.addEventListener('click', skipRating);

// Закрытие модального окна при клике вне его
ratingModal.addEventListener('click', (e) => {
  if (e.target === ratingModal) {
    skipRating();
  }
});

// Функция для получения среднего рейтинга коктейля
async function getCocktailAverageRating(cocktailName) {
  try {
    const ratingsSnapshot = await db.collection('ratings')
      .where('cocktailName', '==', cocktailName)
      .get();
    
    if (ratingsSnapshot.empty) {
      return null;
    }
    
    let totalRating = 0;
    let count = 0;
    
    ratingsSnapshot.forEach(doc => {
      const rating = doc.data();
      totalRating += rating.rating;
      count++;
    });
    
    const averageRating = totalRating / count;
    
    return {
      average: averageRating,
      count: count
    };
    
  } catch (error) {
    console.error('❌ Ошибка получения рейтинга:', error);
    return null;
  }
}

// Функция для отображения рейтинга на карточке коктейля
function displayCocktailRating(cardElement, ratingData) {
  if (!ratingData) return;
  
  // Проверяем, есть ли уже индикатор рейтинга
  let ratingBadge = cardElement.querySelector('.cocktail-rating');
  
  if (!ratingBadge) {
    // Создаем новый индикатор рейтинга
    ratingBadge = document.createElement('div');
    ratingBadge.className = 'cocktail-rating';
    cardElement.appendChild(ratingBadge);
  }
  
  // Генерируем звезды
  const fullStars = Math.floor(ratingData.average);
  const hasHalfStar = ratingData.average % 1 >= 0.5;
  
  let starsHtml = '';
  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      starsHtml += '<i class="fas fa-star"></i>';
    } else if (i === fullStars && hasHalfStar) {
      starsHtml += '<i class="fas fa-star-half-alt"></i>';
    } else {
      starsHtml += '<i class="far fa-star"></i>';
    }
  }
  
  // Заполняем содержимое
  ratingBadge.innerHTML = `
    <div class="cocktail-rating-stars">${starsHtml}</div>
    <div class="cocktail-rating-value">${ratingData.average.toFixed(1)}</div>
    <div class="cocktail-rating-count">(${ratingData.count})</div>
  `;
}

console.log('✅ Система оценки коктейлей инициализирована');

// Подключаем отслеживание заказов при авторизации пользователя
// Это будет вызываться в onAuthStateChanged
firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    // Запускаем отслеживание заказов для текущего пользователя
    startTrackingUserOrders(user.uid);
  } else {
    // Останавливаем отслеживание при выходе
    stopTrackingUserOrders();
    ratedOrders.clear();
  }
});