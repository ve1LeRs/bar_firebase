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
    const preview = bill.items.slice(0, 3).map(item => item.cocktailName || item.name).join(', ');
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
  // Спрашиваем способ оплаты
  const paymentMethod = prompt('Способ оплаты:\n1 - Наличные\n2 - Карта\n3 - Перевод', '1');
  
  if (!paymentMethod) return;
  
  const paymentMethods = {
    '1': 'Наличные',
    '2': 'Карта',
    '3': 'Перевод'
  };
  
  const method = paymentMethods[paymentMethod] || 'Наличные';
  
  if (!confirm(`Отметить счет как оплаченный?\nСпособ оплаты: ${method}`)) {
    return;
  }
  
  try {
    await db.collection('bills').doc(billId).update({
      status: 'paid',
      paidAt: firebase.firestore.FieldValue.serverTimestamp(),
      paymentMethod: method,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    showSuccess(`✅ Счет отмечен как оплаченный (${method})`);
    
    // Перезагружаем список
    loadAdminBills(currentBillFilter);
    
  } catch (error) {
    console.error('❌ Ошибка отметки счета:', error);
    showError('❌ Не удалось отметить счет');
  }
};

// Открыть счет заново
window.reopenBill = async function(billId) {
  if (!confirm('Открыть счет заново? Он станет активным.')) {
    return;
  }
  
  try {
    await db.collection('bills').doc(billId).update({
      status: 'open',
      paidAt: null,
      paymentMethod: null,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    showSuccess('✅ Счет открыт заново');
    
    // Перезагружаем список
    loadAdminBills(currentBillFilter);
    
  } catch (error) {
    console.error('❌ Ошибка открытия счета:', error);
    showError('❌ Не удалось открыть счет');
  }
};

// Удалить счет
window.deleteBill = async function(billId) {
  if (!confirm('Вы уверены, что хотите удалить этот счет? Это действие необратимо.')) {
    return;
  }
  
  try {
    await db.collection('bills').doc(billId).delete();
    
    showSuccess('✅ Счет удален');
    
    // Перезагружаем список
    loadAdminBills(currentBillFilter);
    
  } catch (error) {
    console.error('❌ Ошибка удаления счета:', error);
    showError('❌ Не удалось удалить счет');
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
          ${items.map(item => `
            <div class="bill-detail-item">
              <span>${item.cocktailName || item.name}</span>
              <span>${item.finalPrice || item.price || 0} ₽</span>
            </div>
          `).join('')}
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
    
    // Считаем оплаченные за сегодня
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const paidTodaySnapshot = await db.collection('bills')
      .where('status', '==', 'paid')
      .where('paidAt', '>=', today)
      .get();
    
    let paidCount = 0;
    let revenue = 0;
    
    paidTodaySnapshot.forEach(doc => {
      paidCount++;
      revenue += doc.data().totalAmount || 0;
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

