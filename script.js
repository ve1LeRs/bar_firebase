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
const WEBHOOK_SERVER_URL = "https://barwebhook-production.up.railway.app";

// Инициализация Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// DOM элементы
const themeToggle = document.getElementById('themeToggle');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const ordersBtn = document.getElementById('ordersBtn');
const adminBtn = document.getElementById('adminBtn');
const userName = document.getElementById('userName');
const authModal = document.getElementById('authModal');
const registerModal = document.getElementById('registerModal');
const successModal = document.getElementById('successModal');
const errorModal = document.getElementById('errorModal');
const ordersModal = document.getElementById('ordersModal');
const notificationModal = document.getElementById('notificationModal');
const adminPanel = document.getElementById('adminPanel');
const cocktailFormModal = document.getElementById('cocktailFormModal');
const statusModal = document.getElementById('statusModal');
const modalTitle = document.getElementById('modalTitle');
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
const systemStatus = document.getElementById('systemStatus');
const setupWebhookBtn = document.getElementById('setupWebhookBtn');
const deleteWebhookBtn = document.getElementById('deleteWebhookBtn');
const getWebhookInfoBtn = document.getElementById('getWebhookInfoBtn');
const sendTestMessageBtn = document.getElementById('sendTestMessageBtn');
const telegramStatus = document.getElementById('telegramStatus');

let currentOrder = null;
let startX = 0;
let startY = 0;
let currentCard = null;
let currentOrderId = null;
let isAdmin = false;
let cocktailsData = [];
let stoplistData = [];

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

// Инициализация свайпа
function initSwipe() {
  const cocktailCards = document.querySelectorAll('.cocktail-card');
  cocktailCards.forEach(card => {
    // Touch события для мобильных
    card.addEventListener('touchstart', handleTouchStart, false);
    card.addEventListener('touchmove', handleTouchMove, false);
    card.addEventListener('touchend', handleTouchEnd, false);
    
    // Mouse события для десктопа
    card.addEventListener('mousedown', handleMouseDown, false);
    card.addEventListener('mousemove', handleMouseMove, false);
    card.addEventListener('mouseup', handleMouseUp, false);
    card.addEventListener('mouseleave', handleMouseLeave, false);
  });
}

function handleTouchStart(e) {
  const touch = e.touches[0];
  startX = touch.clientX;
  startY = touch.clientY;
  currentCard = e.currentTarget;
  currentCard.classList.add('swipe-active');
}

function handleTouchMove(e) {
  if (!startX || !currentCard) return;
  
  const touch = e.touches[0];
  const diffX = touch.clientX - startX;
  const diffY = touch.clientY - startY;
  
  // Только горизонтальный свайп
  if (Math.abs(diffX) > Math.abs(diffY)) {
    e.preventDefault();
    const progress = Math.min(1, Math.max(0, diffX / 150));
    currentCard.style.setProperty('--swipe-progress', progress);
    currentCard.style.transform = `translateX(${diffX}px)`;
    currentCard.style.opacity = 1 - Math.abs(diffX) / 300;
    
    // Добавляем визуальный эффект свайпа
    if (diffX > 50) {
      currentCard.classList.add('swipe-right');
    } else {
      currentCard.classList.remove('swipe-right');
    }
  }
}

function handleTouchEnd(e) {
  if (!startX || !currentCard) return;
  
  const touch = e.changedTouches[0];
  const diffX = touch.clientX - startX;
  
  if (Math.abs(diffX) > 100) { // Минимальная дистанция для свайпа
    if (diffX > 0) {
      // Свайп вправо - заказать
      const name = currentCard.getAttribute('data-name');
      // Анимация коммита свайпа
      currentCard.dataset.committing = '1';
      currentCard.classList.add('swipe-commit');
      currentCard.style.transition = 'transform 0.35s ease, opacity 0.35s ease';
      currentCard.style.transform = 'translateX(120%)';
      currentCard.style.opacity = '0';
      // Триггерим заказ
      triggerDirectOrder(name);
      // Сбросим карточку после анимации
      setTimeout(() => {
        if (!currentCard) return;
        currentCard.style.transition = '';
        currentCard.style.transform = '';
        currentCard.style.opacity = '';
        currentCard.classList.remove('swipe-active', 'swipe-right', 'swipe-commit');
        currentCard.style.removeProperty('--swipe-progress');
        delete currentCard.dataset.committing;
        currentCard = null;
        startX = 0;
        startY = 0;
      }, 380);
      return;
    }
  }
  
  // Сброс стилей
  currentCard.style.transform = '';
  currentCard.style.opacity = '';
  currentCard.classList.remove('swipe-active', 'swipe-right');
  currentCard.style.removeProperty('--swipe-progress');
  currentCard = null;
  startX = 0;
  startY = 0;
}

