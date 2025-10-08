// ============================================
// СИСТЕМА ПРОФИЛЯ ПОЛЬЗОВАТЕЛЯ
// ============================================

// Открытие/закрытие модального окна профиля
const profileBtn = document.getElementById('profileBtn');
const profileModal = document.getElementById('profileModal');

profileBtn?.addEventListener('click', () => {
  openProfile();
});

// Закрытие модального окна
const profileCloseBtn = profileModal?.querySelector('.close');
profileCloseBtn?.addEventListener('click', () => {
  profileModal.style.display = 'none';
  document.body.classList.remove('modal-open');
});

// Функция открытия профиля
async function openProfile() {
  const user = firebase.auth().currentUser;
  if (!user) return;
  
  // Показываем модальное окно
  profileModal.style.display = 'block';
  document.body.classList.add('modal-open');
  
  // Загружаем данные профиля
  await loadProfileData(user);
}

// Загрузка данных профиля
async function loadProfileData(user) {
  try {
    // Загружаем данные пользователя из Firestore
    const userDoc = await db.collection('users').doc(user.uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    
    // Обновляем информацию в шапке профиля
    const profileName = document.getElementById('profileName');
    const profilePhone = document.getElementById('profilePhone');
    
    if (profileName) profileName.textContent = user.displayName || 'Пользователь';
    if (profilePhone) profilePhone.textContent = userData.phoneNumber || user.phoneNumber || '';
    
    // Загружаем бонусы
    await loadProfileBonuses(user.uid);
    
    // Загружаем текущий счет
    await loadProfileCurrentBill(user.uid);
    
    // Загружаем историю
    await loadProfileHistory(user.uid);
    
  } catch (error) {
    console.error('❌ Ошибка загрузки профиля:', error);
  }
}

// Загрузка бонусов в профиле
async function loadProfileBonuses(userId) {
  try {
    const bonusDoc = await db.collection('bonusAccounts').doc(userId).get();
    
    let balance = 0;
    let totalEarned = 0;
    let totalSpent = 0;
    
    if (bonusDoc.exists) {
      const bonusData = bonusDoc.data();
      balance = bonusData.balance || 0;
      totalEarned = bonusData.totalEarned || 0;
      totalSpent = bonusData.totalSpent || 0;
    }
    
    // Обновляем отображение в профиле
    const profileBonusAmount = document.getElementById('profileBonusAmount');
    const profileTotalEarned = document.getElementById('profileTotalEarned');
    const profileTotalSpent = document.getElementById('profileTotalSpent');
    
    if (profileBonusAmount) profileBonusAmount.textContent = balance;
    if (profileTotalEarned) profileTotalEarned.textContent = totalEarned;
    if (profileTotalSpent) profileTotalSpent.textContent = totalSpent;
    
  } catch (error) {
    console.error('❌ Ошибка загрузки бонусов:', error);
  }
}

// Загрузка текущего счета в профиле
async function loadProfileCurrentBill(userId) {
  try {
    const billsSnapshot = await db.collection('bills')
      .where('userId', '==', userId)
      .where('status', '==', 'open')
      .limit(1)
      .get();
    
    const profileCurrentBill = document.getElementById('profileCurrentBill');
    if (!profileCurrentBill) return;
    
    if (billsSnapshot.empty) {
      profileCurrentBill.innerHTML = `
        <div class="no-bill-message">
          <i class="fas fa-receipt"></i>
          <p>У вас пока нет открытого счета</p>
          <p class="hint">Сделайте заказ, чтобы начать</p>
        </div>
      `;
      return;
    }
    
    const billDoc = billsSnapshot.docs[0];
    const billData = billDoc.data();
    const billId = billDoc.id;
    
    // Используем существующую функцию отображения счета
    const billItems = billData.items || [];
    const totalAmount = billData.totalAmount || 0;
    
    let itemsHTML = '';
    billItems.forEach(item => {
      const statusIcon = getOrderStatusIcon(item.status);
      const statusText = getOrderStatusText(item.status);
      
      itemsHTML += `
        <div class="bill-item">
          ${item.cocktailImage ? `<img src="${item.cocktailImage}" alt="${item.cocktailName}" class="bill-item-image">` : ''}
          <div class="bill-item-info">
            <div class="bill-item-name">${item.cocktailName}</div>
            <div class="bill-item-status">
              <span class="status-icon">${statusIcon}</span>
              <span class="status-text">${statusText}</span>
            </div>
          </div>
          <div class="bill-item-price">${item.finalPrice || item.price || 0} ₽</div>
        </div>
      `;
    });
    
    profileCurrentBill.innerHTML = `
      <div class="current-bill-card">
        <div class="bill-header">
          <h4><i class="fas fa-receipt"></i> Текущий счет</h4>
          <div class="bill-total">${totalAmount} ₽</div>
        </div>
        <div class="bill-items">
          ${itemsHTML}
        </div>
        <button class="view-full-bill-btn" onclick="openMyBill()">
          <i class="fas fa-expand"></i> Открыть полный счет
        </button>
      </div>
    `;
    
  } catch (error) {
    console.error('❌ Ошибка загрузки текущего счета:', error);
  }
}

// Загрузка истории счетов в профиле
async function loadProfileHistory(userId) {
  try {
    const billsSnapshot = await db.collection('bills')
      .where('userId', '==', userId)
      .where('status', '==', 'paid')
      .orderBy('paidAt', 'desc')
      .limit(5)
      .get();
    
    const profileBillHistory = document.getElementById('profileBillHistory');
    if (!profileBillHistory) return;
    
    if (billsSnapshot.empty) {
      profileBillHistory.innerHTML = `
        <div class="no-history-message">
          <i class="fas fa-history"></i>
          <p>История счетов пуста</p>
          <p class="hint">Оплаченные счета будут отображаться здесь</p>
        </div>
      `;
      return;
    }
    
    let historyHTML = '<div class="history-list">';
    
    billsSnapshot.forEach(doc => {
      const billData = doc.data();
      const billId = doc.id;
      const paidDate = billData.paidAt ? billData.paidAt.toDate().toLocaleDateString('ru-RU') : 'Неизвестно';
      const totalAmount = billData.totalAmount || 0;
      const itemsCount = billData.items ? billData.items.length : 0;
      
      historyHTML += `
        <div class="history-item" onclick="viewBillDetails('${billId}')">
          <div class="history-icon">
            <i class="fas fa-check-circle"></i>
          </div>
          <div class="history-info">
            <div class="history-date">${paidDate}</div>
            <div class="history-details">${itemsCount} ${itemsCount === 1 ? 'позиция' : 'позиции'}</div>
          </div>
          <div class="history-amount">${totalAmount} ₽</div>
        </div>
      `;
    });
    
    historyHTML += '</div>';
    historyHTML += `<button class="view-all-history-btn" onclick="openBillHistory()"><i class="fas fa-list"></i> Вся история</button>`;
    
    profileBillHistory.innerHTML = historyHTML;
    
  } catch (error) {
    console.error('❌ Ошибка загрузки истории:', error);
  }
}

// Вспомогательные функции
function getOrderStatusIcon(status) {
  const icons = {
    'confirmed': '⏳',
    'preparing': '👨‍🍳',
    'ready': '🍸',
    'completed': '✅',
    'cancelled': '❌'
  };
  return icons[status] || '📝';
}

function getOrderStatusText(status) {
  const texts = {
    'confirmed': 'Подтверждён',
    'preparing': 'Готовится',
    'ready': 'Готов',
    'completed': 'Выполнен',
    'cancelled': 'Отменён'
  };
  return texts[status] || 'В обработке';
}

// Открыть полный счет (используем существующую функцию)
window.openMyBill = function() {
  profileModal.style.display = 'none';
  document.body.classList.remove('modal-open');
  
  // Вызываем существующую функцию
  const myBillBtn = document.getElementById('myBillBtn');
  if (myBillBtn) {
    myBillBtn.click();
  }
};

// Открыть историю счетов
window.openBillHistory = function() {
  profileModal.style.display = 'none';
  document.body.classList.remove('modal-open');
  
  // Вызываем существующую функцию
  const billHistoryBtn = document.getElementById('billHistoryBtn');
  if (billHistoryBtn) {
    billHistoryBtn.click();
  }
};

// Просмотр деталей счета
window.viewBillDetails = function(billId) {
  console.log('Просмотр счета:', billId);
  // Можно добавить детальный просмотр
};

// Переключение вкладок профиля
const profileTabs = document.querySelectorAll('.profile-tab');
const profileTabContents = document.querySelectorAll('.profile-tab-content');

profileTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.getAttribute('data-profile-tab');
    
    // Убираем active у всех вкладок
    profileTabs.forEach(t => t.classList.remove('active'));
    profileTabContents.forEach(content => content.classList.remove('active'));
    
    // Добавляем active к выбранной вкладке
    tab.classList.add('active');
    const targetContent = document.getElementById(`profile-${tabName}-tab`);
    if (targetContent) {
      targetContent.classList.add('active');
    }
  });
});

