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

  const DEFAULT_API = 'https://asafievbar.duckdns.org';
  const MENU_CACHE_KEY = 'asafiev_mini_menu_v3';
  const MENU_CACHE_TTL_MS = 10 * 60 * 1000;
  const STATUS_LABELS = {
    pending: 'Ожидание',
    confirmed: 'Подтверждён',
    preparing: 'Готовится',
    ready: 'Готов',
    completed: 'Выполнен',
    cancelled: 'Отменён'
  };
  const TASTE_LABELS = { sour: 'кислое', sweet: 'сладкое', bitter: 'горькое' };
  const PAY_METHOD_RU = {
    cash: 'наличные',
    card: 'карта',
    transfer: 'перевод',
    'Наличные': 'наличные',
    'Карта': 'карта',
    'Перевод': 'перевод'
  };

  const tg = window.Telegram?.WebApp;
  const state = {
    apiBase: resolveApiBase(),
    user: null,
    firebaseUser: null,
    cocktails: [],
    stoplist: new Set(),
    ratings: {},
    category: 'all',
    bonusBalance: 0,
    totalEarned: 0,
    totalSpent: 0,
    openBillTotal: null,
    openBillItems: [],
    openBillPromo: null,
    billHistory: [],
    selected: null,
    bonusToUse: 0,
    bonusPercentage: 5,
    bonusMinOrder: 300,
    bonusActive: true,
    ordersUnsub: null,
    maxBonusUsage: 50,
    authReady: false,
    sessionOk: false,
    uid: null,
    authError: null,
    ordersPollTimer: null,
    role: 'user',
    adminOrdersTimer: null,
    adminTab: 'cocktails',
    knownOrderStatuses: new Map(),
    promptedRatingOrders: new Set(),
    billExpandPrefs: new Map(),
    currentView: 'menu',
    ratingOrder: null,
    ratingValue: 0
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
    const base = resolveApiBase();
    try {
      fetch(`${base}/health`, { method: 'GET', cache: 'no-store', mode: 'cors' }).catch(() => {});
      fetch(`${base}/api/mini-app/menu-bootstrap`, { method: 'GET', cache: 'default', mode: 'cors' }).catch(() => {});
      if (navigator.sendBeacon) navigator.sendBeacon(`${base}/health`);
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
    profileEarned: document.getElementById('profileEarned'),
    profileSpent: document.getElementById('profileSpent'),
    profileBillItems: document.getElementById('profileBillItems'),
    profileBillEmpty: document.getElementById('profileBillEmpty'),
    profileBillHistory: document.getElementById('profileBillHistory'),
    profilePromoInput: document.getElementById('profilePromoInput'),
    profilePromoBtn: document.getElementById('profilePromoBtn'),
    profilePromoHint: document.getElementById('profilePromoHint'),
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
    bonusEarnRow: document.getElementById('bonusEarnRow'),
    sheetBonusEarn: document.getElementById('sheetBonusEarn'),
    confirmOrderBtn: document.getElementById('confirmOrderBtn'),
    cancelOrderBtn: document.getElementById('cancelOrderBtn'),
    ratingSheet: document.getElementById('ratingSheet'),
    ratingBackdrop: document.getElementById('ratingBackdrop'),
    ratingTitle: document.getElementById('ratingTitle'),
    ratingSubtitle: document.getElementById('ratingSubtitle'),
    ratingStars: document.getElementById('ratingStars'),
    ratingSubmitBtn: document.getElementById('ratingSubmitBtn'),
    ratingSkipBtn: document.getElementById('ratingSkipBtn'),
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
    const el = els.toast;
    if (!el) return;
    const text = String(message || '').trim();
    if (!text) return;

    clearTimeout(showToast._t);
    clearTimeout(showToast._hide);

    el.hidden = false;
    el.textContent = text;
    el.classList.remove('is-on', 'is-leaving');
    // Restart enter transition even if toast was already visible
    void el.offsetWidth;
    el.classList.add('is-on');

    showToast._t = setTimeout(() => {
      el.classList.remove('is-on');
      el.classList.add('is-leaving');
      showToast._hide = setTimeout(() => {
        el.classList.remove('is-leaving');
        el.hidden = true;
        el.textContent = '';
      }, 240);
    }, 2400);
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
      // Don't fight the keyboard — expand() on keyboard resize breaks the order sheet
      if (!document.body.classList.contains('keyboard-open') && document.activeElement?.id !== 'bonusInput') {
        try { tg.expand(); } catch (_) { /* ignore */ }
      }
      applySafeArea();
      syncKeyboardLayout();
    });

    bindKeyboardAwareLayout();

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

  function syncKeyboardLayout() {
    const vv = window.visualViewport;
    const layoutHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    let inset = 0;
    let vvHeight = layoutHeight;
    if (vv) {
      vvHeight = vv.height;
      inset = Math.max(0, Math.round(layoutHeight - vv.height - vv.offsetTop));
    }
    document.documentElement.style.setProperty('--keyboard-inset', `${inset}px`);
    document.documentElement.style.setProperty('--vv-height', `${Math.round(vvHeight)}px`);
    const keyboardOpen = inset > 60;
    document.body.classList.toggle('keyboard-open', keyboardOpen);

    if (els.sheet?.classList.contains('open')) {
      if (keyboardOpen || document.activeElement === els.bonusInput) {
        els.sheet.classList.add('sheet-compact');
      } else if (document.activeElement !== els.bonusInput) {
        els.sheet.classList.remove('sheet-compact');
      }
    }
  }

  function bindKeyboardAwareLayout() {
    const onViewport = () => syncKeyboardLayout();
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', onViewport);
      window.visualViewport.addEventListener('scroll', onViewport);
    }
    window.addEventListener('resize', onViewport);
    syncKeyboardLayout();
  }

  function focusBonusField() {
    els.sheet?.classList.add('sheet-compact');
    syncKeyboardLayout();
    // Scroll bonus row into the visible sheet area above action buttons
    requestAnimationFrame(() => {
      try {
        els.bonusRow?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      } catch (_) {
        els.bonusRow?.scrollIntoView();
      }
    });
  }

  function blurBonusField() {
    // Delay so we don't flicker if focus moves briefly
    setTimeout(() => {
      if (document.activeElement === els.bonusInput) return;
      if (!document.body.classList.contains('keyboard-open')) {
        els.sheet?.classList.remove('sheet-compact');
      }
      syncKeyboardLayout();
    }, 180);
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

  function setAuthStatus(text, { error = false } = {}) {
    if (!els.authStatus) return;
    const msg = String(text || '').trim();
    if (!msg || !error) {
      els.authStatus.hidden = true;
      els.authStatus.textContent = '';
      return;
    }
    els.authStatus.hidden = false;
    els.authStatus.textContent = msg;
  }

  function setAuthRetryVisible(on) {
    if (els.authRetryBtn) els.authRetryBtn.hidden = !on;
  }

  async function authenticate(options = {}) {
    const { manual: _manual = false } = options;
    const initData = tg?.initData || '';

    if (!initData) {
      state.authError = 'no_init_data';
      setAuthStatus(
        'Нет данных Telegram. Откройте Mini App кнопкой меню бота (не через браузер).',
        { error: true }
      );
      setAuthRetryVisible(false);
      updateProfileUI();
      return false;
    }

    setAuthRetryVisible(false);
    setAuthStatus('');

    const awake = await ensureApiAwake(() => {});

    if (!awake) {
      state.sessionOk = false;
      state.authReady = false;
      state.authError = 'timeout';
      setAuthStatus(
        'Сервер долго просыпается. Нажмите «Повторить вход» через несколько секунд.',
        { error: true }
      );
      setAuthRetryVisible(true);
      return false;
    }

    // A few auth attempts after wake (first request can still be slow)
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      setAuthStatus('');
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
        if (Array.isArray(data.openBillItems)) {
          state.openBillItems = data.openBillItems;
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

        setAuthStatus('');
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
        setAuthStatus(`Не удалось войти: ${msg}`, { error: true });
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
      startAdminPolling();
      switchAdminTab(state.adminTab || 'cocktails');
    }
  }

  function adminHeaders() {
    return { 'Content-Type': 'application/json' };
  }

  function adminBody(extra = {}) {
    return JSON.stringify({ initData: tg?.initData || '', ...extra });
  }

  async function refreshAdminOrders() {
    if (!isAdminUser()) return;
    if (!els.adminOrdersList) return;
    if (!tg?.initData) {
      els.adminOrdersList.innerHTML = '<div class="empty-state">Нет Telegram-сессии — откройте из бота</div>';
      return;
    }
    els.adminOrdersList.innerHTML = '<div class="empty-state">Загрузка заказов…</div>';
    try {
      const res = await fetch(`${state.apiBase}/api/mini-app/admin/orders`, {
        method: 'POST',
        headers: adminHeaders(),
        body: adminBody()
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || `Ошибка ${res.status}`);
      renderAdminOrders(data.orders || []);
    } catch (err) {
      console.warn(err);
      els.adminOrdersList.innerHTML = `<div class="empty-state">${escapeHtml(err.message || 'Не удалось загрузить')}</div>`;
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
      // Profile open-bill statuses come from bill items — refresh after sync
      refreshProfile().catch(() => {});
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
    if (!isAdminUser()) return;
    try {
      const res = await fetch(`${state.apiBase}/api/mini-app/admin/stoplist`, {
        method: 'POST',
        headers: adminHeaders(),
        body: adminBody({ action: 'list' })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ошибка стоп-листа');
      const items = data.items || [];
      applyStoplistNames(items.map((i) => i.cocktailName));
      renderAdminStoplist(items);
      populateAdminStopSelect();
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
    state.adminTab = name || 'cocktails';
    state.billFilter = state.billFilter || 'open';
    state.cocktailFilter = state.cocktailFilter || 'all';
    state.ingFilter = state.ingFilter || 'all';

    els.adminSubtabs?.querySelectorAll('[data-admin-tab]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.adminTab === state.adminTab);
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
      if (!el) return;
      el.classList.toggle('is-active', key === state.adminTab);
      el.hidden = false;
      el.removeAttribute('hidden');
    });

    if (state.adminTab === 'orders') refreshAdminOrders();
    if (state.adminTab === 'bills') refreshAdminBills();
    if (state.adminTab === 'stoplist') refreshAdminStoplist();
    if (state.adminTab === 'cocktails') refreshAdminCocktails();
    if (state.adminTab === 'promos') refreshAdminPromos();
    if (state.adminTab === 'bonuses') refreshAdminBonuses();
    if (state.adminTab === 'purchases') refreshAdminPurchases();
    if (state.adminTab === 'monitoring') refreshAdminMonitoring();
  }

  async function refreshAdminBills() {
    if (!isAdminUser()) return;
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
          <div class="stat"><span class="stat-label">Оплачено</span><strong>${data.stats?.paidSum ?? 0} ₽</strong></div>
        `;
      }
      const list = data.bills || [];
      if (!els.adminBillsList) return;
      if (!list.length) {
        els.adminBillsList.innerHTML = '<div class="empty-state">Счетов нет</div>';
        return;
      }
      els.adminBillsList.innerHTML = '';
      const billStatusRu = { open: 'открыт', paid: 'оплачен', closed: 'закрыт' };
      list.forEach((bill) => {
        const card = document.createElement('article');
        card.className = 'order-card';
        const statusLabel = billStatusRu[bill.status] || bill.status || '';
        const payLabel = PAY_METHOD_RU[bill.paymentMethod] || bill.paymentMethod || '—';
        const itemsPreview = (bill.items || [])
          .slice(0, 3)
          .map((it) => `${it.cocktailName} (${STATUS_LABELS[it.status] || it.status})`)
          .join(' · ');
        card.innerHTML = `
          <div class="order-top">
            <div>
              <p class="order-name">${escapeHtml(bill.userName || 'Гость')}</p>
              <p class="order-time">${bill.itemsCount || 0} поз. · ${escapeHtml(statusLabel)}${bill.promoCode ? ` · ${escapeHtml(bill.promoCode)}` : ''}</p>
              ${itemsPreview ? `<p class="order-time">${escapeHtml(itemsPreview)}</p>` : ''}
            </div>
            <strong class="price">${Number(bill.totalAmount) || 0} ₽</strong>
          </div>
          ${bill.status === 'open' ? `<div class="admin-actions">
            <button type="button" class="primary" data-close-bill="${escapeAttr(bill.id)}" data-method="cash">Наличные</button>
            <button type="button" data-close-bill="${escapeAttr(bill.id)}" data-method="card">Карта</button>
            <button type="button" data-close-bill="${escapeAttr(bill.id)}" data-method="transfer">Перевод</button>
            <button type="button" class="danger" data-delete-bill="${escapeAttr(bill.id)}">Удалить</button>
          </div>` : `<div class="admin-actions">
            <div class="queue">Оплата: ${escapeHtml(payLabel)}</div>
            <button type="button" data-reopen-bill="${escapeAttr(bill.id)}">Переоткрыть</button>
            <button type="button" class="danger" data-delete-bill="${escapeAttr(bill.id)}">Удалить</button>
          </div>`}
        `;
        card.querySelectorAll('[data-close-bill]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            await closeAdminBill(btn.dataset.closeBill, btn.dataset.method || 'cash');
          });
        });
        card.querySelector('[data-reopen-bill]')?.addEventListener('click', async () => {
          await reopenAdminBill(bill.id);
        });
        card.querySelector('[data-delete-bill]')?.addEventListener('click', async () => {
          if (!confirm('Удалить счёт?')) return;
          await deleteAdminBill(bill.id);
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
      const bonusMsg = data.bonusAwarded ? ` · +${data.bonusAwarded} бонусов` : '';
      showToast(`Счёт закрыт${bonusMsg}`);
      refreshAdminBills();
      refreshProfile().catch(() => {});
    } catch (err) {
      showToast(err.message || 'Ошибка');
    }
  }

  async function reopenAdminBill(billId) {
    try {
      const res = await fetch(`${state.apiBase}/api/mini-app/admin/bills`, {
        method: 'POST', headers: adminHeaders(),
        body: adminBody({ action: 'reopen', billId })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Не удалось переоткрыть');
      showToast('Счёт снова открыт');
      refreshAdminBills();
    } catch (err) {
      showToast(err.message || 'Ошибка');
    }
  }

  async function deleteAdminBill(billId) {
    try {
      const res = await fetch(`${state.apiBase}/api/mini-app/admin/bills`, {
        method: 'POST', headers: adminHeaders(),
        body: adminBody({ action: 'delete', billId })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Не удалось удалить');
      showToast('Счёт удалён');
      refreshAdminBills();
    } catch (err) {
      showToast(err.message || 'Ошибка');
    }
  }

  async function refreshAdminCocktails() {
    if (!isAdminUser()) return;
    try {
      const res = await fetch(`${state.apiBase}/api/mini-app/admin/cocktails`, {
        method: 'POST', headers: adminHeaders(), body: adminBody({ action: 'list' })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ошибка');
      const list = data.cocktails || [];
      state.adminCocktails = list;
      state.cocktails = list.map((c) => ({
        id: c.id, name: c.name, price: c.price, image: c.image || '',
        ingredients: c.ingredients || '', description: c.description || '',
        mood: c.mood || '', alcohol: c.alcohol, category: c.category || '',
        tasteTags: Array.isArray(c.tasteTags) ? c.tasteTags : [],
        isShot: Boolean(c.isShot), isSignature: Boolean(c.isSignature)
      }));
      populateAdminStopSelect();
      scheduleRenderMenu({ animate: false });
      renderAdminCocktailsList();
    } catch (err) {
      const box = document.getElementById('adminCocktailsList');
      if (box) box.innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`;
    }
  }

  function renderAdminCocktailsList() {
    const box = document.getElementById('adminCocktailsList');
    if (!box) return;
    const filter = state.cocktailFilter || 'all';
    let list = state.adminCocktails || [];
    if (filter !== 'all') {
      list = list.filter((c) => getCategory(c) === filter);
    }
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
            <p class="order-time">${escapeHtml(c.category || getCategory(c))} · ${c.alcohol != null ? c.alcohol + '%' : '—'}</p>
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
  }

  function parseStockRecipeText(text) {
    return String(text || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const m = line.match(/^(.+?)\s*[=:]\s*([\d.,]+)\s*$/);
        if (m) {
          return {
            ingredientName: m[1].trim(),
            amount: Number(String(m[2]).replace(',', '.')) || 0
          };
        }
        return { ingredientName: line, amount: 1 };
      })
      .filter((r) => r.ingredientName && r.amount > 0);
  }

  function formatStockRecipeText(recipe) {
    if (!Array.isArray(recipe) || !recipe.length) return '';
    return recipe
      .map((r) => `${r.ingredientName} = ${r.amount}`)
      .join('\n');
  }

  function readTasteTagsFromForm() {
    const tags = [];
    if (document.getElementById('adminTasteSour')?.checked) tags.push('sour');
    if (document.getElementById('adminTasteSweet')?.checked) tags.push('sweet');
    if (document.getElementById('adminTasteBitter')?.checked) tags.push('bitter');
    return tags;
  }

  function fillCocktailForm(c) {
    document.getElementById('adminCocktailId').value = c?.id || '';
    document.getElementById('adminCocktailName').value = c?.name || '';
    document.getElementById('adminCocktailPrice').value = c?.price ?? '';
    document.getElementById('adminCocktailIngredients').value = c?.ingredients || '';
    document.getElementById('adminCocktailImage').value = c?.image || '';
    document.getElementById('adminCocktailCategory').value = c?.category || getCategory(c || {}) || 'classic';
    document.getElementById('adminCocktailAlcohol').value = c?.alcohol ?? '';
    document.getElementById('adminCocktailMood').value = c?.mood || c?.description || '';
    const tags = Array.isArray(c?.tasteTags) ? c.tasteTags : [];
    const sour = document.getElementById('adminTasteSour');
    const sweet = document.getElementById('adminTasteSweet');
    const bitter = document.getElementById('adminTasteBitter');
    if (sour) sour.checked = tags.includes('sour');
    if (sweet) sweet.checked = tags.includes('sweet');
    if (bitter) bitter.checked = tags.includes('bitter');
    const recipeEl = document.getElementById('adminCocktailRecipe');
    if (recipeEl) recipeEl.value = formatStockRecipeText(c?.stockRecipe);
    if (c) showToast(c?.id ? 'Редактирование: сохраните изменения' : 'Новый коктейль');
  }

  async function saveAdminCocktail() {
    const cocktail = {
      id: document.getElementById('adminCocktailId').value || undefined,
      name: document.getElementById('adminCocktailName').value.trim(),
      price: Number(document.getElementById('adminCocktailPrice').value),
      ingredients: document.getElementById('adminCocktailIngredients').value.trim(),
      image: document.getElementById('adminCocktailImage').value.trim(),
      category: document.getElementById('adminCocktailCategory').value,
      alcohol: document.getElementById('adminCocktailAlcohol').value,
      mood: document.getElementById('adminCocktailMood').value.trim(),
      description: document.getElementById('adminCocktailMood').value.trim(),
      tasteTags: readTasteTagsFromForm(),
      stockRecipe: parseStockRecipeText(document.getElementById('adminCocktailRecipe')?.value || '')
    };
    if (!cocktail.name || !Number.isFinite(cocktail.price)) {
      showToast('Название и цена обязательны');
      return;
    }
    try {
      const res = await fetch(`${state.apiBase}/api/mini-app/admin/cocktails`, {
        method: 'POST', headers: adminHeaders(), body: adminBody({ action: 'upsert', cocktail })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ошибка сохранения');
      fillCocktailForm(null);
      document.getElementById('adminCocktailId').value = '';
      document.getElementById('adminCocktailName').value = '';
      document.getElementById('adminCocktailPrice').value = '';
      document.getElementById('adminCocktailIngredients').value = '';
      document.getElementById('adminCocktailImage').value = '';
      document.getElementById('adminCocktailAlcohol').value = '';
      document.getElementById('adminCocktailMood').value = '';
      const recipeEl = document.getElementById('adminCocktailRecipe');
      if (recipeEl) recipeEl.value = '';
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
    if (!isAdminUser()) return;
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
      expiryDate: document.getElementById('adminPromoExpiry')?.value || null,
      active: document.getElementById('adminPromoActive')?.checked !== false
    };
    if (!promo.code) {
      showToast('Введите код промокода');
      return;
    }
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
      if (document.getElementById('adminPromoExpiry')) document.getElementById('adminPromoExpiry').value = '';
      if (document.getElementById('adminPromoActive')) document.getElementById('adminPromoActive').checked = true;
      refreshAdminPromos();
    } catch (err) {
      showToast(err.message || 'Ошибка');
    }
  }

  async function refreshAdminBonuses() {
    if (!isAdminUser()) return;
    const usersBox = document.getElementById('adminBonusUsersList');
    const statsBox = document.getElementById('adminBonusStats');
    if (usersBox) usersBox.innerHTML = '<div class="empty-state">Загрузка…</div>';
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

      if (statsBox) {
        statsBox.innerHTML = `
          <div class="stat"><span class="stat-label">С бонусами</span><strong>${data.stats?.usersCount ?? 0}</strong></div>
          <div class="stat"><span class="stat-label">Всего баллов</span><strong>${data.stats?.totalPoints ?? 0}</strong></div>
          <div class="stat"><span class="stat-label">Сегодня</span><strong>+${data.stats?.issuedToday ?? 0}</strong></div>
        `;
      }

      const users = data.users || [];
      if (usersBox) {
        if (!users.length) {
          usersBox.innerHTML = '<div class="empty-state">Пользователи с бонусами не найдены</div>';
        } else {
          usersBox.innerHTML = '';
          users.forEach((u) => {
            const card = document.createElement('article');
            card.className = 'order-card';
            card.innerHTML = `
              <div class="order-top">
                <div>
                  <p class="order-name">${escapeHtml(u.name || u.id)}</p>
                  <p class="order-time">${escapeHtml(u.phone || u.id)} · начислено ${Number(u.totalEarned) || 0}</p>
                </div>
                <strong class="price">${Number(u.balance) || 0} ◆</strong>
              </div>
            `;
            usersBox.appendChild(card);
          });
        }
      }
    } catch (err) {
      showToast(err.message || 'Ошибка бонусов');
      if (usersBox) usersBox.innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`;
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
    if (!isAdminUser()) return;
    try {
      const res = await fetch(`${state.apiBase}/api/mini-app/admin/purchases`, {
        method: 'POST', headers: adminHeaders(), body: adminBody({ action: 'list' })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ошибка');
      state.adminIngredients = data.items || [];
      const stats = data.stats || {};
      const statsEl = document.getElementById('adminPurchaseStats');
      if (statsEl) {
        statsEl.innerHTML = `
          <div class="stat"><span class="stat-label">Всего</span><strong>${stats.total ?? state.adminIngredients.length}</strong></div>
          <div class="stat"><span class="stat-label">Мало</span><strong>${stats.low ?? 0}</strong></div>
          <div class="stat"><span class="stat-label">Нет</span><strong>${stats.out ?? 0}</strong></div>
        `;
      }
      renderAdminPurchasesList();
    } catch (err) {
      const box = document.getElementById('adminPurchasesList');
      if (box) box.innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`;
    }
  }

  function renderAdminPurchasesList() {
    const box = document.getElementById('adminPurchasesList');
    if (!box) return;
    const filter = state.ingFilter || 'all';
    let list = state.adminIngredients || [];
    if (filter === 'low') list = list.filter((i) => i.low && !i.out);
    if (filter === 'out') list = list.filter((i) => i.out || i.stock <= 0);
    if (!list.length) {
      box.innerHTML = '<div class="empty-state">Ингредиентов нет — добавьте первый формой выше</div>';
      return;
    }
    box.innerHTML = '';
    list.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'order-card';
      const statusClass = item.out || item.stock <= 0 ? 'cancelled' : item.low ? 'preparing' : 'ready';
      const unit = item.unit ? ` ${item.unit}` : '';
      card.innerHTML = `
        <div class="order-top">
          <div>
            <p class="order-name">${escapeHtml(item.name)}</p>
            <p class="order-time">минимум ${item.minStock}${unit}</p>
          </div>
          <span class="status ${statusClass}">${item.stock}${unit}</span>
        </div>
        <div class="ing-stock-row">
          <button type="button" data-stock-delta="-1" data-ing-id="${escapeAttr(item.id)}" aria-label="Минус">−</button>
          <div class="ing-stock-val">остаток ${item.stock}${unit}</div>
          <button type="button" data-stock-delta="1" data-ing-id="${escapeAttr(item.id)}" aria-label="Плюс">+</button>
        </div>
        <div class="admin-actions">
          <button type="button" class="warn" data-zero-ing="${escapeAttr(item.id)}" ${Number(item.stock) <= 0 ? 'disabled' : ''}>Кончился</button>
          <button type="button" class="primary" data-edit-ing="${escapeAttr(item.id)}">Изменить</button>
          <button type="button" class="danger" data-del-ing="${escapeAttr(item.id)}">Удалить</button>
        </div>
      `;
      card.querySelector('[data-edit-ing]')?.addEventListener('click', () => {
        fillIngredientForm(item);
        showToast(`Редактируем: ${item.name}`);
      });
      card.querySelector('[data-del-ing]')?.addEventListener('click', async () => {
        if (!confirm(`Удалить «${item.name}»?`)) return;
        await deleteAdminIngredient(item.id);
      });
      card.querySelector('[data-zero-ing]')?.addEventListener('click', async () => {
        if (Number(item.stock) <= 0) return;
        haptic('medium');
        await quickUpdateIngredientStock(item, 0);
      });
      card.querySelectorAll('[data-stock-delta]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const delta = Number(btn.dataset.stockDelta) || 0;
          const step = item.unit === 'шт' ? 1 : Math.max(1, Math.round((Number(item.minStock) || 100) * 0.1));
          const next = Math.max(0, Number(item.stock) + delta * step);
          await quickUpdateIngredientStock(item, next);
        });
      });
      box.appendChild(card);
    });
  }

  function resetIngredientForm() {
    const title = document.getElementById('adminIngFormTitle');
    const box = document.getElementById('adminIngFormBox');
    const saveBtn = document.getElementById('adminIngSaveBtn');
    const cancelBtn = document.getElementById('adminIngCancelBtn');
    document.getElementById('adminIngId').value = '';
    document.getElementById('adminIngName').value = '';
    document.getElementById('adminIngUnit').value = 'шт';
    document.getElementById('adminIngStock').value = '';
    document.getElementById('adminIngMin').value = '';
    if (title) title.textContent = 'Новый ингредиент';
    if (saveBtn) saveBtn.textContent = 'Добавить ингредиент';
    if (cancelBtn) cancelBtn.hidden = true;
    box?.classList.remove('is-editing');
  }

  function fillIngredientForm(item) {
    const title = document.getElementById('adminIngFormTitle');
    const box = document.getElementById('adminIngFormBox');
    const saveBtn = document.getElementById('adminIngSaveBtn');
    const cancelBtn = document.getElementById('adminIngCancelBtn');
    document.getElementById('adminIngId').value = item?.id || '';
    document.getElementById('adminIngName').value = item?.name || '';
    document.getElementById('adminIngUnit').value = item?.unit || 'шт';
    document.getElementById('adminIngStock').value = item?.stock ?? '';
    document.getElementById('adminIngMin').value = item?.minStock ?? '';
    if (item?.id) {
      if (title) title.textContent = `Редактирование: ${item.name || 'ингредиент'}`;
      if (saveBtn) saveBtn.textContent = 'Сохранить изменения';
      if (cancelBtn) cancelBtn.hidden = false;
      box?.classList.add('is-editing');
      box?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.getElementById('adminIngStock')?.focus();
    } else {
      resetIngredientForm();
    }
  }

  async function quickUpdateIngredientStock(item, stock) {
    try {
      const res = await fetch(`${state.apiBase}/api/mini-app/admin/purchases`, {
        method: 'POST',
        headers: adminHeaders(),
        body: adminBody({
          action: 'upsert',
          ingredient: {
            id: item.id,
            name: item.name,
            unit: item.unit || 'шт',
            stock,
            minStock: Number(item.minStock) || 0
          }
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ошибка');
      const stopped = data.stoplist?.added
        ? ` · в стоп: ${data.stoplist.names.slice(0, 3).join(', ')}${data.stoplist.added > 3 ? '…' : ''}`
        : '';
      showToast(`${item.name}: ${stock}${item.unit ? ' ' + item.unit : ''}${stopped}`);
      await refreshAdminPurchases();
      if (data.stoplist?.added) {
        refreshAdminStoplist().catch(() => {});
        refreshStoplistFromApi().catch(() => {});
      }
    } catch (err) {
      showToast(err.message || 'Ошибка');
    }
  }

  async function saveAdminIngredient() {
    const ingredient = {
      id: document.getElementById('adminIngId').value || undefined,
      name: document.getElementById('adminIngName').value.trim(),
      unit: document.getElementById('adminIngUnit').value,
      stock: Number(document.getElementById('adminIngStock').value),
      minStock: Number(document.getElementById('adminIngMin').value)
    };
    if (!ingredient.name) {
      showToast('Укажите название ингредиента');
      return;
    }
    if (!Number.isFinite(ingredient.stock) || ingredient.stock < 0) {
      showToast('Укажите остаток');
      return;
    }
    if (!Number.isFinite(ingredient.minStock) || ingredient.minStock < 0) {
      showToast('Укажите минимум');
      return;
    }
    try {
      const res = await fetch(`${state.apiBase}/api/mini-app/admin/purchases`, {
        method: 'POST', headers: adminHeaders(), body: adminBody({ action: 'upsert', ingredient })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ошибка');
      showToast(ingredient.id ? 'Изменения сохранены' : 'Ингредиент добавлен');
      resetIngredientForm();
      refreshAdminPurchases();
    } catch (err) {
      showToast(err.message || 'Ошибка');
    }
  }

  async function deleteAdminIngredient(id) {
    try {
      const res = await fetch(`${state.apiBase}/api/mini-app/admin/purchases`, {
        method: 'POST', headers: adminHeaders(), body: adminBody({ action: 'delete', id })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ошибка');
      showToast('Ингредиент удалён');
      refreshAdminPurchases();
    } catch (err) {
      showToast(err.message || 'Ошибка');
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

  function formatUptime(sec) {
    const s = Math.max(0, Number(sec) || 0);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 48) return `${Math.floor(h / 24)}д ${h % 24}ч`;
    if (h > 0) return `${h}ч ${m}м`;
    return `${m}м`;
  }

  function monitorBadge(ok, status) {
    if (ok || status === 'OK' || status === 'SET') return '<span class="monitor-ok">OK</span>';
    if (status === 'EMPTY' || status === 'NOT SET') return '<span class="monitor-warn">НЕТ</span>';
    return '<span class="monitor-bad">ОШИБКА</span>';
  }

  async function refreshAdminMonitoring() {
    if (!isAdminUser()) return;
    const box = els.adminMonitoringBox || document.getElementById('adminMonitoringBox');
    const statsEl = document.getElementById('adminMonitoringStats');
    if (box) box.innerHTML = '<div class="empty-state">Проверка системы…</div>';
    try {
      const t0 = Date.now();
      const res = await fetch(`${state.apiBase}/api/mini-app/admin/monitoring`, {
        method: 'POST', headers: adminHeaders(), body: adminBody()
      });
      const roundtrip = Date.now() - t0;
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ошибка');

      const m = data.metrics || {};
      const svc = data.services || {};
      const host = data.host || {};
      const api = svc.api || {};
      const fb = svc.firebase || {};
      const alerts = svc.alertsBot || {};
      const mini = svc.miniAppBot || {};
      const wh = svc.webhook || {};

      if (statsEl) {
        statsEl.innerHTML = `
          <div class="stat"><span class="stat-label">Заказы сегодня</span><strong>${m.ordersToday ?? 0}</strong></div>
          <div class="stat"><span class="stat-label">Выручка</span><strong>${m.revenueToday ?? 0} ₽</strong></div>
          <div class="stat"><span class="stat-label">Активные</span><strong>${m.activeOrders ?? 0}</strong></div>
        `;
      }

      if (box) {
        box.innerHTML = `
          <article class="monitor-card">
            <div class="monitor-card-top">
              <h4>API сервер</h4>
              ${monitorBadge(true, api.status || 'OK')}
            </div>
            <p>URL: ${escapeHtml(state.apiBase)}</p>
            <p>Uptime: ${escapeHtml(formatUptime(api.uptimeSec))} · Node ${escapeHtml(api.node || '—')}</p>
            <p>Ответ API: ${api.responseMs ?? '—'} мс · до телефона: ${roundtrip} мс</p>
            <p>RAM процесса: ${host.memory?.rssMb ?? '—'} МБ (heap ${host.memory?.heapMb ?? '—'} МБ)</p>
            ${host.system ? `<p>VPS: свободно ${host.system.freeMb}/${host.system.totalMb} МБ · load ${host.system.load1} · CPU ${host.system.cpus}</p>` : ''}
          </article>

          <article class="monitor-card">
            <div class="monitor-card-top">
              <h4>Firebase</h4>
              ${monitorBadge(fb.ok, fb.status)}
            </div>
            <p>Проект: ${escapeHtml(fb.projectId || '—')}</p>
            <p>Задержка: ${fb.latencyMs != null ? fb.latencyMs + ' мс' : '—'}</p>
            ${fb.error ? `<p>Ошибка: ${escapeHtml(fb.error)}</p>` : ''}
          </article>

          <article class="monitor-card">
            <div class="monitor-card-top">
              <h4>Alerts bot</h4>
              ${monitorBadge(alerts.ok, alerts.status)}
            </div>
            <p>@${escapeHtml(alerts.username || '—')} · ${escapeHtml(alerts.name || '')}</p>
            <p>getMe: ${alerts.ms != null ? alerts.ms + ' мс' : '—'}</p>
            ${alerts.error ? `<p>Ошибка: ${escapeHtml(alerts.error)}</p>` : ''}
          </article>

          <article class="monitor-card">
            <div class="monitor-card-top">
              <h4>Mini App bot</h4>
              ${monitorBadge(mini.ok, mini.status)}
            </div>
            <p>@${escapeHtml(mini.username || '—')} · ${escapeHtml(mini.name || '')}</p>
            <p>Main Mini App (кнопка ОТКРЫТЬ): ${mini.hasMainWebApp ? 'включено' : 'выкл — BotFather'}</p>
            <p>getMe: ${mini.ms != null ? mini.ms + ' мс' : '—'}</p>
          </article>

          <article class="monitor-card">
            <div class="monitor-card-top">
              <h4>Telegram webhook</h4>
              ${monitorBadge(wh.ok, wh.status)}
            </div>
            <p>${escapeHtml(wh.url || 'не задан')}</p>
            <p>Ожидают апдейты: ${wh.pending ?? 0}</p>
            ${wh.lastError ? `<p>Последняя ошибка: ${escapeHtml(wh.lastError)}</p>` : '<p>Ошибок webhook нет</p>'}
          </article>

          <article class="monitor-card">
            <div class="monitor-card-top">
              <h4>Бар сейчас</h4>
              <span class="monitor-ok">LIVE</span>
            </div>
            <p>Открытых счетов: ${m.openBills ?? 0}</p>
            <p>В стоп-листе: ${m.stoplistCount ?? 0} · коктейлей: ${m.cocktailsCount ?? 0}</p>
            <p>Ингредиенты: мало ${m.ingredientsLow ?? 0}, нет ${m.ingredientsOut ?? 0}</p>
            <p class="order-time">${escapeHtml(data.status?.timestamp || '')}</p>
          </article>
        `;
      }
    } catch (err) {
      if (box) box.innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`;
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
    }, 2 * 60 * 1000);
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
    if (els.profileEarned) els.profileEarned.textContent = String(state.totalEarned || 0);
    if (els.profileSpent) els.profileSpent.textContent = String(state.totalSpent || 0);
    els.bonusChip.textContent = formatBonusChip(state.bonusBalance);
    els.profileBill.textContent =
      state.openBillTotal == null ? '—' : `${state.openBillTotal} ₽`;
    renderProfileBillItems();
    renderProfileBillHistory();
    if (els.profilePromoHint) {
      if (state.openBillPromo?.code) {
        els.profilePromoHint.hidden = false;
        els.profilePromoHint.textContent =
          `Промокод ${state.openBillPromo.code} (−${state.openBillPromo.discount || 0}%)`;
      } else {
        els.profilePromoHint.hidden = true;
        els.profilePromoHint.textContent = '';
      }
    }
  }

  function renderProfileBillHistory() {
    if (!els.profileBillHistory) return;
    const list = Array.isArray(state.billHistory) ? state.billHistory : [];
    if (!list.length) {
      els.profileBillHistory.innerHTML = '<div class="empty-state">Пока нет оплаченных счетов</div>';
      return;
    }
    els.profileBillHistory.innerHTML = list.map((bill) => {
      const when = bill.paidAtMs
        ? new Date(bill.paidAtMs).toLocaleString('ru-RU')
        : '';
      const names = (bill.itemNames || []).join(', ');
      const pay = PAY_METHOD_RU[bill.paymentMethod] || bill.paymentMethod || '';
      return `
        <article class="order-card">
          <div class="order-top">
            <div>
              <p class="order-name">${escapeHtml(names || `${bill.itemsCount || 0} поз.`)}</p>
              <p class="order-time">${escapeHtml(when)}${pay ? ` · ${escapeHtml(pay)}` : ''}${bill.promoCode ? ` · ${escapeHtml(bill.promoCode)}` : ''}</p>
            </div>
            <strong class="price">${Number(bill.totalAmount) || 0} ₽</strong>
          </div>
        </article>
      `;
    }).join('');
  }

  function renderProfileBillItems() {
    if (!els.profileBillItems) return;
    const items = Array.isArray(state.openBillItems) ? state.openBillItems : [];
    if (!items.length) {
      els.profileBillItems.innerHTML =
        '<div class="empty-state" id="profileBillEmpty">Пока нет позиций в счёте</div>';
      return;
    }

    els.profileBillItems.innerHTML = items
      .map((item) => {
        const status = item.status || 'pending';
        const cancelled = status === 'cancelled';
        return `
          <article class="bill-item-row${cancelled ? ' is-cancelled' : ''}">
            <div>
              <p class="bill-item-name">${escapeHtml(item.cocktailName || 'Коктейль')}</p>
              <p class="bill-item-meta">${STATUS_LABELS[status] || status}</p>
            </div>
            <strong class="bill-item-price">${Number(item.price) || 0} ₽</strong>
          </article>
        `;
      })
      .join('');
  }

  function applyOpenBill(data) {
    if (typeof data?.openBillTotal === 'number') {
      state.openBillTotal = data.openBillTotal;
    }
    if (Array.isArray(data?.openBillItems)) {
      state.openBillItems = data.openBillItems;
    }
    if (data?.openBillPromo !== undefined) {
      state.openBillPromo = data.openBillPromo;
    }
    if (Array.isArray(data?.billHistory)) {
      state.billHistory = data.billHistory;
    }
    if (typeof data?.totalEarned === 'number') state.totalEarned = data.totalEarned;
    if (typeof data?.totalSpent === 'number') state.totalSpent = data.totalSpent;
    if (typeof data?.bonusPercentage === 'number') state.bonusPercentage = data.bonusPercentage;
    if (typeof data?.bonusMinOrder === 'number') state.bonusMinOrder = data.bonusMinOrder;
    if (typeof data?.bonusActive === 'boolean') state.bonusActive = data.bonusActive;
    updateProfileUI();
  }

  async function refreshRatingsSummary() {
    try {
      const res = await fetch(`${state.apiBase}/api/mini-app/ratings-summary`, { cache: 'default' });
      const data = await res.json();
      if (data?.success && data.averages) {
        const next = data.averages;
        if (JSON.stringify(state.ratings) !== JSON.stringify(next)) {
          state.ratings = next;
          writeMenuCache(state.cocktails, [...state.stoplist], state.ratings);
          scheduleRenderMenu({ animate: false });
        }
      }
    } catch (_) { /* ignore */ }
  }

  let menuRenderScheduled = false;
  let menuAnimateNext = false;
  let lastMenuSignature = '';

  function menuSignature() {
    const stop = [...state.stoplist].sort().join('|');
    const rates = Object.keys(state.ratings || {}).sort()
      .map((k) => `${k}:${state.ratings[k]}`).join('|');
    const cats = state.category;
    const cocktails = (state.cocktails || []).map((c) =>
      `${c.id}:${c.name}:${c.price}:${(c.tasteTags || []).join(',')}`
    ).join(';');
    return `${cats}#${stop}#${rates}#${cocktails}`;
  }

  function scheduleRenderMenu({ animate = false } = {}) {
    if (animate) menuAnimateNext = true;
    if (menuRenderScheduled) return;
    menuRenderScheduled = true;
    requestAnimationFrame(() => {
      menuRenderScheduled = false;
      const sig = menuSignature();
      if (sig === lastMenuSignature && els.menuGrid.children.length) {
        menuAnimateNext = false;
        return;
      }
      lastMenuSignature = sig;
      renderMenu({ animate: menuAnimateNext });
      menuAnimateNext = false;
    });
  }

  function readMenuCache() {
    try {
      const raw = localStorage.getItem(MENU_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.cocktails)) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function writeMenuCache(cocktails, stoplistNames, ratings) {
    try {
      localStorage.setItem(MENU_CACHE_KEY, JSON.stringify({
        ts: Date.now(),
        cocktails: cocktails || state.cocktails || [],
        stoplist: stoplistNames || [...state.stoplist],
        ratings: ratings || state.ratings || {}
      }));
    } catch (_) { /* quota */ }
  }

  function setsEqual(a, b) {
    if (a.size !== b.size) return false;
    for (const v of a) if (!b.has(v)) return false;
    return true;
  }

  function applyStoplistNames(stoplistNames, { render = true } = {}) {
    const names = (stoplistNames || [])
      .map((n) => String(n || '').trim())
      .filter(Boolean);
    const next = new Set(names);
    if (setsEqual(state.stoplist, next)) return false;
    state.stoplist = next;
    writeMenuCache(state.cocktails, names, state.ratings);
    if (render) scheduleRenderMenu({ animate: false });
    populateAdminStopSelect();
    return true;
  }

  function applyMenuData(cocktails, stoplistNames, {
    fromCache = false,
    ratings = null,
    animate = false,
    render = true
  } = {}) {
    state.cocktails = cocktails || [];
    const names = (stoplistNames || [])
      .map((n) => String(n || '').trim())
      .filter(Boolean);
    state.stoplist = new Set(names);
    if (ratings && typeof ratings === 'object') {
      state.ratings = ratings;
    }
    if (fromCache) {
      els.menuGrid.dataset.fromCache = '1';
    } else {
      delete els.menuGrid.dataset.fromCache;
    }
    if (render) scheduleRenderMenu({ animate });
  }

  let stoplistUnsub = null;
  let stoplistWatchReady = false;
  function watchStoplist() {
    try {
      initFirebase();
      if (stoplistUnsub || !db) return;
      stoplistUnsub = db.collection('stoplist').onSnapshot(
        (snap) => {
          // Ignore first snapshot noise right after bootstrap paint
          if (!stoplistWatchReady) {
            stoplistWatchReady = true;
            const names = [];
            snap.forEach((doc) => {
              const n = String(doc.data()?.cocktailName || '').trim();
              if (n) names.push(n);
            });
            applyStoplistNames(names, { render: true });
            return;
          }
          const names = [];
          snap.forEach((doc) => {
            const n = String(doc.data()?.cocktailName || '').trim();
            if (n) names.push(n);
          });
          applyStoplistNames(names, { render: true });
        },
        (err) => {
          console.warn('stoplist watch failed', err);
        }
      );
    } catch (err) {
      console.warn('stoplist watch init', err);
    }
  }

  async function refreshStoplistFromApi() {
    try {
      const res = await fetch(`${state.apiBase}/api/mini-app/stoplist`, { cache: 'no-store' });
      const data = await res.json();
      if (data?.success && Array.isArray(data.names)) {
        applyStoplistNames(data.names);
        return true;
      }
    } catch (err) {
      console.warn('stoplist api', err);
    }
    return false;
  }

  async function loadMenu() {
    const cached = readMenuCache();
    if (cached?.cocktails?.length) {
      applyMenuData(cached.cocktails, cached.stoplist || [], {
        fromCache: true,
        ratings: cached.ratings || {},
        animate: true,
        render: true
      });
    }

    try {
      // Single bootstrap request: cocktails + stoplist + ratings
      const res = await fetch(`${state.apiBase}/api/mini-app/menu-bootstrap`, {
        cache: 'default',
        headers: { Accept: 'application/json' }
      });
      const data = await res.json();
      if (!data?.success || !Array.isArray(data.cocktails)) {
        throw new Error(data?.error || 'bootstrap failed');
      }

      writeMenuCache(data.cocktails, data.stoplist || [], data.ratings || {});
      applyMenuData(data.cocktails, data.stoplist || [], {
        fromCache: false,
        ratings: data.ratings || {},
        animate: !cached?.cocktails?.length,
        render: true
      });

      // Live stoplist updates after first full paint
      initFirebase();
      watchStoplist();
    } catch (err) {
      console.warn('menu bootstrap failed, fallback Firestore', err);
      try {
        initFirebase();
        const [cocktailsSnap, stopSnap, ratingsOk] = await Promise.all([
          db.collection('cocktails').get({ source: 'server' }),
          db.collection('stoplist').get({ source: 'server' }).catch(() => null),
          refreshRatingsSummary().then(() => true).catch(() => false)
        ]);
        const cocktails = [];
        cocktailsSnap.forEach((doc) => {
          const data = doc.data();
          cocktails.push({
            id: doc.id,
            name: String(data.name || '').trim(),
            price: data.price || 0,
            image: data.image || '',
            ingredients: data.ingredients || '',
            description: data.description || '',
            mood: data.mood || '',
            alcohol: data.alcohol,
            category: data.category || data.type || '',
            isShot: Boolean(data.isShot),
            isSignature: Boolean(data.isSignature),
            tasteTags: Array.isArray(data.tasteTags) ? data.tasteTags : []
          });
        });
        cocktails.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'));
        let stoplistNames = [...state.stoplist];
        if (stopSnap) {
          stoplistNames = [];
          stopSnap.forEach((doc) => {
            const n = String(doc.data()?.cocktailName || '').trim();
            if (n) stoplistNames.push(n);
          });
        } else {
          await refreshStoplistFromApi();
          stoplistNames = [...state.stoplist];
        }
        writeMenuCache(cocktails, stoplistNames, state.ratings);
        applyMenuData(cocktails, stoplistNames, {
          fromCache: false,
          ratings: state.ratings,
          animate: !cached?.cocktails?.length,
          render: true
        });
        watchStoplist();
        void ratingsOk;
      } catch (fallbackErr) {
        console.error(fallbackErr);
        if (!state.cocktails.length) {
          els.menuGrid.innerHTML = '<div class="empty-state">Не удалось загрузить меню</div>';
        }
      }
    }
  }

  function renderMenu({ animate = false } = {}) {
    const list = state.cocktails
      .filter((c) => {
        if (state.category === 'all') return true;
        return getCategory(c) === state.category;
      })
      .sort((a, b) => {
        const aStop = state.stoplist.has(String(a.name || '').trim()) ? 1 : 0;
        const bStop = state.stoplist.has(String(b.name || '').trim()) ? 1 : 0;
        if (aStop !== bStop) return aStop - bStop;
        return (a.name || '').localeCompare(b.name || '', 'ru');
      });

    if (!list.length) {
      els.menuGrid.innerHTML = '<div class="empty-state">В этой категории пока пусто</div>';
      return;
    }

    const frag = document.createDocumentFragment();
    list.forEach((cocktail, index) => {
      const stopped = state.stoplist.has(String(cocktail.name || '').trim());
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `cocktail${stopped ? ' stopped' : ''}`;
      // Enter animation only uses transform — remove class after so fill
      // mode cannot override .cocktail.stopped opacity.
      if (animate) {
        btn.classList.add('cocktail-enter');
        btn.style.animationDelay = `${Math.min(index, 8) * 30}ms`;
        btn.addEventListener('animationend', () => {
          btn.classList.remove('cocktail-enter');
          btn.style.animationDelay = '';
        }, { once: true });
      }

      const imageUrl = (cocktail.image || '').trim();
      const hasImage = Boolean(imageUrl);
      const rating = state.ratings[cocktail.name];
      btn.innerHTML = `
        <div class="thumb-wrap">
          ${hasImage
            ? `<img class="cocktail-thumb" src="${escapeAttr(imageUrl)}" alt="" loading="${index < 6 ? 'eager' : 'lazy'}" decoding="async">`
            : ''}
          <div class="thumb-placeholder" ${hasImage ? 'hidden' : ''}>
            <span class="thumb-placeholder-ico" aria-hidden="true">📷</span>
            <span class="thumb-placeholder-text">Коктейль уже делает селфи, скоро выложит сюда</span>
          </div>
        </div>
        <div class="cocktail-body">
          <h3>${escapeHtml(cocktail.name || 'Коктейль')}</h3>
          <p class="cocktail-meta">${escapeHtml(cocktail.ingredients || cocktail.description || 'Авторский рецепт бара')}</p>
          ${Array.isArray(cocktail.tasteTags) && cocktail.tasteTags.length
            ? `<div class="taste-tags">${cocktail.tasteTags
                .map((t) => TASTE_LABELS[t] ? `<span class="taste-chip">${TASTE_LABELS[t]}</span>` : '')
                .join('')}</div>`
            : ''}
          <div class="cocktail-foot">
            <span class="price">${Number(cocktail.price) || 0} ₽</span>
            <span>
              ${rating != null ? `<span class="cocktail-rating">★ ${rating}</span> ` : ''}
              ${stopped
                ? '<span class="badge stop">Стоп-лист</span>'
                : cocktail.alcohol != null
                  ? `<span class="badge">${cocktail.alcohol}%</span>`
                  : ''}
            </span>
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

      frag.appendChild(btn);
    });

    els.menuGrid.replaceChildren(frag);
  }

  function openRatingSheet(order) {
    if (state.currentView === 'admin') return;
    if (!order?.id || order.rated) return;
    state.ratingOrder = order;
    state.ratingValue = 0;
    if (order.id) state.promptedRatingOrders.add(order.id);
    if (els.ratingTitle) els.ratingTitle.textContent = `Оцените: ${order.name || 'коктейль'}`;
    if (els.ratingSubtitle) els.ratingSubtitle.textContent = 'Поставьте оценку от 1 до 5';
    els.ratingStars?.querySelectorAll('button').forEach((b) => b.classList.remove('is-on'));
    if (els.ratingBackdrop) els.ratingBackdrop.hidden = false;
    els.ratingSheet?.classList.add('open');
    els.ratingSheet?.setAttribute('aria-hidden', 'false');
  }

  function closeRatingSheet() {
    state.ratingOrder = null;
    state.ratingValue = 0;
    els.ratingSheet?.classList.remove('open');
    els.ratingSheet?.setAttribute('aria-hidden', 'true');
    if (els.ratingBackdrop) els.ratingBackdrop.hidden = true;
  }

  async function submitRating({ skip = false } = {}) {
    if (!state.ratingOrder?.id || !canOrder()) return;
    try {
      const res = await fetch(`${state.apiBase}/api/mini-app/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData: tg.initData,
          orderId: state.ratingOrder.id,
          rating: state.ratingValue,
          skip
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Не удалось сохранить оценку');
      closeRatingSheet();
      showToast(skip ? 'Оценка пропущена' : `Спасибо! ★ ${state.ratingValue || data.rating}`);
      refreshOrders();
      refreshRatingsSummary().catch(() => {});
    } catch (err) {
      showToast(err.message || 'Ошибка оценки');
    }
  }

  async function applyProfilePromo() {
    if (!canOrder()) return;
    const code = els.profilePromoInput?.value?.trim();
    if (!code) {
      showToast('Введите промокод');
      return;
    }
    try {
      const res = await fetch(`${state.apiBase}/api/mini-app/apply-promo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData, promoCode: code })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Промокод не применён');
      applyOpenBill(data);
      if (els.profilePromoInput) els.profilePromoInput.value = '';
      showToast(`Промокод −${data.promo?.discount || 0}%`);
      haptic('medium');
    } catch (err) {
      showToast(err.message || 'Ошибка промокода');
    }
  }

  function noteOrderStatusChanges(orders) {
    const list = Array.isArray(orders) ? orders : [];
    const kitchen = new Set(['pending', 'confirmed', 'preparing']);
    const busy =
      state.currentView === 'admin' ||
      els.ratingSheet?.classList.contains('open') ||
      els.sheet?.classList.contains('open');

    list.forEach((order) => {
      const id = order.id;
      const status = order.status || 'pending';
      if (!id) return;
      const prev = state.knownOrderStatuses.get(id);
      if (prev && prev !== status) {
        // Status toasts only on guest screens — don't interrupt admin work
        if (state.currentView !== 'admin') {
          showToast(`${order.name || 'Заказ'}: ${STATUS_LABELS[status] || status}`);
          haptic('light');
        }
        const becameReady = status === 'ready' && kitchen.has(prev);
        if (
          becameReady &&
          !order.rated &&
          !busy &&
          !state.promptedRatingOrders.has(id)
        ) {
          state.promptedRatingOrders.add(id);
          openRatingSheet(order);
        }
      }
      state.knownOrderStatuses.set(id, status);
    });
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

  function openOrderSheet(cocktail) {
    if (state.stoplist.has(String(cocktail?.name || '').trim())) {
      showToast('Коктейль временно недоступен');
      return;
    }
    // Warm API while user fills the sheet
    wakeApi();
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
    document.body.classList.add('sheet-open');
    tg?.MainButton?.hide?.();
  }

  function closeOrderSheet() {
    try { els.bonusInput?.blur(); } catch (_) { /* ignore */ }
    els.sheet.classList.remove('open', 'sheet-compact');
    els.sheet.setAttribute('aria-hidden', 'true');
    els.sheetBackdrop.hidden = true;
    document.body.classList.remove('sheet-open');
    state.selected = null;
    syncKeyboardLayout();
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
    const payable = Math.max(0, price - bonus);
    els.sheetTotal.textContent = `${payable} ₽`;

    const earn = (state.bonusActive && payable >= state.bonusMinOrder)
      ? Math.floor(payable * (state.bonusPercentage / 100))
      : 0;
    if (els.bonusEarnRow && els.sheetBonusEarn) {
      if (earn > 0) {
        els.bonusEarnRow.hidden = false;
        els.sheetBonusEarn.textContent = `+${earn}`;
      } else {
        els.bonusEarnRow.hidden = true;
      }
    }
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
    wakeApi();

    const displayName =
      [state.user?.first_name, state.user?.last_name].filter(Boolean).join(' ') ||
      state.firebaseUser?.displayName ||
      'Гость Telegram';

    const payload = {
      initData: tg.initData,
      cocktailId: cocktail.id,
      name: cocktail.name,
      price: finalPrice,
      originalPrice: price,
      bonusUsed,
      user: displayName,
      image: cocktail.image || '',
      source: 'telegram-mini-app'
    };

    // Optimistic UX: close sheet immediately, confirm in background
    if (bonusUsed > 0) {
      state.bonusBalance = Math.max(0, state.bonusBalance - bonusUsed);
    }
    state.openBillTotal = (Number(state.openBillTotal) || 0) + finalPrice;
    state.openBillItems = [
      ...(Array.isArray(state.openBillItems) ? state.openBillItems : []),
      {
        cocktailName: cocktail.name,
        price: finalPrice,
        status: 'pending',
        orderId: 'optimistic'
      }
    ];
    updateProfileUI();
    haptic('medium');
    closeOrderSheet();
    showToast('Отправляем заказ…');
    switchView('orders');
    // Optimistic placeholder in orders list
    if (els.ordersList && !els.ordersList.querySelector('[data-optimistic]')) {
      const pending = document.createElement('article');
      pending.className = 'order-card';
      pending.dataset.optimistic = '1';
      pending.innerHTML = `
        <div class="order-top">
          <div>
            <p class="order-name">${escapeHtml(cocktail.name)}</p>
            <p class="order-time">Отправка…</p>
          </div>
          <span class="status pending">Отправка</span>
        </div>
      `;
      els.ordersList.prepend(pending);
    }

    try {
      const res = await fetchWithTimeout(
        `${state.apiBase}/api/mini-app/create-order`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        },
        20000
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Не удалось создать заказ');
      }

      showToast(`Заказ принят · очередь #${data.queuePosition || '—'}`);
      if (typeof data.openBillTotal === 'number' || Array.isArray(data.openBillItems)) {
        applyOpenBill(data);
      } else {
        refreshProfile();
      }
      refreshOrders();
    } catch (err) {
      console.error(err);
      // Rollback optimistic bonus / bill
      if (bonusUsed > 0) {
        state.bonusBalance += bonusUsed;
      }
      state.openBillTotal = Math.max(0, (Number(state.openBillTotal) || 0) - finalPrice);
      state.openBillItems = (state.openBillItems || []).filter((item) => item.orderId !== 'optimistic');
      updateProfileUI();
      document.querySelector('[data-optimistic]')?.remove();
      showToast(err.name === 'AbortError' ? 'Сервер долго отвечает, попробуйте ещё раз' : (err.message || 'Ошибка заказа'));
      haptic('heavy');
    } finally {
      els.confirmOrderBtn.disabled = false;
    }
  }

  function renderOrders(orders, bills) {
    const billList = Array.isArray(bills) ? bills : [];
    if (!billList.length && !orders?.length) {
      els.ordersList.innerHTML = '<div class="empty-state">Пока нет заказов</div>';
      return;
    }

    if (!state.billExpandPrefs) state.billExpandPrefs = new Map();

    const billKey = (bill) => String(bill?.id || '');
    const isExpanded = (bill) => {
      const key = billKey(bill);
      if (!key) return false;
      if (state.billExpandPrefs.has(key)) return state.billExpandPrefs.get(key) === true;
      // Default: only live open bills are expanded; closed stay collapsed
      return bill.status === 'open' && key !== 'orphan';
    };
    const setExpanded = (bill, open) => {
      const key = billKey(bill);
      if (!key) return;
      state.billExpandPrefs.set(key, Boolean(open));
      try {
        const obj = Object.fromEntries(state.billExpandPrefs);
        sessionStorage.setItem('asafiev_bill_expand_v1', JSON.stringify(obj));
      } catch (_) { /* ignore */ }
    };

    // Restore prefs once per session if Map empty
    if (!state.billExpandPrefs.size) {
      try {
        const raw = sessionStorage.getItem('asafiev_bill_expand_v1');
        if (raw) {
          const obj = JSON.parse(raw);
          Object.entries(obj || {}).forEach(([k, v]) => {
            state.billExpandPrefs.set(String(k), Boolean(v));
          });
        }
      } catch (_) { /* ignore */ }
    }

    els.ordersList.innerHTML = '';
    if (!billList.length) {
      orders.forEach((order) => {
        els.ordersList.appendChild(buildOrderItemCard(order));
      });
      return;
    }

    billList.forEach((bill) => {
      const expanded = isExpanded(bill);
      const isOpen = bill.status === 'open';
      const isOrphan = billKey(bill) === 'orphan';
      const whenMs = isOpen ? bill.createdAtMs : (bill.paidAtMs || bill.createdAtMs);
      const when = whenMs ? new Date(whenMs).toLocaleString('ru-RU') : '';
      const pay = PAY_METHOD_RU[bill.paymentMethod] || bill.paymentMethod || '';
      const title = isOrphan
        ? 'Без счёта'
        : isOpen
          ? 'Открытый счёт'
          : 'Закрытый счёт';
      const statusLabel = isOrphan
        ? 'активные'
        : isOpen
          ? 'открыт'
          : 'оплачен';
      const itemsCount = (bill.items || []).length;
      const activeCount = (bill.items || []).filter((i) =>
        ['pending', 'confirmed', 'preparing', 'ready'].includes(i.status)
      ).length;

      const card = document.createElement('article');
      card.className = `bill-accordion${expanded ? ' is-open' : ''}${isOpen ? ' is-open-bill' : ''}`;
      card.dataset.billId = billKey(bill);
      card.innerHTML = `
        <button type="button" class="bill-accordion-head" aria-expanded="${expanded ? 'true' : 'false'}">
          <div class="bill-accordion-title">
            <p class="order-name">${escapeHtml(title)}</p>
            <p class="order-time">
              ${escapeHtml(when)}
              · ${itemsCount} поз.
              ${activeCount ? ` · в работе ${activeCount}` : ''}
              ${pay ? ` · ${escapeHtml(pay)}` : ''}
              ${bill.promoCode ? ` · ${escapeHtml(bill.promoCode)}` : ''}
            </p>
          </div>
          <div class="bill-accordion-meta">
            <span class="status ${isOpen ? 'preparing' : 'completed'}">${statusLabel}</span>
            <strong class="price">${Number(bill.totalAmount) || 0} ₽</strong>
            <span class="bill-chevron" aria-hidden="true"></span>
          </div>
        </button>
        <div class="bill-accordion-body" ${expanded ? '' : 'hidden'}></div>
      `;

      const body = card.querySelector('.bill-accordion-body');
      (bill.items || []).forEach((item) => {
        body.appendChild(buildOrderItemCard({
          id: item.orderId,
          name: item.cocktailName,
          status: item.status,
          price: item.price,
          displayTime: item.displayTime,
          queuePosition: item.queuePosition,
          rated: item.rated
        }, { compact: true }));
      });

      card.querySelector('.bill-accordion-head')?.addEventListener('click', () => {
        const willOpen = !isExpanded(bill);
        setExpanded(bill, willOpen);
        card.classList.toggle('is-open', willOpen);
        body.hidden = !willOpen;
        card.querySelector('.bill-accordion-head')?.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        haptic('light');
      });

      els.ordersList.appendChild(card);
    });
  }

  function buildOrderItemCard(order, { compact = false } = {}) {
    const status = order.status || 'pending';
    const card = document.createElement('article');
    card.className = `order-card${compact ? ' order-card-nested' : ''}`;
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
    return card;
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
      if (data.success) {
        const orders = data.orders || [];
        noteOrderStatusChanges(orders);
        renderOrders(orders, data.bills || []);
      }
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
      if (data.maxBonusUsage) state.maxBonusUsage = Number(data.maxBonusUsage) || 50;
      applyOpenBill(data);
    } catch (err) {
      console.warn('profile refresh failed', err);
    }
  }

  function startOrdersPolling() {
    refreshOrders();
    refreshProfile();
    if (state.ordersPollTimer) clearInterval(state.ordersPollTimer);
    state.ordersPollTimer = setInterval(() => {
      refreshOrders();
      refreshProfile();
    }, 5000);
  }

  function subscribeOrders() {
    // API polling is the source of truth — Firestore client cache can keep stale "pending"
    // after a bill is closed via Admin SDK. Listener only triggers a refresh.
    if (!state.firebaseUser || !db) {
      startOrdersPolling();
      return;
    }
    if (state.ordersUnsub) state.ordersUnsub();

    try {
      state.ordersUnsub = db
        .collection('orders')
        .where('userId', '==', state.firebaseUser.uid)
        .limit(30)
        .onSnapshot(
          () => { refreshOrders(); },
          (err) => {
            console.warn('orders watch failed, polling only', err?.message || err);
            startOrdersPolling();
          }
        );
    } catch (err) {
      console.warn('orders watch init failed', err);
    }
    startOrdersPolling();
  }

  function switchView(name) {
    if (name === 'admin' && !isAdminUser()) {
      showToast('Нет прав админа');
      return;
    }
    state.currentView = name;
    // Never interrupt admin with guest rating UI
    if (name === 'admin') closeRatingSheet();
    document.querySelectorAll('.view').forEach((v) => {
      v.classList.toggle('active', v.dataset.view === name);
    });
    document.querySelectorAll('.tab').forEach((t) => {
      t.classList.toggle('active', t.dataset.nav === name);
    });
    if (name === 'menu') tg?.BackButton?.hide?.();
    else tg?.BackButton?.show?.();
    if (name === 'admin') {
      switchAdminTab(state.adminTab || 'cocktails');
    }
    if (name === 'profile') {
      refreshProfile();
    }
    if (name === 'orders') {
      refreshOrders();
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

  function formatBonusWord(n) {
    const abs = Math.abs(Number(n) || 0) % 100;
    const last = abs % 10;
    if (abs > 10 && abs < 20) return 'бонусов';
    if (last === 1) return 'бонус';
    if (last >= 2 && last <= 4) return 'бонуса';
    return 'бонусов';
  }

  function formatBonusChip(n) {
    const value = Number(n) || 0;
    return `${value} ${formatBonusWord(value)}`;
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
      lastMenuSignature = '';
      scheduleRenderMenu({ animate: false });
      haptic('light');
    });

    els.bonusChip.addEventListener('click', () => switchView('profile'));
    els.cancelOrderBtn.addEventListener('click', closeOrderSheet);
    els.sheetBackdrop.addEventListener('click', closeOrderSheet);
    els.bonusInput.addEventListener('input', updateSheetTotal);
    els.bonusInput.addEventListener('focus', focusBonusField);
    els.bonusInput.addEventListener('blur', blurBonusField);
    els.confirmOrderBtn.addEventListener('click', placeOrder);
    els.profilePromoBtn?.addEventListener('click', applyProfilePromo);
    els.ratingSkipBtn?.addEventListener('click', () => submitRating({ skip: true }));
    els.ratingSubmitBtn?.addEventListener('click', () => {
      if (!state.ratingValue) {
        showToast('Выберите оценку');
        return;
      }
      submitRating();
    });
    els.ratingBackdrop?.addEventListener('click', closeRatingSheet);
    els.ratingStars?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-star]');
      if (!btn) return;
      state.ratingValue = Number(btn.dataset.star) || 0;
      els.ratingStars.querySelectorAll('button').forEach((b) => {
        b.classList.toggle('is-on', Number(b.dataset.star) <= state.ratingValue);
      });
    });
    els.authRetryBtn?.addEventListener('click', () => {
      haptic('light');
      authenticate({ manual: true });
    });
    els.adminStopAddBtn?.addEventListener('click', addToAdminStoplist);
    document.getElementById('adminCocktailSaveBtn')?.addEventListener('click', saveAdminCocktail);
    document.getElementById('adminPromoSaveBtn')?.addEventListener('click', saveAdminPromo);
    document.getElementById('adminBonusSaveBtn')?.addEventListener('click', saveAdminBonuses);
    document.getElementById('adminIngSaveBtn')?.addEventListener('click', saveAdminIngredient);
    document.getElementById('adminIngCancelBtn')?.addEventListener('click', () => {
      resetIngredientForm();
      showToast('Редактирование отменено');
    });
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
    document.getElementById('adminCocktailFilters')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-cocktail-filter]');
      if (!btn) return;
      state.cocktailFilter = btn.dataset.cocktailFilter;
      document.querySelectorAll('#adminCocktailFilters .filter').forEach((f) => {
        f.classList.toggle('active', f === btn);
      });
      renderAdminCocktailsList();
    });
    document.getElementById('adminPurchaseFilters')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-ing-filter]');
      if (!btn) return;
      state.ingFilter = btn.dataset.ingFilter;
      document.querySelectorAll('#adminPurchaseFilters .filter').forEach((f) => {
        f.classList.toggle('active', f === btn);
      });
      renderAdminPurchasesList();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        refreshStoplistFromApi().catch(() => {});
      }
    });
    window.addEventListener('focus', () => {
      refreshStoplistFromApi().catch(() => {});
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
      applyMenuData(cached.cocktails, cached.stoplist || [], {
        fromCache: true,
        ratings: cached.ratings || {},
        animate: true,
        render: true
      });
    }

    try {
      await waitForFirebase();
      initFirebase();
    } catch (err) {
      console.error(err);
      setAuthStatus('Не удалось загрузить SDK. Проверьте сеть.', { error: true });
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