function handleMouseDown(e) {
  startX = e.clientX;
  startY = e.clientY;
  currentCard = e.currentTarget;
  currentCard.classList.add('swipe-active');
}

function handleMouseMove(e) {
  if (!startX || !currentCard) return;
  
  const diffX = e.clientX - startX;
  const diffY = e.clientY - startY;
  
  // Только горизонтальный свайп
  if (Math.abs(diffX) > Math.abs(diffY)) {
    const progress = Math.min(1, Math.max(0, diffX / 150));
    currentCard.style.setProperty('--swipe-progress', progress);
    currentCard.style.transform = `translateX(${diffX}px)`;
    currentCard.style.opacity = 1 - Math.abs(diffX) / 300;
    
    // Добавляем визуальный эффект свайпа
    if (diffX > 50) {
      currentCard.classList.add('swipe-right');
    } else {
      currentCard.classList.remove('swipe-right');
    }
  }
}

function handleMouseUp(e) {
  if (!startX || !currentCard) return;
  
  const diffX = e.clientX - startX;
  
  if (Math.abs(diffX) > 100) { // Минимальная дистанция для свайпа
    if (diffX > 0) {
      // Свайп вправо - заказать
      const name = currentCard.getAttribute('data-name');
      // Анимация коммита свайпа
      currentCard.dataset.committing = '1';
      currentCard.classList.add('swipe-commit');
      currentCard.style.transition = 'transform 0.35s ease, opacity 0.35s ease';
      currentCard.style.transform = 'translateX(120%)';
      currentCard.style.opacity = '0';
      triggerDirectOrder(name);
      setTimeout(() => {
        if (!currentCard) return;
        currentCard.style.transition = '';
        currentCard.style.transform = '';
        currentCard.style.opacity = '';
        currentCard.classList.remove('swipe-active', 'swipe-right', 'swipe-commit');
        currentCard.style.removeProperty('--swipe-progress');
        delete currentCard.dataset.committing;
        currentCard = null;
        startX = 0;
        startY = 0;
      }, 380);
      return;
    }
  }
  
  // Сброс стилей
  currentCard.style.transform = '';
  currentCard.style.opacity = '';
  currentCard.classList.remove('swipe-active', 'swipe-right');
  currentCard.style.removeProperty('--swipe-progress');
  currentCard = null;
  startX = 0;
  startY = 0;
}

function handleMouseLeave(e) {
  if (currentCard) {
    // Сброс стилей
    currentCard.style.transform = '';
    currentCard.style.opacity = '';
    currentCard.classList.remove('swipe-active', 'swipe-right');
    currentCard.style.removeProperty('--swipe-progress');
    currentCard = null;
    startX = 0;
    startY = 0;
  }
}

