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
    ordersPollTimer: null
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
    try {
      tg.setHeaderColor('#14110f');
      tg.setBackgroundColor('#14110f');
    } catch (_) { /* older clients */ }

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
      ? `@${state.user.username}`
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
    const list = state.cocktails.filter((c) => {
      if (state.category === 'all') return true;
      return getCategory(c) === state.category;
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

      const hasImage = Boolean(cocktail.image);
      btn.innerHTML = `
        ${hasImage
          ? `<img class="cocktail-thumb" src="${escapeAttr(cocktail.image)}" alt="" loading="lazy" decoding="async">`
          : `<div class="cocktail-thumb placeholder">🍸</div>`}
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
        showToast('Сессия не готова — подождите или откройте Mini App снова');
        tg?.showAlert?.('Авторизация ещё не завершилась. Закройте Mini App и откройте снова через кнопку бота.');
        authenticate();
      } else if (!tg?.initData) {
        showToast('Нет Telegram-сессии');
        tg?.showAlert?.('Откройте Mini App кнопкой меню внутри бота AsafievBar.');
      } else {
        showToast('Подключаем сессию…');
        authenticate().then((ok) => {
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
      els.sheetMedia.innerHTML = `<img src="${escapeAttr(cocktail.image)}" alt="${escapeAttr(cocktail.name)}" decoding="async">`;
    } else {
      els.sheetMedia.classList.add('is-empty');
      els.sheetMedia.innerHTML = '';
      els.sheetMedia.style.backgroundImage = '';
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
    document.querySelectorAll('.view').forEach((v) => {
      v.classList.toggle('active', v.dataset.view === name);
    });
    document.querySelectorAll('.tab').forEach((t) => {
      t.classList.toggle('active', t.dataset.nav === name);
    });
    if (name === 'menu') tg?.BackButton?.hide?.();
    else tg?.BackButton?.show?.();
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
