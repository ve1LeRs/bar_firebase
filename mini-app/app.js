(() => {
  'use strict';

  const firebaseConfig = {
    apiKey: 'AIzaSyB4bD8UAu0Aj5IRK5H-uZg6kxNAIbkZc9k',
    authDomain: 'bar-menu-6145c.firebaseapp.com',
    projectId: 'bar-menu-6145c',
    storageBucket: 'bar-menu-6145c.appspot.com',
    messagingSenderId: '493608422842',
    appId: '1:493608422842:web:3b4b6bd8a4cb681c436183'
  };

  const DEFAULT_API = 'https://bar-firebase.onrender.com';
  const MENU_CACHE_KEY = 'asafiev_mini_menu_v1';
  const MENU_CACHE_TTL_MS = 5 * 60 * 1000;
  const STATUS_LABELS = {
    pending: 'Ожидание',
    confirmed: 'Подтверждён',
    preparing: 'Готовится',
    ready: 'Готов',
    completed: 'Выполнен',
    cancelled: 'Отменён'
  };

  const tg = window.Telegram?.WebApp;
  const state = {
    apiBase: resolveApiBase(),
    user: null,
    firebaseUser: null,
    cocktails: [],
    stoplist: new Set(),
    category: 'all',
    bonusBalance: 0,
    openBillTotal: null,
    selected: null,
    bonusToUse: 0,
    ordersUnsub: null,
    maxBonusUsage: 50,
    authReady: false,
    sessionOk: false,
    uid: null,
    authError: null,
    ordersPollTimer: null,
    role: 'user',
    adminOrdersTimer: null,
    adminTab: 'orders'
  };

  // Wake Render ASAP (cold start) — do not await
  wakeApi();

  let auth;
  let db;

  function initFirebase() {
    if (auth && db) return;
    if (typeof firebase === 'undefined') {
      throw new Error('Firebase SDK ещё загружается');
    }
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    try {
      db.settings({ ignoreUndefinedProperties: true });
    } catch (_) { /* already configured */ }
  }

  function wakeApi() {
    const url = `${resolveApiBase()}/health`;
    try {
      fetch(url, { method: 'GET', cache: 'no-store', mode: 'cors' }).catch(() => {});
      if (navigator.sendBeacon) navigator.sendBeacon(url);
    } catch (_) { /* ignore */ }
  }

  const els = {
    greeting: document.getElementById('greeting'),
    bonusChip: document.getElementById('bonusChip'),
    menuGrid: document.getElementById('menuGrid'),
    filters: document.getElementById('filters'),
    ordersList: document.getElementById('ordersList'),
    profileName: document.getElementById('profileName'),
    profileMeta: document.getElementById('profileMeta'),
    profileBonus: document.getElementById('profileBonus'),
    profileBill: document.getElementById('profileBill'),
    authStatus: document.getElementById('authStatus'),
    authRetryBtn: document.getElementById('authRetryBtn'),
    avatar: document.getElementById('avatar'),
    adminTabBtn: document.getElementById('adminTabBtn'),
    adminOrdersList: document.getElementById('adminOrdersList'),
    adminStoplist: document.getElementById('adminStoplist'),
    adminStopSelect: document.getElementById('adminStopSelect'),
    adminStopReason: document.getElementById('adminStopReason'),
    adminStopAddBtn: document.getElementById('adminStopAddBtn'),
    adminSubtabs: document.getElementById('adminSubtabs'),
    adminBillsList: document.getElementById('adminBillsList'),
    adminBillsStats: document.getElementById('adminBillsStats'),
    adminCocktailsList: document.getElementById('adminCocktailsList'),
    adminPromosList: document.getElementById('adminPromosList'),
    adminPurchasesList: document.getElementById('adminPurchasesList'),
    adminMonitoringBox: document.getElementById('adminMonitoringBox'),
    viewAdmin: document.getElementById('view-admin'),
    sheet: document.getElementById('orderSheet'),
    sheetBackdrop: document.getElementById('sheetBackdrop'),
    sheetMedia: document.getElementById('sheetMedia'),
    sheetName: document.getElementById('sheetName'),
    sheetIngredients: document.getElementById('sheetIngredients'),
    sheetMood: document.getElementById('sheetMood'),
    sheetPrice: document.getElementById('sheetPrice'),
    sheetTotal: document.getElementById('sheetTotal'),
    bonusRow: document.getElementById('bonusRow'),
    bonusInput: document.getElementById('bonusInput'),
    confirmOrderBtn: document.getElementById('confirmOrderBtn'),
    cancelOrderBtn: document.getElementById('cancelOrderBtn'),
    toast: document.getElementById('toast'),
    loader: document.getElementById('loader')
  };

  function resolveApiBase() {
    const saved = localStorage.getItem('mini_app_api_url');
    if (saved) return saved.replace(/\/$/, '');

    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:3000';
    if (host.includes('onrender.com')) return `https://${host}`;
    return DEFAULT_API;
  }

  function haptic(type = 'light') {
    try {
      tg?.HapticFeedback?.impactOccurred?.(type);
    } catch (_) { /* ignore */ }
  }

  function showToast(message) {
    els.toast.hidden = false;
    els.toast.textContent = message;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      els.toast.hidden = true;
    }, 2800);
  }

  function setLoader(on) {
    if (!els.loader) return;
    els.loader.classList.toggle('is-on', Boolean(on));
    els.loader.hidden = !on;
  }

  function initTelegram() {
    if (!tg) {
      document.body.classList.add('tg-themed');
      els.greeting.textContent = 'Откройте через Telegram-бота';
      return false;
    }

    tg.ready();
    tg.expand();

    // Fullscreen (Bot API 8.0+) + max height fallback
    try {
      tg.disableVerticalSwipes?.();
    } catch (_) { /* older clients */ }

    try {
      if (typeof tg.requestFullscreen === 'function') {
        tg.requestFullscreen();
      }
    } catch (_) { /* not supported / needs user gesture on some clients */ }

    // Retry fullscreen shortly after open (iOS sometimes ignores first call)
    setTimeout(() => {
      try {
        tg.expand();
        tg.requestFullscreen?.();
      } catch (_) { /* ignore */ }
    }, 300);

    try {
      tg.setHeaderColor('#14110f');
      tg.setBackgroundColor('#14110f');
    } catch (_) { /* older clients */ }

    const applySafeArea = () => {
      const sa = tg.safeAreaInset || {};
      const csa = tg.contentSafeAreaInset || {};
      document.documentElement.style.setProperty('--tg-safe-top', `${(sa.top || 0) + (csa.top || 0)}px`);
      document.documentElement.style.setProperty('--tg-safe-bottom', `${(sa.bottom || 0) + (csa.bottom || 0)}px`);
      document.documentElement.style.setProperty('--tg-safe-left', `${(sa.left || 0) + (csa.left || 0)}px`);
      document.documentElement.style.setProperty('--tg-safe-right', `${(sa.right || 0) + (csa.right || 0)}px`);
      document.body.classList.toggle('is-fullscreen', Boolean(tg.isFullscreen));
    };

    applySafeArea();
    tg.onEvent?.('fullscreenChanged', applySafeArea);
    tg.onEvent?.('safeAreaChanged', applySafeArea);
    tg.onEvent?.('contentSafeAreaChanged', applySafeArea);
    tg.onEvent?.('viewportChanged', () => {
      try { tg.expand(); } catch (_) { /* ignore */ }
      applySafeArea();
    });

    // Tap anywhere early to request fullscreen if first call was blocked
    const askFsOnce = () => {
      try { tg.requestFullscreen?.(); } catch (_) { /* ignore */ }
      document.body.removeEventListener('touchstart', askFsOnce);
      document.body.removeEventListener('click', askFsOnce);
    };
    document.body.addEventListener('touchstart', askFsOnce, { once: true, passive: true });
    document.body.addEventListener('click', askFsOnce, { once: true });

    document.body.classList.add('tg-themed');

    const user = tg.initDataUnsafe?.user;
    if (user) {
      const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
      els.greeting.textContent = name ? `Привет, ${user.first_name}` : 'Коктейли · заказ из Telegram';
      state.user = user;
    }

    return Boolean(tg.initData);
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function ensureApiAwake(onStatus) {
    const started = Date.now();
    const maxWait = 75000;
    let attempt = 0;

    while (Date.now() - started < maxWait) {
      attempt += 1;
      const waited = Math.round((Date.now() - started) / 1000);
      onStatus?.(
        attempt === 1
          ? 'Будим сервер заказов…'
          : `Сервер просыпается… ${waited}с`
      );
      try {
        const res = await fetchWithTimeout(
          `${state.apiBase}/health`,
          { method: 'GET', cache: 'no-store', mode: 'cors' },
          10000
        );
        if (res.ok) return true;
      } catch (_) {
        // cold start / network — keep trying
      }
      await sleep(Math.min(2500, 800 + attempt * 400));
    }
    return false;
  }

  function setAuthRetryVisible(on) {
    if (els.authRetryBtn) els.authRetryBtn.hidden = !on;
  }

  async function authenticate(options = {}) {
    const { manual = false } = options;
    const initData = tg?.initData || '';

    if (!initData) {
      state.authError = 'no_init_data';
      els.authStatus.textContent =
        'Нет данных Telegram. Откройте Mini App кнопкой меню бота (не через браузер).';
      setAuthRetryVisible(false);
      updateProfileUI();
      return false;
    }

    setAuthRetryVisible(false);
    els.authStatus.textContent = manual ? 'Повторный вход…' : 'Подключаем сервер…';

    const awake = await ensureApiAwake((text) => {
      els.authStatus.textContent = text;
    });

    if (!awake) {
      state.sessionOk = false;
      state.authReady = false;
      state.authError = 'timeout';
      els.authStatus.textContent =
        'Сервер долго просыпается. Нажмите «Повторить вход» через несколько секунд.';
      setAuthRetryVisible(true);
      return false;
    }

    // A few auth attempts after wake (first request can still be slow)
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      els.authStatus.textContent =
        attempt === 1 ? 'Входим через Telegram…' : `Повтор входа (${attempt}/3)…`;
      try {
        const res = await fetchWithTimeout(
          `${state.apiBase}/api/mini-app/auth`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData })
          },
          20000
        );
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || `Ошибка авторизации (${data.reason || res.status})`);
        }

        state.user = data.user || state.user;
        state.uid = data.user?.uid || null;
        state.sessionOk = Boolean(data.session || data.success);
        state.authReady = state.sessionOk;
        state.authError = null;

        if (typeof data.bonusBalance === 'number') {
          state.bonusBalance = data.bonusBalance;
        }
        if (typeof data.openBillTotal === 'number') {
          state.openBillTotal = data.openBillTotal;
        }
        if (data.role) state.role = data.role;
        applyAdminUi();

        if (data.customToken) {
          try {
            initFirebase();
            const cred = await auth.signInWithCustomToken(data.customToken);
            state.firebaseUser = cred.user;
          } catch (firebaseErr) {
            console.warn('Firebase custom token skipped:', firebaseErr.message);
            state.firebaseUser = null;
          }
        }

        els.authStatus.textContent = 'Вход через Telegram выполнен. Можно заказывать.';
        setAuthRetryVisible(false);
        updateProfileUI();
        startOrdersPolling();
        startKeepAlive();
        return true;
      } catch (err) {
        console.error('auth attempt failed', attempt, err);
        if (attempt < 3) {
          await sleep(1500 * attempt);
          continue;
        }
        state.sessionOk = false;
        state.authReady = false;
        state.authError = err.name === 'AbortError' ? 'timeout' : 'auth_failed';
        const msg =
          err.name === 'AbortError'
            ? 'Сервер ещё прогревается'
            : err.message;
        els.authStatus.textContent = `Не удалось войти: ${msg}`;
        setAuthRetryVisible(true);
        return false;
      }
    }
    return false;
  }

  function canOrder() {
    return Boolean(state.sessionOk && tg?.initData);
  }

  function isAdminUser() {
    return state.role === 'admin';
  }

  function applyAdminUi() {
    const on = isAdminUser();
    document.body.classList.toggle('has-admin', on);
    if (els.adminTabBtn) els.adminTabBtn.hidden = !on;
    if (on) {
      populateAdminStopSelect();
      refreshAdminOrders();
      refreshAdminStoplist();
      startAdminPolling();
    }
  }

  function adminHeaders() {
    return { 'Content-Type': 'application/json' };
  }

  function adminBody(extra = {}) {
    return JSON.stringify({ initData: tg?.initData || '', ...extra });
  }

  async function refreshAdminOrders() {
    if (!isAdminUser() || !canOrder()) return;
    try {
      const res = await fetch(`${state.apiBase}/api/mini-app/admin/orders`, {
        method: 'POST',
        headers: adminHeaders(),
        body: adminBody()
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ошибка загрузки');
      renderAdminOrders(data.orders || []);
    } catch (err) {
      console.warn(err);
      if (els.adminOrdersList) {
        els.adminOrdersList.innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`;
      }
    }
  }

  function renderAdminOrders(orders) {
    if (!els.adminOrdersList) return;
    if (!orders.length) {
      els.adminOrdersList.innerHTML = '<div class="empty-state">Активных заказов нет</div>';
      return;
    }

    els.adminOrdersList.innerHTML = '';
    orders.forEach((order) => {
      const status = order.status || 'pending';
      const card = document.createElement('article');
      card.className = 'order-card';
      card.innerHTML = `
        <div class="order-top">
          <div>
            <p class="order-name">${escapeHtml(order.name || 'Заказ')}</p>
            <p class="order-time">${escapeHtml(order.user || '')} · ${escapeHtml(order.displayTime || '')}</p>
          </div>
          <span class="status ${escapeAttr(status)}">${STATUS_LABELS[status] || status}</span>
        </div>
        <div class="queue">#${order.queuePosition || '—'} · ${Number(order.price) || 0} ₽</div>
        <div class="admin-actions">
          <button type="button" data-status="preparing" data-id="${escapeAttr(order.id)}">Готовится</button>
          <button type="button" class="primary" data-status="ready" data-id="${escapeAttr(order.id)}">Готов</button>
          <button type="button" data-status="completed" data-id="${escapeAttr(order.id)}">Выдан</button>
          <button type="button" class="danger" data-status="cancelled" data-id="${escapeAttr(order.id)}">Отмена</button>
        </div>
      `;
      card.querySelectorAll('button[data-status]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          await setAdminOrderStatus(btn.dataset.id, btn.dataset.status);
          btn.disabled = false;
        });
      });
      els.adminOrdersList.appendChild(card);
    });
  }

  async function setAdminOrderStatus(orderId, status) {
    try {
      const res = await fetch(`${state.apiBase}/api/mini-app/admin/order-status`, {
        method: 'POST',
        headers: adminHeaders(),
        body: adminBody({ orderId, status })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Не удалось обновить');
      haptic('medium');
      showToast(`Статус: ${STATUS_LABELS[status] || status}`);
      refreshAdminOrders();
    } catch (err) {
      showToast(err.message || 'Ошибка статуса');
    }
  }

  function populateAdminStopSelect() {
    if (!els.adminStopSelect) return;
    const current = els.adminStopSelect.value;
    els.adminStopSelect.innerHTML = '<option value="">Выберите коктейль</option>';
    state.cocktails
      .slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'))
      .forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.name;
        opt.textContent = state.stoplist.has(c.name) ? `${c.name} (уже в стопе)` : c.name;
        els.adminStopSelect.appendChild(opt);
      });
    if (current) els.adminStopSelect.value = current;
  }

  async function refreshAdminStoplist() {
    if (!isAdminUser() || !canOrder()) return;
    try {
      const res = await fetch(`${state.apiBase}/api/mini-app/admin/stoplist`, {
        method: 'POST',
        headers: adminHeaders(),
        body: adminBody({ action: 'list' })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ошибка стоп-листа');
      const items = data.items || [];
      state.stoplist = new Set(items.map((i) => i.cocktailName).filter(Boolean));
      renderAdminStoplist(items);
      populateAdminStopSelect();
      renderMenu();
    } catch (err) {
      console.warn(err);
      if (els.adminStoplist) {
        els.adminStoplist.innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`;
      }
    }
  }

  function renderAdminStoplist(items) {
    if (!els.adminStoplist) return;
    if (!items.length) {
      els.adminStoplist.innerHTML = '<div class="empty-state">Стоп-лист пуст</div>';
      return;
    }
    els.adminStoplist.innerHTML = '';
    items.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'order-card';
      card.innerHTML = `
        <div class="stoplist-row">
          <div>
            <p class="order-name">${escapeHtml(item.cocktailName || '')}</p>
            <p class="order-time">${escapeHtml(item.reason || 'Без причины')}</p>
          </div>
          <button type="button" class="danger" data-remove-id="${escapeAttr(item.id)}">Убрать</button>
        </div>
      `;
      card.querySelector('button')?.addEventListener('click', async () => {
        await removeFromAdminStoplist(item.id);
      });
      els.adminStoplist.appendChild(card);
    });
  }

  async function addToAdminStoplist() {
    const cocktailName = els.adminStopSelect?.value || '';
    const reason = els.adminStopReason?.value?.trim() || 'Добавлено из Mini App';
    if (!cocktailName) {
      showToast('Выберите коктейль');
      return;
    }
    try {
      const res = await fetch(`${state.apiBase}/api/mini-app/admin/stoplist`, {
        method: 'POST',
        headers: adminHeaders(),
        body: adminBody({ action: 'add', cocktailName, reason })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Не удалось добавить');
      if (els.adminStopReason) els.adminStopReason.value = '';
      showToast('Добавлено в стоп-лист');
      haptic('medium');
      refreshAdminStoplist();
    } catch (err) {
      showToast(err.message || 'Ошибка');
    }
  }

  async function removeFromAdminStoplist(id) {
    try {
      const res = await fetch(`${state.apiBase}/api/mini-app/admin/stoplist`, {
        method: 'POST',
        headers: adminHeaders(),
        body: adminBody({ action: 'remove', id })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Не удалось убрать');
      showToast('Убрано из стоп-листа');
      refreshAdminStoplist();
    } catch (err) {
      showToast(err.message || 'Ошибка');
    }
  }

  function switchAdminTab(name) {
    state.adminTab = name;
    state.billFilter = state.billFilter || 'open';
    els.adminSubtabs?.querySelectorAll('[data-admin-tab]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.adminTab === name);
    });

    const panes = {
      orders: 'adminOrdersPane',
      bills: 'adminBillsPane',
      stoplist: 'adminStoplistPane',
      cocktails: 'adminCocktailsPane',
      promos: 'adminPromosPane',
      bonuses: 'adminBonusesPane',
      purchases: 'adminPurchasesPane',
      monitoring: 'adminMonitoringPane'
    };
    Object.entries(panes).forEach(([key, id]) => {
      const el = document.getElementById(id);
      if (el) el.hidden = key !== name;
    });

    if (name === 'orders') refreshAdminOrders();
    if (name === 'bills') refreshAdminBills();
    if (name === 'stoplist') refreshAdminStoplist();
    if (name === 'cocktails') refreshAdminCocktails();
    if (name === 'promos') refreshAdminPromos();
    if (name === 'bonuses') refreshAdminBonuses();
    if (name === 'purchases') refreshAdminPurchases();
    if (name === 'monitoring') refreshAdminMonitoring();
  }

  async function refreshAdminBills() {
    if (!isAdminUser() || !canOrder()) return;
    const filter = state.billFilter || 'open';
    try {
      const res = await fetch(`${state.apiBase}/api/mini-app/admin/bills`, {
        method: 'POST', headers: adminHeaders(), body: adminBody({ action: 'list', filter })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ошибка счетов');
      if (els.adminBillsStats) {
        els.adminBillsStats.innerHTML = `
          <div class="stat"><span class="stat-label">Открытых</span><strong>${data.stats?.openCount ?? 0}</strong></div>
          <div class="stat"><span class="stat-label">Сумма paid</span><strong>${data.stats?.paidSum ?? 0} ₽</strong></div>
        `;
      }
      const list = data.bills || [];
      if (!els.adminBillsList) return;
      if (!list.length) {
        els.adminBillsList.innerHTML = '<div class="empty-state">Счетов нет</div>';
        return;
      }
      els.adminBillsList.innerHTML = '';
      list.forEach((bill) => {
        const card = document.createElement('article');
        card.className = 'order-card';
        card.innerHTML = `
          <div class="order-top">
            <div>
              <p class="order-name">${escapeHtml(bill.userName || 'Гость')}</p>
              <p class="order-time">${bill.itemsCount || 0} поз. · ${bill.status}</p>
            </div>
            <strong class="price">${Number(bill.totalAmount) || 0} ₽</strong>
          </div>
          ${bill.status === 'open' ? `<div class="admin-actions">
            <button type="button" class="primary" data-close-bill="${escapeAttr(bill.id)}">Закрыть (наличные)</button>
            <button type="button" data-close-bill="${escapeAttr(bill.id)}" data-method="card">Закрыть (карта)</button>
          </div>` : `<div class="queue">Оплата: ${escapeHtml(bill.paymentMethod || '—')}</div>`}
        `;
        card.querySelectorAll('[data-close-bill]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            await closeAdminBill(btn.dataset.closeBill, btn.dataset.method || 'cash');
          });
        });
        els.adminBillsList.appendChild(card);
      });
    } catch (err) {
      if (els.adminBillsList) els.adminBillsList.innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`;
    }
  }

  async function closeAdminBill(billId, paymentMethod) {
    try {
      const res = await fetch(`${state.apiBase}/api/mini-app/admin/bills`, {
        method: 'POST', headers: adminHeaders(),
        body: adminBody({ action: 'close', billId, paymentMethod })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Не удалось закрыть');
      showToast('Счёт закрыт');
      refreshAdminBills();
    } catch (err) {
      showToast(err.message || 'Ошибка');
    }
  }

  async function refreshAdminCocktails() {
    if (!isAdminUser() || !canOrder()) return;
    try {
      const res = await fetch(`${state.apiBase}/api/mini-app/admin/cocktails`, {
        method: 'POST', headers: adminHeaders(), body: adminBody({ action: 'list' })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ошибка');
      const list = data.cocktails || [];
      // Keep local menu in sync
      state.cocktails = list.map((c) => ({
        id: c.id, name: c.name, price: c.price, image: c.image || '',
        ingredients: c.ingredients || '', description: c.description || '',
        mood: c.mood || '', alcohol: c.alcohol, category: c.category || ''
      }));
      populateAdminStopSelect();
      renderMenu();
      const box = document.getElementById('adminCocktailsList');
      if (!box) return;
      if (!list.length) {
        box.innerHTML = '<div class="empty-state">Нет коктейлей</div>';
        return;
      }
      box.innerHTML = '';
      list.forEach((c) => {
        const card = document.createElement('article');
        card.className = 'order-card';
        card.innerHTML = `
          <div class="order-top">
            <div>
              <p class="order-name">${escapeHtml(c.name || '')}</p>
              <p class="order-time">${escapeHtml(c.category || '')} · ${c.alcohol != null ? c.alcohol + '%' : '—'}</p>
            </div>
            <strong class="price">${Number(c.price) || 0} ₽</strong>
          </div>
          <div class="admin-actions">
            <button type="button" data-edit-cocktail="${escapeAttr(c.id)}">Изменить</button>
            <button type="button" class="danger" data-del-cocktail="${escapeAttr(c.id)}">Удалить</button>
          </div>
        `;
        card.querySelector('[data-edit-cocktail]')?.addEventListener('click', () => fillCocktailForm(c));
        card.querySelector('[data-del-cocktail]')?.addEventListener('click', async () => {
          if (!confirm(`Удалить ${c.name}?`)) return;
          await deleteAdminCocktail(c.id);
        });
        box.appendChild(card);
      });
    } catch (err) {
      const box = document.getElementById('adminCocktailsList');
      if (box) box.innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`;
    }
  }

  function fillCocktailForm(c) {
    document.getElementById('adminCocktailId').value = c.id || '';
    document.getElementById('adminCocktailName').value = c.name || '';
    document.getElementById('adminCocktailPrice').value = c.price || '';
    document.getElementById('adminCocktailIngredients').value = c.ingredients || '';
    document.getElementById('adminCocktailCategory').value = c.category || 'classic';
    document.getElementById('adminCocktailAlcohol').value = c.alcohol ?? '';
    showToast('Редактирование: сохраните изменения');
  }

  async function saveAdminCocktail() {
    const cocktail = {
      id: document.getElementById('adminCocktailId').value || undefined,
      name: document.getElementById('adminCocktailName').value.trim(),
      price: Number(document.getElementById('adminCocktailPrice').value),
      ingredients: document.getElementById('adminCocktailIngredients').value.trim(),
      category: document.getElementById('adminCocktailCategory').value,
      alcohol: document.getElementById('adminCocktailAlcohol').value
    };
    try {
      const res = await fetch(`${state.apiBase}/api/mini-app/admin/cocktails`, {
        method: 'POST', headers: adminHeaders(), body: adminBody({ action: 'upsert', cocktail })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ошибка сохранения');
      document.getElementById('adminCocktailId').value = '';
      document.getElementById('adminCocktailName').value = '';
      document.getElementById('adminCocktailPrice').value = '';
      document.getElementById('adminCocktailIngredients').value = '';
      document.getElementById('adminCocktailAlcohol').value = '';
      showToast('Коктейль сохранён');
      refreshAdminCocktails();
    } catch (err) {
      showToast(err.message || 'Ошибка');
    }
  }

  async function deleteAdminCocktail(id) {
    try {
      const res = await fetch(`${state.apiBase}/api/mini-app/admin/cocktails`, {
        method: 'POST', headers: adminHeaders(), body: adminBody({ action: 'delete', id })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ошибка удаления');
      showToast('Удалено');
      refreshAdminCocktails();
    } catch (err) {
      showToast(err.message || 'Ошибка');
    }
  }

  async function refreshAdminPromos() {
    if (!isAdminUser() || !canOrder()) return;
    try {
      const res = await fetch(`${state.apiBase}/api/mini-app/admin/promos`, {
        method: 'POST', headers: adminHeaders(), body: adminBody({ action: 'list' })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ошибка');
      const box = document.getElementById('adminPromosList');
      const list = data.promos || [];
      if (!box) return;
      if (!list.length) {
        box.innerHTML = '<div class="empty-state">Промокодов нет</div>';
        return;
      }
      box.innerHTML = '';
      list.forEach((p) => {
        const code = p.code || p.id;
        const card = document.createElement('article');
        card.className = 'order-card';
        card.innerHTML = `
          <div class="order-top">
            <div>
              <p class="order-name">${escapeHtml(code)}</p>
              <p class="order-time">${escapeHtml(p.description || '')} · ${p.discount || 0}%</p>
            </div>
            <span class="status ${p.active ? 'ready' : 'cancelled'}">${p.active ? 'Активен' : 'Выкл'}</span>
          </div>
          <div class="admin-actions">
            <button type="button" data-toggle-promo="${escapeAttr(code)}">Вкл/Выкл</button>
            <button type="button" class="danger" data-del-promo="${escapeAttr(code)}">Удалить</button>
          </div>
        `;
        card.querySelector('[data-toggle-promo]')?.addEventListener('click', async () => {
          await fetch(`${state.apiBase}/api/mini-app/admin/promos`, {
            method: 'POST', headers: adminHeaders(), body: adminBody({ action: 'toggle', code })
          });
          refreshAdminPromos();
        });
        card.querySelector('[data-del-promo]')?.addEventListener('click', async () => {
          await fetch(`${state.apiBase}/api/mini-app/admin/promos`, {
            method: 'POST', headers: adminHeaders(), body: adminBody({ action: 'delete', code })
          });
          refreshAdminPromos();
        });
        box.appendChild(card);
      });
    } catch (err) {
      const box = document.getElementById('adminPromosList');
      if (box) box.innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`;
    }
  }

  async function saveAdminPromo() {
    const promo = {
      code: document.getElementById('adminPromoCode').value.trim(),
      discount: Number(document.getElementById('adminPromoDiscount').value),
      description: document.getElementById('adminPromoDescription').value.trim(),
      maxUses: Number(document.getElementById('adminPromoMaxUses').value) || 0,
      active: true
    };
    try {
      const res = await fetch(`${state.apiBase}/api/mini-app/admin/promos`, {
        method: 'POST', headers: adminHeaders(), body: adminBody({ action: 'upsert', promo })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ошибка');
      showToast('Промокод сохранён');
      document.getElementById('adminPromoCode').value = '';
      document.getElementById('adminPromoDiscount').value = '';
      document.getElementById('adminPromoDescription').value = '';
      document.getElementById('adminPromoMaxUses').value = '';
      refreshAdminPromos();
    } catch (err) {
      showToast(err.message || 'Ошибка');
    }
  }

  async function refreshAdminBonuses() {
    if (!isAdminUser() || !canOrder()) return;
    try {
      const res = await fetch(`${state.apiBase}/api/mini-app/admin/bonuses`, {
        method: 'POST', headers: adminHeaders(), body: adminBody({ action: 'get' })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ошибка');
      const s = data.settings || {};
      document.getElementById('adminBonusPct').value = s.percentage ?? 5;
      document.getElementById('adminBonusMin').value = s.minOrder ?? 300;
      document.getElementById('adminBonusMax').value = s.maxUsage ?? 50;
      document.getElementById('adminBonusExpire').value = s.expireDays ?? 180;
      document.getElementById('adminBonusActive').checked = s.active !== false;
    } catch (err) {
      showToast(err.message || 'Ошибка бонусов');
    }
  }

  async function saveAdminBonuses() {
    const settings = {
      percentage: Number(document.getElementById('adminBonusPct').value),
      minOrder: Number(document.getElementById('adminBonusMin').value),
      maxUsage: Number(document.getElementById('adminBonusMax').value),
      expireDays: Number(document.getElementById('adminBonusExpire').value),
      active: document.getElementById('adminBonusActive').checked
    };
    try {
      const res = await fetch(`${state.apiBase}/api/mini-app/admin/bonuses`, {
        method: 'POST', headers: adminHeaders(), body: adminBody({ action: 'save', settings })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ошибка');
      showToast('Настройки бонусов сохранены');
    } catch (err) {
      showToast(err.message || 'Ошибка');
    }
  }

  async function refreshAdminPurchases() {
    if (!isAdminUser() || !canOrder()) return;
    try {
      const res = await fetch(`${state.apiBase}/api/mini-app/admin/purchases`, {
        method: 'POST', headers: adminHeaders(), body: adminBody({ action: 'list' })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ошибка');
      const box = document.getElementById('adminPurchasesList');
      const list = data.items || [];
      if (!box) return;
      if (!list.length) {
        box.innerHTML = '<div class="empty-state">Ингредиентов нет</div>';
        return;
      }
      box.innerHTML = '';
      list.forEach((item) => {
        const card = document.createElement('article');
        card.className = 'order-card';
        card.innerHTML = `
          <div class="order-top">
            <div>
              <p class="order-name">${escapeHtml(item.name)}</p>
              <p class="order-time">мин ${item.minStock}${item.unit ? ' ' + item.unit : ''}</p>
            </div>
            <span class="status ${item.low ? 'cancelled' : 'ready'}">${item.stock}${item.unit ? ' ' + item.unit : ''}</span>
          </div>
        `;
        box.appendChild(card);
      });
    } catch (err) {
      const box = document.getElementById('adminPurchasesList');
      if (box) box.innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`;
    }
  }

  async function sendAdminPurchases() {
    try {
      const res = await fetch(`${state.apiBase}/api/mini-app/admin/purchases`, {
        method: 'POST', headers: adminHeaders(), body: adminBody({ action: 'send' })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ошибка');
      showToast(`Отправлено позиций: ${data.sent ?? 0}`);
    } catch (err) {
      showToast(err.message || 'Ошибка');
    }
  }

  async function refreshAdminMonitoring() {
    if (!isAdminUser() || !canOrder()) return;
    try {
      const res = await fetch(`${state.apiBase}/api/mini-app/admin/monitoring`, {
        method: 'POST', headers: adminHeaders(), body: adminBody()
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ошибка');
      const s = data.status || {};
      if (els.adminMonitoringBox) {
        els.adminMonitoringBox.innerHTML = `
          Сервер: <strong>${escapeHtml(s.server)}</strong><br>
          Firebase: <strong>${escapeHtml(s.firebase)}</strong><br>
          Alerts bot: <strong>${escapeHtml(s.alertsBot)}</strong><br>
          Mini App bot: <strong>${escapeHtml(s.miniAppBot)}</strong><br>
          <span class="order-time">${escapeHtml(s.timestamp || '')}</span>
        `;
      }
    } catch (err) {
      if (els.adminMonitoringBox) els.adminMonitoringBox.textContent = err.message;
    }
  }

  function startAdminPolling() {
    if (state.adminOrdersTimer) clearInterval(state.adminOrdersTimer);
    state.adminOrdersTimer = setInterval(() => {
      if (document.querySelector('.view.active')?.dataset.view === 'admin' && state.adminTab === 'orders') {
        refreshAdminOrders();
      }
    }, 5000);
  }

  function startKeepAlive() {
    if (startKeepAlive._timer) return;
    startKeepAlive._timer = setInterval(() => {
      fetch(`${state.apiBase}/health`, { cache: 'no-store', mode: 'cors' }).catch(() => {});
    }, 4 * 60 * 1000);
  }

  function updateProfileUI() {
    const name =
      state.user?.first_name
        ? [state.user.first_name, state.user.last_name].filter(Boolean).join(' ')
        : state.firebaseUser?.displayName || 'Гость';

    els.profileName.textContent = name;
    els.profileMeta.textContent = state.user?.username
      ? `@${state.user.username}${state.role === 'admin' ? ' · админ' : ''}`
      : state.role === 'admin'
        ? 'Администратор'
        : 'Telegram Mini App';
    els.avatar.textContent = (name || 'A').charAt(0).toUpperCase();
    els.profileBonus.textContent = String(state.bonusBalance);
    els.bonusChip.textContent = `◆ ${state.bonusBalance}`;
    els.profileBill.textContent =
      state.openBillTotal == null ? '—' : `${state.openBillTotal} ₽`;
  }

  function getCategory(cocktail) {
    const raw = (cocktail.category || cocktail.type || '').toLowerCase();
    const name = (cocktail.name || '').toLowerCase();
    if (raw.includes('shot') || raw.includes('шот') || name.includes('шот')) return 'shots';
    if (raw.includes('signature') || raw.includes('автор') || raw.includes('фирм')) return 'signature';
    if (raw.includes('classic') || raw.includes('класс')) return 'classic';
    if (cocktail.isShot) return 'shots';
    if (cocktail.isSignature) return 'signature';
    return 'classic';
  }

  function readMenuCache() {
    try {
      const raw = localStorage.getItem(MENU_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.cocktails)) return null;
      if (Date.now() - (parsed.ts || 0) > MENU_CACHE_TTL_MS) return parsed; // stale ok for instant paint
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function writeMenuCache(cocktails, stoplistNames) {
    try {
      localStorage.setItem(MENU_CACHE_KEY, JSON.stringify({
        ts: Date.now(),
        cocktails,
        stoplist: stoplistNames
      }));
    } catch (_) { /* quota */ }
  }

  function applyMenuData(cocktails, stoplistNames, { fromCache = false } = {}) {
    state.cocktails = cocktails || [];
    state.stoplist = new Set(stoplistNames || []);
    renderMenu();
    if (fromCache) {
      els.menuGrid.dataset.fromCache = '1';
    } else {
      delete els.menuGrid.dataset.fromCache;
    }
  }

  async function loadMenu() {
    const cached = readMenuCache();
    if (cached?.cocktails?.length) {
      applyMenuData(cached.cocktails, cached.stoplist || [], { fromCache: true });
    }

    try {
      initFirebase();
      const [cocktailsSnap, stopSnap] = await Promise.all([
        db.collection('cocktails').get({ source: 'default' }),
        db.collection('stoplist').get({ source: 'default' })
      ]);

      const stoplistNames = [];
      stopSnap.forEach((doc) => {
        const item = doc.data();
        if (item.cocktailName) stoplistNames.push(item.cocktailName);
      });

      const cocktails = [];
      cocktailsSnap.forEach((doc) => {
        const data = doc.data();
        // Keep payload small for cache/render
        cocktails.push({
          id: doc.id,
          name: data.name || '',
          price: data.price || 0,
          image: data.image || '',
          ingredients: data.ingredients || '',
          description: data.description || '',
          mood: data.mood || '',
          alcohol: data.alcohol,
          category: data.category || data.type || '',
          isShot: Boolean(data.isShot),
          isSignature: Boolean(data.isSignature)
        });
      });

      cocktails.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'));
      writeMenuCache(cocktails, stoplistNames);
      applyMenuData(cocktails, stoplistNames);
    } catch (err) {
      console.error(err);
      if (!state.cocktails.length) {
        els.menuGrid.innerHTML = '<div class="empty-state">Не удалось загрузить меню</div>';
      }
    }
  }

  function renderMenu() {
    const list = state.cocktails
      .filter((c) => {
        if (state.category === 'all') return true;
        return getCategory(c) === state.category;
      })
      .sort((a, b) => {
        const aStop = state.stoplist.has(a.name) ? 1 : 0;
        const bStop = state.stoplist.has(b.name) ? 1 : 0;
        if (aStop !== bStop) return aStop - bStop;
        return (a.name || '').localeCompare(b.name || '', 'ru');
      });

    if (!list.length) {
      els.menuGrid.innerHTML = '<div class="empty-state">В этой категории пока пусто</div>';
      return;
    }

    els.menuGrid.innerHTML = '';
    list.forEach((cocktail, index) => {
      const stopped = state.stoplist.has(cocktail.name);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `cocktail${stopped ? ' stopped' : ''}`;
      btn.style.animationDelay = `${Math.min(index, 8) * 40}ms`;

      const imageUrl = (cocktail.image || '').trim();
      const hasImage = Boolean(imageUrl);
      btn.innerHTML = `
        <div class="thumb-wrap">
          ${hasImage
            ? `<img class="cocktail-thumb" src="${escapeAttr(imageUrl)}" alt="" loading="lazy" decoding="async">`
            : ''}
          <div class="thumb-placeholder" ${hasImage ? 'hidden' : ''}>
            <span class="thumb-placeholder-ico" aria-hidden="true">📷</span>
            <span class="thumb-placeholder-text">Коктейль уже делает селфи, скоро выложит сюда</span>
          </div>
        </div>
        <div class="cocktail-body">
          <h3>${escapeHtml(cocktail.name || 'Коктейль')}</h3>
          <p class="cocktail-meta">${escapeHtml(cocktail.ingredients || cocktail.description || 'Авторский рецепт бара')}</p>
          <div class="cocktail-foot">
            <span class="price">${Number(cocktail.price) || 0} ₽</span>
            ${stopped
              ? '<span class="badge stop">Стоп-лист</span>'
              : cocktail.alcohol != null
                ? `<span class="badge">${cocktail.alcohol}%</span>`
                : ''}
          </div>
        </div>
      `;

      const img = btn.querySelector('.cocktail-thumb');
      const placeholder = btn.querySelector('.thumb-placeholder');
      if (img && placeholder) {
        img.addEventListener('error', () => {
          img.remove();
          placeholder.hidden = false;
        });
      }

      btn.addEventListener('click', () => {
        haptic('light');
        openOrderSheet(cocktail);
      });

      els.menuGrid.appendChild(btn);
    });
  }

  function openOrderSheet(cocktail) {
    if (state.stoplist.has(cocktail.name)) {
      showToast('Коктейль временно недоступен');
      return;
    }
    if (!canOrder()) {
      if (state.authError === 'timeout' || state.authError === 'auth_failed') {
        showToast('Сервер ещё не готов — повторяем вход');
        switchView('profile');
        authenticate({ manual: true });
      } else if (!tg?.initData) {
        showToast('Нет Telegram-сессии');
        tg?.showAlert?.('Откройте Mini App кнопкой меню внутри бота AsafievBar.');
      } else {
        showToast('Подключаем сессию…');
        authenticate({ manual: true }).then((ok) => {
          if (ok) openOrderSheet(cocktail);
        });
      }
      return;
    }

    state.selected = cocktail;
    state.bonusToUse = 0;
    els.bonusInput.value = '0';

    els.sheetName.textContent = cocktail.name;
    els.sheetIngredients.textContent = cocktail.ingredients || 'Состав уточнит бармен';
    els.sheetMood.textContent = cocktail.mood || cocktail.description || '';

    if (cocktail.image) {
      els.sheetMedia.classList.remove('is-empty');
      els.sheetMedia.innerHTML = `
        <img src="${escapeAttr(cocktail.image)}" alt="${escapeAttr(cocktail.name)}" decoding="async">
        <div class="thumb-placeholder sheet-placeholder" hidden>
          <span class="thumb-placeholder-ico" aria-hidden="true">📷</span>
          <span class="thumb-placeholder-text">Коктейль уже делает селфи, скоро выложит сюда</span>
        </div>
      `;
      const sheetImg = els.sheetMedia.querySelector('img');
      const sheetPh = els.sheetMedia.querySelector('.sheet-placeholder');
      sheetImg?.addEventListener('error', () => {
        sheetImg.remove();
        if (sheetPh) sheetPh.hidden = false;
        els.sheetMedia.classList.add('is-empty');
      });
    } else {
      els.sheetMedia.classList.add('is-empty');
      els.sheetMedia.innerHTML = `
        <div class="thumb-placeholder sheet-placeholder">
          <span class="thumb-placeholder-ico" aria-hidden="true">📷</span>
          <span class="thumb-placeholder-text">Коктейль уже делает селфи, скоро выложит сюда</span>
        </div>
      `;
    }

    const price = Number(cocktail.price) || 0;
    els.sheetPrice.textContent = `${price} ₽`;

    const maxBonus = Math.min(
      state.bonusBalance,
      Math.floor(price * (state.maxBonusUsage / 100))
    );
    if (maxBonus > 0) {
      els.bonusRow.hidden = false;
      els.bonusInput.max = String(maxBonus);
      els.bonusInput.placeholder = `До ${maxBonus}`;
    } else {
      els.bonusRow.hidden = true;
    }

    updateSheetTotal();
    els.sheetBackdrop.hidden = false;
    els.sheet.classList.add('open');
    els.sheet.setAttribute('aria-hidden', 'false');
    tg?.MainButton?.hide?.();
  }

  function closeOrderSheet() {
    els.sheet.classList.remove('open');
    els.sheet.setAttribute('aria-hidden', 'true');
    els.sheetBackdrop.hidden = true;
    state.selected = null;
  }

  function updateSheetTotal() {
    if (!state.selected) return;
    const price = Number(state.selected.price) || 0;
    const maxBonus = Math.min(
      state.bonusBalance,
      Math.floor(price * (state.maxBonusUsage / 100))
    );
    let bonus = Number(els.bonusInput.value) || 0;
    bonus = Math.max(0, Math.min(bonus, maxBonus));
    state.bonusToUse = bonus;
    els.sheetTotal.textContent = `${Math.max(0, price - bonus)} ₽`;
  }

  async function loadBonuses() {
    if (!state.firebaseUser) return;
    try {
      const [bonusDoc, settingsDoc] = await Promise.all([
        db.collection('bonusAccounts').doc(state.firebaseUser.uid).get(),
        db.collection('settings').doc('bonusSystem').get()
      ]);
      state.bonusBalance = bonusDoc.exists ? Number(bonusDoc.data().balance) || 0 : 0;
      if (settingsDoc.exists && settingsDoc.data().maxUsage != null) {
        state.maxBonusUsage = Number(settingsDoc.data().maxUsage) || 50;
      }
      updateProfileUI();
    } catch (err) {
      console.error(err);
    }
  }

  async function loadOpenBill() {
    if (!state.firebaseUser) return;
    try {
      const snap = await db
        .collection('bills')
        .where('userId', '==', state.firebaseUser.uid)
        .where('status', '==', 'open')
        .limit(1)
        .get();

      if (snap.empty) {
        state.openBillTotal = 0;
      } else {
        const bill = snap.docs[0].data();
        state.openBillTotal = Number(bill.total || bill.totalAmount || 0);
      }
      updateProfileUI();
    } catch (err) {
      console.error(err);
      state.openBillTotal = null;
      updateProfileUI();
    }
  }

  async function getNextQueuePosition() {
    try {
      const res = await fetch(`${state.apiBase}/queue-info`);
      const data = await res.json();
      const total = data?.queueInfo?.totalOrders ?? data?.totalOrders;
      if (data?.success && typeof total === 'number') {
        return total + 1;
      }
    } catch (_) { /* fallback below */ }

    try {
      const snap = await db
        .collection('orders')
        .where('status', 'in', ['pending', 'confirmed', 'preparing', 'ready'])
        .get();
      return snap.size + 1;
    } catch (_) {
      return 1;
    }
  }

  async function placeOrder() {
    if (!state.selected || !canOrder()) return;

    const cocktail = state.selected;
    const price = Number(cocktail.price) || 0;
    const bonusUsed = state.bonusToUse || 0;
    const finalPrice = Math.max(0, price - bonusUsed);

    els.confirmOrderBtn.disabled = true;
    setLoader(true);

    try {
      const queuePosition = await getNextQueuePosition();
      const displayName =
        [state.user?.first_name, state.user?.last_name].filter(Boolean).join(' ') ||
        state.firebaseUser?.displayName ||
        'Гость Telegram';

      const headers = { 'Content-Type': 'application/json' };
      if (state.firebaseUser) {
        try {
          headers.Authorization = `Bearer ${await state.firebaseUser.getIdToken()}`;
        } catch (_) { /* initData is enough */ }
      }

      const payload = {
        initData: tg.initData,
        cocktailId: cocktail.id,
        name: cocktail.name,
        price: finalPrice,
        originalPrice: price,
        bonusUsed,
        queuePosition,
        user: displayName,
        image: cocktail.image || '',
        source: 'telegram-mini-app'
      };

      const res = await fetch(`${state.apiBase}/api/mini-app/create-order`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Не удалось создать заказ');
      }

      if (bonusUsed > 0) {
        state.bonusBalance = Math.max(0, state.bonusBalance - bonusUsed);
        updateProfileUI();
      }

      haptic('medium');
      closeOrderSheet();
      showToast(`Заказ принят · очередь #${data.queuePosition || queuePosition}`);
      switchView('orders');
      refreshOrders();
      refreshProfile();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Ошибка заказа');
      haptic('heavy');
    } finally {
      els.confirmOrderBtn.disabled = false;
      setLoader(false);
    }
  }

  function renderOrders(orders) {
    if (!orders?.length) {
      els.ordersList.innerHTML = '<div class="empty-state">Пока нет заказов</div>';
      return;
    }

    els.ordersList.innerHTML = '';
    orders.forEach((order) => {
      const status = order.status || 'pending';
      const card = document.createElement('article');
      card.className = 'order-card';
      card.innerHTML = `
        <div class="order-top">
          <div>
            <p class="order-name">${escapeHtml(order.name || 'Заказ')}</p>
            <p class="order-time">${escapeHtml(order.displayTime || '')}</p>
          </div>
          <span class="status ${escapeAttr(status)}">${STATUS_LABELS[status] || status}</span>
        </div>
        ${
          order.queuePosition && ['pending', 'confirmed', 'preparing', 'ready'].includes(status)
            ? `<div class="queue">Позиция в очереди: #${order.queuePosition}</div>`
            : ''
        }
        <div class="queue">${Number(order.price) || 0} ₽</div>
      `;
      els.ordersList.appendChild(card);
    });
  }

  async function refreshOrders() {
    if (!canOrder()) return;
    try {
      const res = await fetch(`${state.apiBase}/api/mini-app/my-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData })
      });
      const data = await res.json();
      if (data.success) renderOrders(data.orders || []);
    } catch (err) {
      console.warn('orders refresh failed', err);
    }
  }

  async function refreshProfile() {
    if (!canOrder()) return;
    try {
      const res = await fetch(`${state.apiBase}/api/mini-app/me`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData })
      });
      const data = await res.json();
      if (!data.success) return;
      state.bonusBalance = Number(data.bonusBalance) || 0;
      state.openBillTotal = Number(data.openBillTotal) || 0;
      if (data.maxBonusUsage) state.maxBonusUsage = Number(data.maxBonusUsage) || 50;
      updateProfileUI();
    } catch (err) {
      console.warn('profile refresh failed', err);
    }
  }

  function startOrdersPolling() {
    refreshOrders();
    if (state.ordersPollTimer) clearInterval(state.ordersPollTimer);
    state.ordersPollTimer = setInterval(refreshOrders, 5000);
  }

  function subscribeOrders() {
    if (!state.firebaseUser) return;
    if (state.ordersUnsub) state.ordersUnsub();

    state.ordersUnsub = db
      .collection('orders')
      .where('userId', '==', state.firebaseUser.uid)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .onSnapshot(
        (snap) => {
          if (snap.empty) {
            els.ordersList.innerHTML = '<div class="empty-state">Пока нет заказов</div>';
            return;
          }

          els.ordersList.innerHTML = '';
          snap.forEach((doc) => {
            const order = doc.data();
            const status = order.status || 'pending';
            const card = document.createElement('article');
            card.className = 'order-card';
            card.innerHTML = `
              <div class="order-top">
                <div>
                  <p class="order-name">${escapeHtml(order.name || 'Заказ')}</p>
                  <p class="order-time">${escapeHtml(order.displayTime || '')}</p>
                </div>
                <span class="status ${escapeAttr(status)}">${STATUS_LABELS[status] || status}</span>
              </div>
              ${
                order.queuePosition && ['pending', 'confirmed', 'preparing', 'ready'].includes(status)
                  ? `<div class="queue">Позиция в очереди: #${order.queuePosition}</div>`
                  : ''
              }
              <div class="queue">${Number(order.price) || 0} ₽</div>
            `;
            els.ordersList.appendChild(card);
          });
        },
        async (err) => {
          console.warn('orders index fallback', err);
          // Fallback without orderBy if composite index missing
          const snap = await db
            .collection('orders')
            .where('userId', '==', state.firebaseUser.uid)
            .limit(20)
            .get();
          const items = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => {
              const ta = a.createdAt?.toMillis?.() || 0;
              const tb = b.createdAt?.toMillis?.() || 0;
              return tb - ta;
            });

          if (!items.length) {
            els.ordersList.innerHTML = '<div class="empty-state">Пока нет заказов</div>';
            return;
          }

          els.ordersList.innerHTML = '';
          items.forEach((order) => {
            const status = order.status || 'pending';
            const card = document.createElement('article');
            card.className = 'order-card';
            card.innerHTML = `
              <div class="order-top">
                <div>
                  <p class="order-name">${escapeHtml(order.name || 'Заказ')}</p>
                  <p class="order-time">${escapeHtml(order.displayTime || '')}</p>
                </div>
                <span class="status ${escapeAttr(status)}">${STATUS_LABELS[status] || status}</span>
              </div>
              <div class="queue">${Number(order.price) || 0} ₽</div>
            `;
            els.ordersList.appendChild(card);
          });
        }
      );
  }

  function switchView(name) {
    if (name === 'admin' && !isAdminUser()) {
      showToast('Нет прав админа');
      return;
    }
    document.querySelectorAll('.view').forEach((v) => {
      v.classList.toggle('active', v.dataset.view === name);
    });
    document.querySelectorAll('.tab').forEach((t) => {
      t.classList.toggle('active', t.dataset.nav === name);
    });
    if (name === 'menu') tg?.BackButton?.hide?.();
    else tg?.BackButton?.show?.();
    if (name === 'admin') {
      if (state.adminTab === 'orders') refreshAdminOrders();
      else refreshAdminStoplist();
    }
    haptic('light');
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/'/g, '&#39;');
  }

  function bindUi() {
    document.querySelectorAll('.tab').forEach((tab) => {
      tab.addEventListener('click', () => switchView(tab.dataset.nav));
    });

    els.filters.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter');
      if (!btn) return;
      state.category = btn.dataset.category;
      els.filters.querySelectorAll('.filter').forEach((f) => {
        f.classList.toggle('active', f === btn);
      });
      renderMenu();
      haptic('light');
    });

    els.bonusChip.addEventListener('click', () => switchView('profile'));
    els.cancelOrderBtn.addEventListener('click', closeOrderSheet);
    els.sheetBackdrop.addEventListener('click', closeOrderSheet);
    els.bonusInput.addEventListener('input', updateSheetTotal);
    els.confirmOrderBtn.addEventListener('click', placeOrder);
    els.authRetryBtn?.addEventListener('click', () => {
      haptic('light');
      authenticate({ manual: true });
    });
    els.adminStopAddBtn?.addEventListener('click', addToAdminStoplist);
    document.getElementById('adminCocktailSaveBtn')?.addEventListener('click', saveAdminCocktail);
    document.getElementById('adminPromoSaveBtn')?.addEventListener('click', saveAdminPromo);
    document.getElementById('adminBonusSaveBtn')?.addEventListener('click', saveAdminBonuses);
    document.getElementById('adminPurchaseSendBtn')?.addEventListener('click', sendAdminPurchases);
    document.getElementById('adminMonitoringRefreshBtn')?.addEventListener('click', refreshAdminMonitoring);
    document.getElementById('adminBillFilters')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-bill-filter]');
      if (!btn) return;
      state.billFilter = btn.dataset.billFilter;
      document.querySelectorAll('#adminBillFilters .filter').forEach((f) => {
        f.classList.toggle('active', f === btn);
      });
      refreshAdminBills();
    });
    els.adminSubtabs?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-admin-tab]');
      if (!btn) return;
      switchAdminTab(btn.dataset.adminTab);
      haptic('light');
    });

    tg?.BackButton?.onClick?.(() => {
      if (els.sheet.classList.contains('open')) closeOrderSheet();
      else switchView('menu');
    });
  }

  async function waitForFirebase(timeoutMs = 8000) {
    if (typeof firebase !== 'undefined') return;
    const start = Date.now();
    await new Promise((resolve, reject) => {
      const timer = setInterval(() => {
        if (typeof firebase !== 'undefined') {
          clearInterval(timer);
          resolve();
        } else if (Date.now() - start > timeoutMs) {
          clearInterval(timer);
          reject(new Error('Firebase SDK не загрузился'));
        }
      }, 30);
    });
  }

  async function boot() {
    bindUi();
    initTelegram();
    updateProfileUI();

    // Instant paint from cache before network
    const cached = readMenuCache();
    if (cached?.cocktails?.length) {
      applyMenuData(cached.cocktails, cached.stoplist || [], { fromCache: true });
    }

    try {
      await waitForFirebase();
      initFirebase();
    } catch (err) {
      console.error(err);
      els.authStatus.textContent = 'Не удалось загрузить SDK. Проверьте сеть.';
      if (!state.cocktails.length) {
        els.menuGrid.innerHTML = '<div class="empty-state">Нет сети для загрузки меню</div>';
      }
      return;
    }

    // Menu and auth in parallel — UI stays interactive
    await Promise.all([loadMenu(), authenticate()]);
  }

  boot();
})();