// Прямой заказ без подтверждения
async function triggerDirectOrder(name) {
  const user = auth.currentUser;
  if (!user) {
    showError('🔒 Пожалуйста, войдите или зарегистрируйтесь для заказа.');
    return;
  }
  
  const card = document.querySelector(`.cocktail-card[data-name="${name}"]`);
  if (!card) return;
  
  // Находим кнопку заказа в карточке
  const orderBtn = card.querySelector('.order-btn');
  if (!orderBtn || orderBtn.disabled || orderBtn.classList.contains('loading')) {
    return; // Предотвращаем множественные клики
  }
  
  // Проверяем, не в стоп-листе ли коктейль
  const isInStoplist = stoplistData.some(item => item.cocktailName === name);
  if (isInStoplist) {
    showError(`❌ ${name} временно недоступен. Причина: ${stoplistData.find(item => item.cocktailName === name).reason}`);
    return;
  }
  
  // Устанавливаем состояние загрузки
  orderBtn.classList.add('loading');
  orderBtn.disabled = true;
  const originalText = orderBtn.innerHTML;
  orderBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Заказываем...';
  
  // Безопасное получение изображения
  const imgElement = card.querySelector('img');
  const imgSrc = imgElement ? imgElement.src : '';
  
  // Проверяем, есть ли реальное изображение или это заглушка
  const hasRealImage = imgSrc && !imgSrc.includes('5d5d5d') && !imgSrc.includes('placeholder');
  
  const order = {
    name,
    user: user.displayName || "Гость",
    userId: user.uid,
    displayTime: new Date().toLocaleString('ru-RU'),
    createdAt: firebase.firestore.FieldValue.serverTimestamp ? firebase.firestore.FieldValue.serverTimestamp() : new Date(),
    image: hasRealImage ? imgSrc : '',
    status: 'pending'
  };
  
  try {
    // Сохраняем заказ в Firestore
    const docRef = await db.collection('orders').add(order);

    const message = `
🆕 *Новый заказ в Asafiev Bar!*
🍸 *Коктейль:* ${order.name}
👤 *Имя клиента:* ${order.user}
🕒 *Время:* ${order.displayTime}
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

    // Показываем уведомление
    openModal(notificationModal); // Используем новую функцию
    currentOrder = null;
    
  } catch (error) {
    console.error("Ошибка:", error);
    showError('❌ Не удалось отправить заказ.');
  } finally {
    // Восстанавливаем состояние кнопки
    if (orderBtn) {
      orderBtn.classList.remove('loading');
      orderBtn.disabled = false;
      orderBtn.innerHTML = originalText;
    }
  }
}

// Проверка состояния пользователя
auth.onAuthStateChanged(async user => {
  if (user) {
    loginBtn.style.display = 'none';
    registerBtn.style.display = 'none';
    ordersBtn.style.display = 'inline-block';
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
  } else {
    loginBtn.style.display = 'inline-block';
    registerBtn.style.display = 'inline-block';
    ordersBtn.style.display = 'none';
    adminBtn.style.display = 'none';
    logoutBtn.style.display = 'none';
    userName.textContent = '';
    userName.style.display = 'none';
    isAdmin = false;
  }
});

// Загрузка коктейлей
async function loadCocktails() {
  try {
    const cocktailsSnapshot = await db.collection('cocktails').get();
    cocktailsData = [];
    cocktailsGrid.innerHTML = '';
    
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
          ${!isInStoplist ? `
            <button class="order-btn" data-name="${cocktail.name}">
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
    
    // Инициализируем свайп для новых карточек
    initSwipe();
    
  } catch (error) {
    console.error('Ошибка загрузки коктейлей:', error);
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
        <div class="stoplist-info">
          <strong>${item.cocktailName}</strong>
          <span>${item.reason}</span>
          <small>${item.timestamp}</small>
        </div>
        ${isAdmin ? `
          <button class="remove-from-stoplist" data-id="${item.id}">
            <i class="fas fa-times"></i>
          </button>
        ` : ''}
      `;
      
      currentStoplist.appendChild(stoplistItem);
    });
    
    // Добавляем обработчики для удаления из стоп-листа
    if (isAdmin) {
      document.querySelectorAll('.remove-from-stoplist').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          removeFromStoplist(id);
        });
      });
    }
    
    // Перезагружаем коктейли, чтобы обновить статусы
    await loadCocktails();
    
  } catch (error) {
    console.error('Ошибка загрузки стоп-листа:', error);
  }
}

// Real-time listener для заказов пользователя
let userOrdersListener = null;

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
      .orderBy('createdAt', 'desc')
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
          orderElement.innerHTML = `
            <div class="order-header">
              <span class="order-name">${order.name}</span>
              <span class="order-status ${order.status || 'pending'}">${getStatusText(order.status)}</span>
            </div>
            <div class="order-time" style="font-size: 1.1rem;">${order.displayTime || (order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString('ru-RU') : '')}</div>
          `;
          ordersList.appendChild(orderElement);
        });
        
        // Показываем уведомление о обновлении статуса, если модальное окно открыто
        if (ordersModal && ordersModal.style.display === 'block') {
          showStatusUpdateNotification();
        }
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

        snapshot.forEach(doc => {
          const order = { id: doc.id, ...doc.data() };
          const orderElement = document.createElement('div');
          orderElement.className = 'admin-order-item';
          orderElement.setAttribute('data-order-id', order.id);
          orderElement.innerHTML = `
            <div class="admin-order-header">
              <div>
                <strong>${order.name}</strong>
                <div>Клиент: ${order.user || 'Гость'}</div>
                <small>ID: ${order.id}</small>
                <small>${order.displayTime || (order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString('ru-RU') : '')}</small>
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

// Открытие модалки истории заказов
ordersBtn?.addEventListener('click', async () => {
  if (auth.currentUser) {
    await loadOrderHistory(auth.currentUser.uid);
    openModal(ordersModal);
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
  const cocktailId = document.getElementById('cocktailId');
  const cocktailName = document.getElementById('cocktailName');
  const cocktailIngredients = document.getElementById('cocktailIngredients');
  const cocktailMood = document.getElementById('cocktailMood');
  const cocktailAlcohol = document.getElementById('cocktailAlcohol');
  const previewImage = document.getElementById('previewImage');

  if (formTitle) formTitle.innerHTML = '<i class="fas fa-cocktail"></i> Добавить коктейль';
  if (cocktailId) cocktailId.value = '';
  if (cocktailName) cocktailName.value = '';
  if (cocktailIngredients) cocktailIngredients.value = '';
  if (cocktailMood) cocktailMood.value = '';
  if (cocktailAlcohol) cocktailAlcohol.value = '';
  if (previewImage) {
    previewImage.style.display = 'none';
    previewImage.src = '';
  }
  // Открываем модальное окно формы коктейля
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
  
  await auth.signOut();
});

// Редактирование коктейля
function editCocktail(id) {
  const cocktail = cocktailsData.find(c => c.id === id);
  if (cocktail) {
    const formTitle = document.getElementById('formTitle');
    const cocktailId = document.getElementById('cocktailId');
    const cocktailName = document.getElementById('cocktailName');
    const cocktailIngredients = document.getElementById('cocktailIngredients');
    const cocktailMood = document.getElementById('cocktailMood');
    const cocktailAlcohol = document.getElementById('cocktailAlcohol');
    const previewImage = document.getElementById('previewImage');

    if (formTitle) formTitle.innerHTML = '<i class="fas fa-edit"></i> Редактировать коктейль';
    if (cocktailId) cocktailId.value = cocktail.id;
    if (cocktailName) cocktailName.value = cocktail.name;
    if (cocktailIngredients) cocktailIngredients.value = cocktail.ingredients || '';
    if (cocktailMood) cocktailMood.value = cocktail.mood || '';
    if (cocktailAlcohol) cocktailAlcohol.value = cocktail.alcohol || '';

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
    
    openModal(cocktailFormModal); // Используем новую функцию
  }
}

// Удаление коктейля
async function deleteCocktail(id) {
  if (confirm('Вы уверены, что хотите удалить этот коктейль?')) {
    try {
      await db.collection('cocktails').doc(id).delete();
      await loadCocktails();
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
  
  try {
    await db.collection('stoplist').add({
      cocktailName: cocktailName,
      reason: reason,
      timestamp: new Date().toLocaleString('ru-RU')
    });
    
    stopReason.value = '';
    await loadStoplist();
    showSuccess('Коктейль добавлен в стоп-лист');
  } catch (error) {
    console.error('Ошибка добавления в стоп-лист:', error);
    showError('Ошибка добавления в стоп-лист');
  }
});

// Удаление из стоп-листа
async function removeFromStoplist(id) {
  try {
    await db.collection('stoplist').doc(id).delete();
    await loadStoplist();
    showSuccess('Коктейль удалён из стоп-листа');
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
      status: 'pending' // Статус по умолчанию
    };
    if (orderSummary) {
        orderSummary.innerHTML = `
        <strong>🍸 Коктейль:</strong> ${name}<br>
        <strong>📬 Ваше имя:</strong> ${currentOrder.user}
        `;
    }
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
    // Сохраняем заказ в Firestore с корректными полями времени
    const now = new Date();
    const orderData = {
      ...currentOrder,
      displayTime: now.toLocaleString('ru-RU'),
      createdAt: firebase.firestore.FieldValue.serverTimestamp ? firebase.firestore.FieldValue.serverTimestamp() : now
    };
    const docRef = await db.collection('orders').add(orderData);

    const message = `
🆕 *Новый заказ в Asafiev Bar!*
🍸 *Коктейль:* ${currentOrder.name}
👤 *Имя клиента:* ${currentOrder.user}
🕒 *Время:* ${currentOrder.displayTime}
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

// Уведомление об обновлении статуса заказа для пользователей
function showStatusUpdateNotification() {
  // Создаем временное уведомление
  const notification = document.createElement('div');
  notification.className = 'status-update-notification';
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas fa-sync-alt"></i>
      <span>Статус заказа обновлен!</span>
    </div>
  `;
  
  // Добавляем стили для уведомления
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #27ae60;
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 10000;
    animation: slideInRight 0.3s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: 'Inter', sans-serif;
    font-weight: 500;
  `;
  
  document.body.appendChild(notification);
  
  // Удаляем уведомление через 3 секунды
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Уведомление об обновлении статуса для админов
function showAdminStatusUpdateNotification() {
  // Создаем временное уведомление для админа
  const notification = document.createElement('div');
  notification.className = 'admin-status-update-notification';
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas fa-bell"></i>
      <span>Заказ обновлен через Telegram!</span>
    </div>
  `;
  
  // Добавляем стили для уведомления
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #3498db;
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 10000;
    animation: slideInRight 0.3s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: 'Inter', sans-serif;
    font-weight: 500;
  `;
  
  document.body.appendChild(notification);
  
  // Удаляем уведомление через 4 секунды
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 4000);
}

// === ФУНКЦИИ МОНИТОРИНГА WEBHOOK СЕРВЕРА ===

// Проверка статуса webhook сервера
async function checkWebhookServerStatus() {
  try {
    const response = await fetch(`${WEBHOOK_SERVER_URL}/health`);
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
    const response = await fetch(`${WEBHOOK_SERVER_URL}/test-firebase`);
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
    
    if (data.ok && data.result.url) {
      console.log('✅ Telegram webhook настроен:', data.result.url);
      return { status: 'online', data: data.result };
    } else {
      console.warn('⚠️ Telegram webhook не настроен:', data);
      return { status: 'error', data };
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
    const webhookUrl = `${WEBHOOK_SERVER_URL}/telegram-webhook`;
    
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
    
    if (data.ok) {
      showSuccess('✅ Webhook успешно настроен!');
      displayTelegramInfo();
    } else {
      showError(`❌ Ошибка настройки webhook: ${data.description}`);
    }
  } catch (error) {
    showError(`❌ Ошибка настройки webhook: ${error.message}`);
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

// Инициализация функций
initThemeToggle();
initSwipe();

// Загружаем начальные данные последовательно, чтобы статусы стоп-листа применились к карточкам
(async () => {
  await loadStoplist();
  await loadCocktails();
  
  // Проверяем статус системы при загрузке
  await monitorSystem();
  
  // Периодическая проверка системы каждые 5 минут
  setInterval(monitorSystem, 5 * 60 * 1000);
})();