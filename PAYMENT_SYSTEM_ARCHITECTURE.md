# 💳 Архитектура системы оплаты и оценок

## Структура данных Firestore

### 1. Коллекция `bills` (Счета)
```javascript
{
  billId: "bill_123",
  userId: "user_456",
  userName: "Иван Петров",
  userPhone: "+79991234567",
  items: [
    {
      orderId: "order_789",
      cocktailId: "cocktail_001",
      cocktailName: "Мохито",
      price: 500,
      timestamp: "2025-01-15T20:30:00Z",
      status: "completed", // pending, confirmed, preparing, ready, completed
      rated: false
    }
  ],
  totalAmount: 1500,
  status: "open", // open, paid, cancelled
  createdAt: "2025-01-15T20:00:00Z",
  paidAt: null,
  paymentMethod: null, // sbp, card
  paymentId: null // ID платежа из ЮKassa
}
```

### 2. Коллекция `cocktails` (дополнение)
```javascript
{
  id: "cocktail_001",
  name: "Мохито",
  // ... существующие поля ...
  rating: {
    average: 4.5,
    count: 127,
    sum: 572
  },
  reviews: [] // или отдельная коллекция
}
```

### 3. Коллекция `ratings` (Оценки)
```javascript
{
  ratingId: "rating_001",
  userId: "user_456",
  userName: "Иван Петров",
  orderId: "order_789",
  cocktailId: "cocktail_001",
  cocktailName: "Мохито",
  rating: 5, // от 1 до 5
  comment: "Отличный коктейль!", // опционально
  timestamp: "2025-01-15T21:00:00Z"
}
```

### 4. Коллекция `payments` (Платежи)
```javascript
{
  paymentId: "payment_123",
  billId: "bill_123",
  userId: "user_456",
  amount: 1500,
  status: "pending", // pending, succeeded, failed, cancelled
  paymentMethod: "sbp",
  yukassaPaymentId: "2c7e5c3a-...",
  confirmationUrl: "https://yoomoney.ru/...",
  createdAt: "2025-01-15T22:00:00Z",
  paidAt: null
}
```

## 🔄 Флоу системы

### Флоу 1: Создание заказа
```
1. Пользователь выбирает коктейль
2. Нажимает "Подтвердить заказ"
3. Создается order в коллекции orders (как сейчас)
4. Создается или обновляется bill для этого пользователя
5. Заказ добавляется в items массив счета
6. Уведомление бармену
```

### Флоу 2: Оплата счета
```
1. Пользователь открывает "Мой счет"
2. Видит список всех заказанных коктейлей и общую сумму
3. Нажимает "Оплатить счет"
4. Выбирает метод оплаты (СБП/Карта)
5. Создается payment в Firestore
6. Запрос к ЮKassa API для создания платежа
7. Получаем confirmation_url
8. Перенаправляем пользователя на страницу оплаты
9. ЮKassa отправляет webhook после оплаты
10. Обновляем статус bill на "paid"
```

### Флоу 3: Оценка коктейля
```
1. Бармен меняет статус заказа на "ready"
2. Пользователь получает уведомление
3. Показывается модальное окно "Ваш заказ готов!"
4. Через некоторое время (или когда статус → completed)
5. Показывается модальное окно с оценкой
6. Пользователь ставит звезды (1-5)
7. Сохраняется в коллекцию ratings
8. Обновляется средний рейтинг в cocktails
9. Отмечается rated: true в bill.items
```

## 💰 Интеграция с ЮKassa

### Backend (Node.js + Express)

#### 1. Установка SDK
```bash
npm install yookassa
```

