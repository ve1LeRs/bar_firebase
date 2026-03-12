// ============================================
// УПРАВЛЕНИЕ СЧЕТАМИ (АДМИН)
// ============================================

// Текущий фильтр счетов
let currentBillFilter = 'open';

// Загрузка списка счетов
async function loadAdminBills(filter = 'open') {
  try {
    currentBillFilter = filter;
    
    let query = db.collection('bills');
    
    // Применяем фильтр
    if (filter === 'open') {
      query = query.where('status', '==', 'open');
    } else if (filter === 'paid') {
      query = query.where('status', '==', 'paid');
    }
    // Для 'all' не добавляем фильтр
    
    const billsSnapshot = await query.get();
    
    const adminBillsList = document.getElementById('adminBillsList');
    if (!adminBillsList) return;
    
    if (billsSnapshot.empty) {
      adminBillsList.innerHTML = '<p style="text-align: center; color: #999;">Счета не найдены</p>';
      updateBillsStatistics([], filter);
      return;
    }
    
    const bills = [];
    billsSnapshot.forEach(doc => {
      bills.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Сортируем по дате создания (новые первыми)
    bills.sort((a, b) => {
      const dateA = a.createdAt?.toDate() || new Date(0);
      const dateB = b.createdAt?.toDate() || new Date(0);
      return dateB - dateA;
    });
    
    // Отображаем счета
    adminBillsList.innerHTML = '';
    
    for (const bill of bills) {
      const billCard = await createBillCard(bill);
      adminBillsList.appendChild(billCard);
    }
    
    // Обновляем статистику
    updateBillsStatistics(bills, filter);
    
  } catch (error) {
    console.error('❌ Ошибка загрузки счетов:', error);
  }
}

// Создание карточки счета
async function createBillCard(bill) {
  const card = document.createElement('div');
  card.className = 'admin-bill-card';
  
  const createdDate = bill.createdAt ? bill.createdAt.toDate().toLocaleString('ru-RU') : 'Неизвестно';
  const paidDate = bill.paidAt ? bill.paidAt.toDate().toLocaleString('ru-RU') : null;
  const itemsCount = bill.items ? bill.items.length : 0;
  const totalAmount = bill.totalAmount || 0;
  const userName = bill.userName || 'Неизвестный';
  const status = bill.status || 'open';
  
  // Получаем краткую информацию о позициях
  let itemsPreview = '';
  if (bill.items && bill.items.length > 0) {
    const preview = bill.items.slice(0, 3).map(item => {
      const name = item.cocktailName || item.name;
      const qty = item.quantity || 1;
      return qty > 1 ? `${name} x${qty}` : name;
    }).join(', ');
    itemsPreview = bill.items.length > 3 ? `${preview}...` : preview;
  }
  
  const statusBadge = status === 'paid' 
    ? '<span class="bill-status-badge paid"><i class="fas fa-check-circle"></i> Оплачен</span>'
    : '<span class="bill-status-badge open"><i class="fas fa-clock"></i> Открыт</span>';
  
  const paymentInfo = bill.paymentMethod 
    ? `<div class="bill-payment-info"><i class="fas fa-credit-card"></i> ${bill.paymentMethod}</div>`
    : '';
  
  card.innerHTML = `
    <div class="admin-bill-header">
      <div class="bill-user-info">
        <i class="fas fa-user-circle"></i>
        <div>
          <div class="bill-user-name">${userName}</div>
          <div class="bill-date">${createdDate}</div>
        </div>
      </div>
      ${statusBadge}
    </div>
    
    <div class="admin-bill-content">
      <div class="bill-items-preview">
        <i class="fas fa-cocktail"></i>
        <span><strong>${itemsCount}</strong> ${itemsCount === 1 ? 'позиция' : 'позиций'}: ${itemsPreview}</span>
      </div>
      
      <div class="bill-amount-section">
        <div class="bill-amount-label">Сумма:</div>
        <div class="bill-amount-value">${totalAmount} ₽</div>
      </div>
      
      ${bill.discount && bill.discount > 0 ? `
        <div class="bill-discount-info">
          <i class="fas fa-tag"></i> Скидка ${bill.discount}%
          ${bill.promoCode ? `(${bill.promoCode})` : ''}
        </div>
      ` : ''}
      
      ${paymentInfo}
      ${paidDate ? `<div class="bill-paid-date"><i class="fas fa-calendar-check"></i> Оплачен: ${paidDate}</div>` : ''}
    </div>
    
    <div class="admin-bill-actions">
      ${status === 'open' ? `
        <button class="admin-btn success" onclick="markBillAsPaid('${bill.id}')">
          <i class="fas fa-check"></i> Отметить оплаченным
        </button>
        <button class="admin-btn primary" onclick="viewBillDetails('${bill.id}')">
          <i class="fas fa-eye"></i> Детали
        </button>
      ` : `
        <button class="admin-btn primary" onclick="viewBillDetails('${bill.id}')">
          <i class="fas fa-eye"></i> Детали
        </button>
        <button class="admin-btn warning" onclick="reopenBill('${bill.id}')">
          <i class="fas fa-undo"></i> Открыть заново
        </button>
      `}
      <button class="admin-btn danger" onclick="deleteBill('${bill.id}')">
        <i class="fas fa-trash"></i> Удалить
      </button>
    </div>
  `;
  
  return card;
}

// Отметить счет как оплаченный
window.markBillAsPaid = async function(billId) {
  try {
    // Получаем данные счета
    const billDoc = await db.collection('bills').doc(billId).get();
    
    if (!billDoc.exists) {
      showError('Счет не найден');
      return;
    }
    
    const billData = billDoc.data();
    
    // Показываем модальное окно подтверждения оплаты
    showPaymentConfirmModal(billId, billData);
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    showError('❌ Не удалось загрузить данные счета');
  }
};

// Показать модальное окно подтверждения оплаты
function showPaymentConfirmModal(billId, billData) {
  const modal = document.getElementById('paymentConfirmModal');
  const paymentBillInfo = document.getElementById('paymentBillInfo');
  
  if (!modal || !paymentBillInfo) return;
  
  const itemsCount = billData.items ? billData.items.length : 0;
  const totalAmount = billData.totalAmount || 0;
  const userName = billData.userName || 'Неизвестный';
  
  // Формируем информацию о счете
  paymentBillInfo.innerHTML = `
    <div class="payment-bill-info-row">
      <span><i class="fas fa-user"></i> Клиент:</span>
      <strong>${userName}</strong>
    </div>
    <div class="payment-bill-info-row">
      <span><i class="fas fa-cocktail"></i> Позиций:</span>
      <strong>${itemsCount}</strong>
    </div>
    ${billData.discount && billData.discount > 0 ? `
      <div class="payment-bill-info-row">
        <span><i class="fas fa-tag"></i> Скидка:</span>
        <strong>${billData.discount}% ${billData.promoCode ? `(${billData.promoCode})` : ''}</strong>
      </div>
    ` : ''}
    <div class="payment-bill-info-row">
      <span>Итого к оплате:</span>
      <strong>${totalAmount} ₽</strong>
    </div>
  `;
  
  // Показываем модальное окно
  openModal(modal);
  
  // Обработчик подтверждения
  const confirmBtn = document.getElementById('confirmPaymentBtn');
  
  // Удаляем старые обработчики
  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  
  newConfirmBtn.addEventListener('click', async () => {
    const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked');
    
    if (!selectedMethod) {
      showError('Выберите способ оплаты');
      return;
    }
    
    const paymentMethod = selectedMethod.value;
    
    try {
      // Отключаем кнопку
      newConfirmBtn.disabled = true;
      newConfirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Обработка...';
      
      await db.collection('bills').doc(billId).update({
        status: 'paid',
        paidAt: firebase.firestore.FieldValue.serverTimestamp(),
        paymentMethod: paymentMethod,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      showSuccess(`✅ Счет отмечен как оплаченный (${paymentMethod})`);
      
      // Закрываем модальное окно
      closePaymentConfirmModal();
      
      // Перезагружаем список
      loadAdminBills(currentBillFilter);
      
    } catch (error) {
      console.error('❌ Ошибка отметки счета:', error);
      showError('❌ Не удалось отметить счет');
      
      // Восстанавливаем кнопку
      newConfirmBtn.disabled = false;
      newConfirmBtn.innerHTML = '<i class="fas fa-check"></i> Подтвердить оплату';
    }
  });
}

// Закрыть модальное окно подтверждения оплаты
window.closePaymentConfirmModal = function() {
  const modal = document.getElementById('paymentConfirmModal');
  if (modal) {
    closeModal(modal);
  }
  
  // Сбрасываем выбор на "Наличные"
  const cashRadio = document.querySelector('input[name="paymentMethod"][value="Наличные"]');
  if (cashRadio) {
    cashRadio.checked = true;
  }
};

// Открыть счет заново
window.reopenBill = async function(billId) {
  showConfirmAction(
    'Открыть счет заново?',
    'Счет станет активным и вернётся в список открытых счетов.',
    'success',
    '🔄',
    async () => {
      try {
        await db.collection('bills').doc(billId).update({
          status: 'open',
          paidAt: null,
          paymentMethod: null,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showSuccess('✅ Счет открыт заново');
        loadAdminBills(currentBillFilter);
        
      } catch (error) {
        console.error('❌ Ошибка открытия счета:', error);
        showError('❌ Не удалось открыть счет');
      }
    }
  );
};

// Удалить счет
window.deleteBill = async function(billId) {
  showConfirmAction(
    'Удалить счет?',
    'Вы уверены, что хотите удалить этот счет? Это действие необратимо.',
    'danger',
    '🗑️',
    async () => {
      try {
        await db.collection('bills').doc(billId).delete();
        
        showSuccess('✅ Счет удален');
        loadAdminBills(currentBillFilter);
        
      } catch (error) {
        console.error('❌ Ошибка удаления счета:', error);
        showError('❌ Не удалось удалить счет');
      }
    }
  );
};

// Универсальная функция показа подтверждения
function showConfirmAction(title, message, type = 'warning', icon = '⚠️', onConfirm) {
  const modal = document.getElementById('confirmActionModal');
  const header = document.getElementById('confirmActionHeader');
  const iconEl = document.getElementById('confirmIcon');
  const titleEl = document.getElementById('confirmActionTitle');
  const messageEl = document.getElementById('confirmActionMessage');
  const confirmBtn = document.getElementById('confirmActionBtn');
  
  if (!modal) return;
  
  // Устанавливаем тип (для цветов)
  header.className = `confirm-action-header ${type}`;
  
  // Устанавливаем содержимое
  if (iconEl) iconEl.textContent = icon;
  if (titleEl) titleEl.textContent = title;
  if (messageEl) messageEl.textContent = message;
  
  // Обновляем кнопку подтверждения
  if (confirmBtn) {
    confirmBtn.className = `confirm-btn confirm ${type}`;
  }
  
  // Показываем модальное окно
  modal.style.display = 'block';
  document.body.classList.add('modal-open');
  
  // Удаляем старые обработчики
  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  
  // Добавляем обработчик подтверждения
  newConfirmBtn.addEventListener('click', async () => {
    closeConfirmActionModal();
    if (onConfirm) {
      await onConfirm();
    }
  });
}

// Закрыть модальное окно подтверждения
window.closeConfirmActionModal = function() {
  const modal = document.getElementById('confirmActionModal');
  if (modal) {
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
  }
};

// Просмотр деталей счета
window.viewBillDetails = async function(billId) {
  try {
    const billDoc = await db.collection('bills').doc(billId).get();
    
    if (!billDoc.exists) {
      showError('Счет не найден');
      return;
    }
    
    const billData = billDoc.data();
    
    // Используем существующую функцию показа счета
    // Или создаём новую модалку для детального просмотра
    const items = billData.items || [];
    
    let detailsHTML = `
      <div class="bill-details-modal-content">
        <h3><i class="fas fa-receipt"></i> Счет #${billId.substring(0, 8)}</h3>
        
        <div class="bill-detail-section">
          <strong>Клиент:</strong> ${billData.userName || 'Неизвестный'}
        </div>
        <div class="bill-detail-section">
          <strong>Статус:</strong> ${billData.status === 'paid' ? '✅ Оплачен' : '⏳ Открыт'}
        </div>
        <div class="bill-detail-section">
          <strong>Создан:</strong> ${billData.createdAt ? billData.createdAt.toDate().toLocaleString('ru-RU') : 'Неизвестно'}
        </div>
        ${billData.paidAt ? `
          <div class="bill-detail-section">
            <strong>Оплачен:</strong> ${billData.paidAt.toDate().toLocaleString('ru-RU')}
          </div>
        ` : ''}
        ${billData.paymentMethod ? `
          <div class="bill-detail-section">
            <strong>Способ оплаты:</strong> ${billData.paymentMethod}
          </div>
        ` : ''}
        
        <h4>Позиции в счете:</h4>
        <div class="bill-details-items">
          ${items.map(item => {
            const name = item.cocktailName || item.name;
            const qty = item.quantity || 1;
            const unitPrice = item.price || 0;
            const finalPrice = item.finalPrice || unitPrice;
            const discount = item.discount || 0;
            
            return `
              <div class="bill-detail-item-enhanced">
                <div class="item-info">
                  <div class="item-name">${name}</div>
                  <div class="item-details">
                    Количество: <strong>${qty} шт.</strong> × ${unitPrice} ₽
                    ${discount > 0 ? `<span class="item-discount">(-${discount}%)</span>` : ''}
                  </div>
                </div>
                <div class="item-price">
                  <strong>${finalPrice} ₽</strong>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        
        ${billData.discount && billData.discount > 0 ? `
          <div class="bill-detail-section highlight">
            <strong>Скидка:</strong> ${billData.discount}% ${billData.promoCode ? `(${billData.promoCode})` : ''}
          </div>
        ` : ''}
        
        <div class="bill-detail-total">
          <strong>Итого:</strong>
          <strong>${billData.totalAmount || 0} ₽</strong>
        </div>
      </div>
    `;
    
    // Показываем в alert (можно создать отдельную модалку)
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = detailsHTML;
    
    // Создаём простое модальное окно
    const existingDetailsModal = document.getElementById('billDetailsModal');
    if (existingDetailsModal) {
      existingDetailsModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'billDetailsModal';
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 600px;">
        <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
        ${detailsHTML}
      </div>
    `;
    
    document.body.appendChild(modal);
    document.body.classList.add('modal-open');
    
    // Закрытие по клику вне модалки
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
        document.body.classList.remove('modal-open');
      }
    });
    
  } catch (error) {
    console.error('❌ Ошибка просмотра деталей:', error);
    showError('❌ Не удалось загрузить детали счета');
  }
};

// Обновление статистики по счетам
async function updateBillsStatistics(bills, filter) {
  try {
    const openBillsCountEl = document.getElementById('openBillsCount');
    const paidBillsTodayEl = document.getElementById('paidBillsToday');
    const totalRevenueTodayEl = document.getElementById('totalRevenueToday');
    
    // Считаем открытые счета
    const allBillsSnapshot = await db.collection('bills')
      .where('status', '==', 'open')
      .get();
    
    if (openBillsCountEl) {
      openBillsCountEl.textContent = allBillsSnapshot.size;
    }
    
    // Считаем оплаченные за сегодня - упрощённый запрос
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Получаем все оплаченные счета и фильтруем на клиенте
    const allPaidBillsSnapshot = await db.collection('bills')
      .where('status', '==', 'paid')
      .get();
    
    let paidCount = 0;
    let revenue = 0;
    
    allPaidBillsSnapshot.forEach(doc => {
      const billData = doc.data();
      if (billData.paidAt) {
        const paidDate = billData.paidAt.toDate();
        if (paidDate >= today) {
          paidCount++;
          revenue += billData.totalAmount || 0;
        }
      }
    });
    
    if (paidBillsTodayEl) {
      paidBillsTodayEl.textContent = paidCount;
    }
    
    if (totalRevenueTodayEl) {
      totalRevenueTodayEl.textContent = `${revenue} ₽`;
    }
    
  } catch (error) {
    console.error('❌ Ошибка обновления статистики:', error);
  }
}

// Обработчики фильтров
const billFilterButtons = document.querySelectorAll('[data-bill-filter]');
billFilterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const filter = btn.getAttribute('data-bill-filter');
    
    // Обновляем активную кнопку
    billFilterButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Загружаем счета с новым фильтром
    loadAdminBills(filter);
  });
});

// Загружаем счета при открытии вкладки
const billsTab = document.querySelector('[data-tab="bills"]');
billsTab?.addEventListener('click', () => {
  loadAdminBills('open');
});

console.log('✅ Система управления счетами (админ) инициализирована');

