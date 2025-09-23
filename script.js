// 🔥 ТВОИ КЛЮЧИ FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyB4bD8UAu0Aj5IRK5H-uZg6kxNAIbkZc9k",
  authDomain: "bar-menu-6145c.firebaseapp.com",
  projectId: "bar-menu-6145c",
  storageBucket: "bar-menu-6145c.firebasestorage.app",
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
      triggerDirectOrder(name);
    }
  }

  // Сброс стилей
  currentCard.style.transform = '';
  currentCard.style.opacity = '';
  currentCard.classList.remove('swipe-active', 'swipe-right');
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
      triggerDirectOrder(name);
    }
  }

  // Сброс стилей
  currentCard.style.transform = '';
  currentCard.style.opacity = '';
  currentCard.classList.remove('swipe-active', 'swipe-right');
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
    timestamp: new Date().toLocaleString('ru-RU'),
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
    notificationModal.style.display = 'block';
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
    // Загружаем данные
    await loadCocktails();
    await loadStoplist();
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
          <p class="ingredients">${cocktail.ingredients}</p>
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

// Загрузка истории заказов
async function loadOrderHistory(userId) {
  // Добавим явную проверку аутентификации
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== userId) {
    console.warn('Попытка загрузки заказов для неверного пользователя или неавторизованного юзера', { currentUserUid: currentUser?.uid, requestedUserId: userId });
    ordersList.innerHTML = '<p class="error">Ошибка доступа. Пожалуйста, обновите страницу.</p>';
    return;
  }

  try {
    console.log(`Запрашиваем заказы для userId: ${userId}`);
    // Используем query с where для фильтрации на стороне сервера, если индекс создан
    // const q = query(collection(db, "orders"), where("userId", "==", userId), orderBy("timestamp", "desc"));
    // const ordersSnapshot = await getDocs(q);

    // ИЛИ продолжаем использовать фильтрацию на клиенте, если индекса нет
    const ordersSnapshot = await db.collection('orders').orderBy('timestamp', 'desc').get();
    // const ordersSnapshot = await db.collection('orders').get(); // Если orderBy тоже вызывает проблему

    ordersList.innerHTML = '';

    // Фильтруем заказы на клиенте
    const userOrders = [];
    ordersSnapshot.forEach(doc => {
      const orderData = doc.data();
      // console.log(`Проверка заказа ID ${doc.id}:`, orderData); // Раскомментируйте для отладки
      if (orderData.userId === userId) {
        userOrders.push({ id: doc.id, ...orderData });
      }
    });

    if (userOrders.length === 0) {
      ordersList.innerHTML = '<p class="no-orders">У вас пока нет заказов</p>';
      return;
    }

    // Сортируем по времени (новые первыми)
    userOrders.sort((a, b) => {
        // Предполагаем, что timestamp - это строка. Если это объект Date или Timestamp, обработка будет другой.
        const dateA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
        const dateB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
        // Для корректной сортировки строкового времени может потребоваться другой формат
        return dateB - dateA; // Сортировка по убыванию
    });

    userOrders.forEach(order => {
      const orderElement = document.createElement('div');
      orderElement.className = 'order-item';
      // Убедитесь, что getStatusText определена
      const statusText = typeof getStatusText === 'function' ? getStatusText(order.status) : (order.status || 'В обработке');
      orderElement.innerHTML = `
        <div class="order-header">
          <span class="order-name">${order.name}</span>
          <span class="order-status ${order.status || 'pending'}">${statusText}</span>
        </div>
        <div class="order-time">${order.timestamp}</div>
      `;
      ordersList.appendChild(orderElement);
    });
  } catch (error) {
    console.error('Ошибка загрузки истории заказов:', error);
    // Более конкретная обработка ошибок
    if (error.code === 'permission-denied') {
        showError('❌ Доступ к заказам запрещен. Пожалуйста, свяжитесь с администратором.');
    } else if (error.code === 'failed-precondition') {
         showError('❌ Ошибка базы данных. Возможно, требуется создать индекс.');
    } else {
        showError('❌ Ошибка загрузки заказов: ' + error.message);
    }
  }
}

