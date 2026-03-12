// ============================================
// СИСТЕМА "СЧАСТЛИВЫЕ ЧАСЫ" (HAPPY HOURS)
// ============================================

// Глобальные переменные для счастливых часов
let currentHappyHour = null;
let happyHourTimer = null;

// Счастливые часы отключены — баннер и скидка не используются
async function checkActiveHappyHours() {
  hideHappyHourBanner();
  currentHappyHour = null;
}

// Показать баннер счастливых часов
function showHappyHourBanner(happyHour) {
  const banner = document.getElementById('happyHourBanner');
  if (!banner) return;
  
  const titleEl = document.getElementById('hhBannerTitle');
  const discountEl = document.getElementById('hhBannerDiscount');
  const timerEl = document.getElementById('hhBannerTimer');
  
  if (titleEl) titleEl.textContent = happyHour.name || 'Счастливые часы!';
  if (discountEl) discountEl.textContent = `${happyHour.discount}%`;
  
  banner.style.display = 'block';
  
  // Запускаем таймер обратного отсчёта
  if (happyHourTimer) clearInterval(happyHourTimer);
  
  happyHourTimer = setInterval(() => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const remainingMinutes = happyHour.endTimeMinutes - currentTime;
    
    if (remainingMinutes <= 0) {
      clearInterval(happyHourTimer);
      hideHappyHourBanner();
      currentHappyHour = null;
      return;
    }
    
    const hours = Math.floor(remainingMinutes / 60);
    const minutes = remainingMinutes % 60;
    
    if (timerEl) {
      timerEl.textContent = hours > 0 
        ? `${hours}:${minutes.toString().padStart(2, '0')}` 
        : `${minutes} мин`;
    }
  }, 1000);
}

// Скрыть баннер счастливых часов
function hideHappyHourBanner() {
  const banner = document.getElementById('happyHourBanner');
  if (banner) banner.style.display = 'none';
  if (happyHourTimer) {
    clearInterval(happyHourTimer);
    happyHourTimer = null;
  }
}

// Получить скидку счастливых часов (если активна)
function getHappyHourDiscount() {
  return 0;
}

// Проверяем счастливые часы при загрузке и каждую минуту (баннер всегда скрыт)
checkActiveHappyHours();
setInterval(checkActiveHappyHours, 60000);

// ============================================
// СОЗДАНИЕ СЧАСТЛИВЫХ ЧАСОВ (АДМИН)
// ============================================