// Переключение темы из профиля
const profileThemeToggle = document.getElementById('profileThemeToggle');
profileThemeToggle?.addEventListener('click', () => {
  // Используем существующую кнопку переключения темы
  const mainThemeToggle = document.getElementById('themeToggle');
  if (mainThemeToggle) {
    mainThemeToggle.click();
  }
});

// Выход из аккаунта из профиля
const profileLogoutBtn = document.getElementById('profileLogoutBtn');
profileLogoutBtn?.addEventListener('click', () => {
  if (confirm('Вы уверены, что хотите выйти?')) {
    firebase.auth().signOut().then(() => {
      profileModal.style.display = 'none';
      document.body.classList.remove('modal-open');
      location.reload();
    });
  }
});

// Обновление кнопки профиля при изменении пользователя
firebase.auth().onAuthStateChanged(async (user) => {
  const profileBtn = document.getElementById('profileBtn');
  const profileUserName = document.getElementById('profileUserName');
  const profileBonusPreview = document.getElementById('profileBonusPreview');
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  
  if (user) {
    // Показываем кнопку профиля
    if (profileBtn) profileBtn.style.display = 'flex';
    if (loginBtn) loginBtn.style.display = 'none';
    if (registerBtn) registerBtn.style.display = 'none';
    
    // Обновляем имя
    if (profileUserName) {
      profileUserName.textContent = user.displayName || 'Профиль';
    }
    
    // Обновляем баланс бонусов
    if (profileBonusPreview) {
      const balance = await getUserBonusBalance(user.uid);
      profileBonusPreview.textContent = `💎 ${balance}`;
    }
  } else {
    // Скрываем кнопку профиля
    if (profileBtn) profileBtn.style.display = 'none';
    if (loginBtn) loginBtn.style.display = 'inline-block';
    if (registerBtn) registerBtn.style.display = 'inline-block';
  }
});

console.log('✅ Система профиля инициализирована');