// Загрузка заказов для админ-панели
async function loadAdminOrders() {
  try {
    const ordersSnapshot = await db.collection('orders')
      .orderBy('timestamp', 'desc')
      .get();

    adminOrdersList.innerHTML = '';

    if (ordersSnapshot.empty) {
      adminOrdersList.innerHTML = '<p class="no-orders">Нет активных заказов</p>';
      return;
    }

    ordersSnapshot.forEach(doc => {
      const order = { id: doc.id, ...doc.data() };

      // Показываем только активные заказы
      if (order.status !== 'completed' && order.status !== 'cancelled') {
        const orderElement = document.createElement('div');
        orderElement.className = 'admin-order-item';
        orderElement.innerHTML = `
          <div class="admin-order-header">
            <div>
              <strong>${order.name}</strong>
              <div>${order.user}</div>
              <small>${order.timestamp}</small>
            </div>
            <div class="admin-order-status ${order.status || 'pending'}">
              ${getStatusText(order.status)}
            </div>
          </div>
          <div class="admin-order-actions">
            <button class="change-status-btn" data-id="${order.id}">
              <i class="fas fa-sync-alt"></i> Изменить статус
            </button>
          </div>
        `;

        adminOrdersList.appendChild(orderElement);
      }
    });

    // Добавляем обработчики для изменения статуса
    document.querySelectorAll('.change-status-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openStatusModal(id);
      });
    });

  } catch (error) {
    console.error('Ошибка загрузки заказов:', error);
    showError('Ошибка загрузки заказов');
  }
}

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

// Открытие модального окна изменения статуса
function openStatusModal(orderId) {
  currentOrderId = orderId;

  // Находим заказ по ID
  const orderElement = document.querySelector(`.change-status-btn[data-id="${orderId}"]`)
    .closest('.admin-order-item');
  const orderName = orderElement.querySelector('strong').textContent;
  const orderUser = orderElement.querySelector('div div').textContent;

  statusOrderInfo.innerHTML = `
    <p><strong>Коктейль:</strong> ${orderName}</p>
    <p><strong>Клиент:</strong> ${orderUser}</p>
  `;

  statusModal.style.display = 'block';
}

// Изменение статуса заказа
async function changeOrderStatus(orderId, newStatus) {
  try {
    await db.collection('orders').doc(orderId).update({
      status: newStatus
    });

    // Закрываем модальное окно
    statusModal.style.display = 'none';

    // Перезагружаем заказы
    await loadAdminOrders();

    // Отправляем уведомление в Telegram
    const orderDoc = await db.collection('orders').doc(orderId).get();
    const order = orderDoc.data();

    let statusMessage = '';
    switch(newStatus) {
      case 'confirmed':
        statusMessage = 'подтверждён';
        break;
      case 'preparing':
        statusMessage = 'готовится';
        break;
      case 'ready':
        statusMessage = 'готов';
        break;
      case 'completed':
        statusMessage = 'выполнен';
        break;
      case 'cancelled':
        statusMessage = 'отменён';
        break;
    }

    const message = `
🔄 *Статус заказа изменён!*
🍸 *Коктейль:* ${order.name}
👤 *Клиент:* ${order.user}
📊 *Новый статус:* ${statusMessage}
    `.trim();

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

  } catch (error) {
    console.error('Ошибка изменения статуса:', error);
    showError('Ошибка изменения статуса');
  }
}

// Открытие модалки входа
loginBtn?.addEventListener('click', () => {
  authModal.style.display = 'block';
});

// Открытие модалки регистрации
registerBtn?.addEventListener('click', () => {
  registerModal.style.display = 'block';
});

// Открытие модалки истории заказов
ordersBtn?.addEventListener('click', async () => {
  if (auth.currentUser) {
    await loadOrderHistory(auth.currentUser.uid);
    ordersModal.style.display = 'block';
  }
});

// Открытие админ-панели
adminBtn?.addEventListener('click', async () => {
  if (isAdmin) {
    // Загружаем данные для админ-панели
    await loadCocktails();
    await loadAdminOrders();
    await loadStoplist();
    adminPanel.style.display = 'block';
  }
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
    document.getElementById(`${tabId}-tab`).classList.add('active');
  });
});

