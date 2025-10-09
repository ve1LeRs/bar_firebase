// ========================================
// КОЛЕСО УДАЧИ - СИСТЕМА
// ========================================

// Состояние колеса
let wheelState = {
  isSpinning: false,
  currentRotation: 0,
  prizes: [],
  userLastSpin: null,
  config: {
    active: true,
    cooldownHours: 24
  }
};

// Ссылки на элементы
const wheelElements = {
  modal: null,
  canvas: null,
  ctx: null,
  spinButton: null,
  resultDiv: null,
  historyList: null,
  availabilityInfo: null,
  openBtn: null
};

// Инициализация колеса удачи
async function initWheelOfFortune() {
  console.log('🎰 Инициализация колеса удачи...');
  
  // Получаем элементы
  wheelElements.modal = document.getElementById('wheelOfFortuneModal');
  wheelElements.canvas = document.getElementById('wheelCanvas');
  wheelElements.spinButton = document.getElementById('spinButton');
  wheelElements.resultDiv = document.getElementById('wheelResult');
  wheelElements.historyList = document.getElementById('wheelHistoryList');
  wheelElements.availabilityInfo = document.getElementById('availabilityInfo');
  wheelElements.openBtn = document.getElementById('openWheelBtn');
  
  if (!wheelElements.canvas) {
    console.error('❌ Canvas для колеса не найден');
    return;
  }
  
  wheelElements.ctx = wheelElements.canvas.getContext('2d');
  
  // Загружаем конфигурацию
  await loadWheelConfig();
  
  // Загружаем призы
  await loadWheelPrizes();
  
  // Настраиваем обработчики событий
  setupWheelEventListeners();
  
  // Отрисовываем колесо
  drawWheel();
  
  console.log('✅ Колесо удачи инициализировано');
}