const createHappyHourBtn = document.getElementById('createHappyHourBtn');
createHappyHourBtn?.addEventListener('click', async () => {
  const name = document.getElementById('hhName')?.value.trim();
  const discount = parseInt(document.getElementById('hhDiscount')?.value || '0');
  const startTime = document.getElementById('hhStartTime')?.value;
  const endTime = document.getElementById('hhEndTime')?.value;
  const active = document.getElementById('hhActive')?.checked;
  
  // Получаем выбранные дни недели
  const dayCheckboxes = document.querySelectorAll('.hh-day-checkbox:checked');
  const days = Array.from(dayCheckboxes).map(cb => cb.value);
  
  if (!name || !discount || !startTime || !endTime || days.length === 0) {
    showError('❌ Заполните все обязательные поля');
    return;
  }
  
  if (discount < 1 || discount > 100) {
    showError('❌ Скидка должна быть от 1 до 100%');
    return;
  }
  
  try {
    const happyHourData = {
      name: name,
      discount: discount,
      startTime: startTime,
      endTime: endTime,
      days: days,
      active: active,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('happyHours').add(happyHourData);
    
    showSuccess(`✅ Счастливые часы "${name}" созданы!`);
    
    // Очищаем форму
    document.getElementById('hhName').value = '';
    document.getElementById('hhDiscount').value = '';
    document.getElementById('hhStartTime').value = '';
    document.getElementById('hhEndTime').value = '';
    document.getElementById('hhActive').checked = true;
    dayCheckboxes.forEach(cb => cb.checked = false);
    
    // Перезагружаем список
    loadHappyHours();
    
    // Перепроверяем активные счастливые часы
    checkActiveHappyHours();
    
  } catch (error) {
    console.error('❌ Ошибка создания счастливых часов:', error);
    showError('❌ Не удалось создать счастливые часы');
  }
});

// Загрузка списка счастливых часов
async function loadHappyHours() {
  try {
    const happyHoursSnapshot = await db.collection('happyHours')
      .orderBy('createdAt', 'desc')
      .get();
    
    const happyHoursList = document.getElementById('happyHoursList');
    if (!happyHoursList) return;
    
    if (happyHoursSnapshot.empty) {
      happyHoursList.innerHTML = '<p style="text-align: center; color: #1a1a1a;">Счастливые часы не найдены</p>';
      return;
    }
    
    happyHoursList.innerHTML = '';
    
    const dayNames = {
      '0': 'Вс', '1': 'Пн', '2': 'Вт', '3': 'Ср', 
      '4': 'Чт', '5': 'Пт', '6': 'Сб'
    };
    
    happyHoursSnapshot.forEach(doc => {
      const hh = doc.data();
      const hhId = doc.id;
      
      const daysDisplay = hh.days ? hh.days.map(d => `<span class="day-badge">${dayNames[d]}</span>`).join(' ') : '';
      
      const hhItem = document.createElement('div');
      hhItem.className = 'happy-hour-item';
      hhItem.innerHTML = `
        <div class="happy-hour-item-header">
          <div class="happy-hour-name">${hh.name}</div>
          <div class="happy-hour-discount">-${hh.discount}%</div>
        </div>
        <div class="happy-hour-details">
          <div class="happy-hour-detail">
            <i class="fas fa-clock"></i>
            <span>${hh.startTime} - ${hh.endTime}</span>
          </div>
          <div class="happy-hour-detail">
            <i class="fas fa-calendar"></i>
            <div class="happy-hour-days">${daysDisplay}</div>
          </div>
          <div class="happy-hour-detail">
            <i class="fas fa-${hh.active ? 'check-circle' : 'times-circle'}"></i>
            <span class="happy-hour-status ${hh.active ? 'active' : 'inactive'}">
              ${hh.active ? 'Активна' : 'Неактивна'}
            </span>
          </div>
        </div>
        <div class="promo-item-actions" style="margin-top: 1rem;">
          <button class="admin-btn ${hh.active ? 'warning' : 'primary'}" onclick="toggleHappyHourStatus('${hhId}', ${!hh.active})">
            <i class="fas fa-${hh.active ? 'ban' : 'check'}"></i> ${hh.active ? 'Деактивировать' : 'Активировать'}
          </button>
          <button class="admin-btn danger" onclick="deleteHappyHour('${hhId}')">
            <i class="fas fa-trash"></i> Удалить
          </button>
        </div>
      `;
      
      happyHoursList.appendChild(hhItem);
    });
    
  } catch (error) {
    console.error('❌ Ошибка загрузки счастливых часов:', error);
  }
}

// Переключение статуса счастливых часов
window.toggleHappyHourStatus = async function(hhId, newStatus) {
  try {
    await db.collection('happyHours').doc(hhId).update({
      active: newStatus,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    showSuccess(`✅ Счастливые часы ${newStatus ? 'активированы' : 'деактивированы'}`);
    loadHappyHours();
    checkActiveHappyHours(); // Перепроверяем активные
    
  } catch (error) {
    console.error('❌ Ошибка изменения статуса:', error);
    showError('❌ Не удалось изменить статус');
  }
};

// Удаление счастливых часов
window.deleteHappyHour = async function(hhId) {
  if (!confirm('Вы уверены, что хотите удалить эти счастливые часы?')) {
    return;
  }
  
  try {
    await db.collection('happyHours').doc(hhId).delete();
    showSuccess('✅ Счастливые часы удалены');
    loadHappyHours();
    checkActiveHappyHours(); // Перепроверяем активные
    
  } catch (error) {
    console.error('❌ Ошибка удаления:', error);
    showError('❌ Не удалось удалить счастливые часы');
  }
};

// Загружаем счастливые часы при открытии вкладки
const happyHoursTab = document.querySelector('[data-tab="happyhours"]');
happyHoursTab?.addEventListener('click', () => {
  loadHappyHours();
});

// ============================================
// БОНУСНАЯ СИСТЕМА (CASHBACK)
// ============================================

// Глобальные переменные для бонусной системы
let bonusSettings = null;
let currentUserBonuses = 0;

// Загрузка настроек бонусной системы
async function loadBonusSettings() {
  try {
    const settingsDoc = await db.collection('settings').doc('bonusSystem').get();
    
    if (settingsDoc.exists) {
      bonusSettings = settingsDoc.data();
    } else {
      // Создаём настройки по умолчанию
      bonusSettings = {
        percentage: 5, // 5% кэшбэк
        minOrder: 300, // Минимальная сумма заказа
        maxUsage: 50, // Максимум 50% можно оплатить бонусами
        expireDays: 180, // Срок действия 180 дней
        active: true
      };
      
      await db.collection('settings').doc('bonusSystem').set({
        ...bonusSettings,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    
    // Обновляем форму настроек
    updateBonusSettingsForm();
    
  } catch (error) {
    console.error('❌ Ошибка загрузки настроек бонусов:', error);
  }
}

// Обновление формы настроек бонусов
function updateBonusSettingsForm() {
  if (!bonusSettings) return;
  
  const percentageInput = document.getElementById('bonusPercentage');
  const minOrderInput = document.getElementById('bonusMinOrder');
  const maxUsageInput = document.getElementById('bonusMaxUsage');
  const expireDaysInput = document.getElementById('bonusExpireDays');
  const activeCheckbox = document.getElementById('bonusSystemActive');
  
  if (percentageInput) percentageInput.value = bonusSettings.percentage || 5;
  if (minOrderInput) minOrderInput.value = bonusSettings.minOrder || 300;
  if (maxUsageInput) maxUsageInput.value = bonusSettings.maxUsage || 50;
  if (expireDaysInput) expireDaysInput.value = bonusSettings.expireDays || 180;
  if (activeCheckbox) activeCheckbox.checked = bonusSettings.active !== false;
}

// Сохранение настроек бонусной системы
const saveBonusSettingsBtn = document.getElementById('saveBonusSettingsBtn');
saveBonusSettingsBtn?.addEventListener('click', async () => {
  const percentage = parseInt(document.getElementById('bonusPercentage')?.value || '5');
  const minOrder = parseInt(document.getElementById('bonusMinOrder')?.value || '300');
  const maxUsage = parseInt(document.getElementById('bonusMaxUsage')?.value || '50');
  const expireDays = parseInt(document.getElementById('bonusExpireDays')?.value || '180');
  const active = document.getElementById('bonusSystemActive')?.checked;
  
  if (percentage < 1 || percentage > 100) {
    showError('❌ Процент должен быть от 1 до 100');
    return;
  }
  
  if (maxUsage < 1 || maxUsage > 100) {
    showError('❌ Макс. процент должен быть от 1 до 100');
    return;
  }
  
  try {
    bonusSettings = {
      percentage: percentage,
      minOrder: minOrder,
      maxUsage: maxUsage,
      expireDays: expireDays,
      active: active,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('settings').doc('bonusSystem').set(bonusSettings, { merge: true });
    
    showSuccess('✅ Настройки бонусной системы сохранены');
    
  } catch (error) {
    console.error('❌ Ошибка сохранения настроек:', error);
    showError('❌ Не удалось сохранить настройки');
  }
});

// Получение баланса бонусов пользователя
async function getUserBonusBalance(userId) {
  try {
    const bonusDoc = await db.collection('bonusAccounts').doc(userId).get();
    
    if (bonusDoc.exists) {
      const data = bonusDoc.data();
      currentUserBonuses = data.balance || 0;
      return data.balance || 0;
    }
    
    return 0;
    
  } catch (error) {
    console.error('❌ Ошибка получения баланса бонусов:', error);
    return 0;
  }
}

// Обновление отображения баланса бонусов
async function updateBonusDisplay() {
  const bonusBalanceEl = document.getElementById('bonusBalance');
  const bonusPointsEl = document.getElementById('bonusPoints');
  
  const user = firebase.auth().currentUser;
  if (!user || !bonusBalanceEl) return;
  
  const balance = await getUserBonusBalance(user.uid);
  
  if (bonusPointsEl) bonusPointsEl.textContent = balance;
  bonusBalanceEl.style.display = 'flex';
}

// Начисление бонусов за заказ
async function awardBonusPoints(userId, orderAmount, orderId) {
  if (!bonusSettings || !bonusSettings.active) return;
  
  // Проверяем минимальную сумму заказа
  if (orderAmount < bonusSettings.minOrder) {
    console.log('💰 Сумма заказа меньше минимальной для начисления бонусов');
    return;
  }
  
  const bonusPoints = Math.floor(orderAmount * bonusSettings.percentage / 100);
  
  if (bonusPoints <= 0) return;
  
  try {
    const bonusAccountRef = db.collection('bonusAccounts').doc(userId);
    const bonusDoc = await bonusAccountRef.get();
    
    const expiryDate = bonusSettings.expireDays > 0
      ? new Date(Date.now() + bonusSettings.expireDays * 24 * 60 * 60 * 1000)
      : null;
    
    if (bonusDoc.exists) {
      // Обновляем существующий аккаунт
      await bonusAccountRef.update({
        balance: firebase.firestore.FieldValue.increment(bonusPoints),
        totalEarned: firebase.firestore.FieldValue.increment(bonusPoints),
        lastEarned: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // Создаём новый аккаунт
      await bonusAccountRef.set({
        userId: userId,
        balance: bonusPoints,
        totalEarned: bonusPoints,
        totalSpent: 0,
        lastEarned: firebase.firestore.FieldValue.serverTimestamp(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    
    // Записываем транзакцию
    await db.collection('bonusTransactions').add({
      userId: userId,
      type: 'earn',
      amount: bonusPoints,
      orderId: orderId,
      orderAmount: orderAmount,
      percentage: bonusSettings.percentage,
      expiryDate: expiryDate,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ Начислено ${bonusPoints} бонусов пользователю ${userId}`);
    
    // Обновляем отображение
    const user = firebase.auth().currentUser;
    if (user && user.uid === userId) {
      updateBonusDisplay();
    }
    
  } catch (error) {
    console.error('❌ Ошибка начисления бонусов:', error);
  }
}

// Списание бонусов при оплате
async function spendBonusPoints(userId, bonusAmount, orderId) {
  if (bonusAmount <= 0) return false;
  
  try {
    const bonusAccountRef = db.collection('bonusAccounts').doc(userId);
    const bonusDoc = await bonusAccountRef.get();
    
    if (!bonusDoc.exists) {
      showError('❌ Бонусный аккаунт не найден');
      return false;
    }
    
    const currentBalance = bonusDoc.data().balance || 0;
    
    if (currentBalance < bonusAmount) {
      showError('❌ Недостаточно бонусов');
      return false;
    }
    
    // Списываем бонусы
    await bonusAccountRef.update({
      balance: firebase.firestore.FieldValue.increment(-bonusAmount),
      totalSpent: firebase.firestore.FieldValue.increment(bonusAmount),
      lastSpent: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Записываем транзакцию
    await db.collection('bonusTransactions').add({
      userId: userId,
      type: 'spend',
      amount: bonusAmount,
      orderId: orderId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ Списано ${bonusAmount} бонусов у пользователя ${userId}`);
    
    // Обновляем отображение
    const user = firebase.auth().currentUser;
    if (user && user.uid === userId) {
      updateBonusDisplay();
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Ошибка списания бонусов:', error);
    return false;
  }
}

// Загрузка статистики бонусов (админ)
async function loadBonusStatistics() {
  try {
    const bonusAccountsSnapshot = await db.collection('bonusAccounts').get();
    
    let totalUsers = 0;
    let totalPoints = 0;
    
    bonusAccountsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.balance > 0) {
        totalUsers++;
        totalPoints += data.balance;
      }
    });
    
    // Считаем начисления за сегодня - упрощённый запрос
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Получаем все транзакции и фильтруем на клиенте
    const allTransactionsSnapshot = await db.collection('bonusTransactions').get();
    
    let todayEarned = 0;
    allTransactionsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.type === 'earn' && data.createdAt) {
        const transDate = data.createdAt.toDate();
        if (transDate >= today) {
          todayEarned += data.amount || 0;
        }
      }
    });
    
    // Обновляем отображение статистики
    const bonusUsersCountEl = document.getElementById('bonusUsersCount');
    const totalBonusPointsEl = document.getElementById('totalBonusPoints');
    const bonusIssuedTodayEl = document.getElementById('bonusIssuedToday');
    
    if (bonusUsersCountEl) bonusUsersCountEl.textContent = totalUsers;
    if (totalBonusPointsEl) totalBonusPointsEl.textContent = totalPoints;
    if (bonusIssuedTodayEl) bonusIssuedTodayEl.textContent = todayEarned;
    
  } catch (error) {
    console.error('❌ Ошибка загрузки статистики бонусов:', error);
  }
}

// Загрузка списка пользователей с бонусами (админ)
async function loadBonusUsers() {
  try {
    const bonusAccountsSnapshot = await db.collection('bonusAccounts')
      .orderBy('balance', 'desc')
      .get();
    
    const bonusUsersList = document.getElementById('bonusUsersList');
    if (!bonusUsersList) return;
    
    if (bonusAccountsSnapshot.empty) {
      bonusUsersList.innerHTML = '<p style="text-align: center; color: #1a1a1a;">Пользователи с бонусами не найдены</p>';
      return;
    }
    
    bonusUsersList.innerHTML = '';
    
    for (const doc of bonusAccountsSnapshot.docs) {
      const bonus = doc.data();
      const userId = doc.id;
      
      // Получаем информацию о пользователе
      let userName = 'Неизвестный';
      let userPhone = '';
      
      try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          userName = userData.displayName || 'Неизвестный';
          userPhone = userData.phoneNumber || '';
        }
      } catch (error) {
        console.error('Ошибка получения данных пользователя:', error);
      }
      
      const bonusItem = document.createElement('div');
      bonusItem.className = 'bonus-user-item';
      bonusItem.innerHTML = `
        <div class="bonus-user-header">
          <div class="bonus-user-name">${userName}</div>
          <div class="bonus-user-points">${bonus.balance || 0} 💎</div>
        </div>
        <div class="bonus-user-details">
          <div class="bonus-user-detail">
            <strong>Телефон:</strong>
            ${userPhone || 'Не указан'}
          </div>
          <div class="bonus-user-detail">
            <strong>Всего начислено:</strong>
            ${bonus.totalEarned || 0} баллов
          </div>
          <div class="bonus-user-detail">
            <strong>Всего потрачено:</strong>
            ${bonus.totalSpent || 0} баллов
          </div>
          <div class="bonus-user-detail">
            <strong>Последнее начисление:</strong>
            ${bonus.lastEarned ? new Date(bonus.lastEarned.toDate()).toLocaleDateString('ru-RU') : 'Нет данных'}
          </div>
        </div>
      `;
      
      bonusUsersList.appendChild(bonusItem);
    }
    
  } catch (error) {
    console.error('❌ Ошибка загрузки пользователей с бонусами:', error);
  }
}

// Поиск пользователей по имени или телефону
const bonusUserSearchInput = document.getElementById('bonusUserSearch');
bonusUserSearchInput?.addEventListener('input', (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const userItems = document.querySelectorAll('.bonus-user-item');
  
  userItems.forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(searchTerm) ? 'block' : 'none';
  });
});

// Загружаем бонусы при открытии вкладки
const bonusesTab = document.querySelector('[data-tab="bonuses"]');
bonusesTab?.addEventListener('click', () => {
  loadBonusSettings();
  loadBonusStatistics();
  loadBonusUsers();
});

// Инициализация бонусной системы при загрузке
loadBonusSettings();

// Обновляем отображение бонусов при изменении пользователя
firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    await updateBonusDisplay();
  }
});

console.log('🎉 Система счастливых часов инициализирована');
console.log('💎 Бонусная система (cashback) инициализирована');

