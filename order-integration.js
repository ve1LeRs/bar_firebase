// ============================================
// ИНТЕГРАЦИЯ СЧАСТЛИВЫХ ЧАСОВ И БОНУСОВ С ЗАКАЗАМИ
// ============================================

// Глобальные переменные для заказа
let orderHappyHourDiscount = 0;
let orderBonusAmount = 0;
let orderOriginalPrice = 0;
let orderFinalPrice = 0;

// Обработчик применения бонусов
document.addEventListener('DOMContentLoaded', () => {
  const applyBonusBtn = document.getElementById('applyBonusBtn');
  applyBonusBtn?.addEventListener('click', () => {
    applyBonusToOrder();
  });
});

// Обновление отображения заказа с учётом всех скидок
async function updateOrderDisplay(name, image, originalPrice) {
  const orderSummary = document.getElementById('orderSummary');
  const orderImagePreview = document.getElementById('orderImagePreview');
  const orderOriginalPriceEl = document.getElementById('orderOriginalPrice');
  const orderHappyHourDiscountEl = document.getElementById('orderHappyHourDiscount');
  const orderHHPercentEl = document.getElementById('orderHHPercent');
  const orderHHAmountEl = document.getElementById('orderHHAmount');
  const orderBonusSectionEl = document.getElementById('orderBonusSection');
  const orderAvailableBonusesEl = document.getElementById('orderAvailableBonuses');
  const orderBonusInputEl = document.getElementById('orderBonusInput');
  const orderBonusEarnEl = document.getElementById('orderBonusEarn');
  const orderBonusEarnAmountEl = document.getElementById('orderBonusEarnAmount');
  const orderPriceEl = document.getElementById('orderPrice');
  
  // Устанавливаем данные заказа
  if (orderSummary) {
    orderSummary.innerHTML = `Вы заказываете: <strong>${name}</strong>`;
  }
  
  if (orderImagePreview && image) {
    orderImagePreview.src = image;
    orderImagePreview.style.display = 'block';
  } else if (orderImagePreview) {
    orderImagePreview.style.display = 'none';
  }
  
  // Устанавливаем исходную цену
  if (orderOriginalPriceEl) {
    orderOriginalPriceEl.textContent = `${originalPrice} ₽`;
  }
  
  // Проверяем и применяем скидку счастливых часов
  const hhDiscount = getHappyHourDiscount();
  let currentPrice = originalPrice;
  
  if (hhDiscount > 0) {
    const hhAmount = Math.round(originalPrice * hhDiscount / 100);
    orderHappyHourDiscount = hhAmount;
    currentPrice -= hhAmount;
    
    if (orderHHPercentEl) orderHHPercentEl.textContent = hhDiscount;
    if (orderHHAmountEl) orderHHAmountEl.textContent = hhAmount;
    if (orderHappyHourDiscountEl) orderHappyHourDiscountEl.style.display = 'flex';
  } else {
    if (orderHappyHourDiscountEl) orderHappyHourDiscountEl.style.display = 'none';
  }
  
  // Показываем секцию бонусов, если пользователь авторизован
  const user = firebase.auth().currentUser;
  if (user && orderBonusSectionEl) {
    const userBonuses = await getUserBonusBalance(user.uid);
    
    if (userBonuses > 0) {
      orderBonusSectionEl.style.display = 'block';
      
      if (orderAvailableBonusesEl) {
        orderAvailableBonusesEl.textContent = userBonuses;
      }
      
      if (orderBonusInputEl) {
        // Максимум можно использовать
        const maxBonusUsage = bonusSettings ? Math.floor(currentPrice * bonusSettings.maxUsage / 100) : Math.floor(currentPrice * 0.5);
        const maxBonusToUse = Math.min(userBonuses, maxBonusUsage);
        
        orderBonusInputEl.max = maxBonusToUse;
        orderBonusInputEl.placeholder = `До ${maxBonusToUse} баллов`;
      }
    } else {
      orderBonusSectionEl.style.display = 'none';
    }
  }
  
  // Показываем, сколько бонусов будет начислено
  if (bonusSettings && bonusSettings.active && currentPrice >= bonusSettings.minOrder) {
    const earnAmount = Math.floor(currentPrice * bonusSettings.percentage / 100);
    
    if (orderBonusEarnAmountEl) orderBonusEarnAmountEl.textContent = earnAmount;
    if (orderBonusEarnEl) orderBonusEarnEl.style.display = 'flex';
  } else {
    if (orderBonusEarnEl) orderBonusEarnEl.style.display = 'none';
  }
  
  // Устанавливаем финальную цену
  orderFinalPrice = currentPrice;
  if (orderPriceEl) {
    orderPriceEl.textContent = `${currentPrice} ₽`;
  }
  
  // Обновляем глобальный объект заказа
  if (currentOrder) {
    currentOrder.price = currentPrice;
    currentOrder.originalPrice = originalPrice;
    currentOrder.happyHourDiscount = hhDiscount;
  }
}