// Загрузка конфигурации колеса
async function loadWheelConfig() {
  try {
    const configDoc = await db.collection('wheelConfig').doc('settings').get();
    
    if (configDoc.exists) {
      wheelState.config = {
        ...wheelState.config,
        ...configDoc.data()
      };
    } else {
      // Создаем конфигурацию по умолчанию
      await db.collection('wheelConfig').doc('settings').set({
        active: true,
        cooldownHours: 24,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    
    console.log('📋 Конфигурация колеса загружена:', wheelState.config);
  } catch (error) {
    console.error('❌ Ошибка загрузки конфигурации:', error);
  }
}

// Загрузка призов
async function loadWheelPrizes() {
  try {
    const prizesSnapshot = await db.collection('wheelPrizes')
      .where('active', '==', true)
      .orderBy('probability', 'desc')
      .get();
    
    if (prizesSnapshot.empty) {
      // Создаем призы по умолчанию
      wheelState.prizes = await createDefaultPrizes();
    } else {
      wheelState.prizes = prizesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
    
    console.log('🎁 Призы загружены:', wheelState.prizes);
  } catch (error) {
    console.error('❌ Ошибка загрузки призов:', error);
    // Используем призы по умолчанию
    wheelState.prizes = getDefaultPrizes();
  }
}

// Призы по умолчанию
function getDefaultPrizes() {
  return [
    {
      id: 'bonus_50',
      name: '50 бонусов',
      description: '50 бонусных баллов на ваш счет',
      type: 'bonus',
      value: 50,
      probability: 25,
      color: '#4caf50',
      icon: '💎'
    },
    {
      id: 'discount_10',
      name: 'Скидка 10%',
      description: 'Промокод на скидку 10%',
      type: 'promo',
      value: 10,
      probability: 20,
      color: '#ff9800',
      icon: '🎫'
    },
    {
      id: 'bonus_100',
      name: '100 бонусов',
      description: '100 бонусных баллов на ваш счет',
      type: 'bonus',
      value: 100,
      probability: 15,
      color: '#2196f3',
      icon: '💰'
    },
    {
      id: 'free_shot',
      name: 'Бесплатный шот',
      description: 'Промокод на бесплатный шот',
      type: 'promo',
      value: 100,
      promoType: 'freeShot',
      probability: 10,
      color: '#e91e63',
      icon: '🍸'
    },
    {
      id: 'discount_15',
      name: 'Скидка 15%',
      description: 'Промокод на скидку 15%',
      type: 'promo',
      value: 15,
      probability: 10,
      color: '#9c27b0',
      icon: '🎁'
    },
    {
      id: 'bonus_20',
      name: '20 бонусов',
      description: '20 бонусных баллов на ваш счет',
      type: 'bonus',
      value: 20,
      probability: 15,
      color: '#00bcd4',
      icon: '✨'
    },
    {
      id: 'nothing',
      name: 'Повезет в другой раз',
      description: 'К сожалению, приз не выпал',
      type: 'nothing',
      value: 0,
      probability: 5,
      color: '#9e9e9e',
      icon: '😢'
    }
  ];
}

// Создание призов по умолчанию в Firestore
async function createDefaultPrizes() {
  const defaultPrizes = getDefaultPrizes();
  const batch = db.batch();
  
  for (const prize of defaultPrizes) {
    const prizeRef = db.collection('wheelPrizes').doc(prize.id);
    batch.set(prizeRef, {
      ...prize,
      active: true,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
  
  await batch.commit();
  console.log('✅ Призы по умолчанию созданы');
  
  return defaultPrizes;
}

// Настройка обработчиков событий
function setupWheelEventListeners() {
  // Кнопка открытия колеса
  if (wheelElements.openBtn) {
    wheelElements.openBtn.addEventListener('click', openWheelModal);
  }
  
  // Кнопка вращения
  if (wheelElements.spinButton) {
    wheelElements.spinButton.addEventListener('click', spinWheel);
  }
  
  // Закрытие модального окна
  const closeBtn = wheelElements.modal?.querySelector('.close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeWheelModal);
  }
}

// Открытие модального окна колеса
async function openWheelModal() {
  if (!auth.currentUser) {
    showError('Войдите в систему, чтобы крутить колесо');
    return;
  }
  
  wheelElements.modal.style.display = 'block';
  
  // Проверяем доступность
  await checkWheelAvailability();
  
  // Загружаем историю
  await loadWheelHistory();
  
  // Перерисовываем колесо
  drawWheel();
}

// Закрытие модального окна
function closeWheelModal() {
  wheelElements.modal.style.display = 'none';
  wheelElements.resultDiv.style.display = 'none';
}

// Проверка доступности колеса
async function checkWheelAvailability() {
  if (!auth.currentUser) return;
  
  try {
    const userId = auth.currentUser.uid;
    const userSpinDoc = await db.collection('wheelSpins').doc(userId).get();
    
    if (userSpinDoc.exists) {
      const data = userSpinDoc.data();
      wheelState.userLastSpin = data.lastSpinDate?.toDate();
      
      if (wheelState.userLastSpin) {
        const now = new Date();
        const timeDiff = now - wheelState.userLastSpin;
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        
        if (hoursDiff < wheelState.config.cooldownHours) {
          // Колесо недоступно
          const remainingTime = wheelState.config.cooldownHours - hoursDiff;
          const remainingHours = Math.floor(remainingTime);
          const remainingMinutes = Math.floor((remainingTime - remainingHours) * 60);
          
          wheelElements.spinButton.disabled = true;
          wheelElements.availabilityInfo.innerHTML = `
            <div class="availability-locked">
              🔒 Колесо будет доступно через:
              <div class="availability-timer">${remainingHours}ч ${remainingMinutes}м</div>
            </div>
          `;
          
          // Обновляем статус в карточке профиля
          const wheelCardStatus = document.getElementById('wheelCardStatus');
          if (wheelCardStatus) {
            wheelCardStatus.textContent = `Доступно через ${remainingHours}ч ${remainingMinutes}м`;
          }
          
          return false;
        }
      }
    }
    
    // Колесо доступно
    wheelElements.spinButton.disabled = false;
    wheelElements.availabilityInfo.innerHTML = `
      <div class="availability-available">
        🎉 Колесо готово к вращению!
        <p style="margin-top: 0.5rem; font-size: 0.9rem; font-weight: normal;">
          Нажмите кнопку в центре колеса
        </p>
      </div>
    `;
    
    // Обновляем статус в карточке профиля
    const wheelCardStatus = document.getElementById('wheelCardStatus');
    if (wheelCardStatus) {
      wheelCardStatus.textContent = 'Доступно сегодня!';
    }
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка проверки доступности:', error);
    return false;
  }
}

// Отрисовка колеса
function drawWheel() {
  if (!wheelElements.ctx || wheelState.prizes.length === 0) return;
  
  const canvas = wheelElements.canvas;
  const ctx = wheelElements.ctx;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(centerX, centerY) - 10;
  
  // Очищаем canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Рисуем сектора
  const totalPrizes = wheelState.prizes.length;
  const anglePerPrize = (2 * Math.PI) / totalPrizes;
  
  wheelState.prizes.forEach((prize, index) => {
    const startAngle = index * anglePerPrize + wheelState.currentRotation;
    const endAngle = startAngle + anglePerPrize;
    
    // Рисуем сектор
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    
    // Заливаем цветом
    ctx.fillStyle = prize.color || '#ff9800';
    ctx.fill();
    
    // Обводка
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Текст приза
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(startAngle + anglePerPrize / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Иконка
    ctx.font = 'bold 30px Arial';
    ctx.fillStyle = '#fff';
    ctx.fillText(prize.icon || '🎁', radius * 0.65, 0);
    
    // Название
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText(prize.name, radius * 0.4, 0);
    
    ctx.restore();
  });
  
  // Центральный круг
  ctx.beginPath();
  ctx.arc(centerX, centerY, 60, 0, 2 * Math.PI);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.strokeStyle = '#ff9800';
  ctx.lineWidth = 5;
  ctx.stroke();
}

// Вращение колеса
async function spinWheel() {
  if (wheelState.isSpinning) return;
  
  // Проверяем доступность
  const isAvailable = await checkWheelAvailability();
  if (!isAvailable) {
    showError('Колесо пока недоступно. Попробуйте позже');
    return;
  }
  
  wheelState.isSpinning = true;
  wheelElements.spinButton.disabled = true;
  wheelElements.resultDiv.style.display = 'none';
  
  // Выбираем приз
  const selectedPrize = selectPrizeByProbability();
  console.log('🎯 Выбран приз:', selectedPrize);
  
  // Вычисляем угол для остановки на выбранном призе
  const prizeIndex = wheelState.prizes.findIndex(p => p.id === selectedPrize.id);
  const anglePerPrize = (2 * Math.PI) / wheelState.prizes.length;
  const targetAngle = (prizeIndex * anglePerPrize) + (anglePerPrize / 2);
  
  // Количество полных оборотов + целевой угол
  const fullRotations = 5 + Math.random() * 3; // 5-8 оборотов
  const totalRotation = (fullRotations * 2 * Math.PI) + (2 * Math.PI - targetAngle);
  
  // Анимация вращения
  const duration = 4000; // 4 секунды
  const startTime = Date.now();
  const startRotation = wheelState.currentRotation;
  
  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease-out функция
    const easeOut = 1 - Math.pow(1 - progress, 3);
    
    wheelState.currentRotation = startRotation + (totalRotation * easeOut);
    drawWheel();
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      // Вращение завершено
      wheelState.isSpinning = false;
      onSpinComplete(selectedPrize);
    }
  }
  
  animate();
  
  // Сохраняем попытку в базу
  await saveSpinAttempt(selectedPrize);
}

// Выбор приза по вероятности
function selectPrizeByProbability() {
  const totalProbability = wheelState.prizes.reduce((sum, prize) => sum + (prize.probability || 0), 0);
  const random = Math.random() * totalProbability;
  
  let cumulativeProbability = 0;
  for (const prize of wheelState.prizes) {
    cumulativeProbability += prize.probability || 0;
    if (random <= cumulativeProbability) {
      return prize;
    }
  }
  
  // На случай ошибок округления
  return wheelState.prizes[wheelState.prizes.length - 1];
}

// Завершение вращения
async function onSpinComplete(prize) {
  console.log('🎊 Вращение завершено! Приз:', prize);
  
  // Показываем результат
  wheelElements.resultDiv.style.display = 'block';
  document.getElementById('resultIcon').textContent = prize.icon || '🎁';
  document.getElementById('resultTitle').textContent = prize.name;
  document.getElementById('resultDescription').textContent = prize.description;
  
  // Настраиваем кнопку получения приза
  const claimBtn = document.getElementById('claimPrizeBtn');
  claimBtn.onclick = () => claimPrize(prize);
  
  // Эффекты
  if (prize.type !== 'nothing') {
    playConfetti();
  }
  
  // Обновляем историю
  await loadWheelHistory();
}

// Получение приза
async function claimPrize(prize) {
  if (!auth.currentUser) return;
  
  try {
    const userId = auth.currentUser.uid;
    
    if (prize.type === 'bonus') {
      // Начисляем бонусы
      await db.collection('users').doc(userId).update({
        bonusPoints: firebase.firestore.FieldValue.increment(prize.value),
        totalEarned: firebase.firestore.FieldValue.increment(prize.value)
      });
      
      showSuccess(`🎉 ${prize.value} бонусов начислено на ваш счет!`);
      
      // Обновляем отображение бонусов
      if (typeof loadUserBonuses === 'function') {
        await loadUserBonuses();
      }
      
    } else if (prize.type === 'promo') {
      // Создаем промокод
      const promoCode = await createWheelPromoCode(prize);
      
      showSuccess(`🎫 Промокод создан: ${promoCode}\nПримените его при заказе!`);
      
    } else if (prize.type === 'nothing') {
      showInfo('😢 В этот раз не повезло, но попробуйте завтра!');
    }
    
    // Обновляем статус приза
    await db.collection('wheelSpins').doc(userId).update({
      [`prizes.${wheelState.prizes.findIndex(p => p.id === prize.id)}.claimed`]: true,
      [`prizes.${wheelState.prizes.findIndex(p => p.id === prize.id)}.claimedAt`]: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Закрываем модальное окно
    setTimeout(() => {
      closeWheelModal();
    }, 2000);
    
  } catch (error) {
    console.error('❌ Ошибка получения приза:', error);
    showError('Произошла ошибка при получении приза');
  }
}

// Создание промокода из колеса
async function createWheelPromoCode(prize) {
  const code = `WHEEL${Date.now().toString(36).toUpperCase()}`;
  
  const promoData = {
    code: code,
    discount: prize.value,
    description: prize.description,
    active: true,
    maxUses: 1,
    currentUses: 0,
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 дней
    createdBy: 'wheel',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  if (prize.promoType === 'freeShot') {
    promoData.freeShot = true;
  }
  
  await db.collection('promocodes').doc(code).set(promoData);
  
  // Привязываем к пользователю
  const userId = auth.currentUser.uid;
  await db.collection('userPromocodes').add({
    userId: userId,
    promoCode: code,
    source: 'wheel',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  
  return code;
}

// Сохранение попытки вращения
async function saveSpinAttempt(prize) {
  if (!auth.currentUser) return;
  
  try {
    const userId = auth.currentUser.uid;
    const spinData = {
      userId: userId,
      prize: {
        id: prize.id,
        name: prize.name,
        type: prize.type,
        value: prize.value,
        claimed: false
      },
      lastSpinDate: firebase.firestore.FieldValue.serverTimestamp(),
      totalSpins: firebase.firestore.FieldValue.increment(1)
    };
    
    await db.collection('wheelSpins').doc(userId).set(spinData, { merge: true });
    
    // Обновляем статус доступности
    await checkWheelAvailability();
    
    console.log('✅ Попытка вращения сохранена');
  } catch (error) {
    console.error('❌ Ошибка сохранения попытки:', error);
  }
}

// Загрузка истории вращений
async function loadWheelHistory() {
  if (!auth.currentUser || !wheelElements.historyList) return;
  
  try {
    const userId = auth.currentUser.uid;
    const userSpinDoc = await db.collection('wheelSpins').doc(userId).get();
    
    if (!userSpinDoc.exists) {
      wheelElements.historyList.innerHTML = `
        <p style="text-align: center; color: #999; padding: 2rem;">
          История пуста. Крутите колесо!
        </p>
      `;
      return;
    }
    
    const data = userSpinDoc.data();
    const prize = data.prize;
    
    if (!prize) {
      wheelElements.historyList.innerHTML = `
        <p style="text-align: center; color: #999; padding: 2rem;">
          История пуста. Крутите колесо!
        </p>
      `;
      return;
    }
    
    const lastSpinDate = data.lastSpinDate?.toDate();
    const dateStr = lastSpinDate ? formatDate(lastSpinDate) : 'Недавно';
    
    wheelElements.historyList.innerHTML = `
      <div class="wheel-history-item">
        <div class="history-item-icon">
          ${wheelState.prizes.find(p => p.id === prize.id)?.icon || '🎁'}
        </div>
        <div class="history-item-info">
          <div class="history-item-prize">${prize.name}</div>
          <div class="history-item-date">${dateStr}</div>
        </div>
        <div class="history-item-status ${prize.claimed ? 'claimed' : 'pending'}">
          ${prize.claimed ? 'Получен' : 'Ожидает'}
        </div>
      </div>
    `;
    
  } catch (error) {
    console.error('❌ Ошибка загрузки истории:', error);
  }
}

// Эффект конфетти
function playConfetti() {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };
  
  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }
  
  const interval = setInterval(function() {
    const timeLeft = animationEnd - Date.now();
    
    if (timeLeft <= 0) {
      return clearInterval(interval);
    }
    
    const particleCount = 50 * (timeLeft / duration);
    
    // Создаем конфетти (упрощенная версия)
    for (let i = 0; i < particleCount; i++) {
      createConfettiParticle();
    }
  }, 250);
}

// Создание частицы конфетти
function createConfettiParticle() {
  const confetti = document.createElement('div');
  confetti.style.position = 'fixed';
  confetti.style.width = '10px';
  confetti.style.height = '10px';
  confetti.style.backgroundColor = ['#ff9800', '#4caf50', '#2196f3', '#e91e63', '#9c27b0'][Math.floor(Math.random() * 5)];
  confetti.style.left = Math.random() * window.innerWidth + 'px';
  confetti.style.top = '-20px';
  confetti.style.zIndex = '10000';
  confetti.style.borderRadius = '50%';
  confetti.style.pointerEvents = 'none';
  confetti.style.animation = 'confettiDrop 3s linear forwards';
  
  document.body.appendChild(confetti);
  
  setTimeout(() => {
    confetti.remove();
  }, 3000);
}

// ========================================
// АДМИН-ПАНЕЛЬ ДЛЯ КОЛЕСА УДАЧИ
// ========================================

// Инициализация админ-панели колеса
async function initWheelAdmin() {
  console.log('🔧 Инициализация админ-панели колеса...');
  
  // Обработчики событий
  const saveSettingsBtn = document.getElementById('saveWheelSettingsBtn');
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', saveWheelSettings);
  }
  
  const addPrizeBtn = document.getElementById('addWheelPrizeBtn');
  if (addPrizeBtn) {
    addPrizeBtn.addEventListener('click', showAddPrizeForm);
  }
  
  // Загружаем данные при открытии вкладки
  const wheelTab = document.querySelector('[data-tab="wheel"]');
  if (wheelTab) {
    wheelTab.addEventListener('click', () => {
      loadWheelAdminData();
    });
  }
}

// Загрузка данных админ-панели
async function loadWheelAdminData() {
  await loadWheelAdminStats();
  await loadWheelAdminSettings();
  await loadWheelAdminPrizes();
  await loadWheelAdminHistory();
}

// Загрузка статистики
async function loadWheelAdminStats() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Вращения сегодня
    const spinsToday = await db.collection('wheelSpins')
      .where('lastSpinDate', '>=', today)
      .get();
    
    document.getElementById('wheelSpinsToday').textContent = spinsToday.size;
    
    // Всего вращений
    const totalSpins = await db.collection('wheelSpins').get();
    document.getElementById('wheelTotalSpins').textContent = totalSpins.size;
    
    // Призов выдано
    let prizesGiven = 0;
    totalSpins.forEach(doc => {
      const data = doc.data();
      if (data.prize && data.prize.claimed) {
        prizesGiven++;
      }
    });
    
    document.getElementById('wheelPrizesGiven').textContent = prizesGiven;
    
  } catch (error) {
    console.error('❌ Ошибка загрузки статистики:', error);
  }
}

// Загрузка настроек
async function loadWheelAdminSettings() {
  try {
    const configDoc = await db.collection('wheelConfig').doc('settings').get();
    
    if (configDoc.exists) {
      const data = configDoc.data();
      document.getElementById('wheelActive').checked = data.active !== false;
      document.getElementById('wheelCooldown').value = data.cooldownHours || 24;
    }
  } catch (error) {
    console.error('❌ Ошибка загрузки настроек:', error);
  }
}

// Сохранение настроек
async function saveWheelSettings() {
  try {
    const active = document.getElementById('wheelActive').checked;
    const cooldownHours = parseInt(document.getElementById('wheelCooldown').value) || 24;
    
    await db.collection('wheelConfig').doc('settings').set({
      active: active,
      cooldownHours: cooldownHours,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    showSuccess('✅ Настройки сохранены');
    
    // Обновляем состояние
    await loadWheelConfig();
    
  } catch (error) {
    console.error('❌ Ошибка сохранения настроек:', error);
    showError('Ошибка сохранения настроек');
  }
}

// Загрузка призов в админке
async function loadWheelAdminPrizes() {
  try {
    const prizesSnapshot = await db.collection('wheelPrizes')
      .orderBy('probability', 'desc')
      .get();
    
    const prizesList = document.getElementById('wheelPrizesList');
    if (!prizesList) return;
    
    if (prizesSnapshot.empty) {
      prizesList.innerHTML = '<p style="text-align: center; color: #999;">Нет призов</p>';
      return;
    }
    
    let html = '';
    prizesSnapshot.forEach(doc => {
      const prize = doc.data();
      html += `
        <div class="prize-item" data-prize-id="${doc.id}">
          <div class="prize-item-icon">${prize.icon || '🎁'}</div>
          <div class="prize-item-info">
            <div class="prize-item-name">${prize.name}</div>
            <div class="prize-item-description">${prize.description}</div>
            <span class="prize-item-probability">${prize.probability}% вероятность</span>
          </div>
          <div class="prize-item-actions">
            <button class="admin-btn warning" onclick="editWheelPrize('${doc.id}')">
              <i class="fas fa-edit"></i> Изменить
            </button>
            <button class="admin-btn danger" onclick="deleteWheelPrize('${doc.id}')">
              <i class="fas fa-trash"></i> Удалить
            </button>
          </div>
        </div>
      `;
    });
    
    prizesList.innerHTML = html;
    
  } catch (error) {
    console.error('❌ Ошибка загрузки призов:', error);
  }
}

// Показать форму добавления приза
function showAddPrizeForm() {
  const name = prompt('Название приза:');
  if (!name) return;
  
  const description = prompt('Описание приза:');
  const type = prompt('Тип приза (bonus/promo/nothing):');
  const value = parseInt(prompt('Значение (для бонусов - количество, для промо - процент):')) || 0;
  const probability = parseInt(prompt('Вероятность (в процентах):')) || 10;
  const color = prompt('Цвет (hex):') || '#ff9800';
  const icon = prompt('Иконка (emoji):') || '🎁';
  
  addWheelPrize({ name, description, type, value, probability, color, icon });
}

// Добавление приза
async function addWheelPrize(prizeData) {
  try {
    await db.collection('wheelPrizes').add({
      ...prizeData,
      active: true,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    showSuccess('✅ Приз добавлен');
    await loadWheelAdminPrizes();
    await loadWheelPrizes();
    drawWheel();
    
  } catch (error) {
    console.error('❌ Ошибка добавления приза:', error);
    showError('Ошибка добавления приза');
  }
}

// Удаление приза
async function deleteWheelPrize(prizeId) {
  if (!confirm('Удалить этот приз?')) return;
  
  try {
    await db.collection('wheelPrizes').doc(prizeId).delete();
    
    showSuccess('✅ Приз удален');
    await loadWheelAdminPrizes();
    await loadWheelPrizes();
    drawWheel();
    
  } catch (error) {
    console.error('❌ Ошибка удаления приза:', error);
    showError('Ошибка удаления приза');
  }
}

// Загрузка истории в админке
async function loadWheelAdminHistory() {
  try {
    const spinsSnapshot = await db.collection('wheelSpins')
      .orderBy('lastSpinDate', 'desc')
      .limit(50)
      .get();
    
    const historyList = document.getElementById('wheelSpinsHistoryList');
    if (!historyList) return;
    
    if (spinsSnapshot.empty) {
      historyList.innerHTML = '<p style="text-align: center; color: #999;">История пуста</p>';
      return;
    }
    
    let html = '';
    for (const doc of spinsSnapshot.docs) {
      const data = doc.data();
      const userId = doc.id;
      
      // Получаем данные пользователя
      const userDoc = await db.collection('users').doc(userId).get();
      const userName = userDoc.exists ? userDoc.data().displayName : 'Неизвестный';
      
      const date = data.lastSpinDate?.toDate();
      const dateStr = date ? formatDate(date) : 'Недавно';
      
      html += `
        <div class="admin-list-item">
          <div class="item-info">
            <strong>${userName}</strong>
            <p>Приз: ${data.prize?.name || 'Не определен'}</p>
            <small>${dateStr}</small>
          </div>
          <div class="item-status ${data.prize?.claimed ? 'success' : 'pending'}">
            ${data.prize?.claimed ? '✓ Получен' : '⏳ Ожидает'}
          </div>
        </div>
      `;
    }
    
    historyList.innerHTML = html;
    
  } catch (error) {
    console.error('❌ Ошибка загрузки истории:', error);
  }
}

// Форматирование даты
function formatDate(date) {
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} дн. назад`;
  if (hours > 0) return `${hours} ч. назад`;
  if (minutes > 0) return `${minutes} мин. назад`;
  return 'Только что';
}

// ========================================
// ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ
// ========================================

// Инициализируем колесо после загрузки Firebase
firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    // Небольшая задержка для загрузки всех зависимостей
    setTimeout(async () => {
      await initWheelOfFortune();
      await initWheelAdmin();
    }, 1000);
  }
});

console.log('🎰 Модуль колеса удачи загружен');