#### 2. Создание платежа
```javascript
// server.js
const { YooKassa } = require('yookassa');

const yookassa = new YooKassa({
  shopId: process.env.YUKASSA_SHOP_ID,
  secretKey: process.env.YUKASSA_SECRET_KEY
});

// Эндпоинт для создания платежа
app.post('/api/create-payment', async (req, res) => {
  try {
    const { billId, amount, returnUrl } = req.body;
    
    const payment = await yookassa.createPayment({
      amount: {
        value: amount.toFixed(2),
        currency: 'RUB'
      },
      confirmation: {
        type: 'redirect',
        return_url: returnUrl
      },
      capture: true,
      description: `Оплата счета ${billId}`,
      metadata: {
        billId: billId
      }
    });
    
    // Сохраняем payment в Firestore
    await admin.firestore().collection('payments').add({
      paymentId: payment.id,
      billId: billId,
      amount: amount,
      status: payment.status,
      confirmationUrl: payment.confirmation.confirmation_url,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({
      success: true,
      confirmationUrl: payment.confirmation.confirmation_url,
      paymentId: payment.id
    });
  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

#### 3. Webhook для обработки статуса платежа
```javascript
// server.js
app.post('/api/payment-webhook', async (req, res) => {
  try {
    const notification = req.body;
    
    // Проверка подлинности webhook (опционально)
    // ...
    
    const payment = notification.object;
    
    if (payment.status === 'succeeded') {
      const billId = payment.metadata.billId;
      
      // Обновляем статус счета
      await admin.firestore().collection('bills').doc(billId).update({
        status: 'paid',
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        paymentId: payment.id
      });
      
      // Обновляем статус платежа
      const paymentSnapshot = await admin.firestore()
        .collection('payments')
        .where('paymentId', '==', payment.id)
        .get();
      
      if (!paymentSnapshot.empty) {
        await paymentSnapshot.docs[0].ref.update({
          status: 'succeeded',
          paidAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      
      console.log(`✅ Счет ${billId} успешно оплачен`);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ success: false });
  }
});
```

### Frontend

#### 1. Модальное окно "Мой счет"
```javascript
// script.js
async function showMyBill() {
  const user = firebase.auth().currentUser;
  if (!user) return;
  
  // Получаем активный счет пользователя
  const billSnapshot = await db.collection('bills')
    .where('userId', '==', user.uid)
    .where('status', '==', 'open')
    .get();
  
  if (billSnapshot.empty) {
    showNotification('У вас пока нет заказов', 'info');
    return;
  }
  
  const bill = billSnapshot.docs[0].data();
  const billId = billSnapshot.docs[0].id;
  
  // Показываем модальное окно со счетом
  showBillModal(bill, billId);
}

function showBillModal(bill, billId) {
  const modal = document.createElement('div');
  modal.className = 'modal bill-modal';
  modal.style.display = 'block';
  
  let itemsHTML = bill.items.map(item => `
    <div class="bill-item">
      <div class="bill-item-name">${item.cocktailName}</div>
      <div class="bill-item-price">${item.price} ₽</div>
      <div class="bill-item-status">${getStatusText(item.status)}</div>
    </div>
  `).join('');
  
  modal.innerHTML = `
    <div class="modal-content bill-content">
      <span class="close">&times;</span>
      <h3><i class="fas fa-receipt"></i> Ваш счет</h3>
      
      <div class="bill-items">
        ${itemsHTML}
      </div>
      
      <div class="bill-total">
        <span>Итого:</span>
        <span class="total-amount">${bill.totalAmount} ₽</span>
      </div>
      
      <div class="payment-methods">
        <button id="paySBP" class="payment-btn sbp-btn">
          <i class="fas fa-mobile-alt"></i> Оплатить через СБП
        </button>
        <button id="payCard" class="payment-btn card-btn">
          <i class="fas fa-credit-card"></i> Оплатить картой
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Обработчики
  modal.querySelector('.close').addEventListener('click', () => {
    modal.remove();
  });
  
  modal.querySelector('#paySBP').addEventListener('click', () => {
    processPayment(billId, bill.totalAmount, 'sbp');
  });
  
  modal.querySelector('#payCard').addEventListener('click', () => {
    processPayment(billId, bill.totalAmount, 'card');
  });
}

async function processPayment(billId, amount, method) {
  try {
    showLoader();
    
    const response = await fetch(`${SERVER_URL}/api/create-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        billId: billId,
        amount: amount,
        returnUrl: window.location.origin + '/payment-success.html'
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Перенаправляем на страницу оплаты ЮKassa
      window.location.href = data.confirmationUrl;
    } else {
      showError('Ошибка создания платежа');
    }
  } catch (error) {
    console.error('Payment error:', error);
    showError('Ошибка обработки платежа');
  } finally {
    hideLoader();
  }
}
```

#### 2. Модальное окно оценки коктейля
```javascript
// script.js
function showRatingModal(order) {
  const modal = document.createElement('div');
  modal.className = 'modal rating-modal';
  modal.style.display = 'block';
  
  modal.innerHTML = `
    <div class="modal-content rating-content">
      <h3><i class="fas fa-star"></i> Оцените коктейль</h3>
      
      <div class="cocktail-info">
        <img src="${order.image}" alt="${order.cocktailName}" class="rating-cocktail-image">
        <h4>${order.cocktailName}</h4>
      </div>
      
      <div class="rating-stars">
        <i class="far fa-star" data-rating="1"></i>
        <i class="far fa-star" data-rating="2"></i>
        <i class="far fa-star" data-rating="3"></i>
        <i class="far fa-star" data-rating="4"></i>
        <i class="far fa-star" data-rating="5"></i>
      </div>
      
      <textarea id="ratingComment" placeholder="Оставьте комментарий (необязательно)" rows="3"></textarea>
      
      <div class="rating-buttons">
        <button id="submitRating" class="submit-rating-btn" disabled>
          <i class="fas fa-check"></i> Отправить оценку
        </button>
        <button id="skipRating" class="skip-rating-btn">
          Пропустить
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  let selectedRating = 0;
  const stars = modal.querySelectorAll('.rating-stars i');
  const submitBtn = modal.querySelector('#submitRating');
  
  // Обработка наведения и клика на звезды
  stars.forEach(star => {
    star.addEventListener('mouseenter', function() {
      const rating = parseInt(this.dataset.rating);
      highlightStars(stars, rating);
    });
    
    star.addEventListener('click', function() {
      selectedRating = parseInt(this.dataset.rating);
      submitBtn.disabled = false;
    });
  });
  
  modal.querySelector('.rating-stars').addEventListener('mouseleave', () => {
    highlightStars(stars, selectedRating);
  });
  
  submitBtn.addEventListener('click', async () => {
    await submitRating(order, selectedRating, modal.querySelector('#ratingComment').value);
    modal.remove();
  });
  
  modal.querySelector('#skipRating').addEventListener('click', () => {
    modal.remove();
  });
}

function highlightStars(stars, rating) {
  stars.forEach((star, index) => {
    if (index < rating) {
      star.classList.remove('far');
      star.classList.add('fas');
    } else {
      star.classList.remove('fas');
      star.classList.add('far');
    }
  });
}

async function submitRating(order, rating, comment) {
  try {
    const user = firebase.auth().currentUser;
    
    // Сохраняем оценку
    await db.collection('ratings').add({
      userId: user.uid,
      userName: user.displayName,
      orderId: order.id,
      cocktailId: order.cocktailId,
      cocktailName: order.cocktailName,
      rating: rating,
      comment: comment,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Обновляем средний рейтинг коктейля
    await updateCocktailRating(order.cocktailId, rating);
    
    // Отмечаем заказ как оцененный
    await db.collection('orders').doc(order.id).update({
      rated: true
    });
    
    showNotification('Спасибо за вашу оценку! 🌟', 'success');
  } catch (error) {
    console.error('Rating submission error:', error);
    showError('Ошибка отправки оценки');
  }
}

async function updateCocktailRating(cocktailId, newRating) {
  const cocktailRef = db.collection('cocktails').doc(cocktailId);
  
  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(cocktailRef);
    
    if (!doc.exists) return;
    
    const data = doc.data();
    const currentRating = data.rating || { average: 0, count: 0, sum: 0 };
    
    const newCount = currentRating.count + 1;
    const newSum = currentRating.sum + newRating;
    const newAverage = newSum / newCount;
    
    transaction.update(cocktailRef, {
      'rating.average': Math.round(newAverage * 10) / 10,
      'rating.count': newCount,
      'rating.sum': newSum
    });
  });
}
```

## 🎨 CSS стили

```css
/* Счет */
.bill-modal .bill-content {
  max-width: 500px;
  padding: 2rem;
}

.bill-items {
  max-height: 400px;
  overflow-y: auto;
  margin: 1.5rem 0;
}

.bill-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 12px;
  margin-bottom: 0.5rem;
}

.bill-item-name {
  font-weight: 600;
  flex: 1;
}

.bill-item-price {
  font-weight: 700;
  color: #8e6f42;
  margin: 0 1rem;
}

.bill-item-status {
  font-size: 0.85rem;
  color: #6c757d;
}

.bill-total {
  display: flex;
  justify-content: space-between;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f9f7f3 0%, #f0ece6 100%);
  border-radius: 12px;
  font-size: 1.3rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
}

.total-amount {
  color: #8e6f42;
}

.payment-methods {
  display: flex;
  gap: 1rem;
}

.payment-btn {
  flex: 1;
  padding: 1rem;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.sbp-btn {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.card-btn {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: white;
}

.payment-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

/* Оценка */
.rating-modal .rating-content {
  max-width: 450px;
  padding: 2rem;
  text-align: center;
}

.cocktail-info {
  margin: 1.5rem 0;
}

.rating-cocktail-image {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 50%;
  border: 3px solid #f0f0f0;
  margin-bottom: 1rem;
}

.cocktail-info h4 {
  font-size: 1.4rem;
  color: #1a1a1a;
  margin: 0;
}

.rating-stars {
  display: flex;
  justify-content: center;
  gap: 0.8rem;
  margin: 2rem 0;
  font-size: 2.5rem;
}

.rating-stars i {
  color: #ffd700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.rating-stars i:hover {
  transform: scale(1.2);
}

.rating-stars i.fas {
  color: #ffd700;
  text-shadow: 0 2px 8px rgba(255, 215, 0, 0.5);
}

.rating-stars i.far {
  color: #ddd;
}

#ratingComment {
  width: 100%;
  padding: 1rem;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  resize: vertical;
  margin-bottom: 1.5rem;
}

.rating-buttons {
  display: flex;
  gap: 1rem;
}

.submit-rating-btn {
  flex: 2;
  padding: 1rem;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.submit-rating-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.submit-rating-btn:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(245, 87, 108, 0.3);
}

.skip-rating-btn {
  flex: 1;
  padding: 1rem;
  background: #e9ecef;
  color: #6c757d;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.skip-rating-btn:hover {
  background: #dee2e6;
}

/* Отображение рейтинга на карточке коктейля */
.cocktail-rating {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.cocktail-rating-stars {
  color: #ffd700;
  font-size: 1rem;
}

.cocktail-rating-text {
  font-size: 0.9rem;
  color: #6c757d;
}
```

## 📝 Переменные окружения Railway

Добавьте в Railway:
```
YUKASSA_SHOP_ID=your_shop_id
YUKASSA_SECRET_KEY=your_secret_key
```

## ✅ Пошаговый план реализации

1. **Настроить ЮKassa аккаунт**
2. **Добавить npm пакет yookassa**
3. **Создать эндпоинты для платежей**
4. **Создать систему счетов (bills)**
5. **Добавить UI для "Мой счет"**
6. **Создать систему оценок**
7. **Добавить отображение рейтинга на карточках**
8. **Тестирование**

---

Хотите, чтобы я начал реализацию? Или сначала обсудим детали?

