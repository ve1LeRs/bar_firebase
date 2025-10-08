// ============================================
// ИНТЕГРАЦИЯ СЧАСТЛИВЫХ ЧАСОВ И БОНУСОВ С ЗАКАЗАМИ
// ============================================

// Глобальные переменные для заказа
let orderHappyHourDiscount = 0;
let orderBonusAmount = 0;
let orderOriginalPrice = 0;
let orderFinalPrice = 0;

// Обработчик открытия модального окна заказа - обновляем логику
document.addEventListener('DOMContentLoaded', () => {
  // Переопределяем обработчик кнопок "Заказать"
  const orderButtons = document.querySelectorAll('.order-btn');
  
  orderButtons.forEach(button => {
    // Удаляем старые обработчики
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    
    newButton.addEventListener('click', async (e) => {
      const cocktailId = newButton.getAttribute('data-id');
      const name = newButton.getAttribute('data-name');
      const image = newButton.getAttribute('data-image');
      const price = parseInt(newButton.getAttribute('data-price')) || 0;
      
      const user = firebase.auth().currentUser;
      if (!user) {
        showError('Пожалуйста, войдите в систему для заказа');
        return;
      }
      
      // Проверяем стоп-лист
      const stoplistDoc = await db.collection('stoplist').doc(cocktailId).get();
      if (stoplistDoc.exists) {
        const stoplistData = stoplistDoc.data();
        showError(`😔 К сожалению, "${name}" временно недоступен. ${stoplistData.reason || ''}`);
        return;
      }
      
      // Сохраняем данные заказа
      orderOriginalPrice = price;
      orderHappyHourDiscount = 0;
      orderBonusAmount = 0;
      orderFinalPrice = price;
      
      // Создаём объект заказа
      currentOrder = {
        cocktailId: cocktailId,
        name: name,
        image: image,
        price: price,
        originalPrice: price,
        discount: 0,
        promoCode: null,
        happyHourDiscount: 0,
        bonusDiscount: 0
      };
      
      // Обновляем отображение заказа
      await updateOrderDisplay(name, image, price);
      
      // Показываем модальное окно
      const orderModal = document.getElementById('orderModal');
      if (orderModal) {
        orderModal.style.display = 'block';
        document.body.classList.add('modal-open');
      }
    });
  });
  
  // Обработчик применения бонусов
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

// Обработчик подтверждения заказа - обновляем логику
const originalConfirmOrder = document.getElementById('confirmOrder');
if (originalConfirmOrder) {
  const newConfirmOrder = originalConfirmOrder.cloneNode(true);
  originalConfirmOrder.parentNode.replaceChild(newConfirmOrder, originalConfirmOrder);
  
  newConfirmOrder.addEventListener('click', async () => {
    if (!currentOrder) return;
    
    // Предотвращаем множественные клики
    if (newConfirmOrder.disabled || newConfirmOrder.classList.contains('loading')) {
      return;
    }
    
    // Устанавливаем состояние загрузки
    newConfirmOrder.classList.add('loading');
    newConfirmOrder.disabled = true;
    const originalText = newConfirmOrder.innerHTML;
    newConfirmOrder.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправляем заказ...';
    
    try {
      const user = firebase.auth().currentUser;
      if (!user) {
        throw new Error('Необходима авторизация');
      }
      
      // Если используются бонусы - списываем их
      if (orderBonusAmount > 0) {
        const success = await spendBonusPoints(user.uid, orderBonusAmount, `pending_${Date.now()}`);
        if (!success) {
          throw new Error('Не удалось списать бонусы');
        }
      }
      
      // Получаем следующую позицию в очереди
      const queuePosition = await getNextQueuePosition();
      
      // Создаём заказ
      const orderData = {
        name: currentOrder.name,
        cocktailId: currentOrder.cocktailId,
        cocktailImage: currentOrder.image || '',
        user: user.displayName || 'Гость',
        userId: user.uid,
        status: 'confirmed',
        queuePosition: queuePosition,
        originalPrice: orderOriginalPrice,
        happyHourDiscount: orderHappyHourDiscount,
        bonusDiscount: orderBonusAmount,
        finalPrice: orderFinalPrice,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        displayTime: new Date().toLocaleString('ru-RU'),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      const docRef = await db.collection('orders').add(orderData);
      console.log('✅ Заказ создан:', docRef.id);
      
      // Начисляем бонусы (если применимо)
      if (orderFinalPrice > 0) {
        await awardBonusPoints(user.uid, orderFinalPrice, docRef.id);
      }
      
      // Добавляем заказ в текущий счет пользователя
      await addOrderToBill(user.uid, {
        ...orderData,
        orderId: docRef.id,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Закрываем модальное окно заказа
      const orderModal = document.getElementById('orderModal');
      if (orderModal) {
        orderModal.style.display = 'none';
        document.body.classList.remove('modal-open');
      }
      
      // Показываем уведомление об успешном заказе
      showNotification();
      
      // Сбрасываем данные
      currentOrder = null;
      orderHappyHourDiscount = 0;
      orderBonusAmount = 0;
      orderOriginalPrice = 0;
      orderFinalPrice = 0;
      
      // Обновляем баланс бонусов
      await updateBonusDisplay();
      
    } catch (error) {
      console.error('❌ Ошибка создания заказа:', error);
      showError('❌ Не удалось отправить заказ.');
    } finally {
      // Восстанавливаем состояние кнопки
      newConfirmOrder.classList.remove('loading');
      newConfirmOrder.disabled = false;
      newConfirmOrder.innerHTML = originalText;
    }
  });
}

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