// Переключение на регистрацию
toggleForm?.addEventListener('click', (e) => {
  if (e.target.id === 'switchToRegister') {
    authModal.style.display = 'none';
    registerModal.style.display = 'block';
    e.preventDefault();
  }
});

// Закрытие модалок
closeBtns.forEach(btn => {
  btn?.addEventListener('click', () => {
    authModal.style.display = 'none';
    registerModal.style.display = 'none';
    orderModal.style.display = 'none';
    ordersModal.style.display = 'none';
    notificationModal.style.display = 'none';
    successModal.style.display = 'none';
    errorModal.style.display = 'none';
    adminPanel.style.display = 'none';
    cocktailFormModal.style.display = 'none';
    statusModal.style.display = 'none';
  });
});

// Закрытие уведомлений
closeNotification?.addEventListener('click', () => {
  notificationModal.style.display = 'none';
  champagneAnimation.innerHTML = '';
});

closeSuccess?.addEventListener('click', () => {
  successModal.style.display = 'none';
});

closeError?.addEventListener('click', () => {
  errorModal.style.display = 'none';
});

// Обработка входа
authForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const phone = document.getElementById('phone').value;
  const password = document.getElementById('password').value;

  const loader = document.getElementById('loader');
  loader.classList.add('active');

  try {
    // Здесь должна быть логика входа по телефону
    // Пока используем email как заглушку
    const email = `${phone.replace(/\D/g, '')}@asafievbar.com`;
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    await userCredential.user.reload();
    const updatedUser = auth.currentUser;

    // Имитируем небольшую задержку для красивой анимации (300ms)
    await new Promise(resolve => setTimeout(resolve, 300));

    userName.textContent = updatedUser.displayName || "Гость";
    authModal.style.display = 'none';

    // Добавляем плавное появление контента
    document.querySelectorAll('.cocktail-card').forEach(card => {
      card.classList.add('fade-in-content');
    });

  } catch (error) {
    showError('❌ Ошибка входа: ' + error.message);
  } finally {
    loader.classList.remove('active');
  }
});

// Обработка регистрации
registerForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const displayName = document.getElementById('displayName').value;
  const phone = document.getElementById('regPhone').value;
  const password = document.getElementById('regPassword').value;

  const loader = document.getElementById('loader');
  loader.classList.add('active');

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
    registerModal.style.display = 'none';
    successModal.style.display = 'block';

    document.querySelectorAll('.cocktail-card').forEach(card => {
      card.classList.add('fade-in-content');
    });

  } catch (error) {
    showError('❌ Ошибка регистрации: ' + error.message);
  } finally {
    loader.classList.remove('active');
  }
});

// Выход
logoutBtn?.addEventListener('click', async () => {
  await auth.signOut();
});

// Добавление коктейля
addCocktailBtn?.addEventListener('click', () => {
  document.getElementById('formTitle').innerHTML = '<i class="fas fa-cocktail"></i> Добавить коктейль';
  document.getElementById('cocktailId').value = '';
  document.getElementById('cocktailName').value = '';
  document.getElementById('cocktailIngredients').value = '';
  document.getElementById('cocktailMood').value = '';
  document.getElementById('cocktailAlcohol').value = '';
  document.getElementById('previewImage').style.display = 'none';
  document.getElementById('previewImage').src = '';
  cocktailFormModal.style.display = 'block';
});

// Редактирование коктейля
function editCocktail(id) {
  const cocktail = cocktailsData.find(c => c.id === id);
  if (cocktail) {
    document.getElementById('formTitle').innerHTML = '<i class="fas fa-edit"></i> Редактировать коктейль';
    document.getElementById('cocktailId').value = cocktail.id;
    document.getElementById('cocktailName').value = cocktail.name;
    document.getElementById('cocktailIngredients').value = cocktail.ingredients;
    document.getElementById('cocktailMood').value = cocktail.mood || '';
    document.getElementById('cocktailAlcohol').value = cocktail.alcohol || '';

    if (cocktail.image) {
      document.getElementById('previewImage').src = cocktail.image;
      document.getElementById('previewImage').style.display = 'block';
    } else {
      document.getElementById('previewImage').style.display = 'none';
    }

    cocktailFormModal.style.display = 'block';
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

  const id = document.getElementById('cocktailId').value;
  const name = document.getElementById('cocktailName').value;
  const ingredients = document.getElementById('cocktailIngredients').value;
  const mood = document.getElementById('cocktailMood').value;
  const alcohol = document.getElementById('cocktailAlcohol').value;
  const imageFile = document.getElementById('cocktailImage').files[0];

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

    cocktailFormModal.style.display = 'none';
    await loadCocktails();
    showSuccess(id ? 'Коктейль успешно обновлён' : 'Коктейль успешно добавлен');

  } catch (error) {
    console.error('Ошибка сохранения коктейля:', error);
    showError('Ошибка сохранения коктейля');
  }
});

