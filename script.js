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
  
  // Проверяем, не в стоп-листе ли коктейль
  const isInStoplist = stoplistData.some(item => item.cocktailName === name);
  if (isInStoplist) {
    showError(`❌ ${name} временно недоступен. Причина: ${stoplistData.find(item => item.cocktailName === name).reason}`);
    return;
  }
  
  const imgSrc = card.querySelector('img').src;
  const order = {
    name,
    user: user.displayName || "Гость",
    userId: user.uid,
    displayTime: new Date().toLocaleString('ru-RU'),
    createdAt: firebase.firestore.FieldValue.serverTimestamp ? firebase.firestore.FieldValue.serverTimestamp() : new Date(),
    image: imgSrc,
    status: 'pending'
  };
  
  try {
    // Сохраняем заказ в Firestore
    const docRef = await db.collection('orders').add(order);

    const message = `
🆕 *Новый заказ в Asafiev Bar!*
🍸 *Коктейль:* ${order.name}
👤 *Имя клиента:* ${order.user}
🕒 *Время:* ${order.timestamp}
🆔 *ID заказа:* ${docRef.id}
        `.trim();

    // ИСПРАВЛЕНО: Убран лишний пробел в URL Telegram API
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    });

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
      cocktailCard.className = `cocktail-card nudge-right ${isInStoplist ? 'stopped' : ''}`;
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
          ${cocktail.alcohol ? `
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

// Загрузка истории заказов (без индекса, используем фильтрацию на клиенте)
async function loadOrderHistory(userId) {
  try {
    const ordersSnapshot = await db.collection('orders')
      .orderBy('createdAt', 'desc')
      .get();
    
    ordersList.innerHTML = '';
    
    // Фильтруем заказы на клиенте
    const userOrders = [];
    ordersSnapshot.forEach(doc => {
      const order = doc.data();
      if (order.userId === userId) {
        userOrders.push({ id: doc.id, ...order });
      }
    });
    
    if (userOrders.length === 0) {
      ordersList.innerHTML = '<p class="no-orders">У вас пока нет заказов</p>';
      return;
    }
    
    // Сортируем по времени (новые первыми)
    userOrders.sort((a, b) => {
      const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.displayTime ? Date.parse(a.displayTime) : 0);
      const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.displayTime ? Date.parse(b.displayTime) : 0);
      return bTime - aTime;
    });
    
    userOrders.forEach(order => {
      const orderElement = document.createElement('div');
      orderElement.className = 'order-item';
      orderElement.innerHTML = `
        <div class="order-header">
          <span class="order-name">${order.name}</span>
          <span class="order-status ${order.status || 'pending'}">${getStatusText(order.status)}</span>
        </div>
        <div class="order-time" style="font-size: 1.1rem;">${order.displayTime || (order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString('ru-RU') : '')}</div>
      `;
      ordersList.appendChild(orderElement);
    });
  } catch (error) {
    console.error('Ошибка загрузки истории заказов:', error);
    showError('Ошибка загрузки заказов');
  }
}

// === НОВЫЕ ФУНКЦИИ ДЛЯ АДМИН-ПАНЕЛИ ===

// Загрузка заказов для админ-панели
async function loadAdminOrders() {
  try {
    // Получаем все заказы, отсортированные по времени (новые первыми)
    const ordersSnapshot = await db.collection('orders')
      .orderBy('createdAt', 'desc')
      .get();

    // Проверяем, существует ли элемент adminOrdersList
    if (!adminOrdersList) {
      console.error('Элемент adminOrdersList не найден в DOM');
      return;
    }

    adminOrdersList.innerHTML = '';

    if (ordersSnapshot.empty) {
      adminOrdersList.innerHTML = '<p class="no-orders">Заказов пока нет</p>';
      return;
    }

    ordersSnapshot.forEach(doc => {
      const order = { id: doc.id, ...doc.data() };
      const orderElement = document.createElement('div');
      orderElement.className = 'admin-order-item';
      orderElement.innerHTML = `
        <div class="admin-order-header">
          <div>
            <strong>${order.name}</strong>
            <div>Клиент: ${order.user || 'Гость'}</div>
            <small>ID: ${order.id}</small>
            <small>${order.timestamp}</small>
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
    await db.collection('orders').doc(orderId).update({
      status: newStatus,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp ? firebase.firestore.FieldValue.serverTimestamp() : new Date()
    });

    // Закрываем модальное окно статуса
    closeModal(statusModal); // Используем новую функцию
    
    // Перезагрузить список заказов в админке
    if (adminPanel && adminPanel.style.display === 'block') {
      await loadAdminOrders();
    }
    
    showSuccess('Статус заказа успешно обновлён');
  } catch (error) {
    console.error('Ошибка обновления статуса:', error);
    showError('Ошибка обновления статуса заказа');
  }
}

// === КОНЕЦ НОВЫХ ФУНКЦИЙ ===

// Получение текста статуса
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

// Заказ (кнопка)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.order-btn');
  if (btn && !btn.disabled) {
    const user = auth.currentUser;
    if (!user) {
      showError('🔒 Пожалуйста, войдите или зарегистрируйтесь для заказа.');
      return;
    }
    const name = btn.getAttribute('data-name');
    // 👇 Получаем изображение коктейля из родительской карточки
    const imgSrc = btn.closest('.cocktail-card')?.querySelector('img')?.src;
    currentOrder = { 
      name, 
      user: user.displayName || "Гость", 
      userId: user.uid,
      displayTime: new Date().toLocaleString('ru-RU'),
      image: imgSrc,
      status: 'pending' // Статус по умолчанию
    };
    if (orderSummary) {
        orderSummary.innerHTML = `
        <strong>🍸 Коктейль:</strong> ${name}<br>
        <strong>📬 Ваше имя:</strong> ${currentOrder.user}
        `;
    }
    // 👇 Показываем и подставляем изображение
    const orderImagePreview = document.getElementById('orderImagePreview');
    if (orderImagePreview && imgSrc) {
        orderImagePreview.src = imgSrc;
        orderImagePreview.style.display = 'block';
    }
    openModal(orderModal); // Используем новую функцию
  }
});

// Подтверждение заказа
confirmOrderBtn?.addEventListener('click', async () => {
  if (!currentOrder) return;

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
🕒 *Время:* ${currentOrder.timestamp}
🆔 *ID заказа:* ${docRef.id}
        `.trim();

    // ИСПРАВЛЕНО: Убран лишний пробел в URL Telegram API
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    });

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
    closeModal(orderModal); // Используем новую функцию
    openModal(notificationModal); // Используем новую функцию
    currentOrder = null;
    
  } catch (error) {
    console.error("Ошибка:", error);
    showError('❌ Не удалось отправить заказ.');
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

// Инициализация функций
initThemeToggle();
initSwipe();

// Загружаем начальные данные последовательно, чтобы статусы стоп-листа применились к карточкам
(async () => {
  await loadStoplist();
  await loadCocktails();
})();