// Применение бонусов к заказу
function applyBonusToOrder() {
  const orderBonusInputEl = document.getElementById('orderBonusInput');
  const orderBonusMessageEl = document.getElementById('orderBonusMessage');
  const orderBonusDiscountEl = document.getElementById('orderBonusDiscount');
  const orderBonusAmountEl = document.getElementById('orderBonusAmount');
  const orderPriceEl = document.getElementById('orderPrice');
  const orderBonusEarnEl = document.getElementById('orderBonusEarn');
  const orderBonusEarnAmountEl = document.getElementById('orderBonusEarnAmount');
  
  if (!orderBonusInputEl) return;
  
  const bonusToUse = parseInt(orderBonusInputEl.value) || 0;
  const maxBonus = parseInt(orderBonusInputEl.max) || 0;
  
  if (bonusToUse <= 0) {
    if (orderBonusMessageEl) {
      orderBonusMessageEl.textContent = 'Укажите количество бонусов';
      orderBonusMessageEl.className = 'bonus-message error';
    }
    return;
  }
  
  if (bonusToUse > maxBonus) {
    if (orderBonusMessageEl) {
      orderBonusMessageEl.textContent = `Максимум ${maxBonus} баллов`;
      orderBonusMessageEl.className = 'bonus-message error';
    }
    return;
  }
  
  // Применяем бонусы
  orderBonusAmount = bonusToUse;
  const priceAfterHH = orderOriginalPrice - orderHappyHourDiscount;
  orderFinalPrice = priceAfterHH - bonusToUse;
  
  // Обновляем отображение
  if (orderBonusAmountEl) orderBonusAmountEl.textContent = bonusToUse;
  if (orderBonusDiscountEl) orderBonusDiscountEl.style.display = 'flex';
  
  if (orderPriceEl) {
    orderPriceEl.textContent = `${orderFinalPrice} ₽`;
  }
  
  if (orderBonusMessageEl) {
    orderBonusMessageEl.textContent = `✅ Применено ${bonusToUse} бонусов`;
    orderBonusMessageEl.className = 'bonus-message success';
  }
  
  // Обновляем начисление бонусов (теперь начислим меньше, так как оплатили бонусами)
  if (bonusSettings && bonusSettings.active && orderFinalPrice >= bonusSettings.minOrder) {
    const earnAmount = Math.floor(orderFinalPrice * bonusSettings.percentage / 100);
    if (orderBonusEarnAmountEl) orderBonusEarnAmountEl.textContent = earnAmount;
    if (orderBonusEarnEl) orderBonusEarnEl.style.display = 'flex';
  } else {
    if (orderBonusEarnEl) orderBonusEarnEl.style.display = 'none';
  }
  
  // Отключаем поле ввода
  orderBonusInputEl.disabled = true;
  
  // Обновляем глобальный объект заказа
  if (currentOrder) {
    currentOrder.bonusDiscount = bonusToUse;
    currentOrder.price = orderFinalPrice;
  }
}

// НЕ переопределяем confirmOrder - используем существующий из script.js
// Вместо этого, добавим обработку бонусов и счастливых часов через расширение существующей логики

// Функция получения следующей позиции в очереди (если ещё не определена)
if (typeof getNextQueuePosition === 'undefined') {
  async function getNextQueuePosition() {
    try {
      const activeOrdersSnapshot = await db.collection('orders')
        .where('status', 'in', ['confirmed', 'preparing', 'ready'])
        .orderBy('queuePosition', 'desc')
        .limit(1)
        .get();
      
      if (activeOrdersSnapshot.empty) {
        return 1;
      }
      
      const lastOrder = activeOrdersSnapshot.docs[0];
      const lastPosition = lastOrder.data().queuePosition || 0;
      return lastPosition + 1;
      
    } catch (error) {
      console.error('❌ Ошибка получения позиции в очереди:', error);
      return Date.now();
    }
  }
}

// Функция добавления заказа в счет (если ещё не определена)
if (typeof addOrderToBill === 'undefined') {
  async function addOrderToBill(userId, orderData) {
    try {
      const userBillsSnapshot = await db.collection('bills')
        .where('userId', '==', userId)
        .where('status', '==', 'open')
        .limit(1)
        .get();
      
      if (!userBillsSnapshot.empty) {
        const billDoc = userBillsSnapshot.docs[0];
        const billData = billDoc.data();
        
        await db.collection('bills').doc(billDoc.id).update({
          items: firebase.firestore.FieldValue.arrayUnion(orderData),
          totalAmount: firebase.firestore.FieldValue.increment(orderData.finalPrice),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        const user = firebase.auth().currentUser;
        await db.collection('bills').add({
          userId: userId,
          userName: user ? user.displayName || 'Гость' : 'Гость',
          items: [orderData],
          totalAmount: orderData.finalPrice,
          originalTotal: orderData.finalPrice,
          discount: 0,
          status: 'open',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          paidAt: null,
          paymentMethod: null,
          paymentId: null
        });
      }
      
    } catch (error) {
      console.error('❌ Ошибка добавления в счет:', error);
    }
  }
}

console.log('✅ Интеграция счастливых часов и бонусов с заказами завершена');