// Предпросмотр изображения
document.getElementById('cocktailImage')?.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const preview = document.getElementById('previewImage');
      preview.src = e.target.result;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }
});

// Добавление в стоп-лист
addToStoplist?.addEventListener('click', async () => {
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
  if (e.target.classList.contains('order-btn') && !e.target.disabled) {
    const user = auth.currentUser;
    if (!user) {
      showError('🔒 Пожалуйста, войдите или зарегистрируйтесь для заказа.');
      return;
    }
    const name = e.target.getAttribute('data-name');
    // 👇 Получаем изображение коктейля из родительской карточки
    const imgSrc = e.target.closest('.cocktail-card').querySelector('img').src;
    currentOrder = {
      name,
      user: user.displayName || "Гость",
      userId: user.uid,
      timestamp: new Date().toLocaleString('ru-RU'),
      image: imgSrc,
      status: 'pending' // Статус по умолчанию
    };
    orderSummary.innerHTML = `
      <strong>🍸 Коктейль:</strong> ${name}<br>
      <strong>📬 Ваше имя:</strong> ${currentOrder.user}
    `;
    // 👇 Показываем и подставляем изображение
    const orderImagePreview = document.getElementById('orderImagePreview');
    orderImagePreview.src = imgSrc;
    orderImagePreview.style.display = 'block';
    orderModal.style.display = 'block';
  }
});

// Подтверждение заказа
confirmOrderBtn?.addEventListener('click', async () => {
  if (!currentOrder) return;

  try {
    // Сохраняем заказ в Firestore
    const docRef = await db.collection('orders').add(currentOrder);

    const message = `
🆕 *Новый заказ в Asafiev Bar!*
🍸 *Коктейль:* ${currentOrder.name}
👤 *Имя клиента:* ${currentOrder.user}
🕒 *Время:* ${currentOrder.timestamp}
    `.trim();

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
    orderModal.style.display = 'none';
    notificationModal.style.display = 'block';
    currentOrder = null;

  } catch (error) {
    console.error("Ошибка:", error);
    showError('❌ Не удалось отправить заказ.');
  }
});

// Создание анимации шампанского
function createChampagneAnimation() {
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
    champagneAnimation.innerHTML = '';
  }, 3000);
}

// Показ ошибки
function showError(message) {
  errorMessage.textContent = message;
  errorModal.style.display = 'block';
}

// Показ успеха
function showSuccess(message) {
  document.querySelector('.success-content p').textContent = message;
  successModal.style.display = 'block';
}

// Закрытие по клику вне
window.addEventListener('click', (e) => {
  if (e.target === authModal) authModal.style.display = 'none';
  if (e.target === registerModal) registerModal.style.display = 'none';
  if (e.target === orderModal) orderModal.style.display = 'none';
  if (e.target === ordersModal) ordersModal.style.display = 'none';
  if (e.target === notificationModal) notificationModal.style.display = 'none';
  if (e.target === successModal) successModal.style.display = 'none';
  if (e.target === errorModal) errorModal.style.display = 'none';
  if (e.target === adminPanel) adminPanel.style.display = 'none';
  if (e.target === cocktailFormModal) cocktailFormModal.style.display = 'none';
  if (e.target === statusModal) statusModal.style.display = 'none';
});

// Инициализация функций
initThemeToggle();
initSwipe();

// Загружаем начальные данные
loadCocktails();
loadStoplist();