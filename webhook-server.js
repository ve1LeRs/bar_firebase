require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - CORS configuration with proper wildcard support
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or file://)
    if (!origin) return callback(null, true);
    
    // List of allowed origins and patterns
    const allowedOrigins = [
      'https://railway.com',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://ve1lers.github.io',
      'https://asafievbar.duckdns.org',
      'null' // For file:// protocol
    ];
    
    const allowedPatterns = [
      /^https:\/\/.*\.railway\.app$/,
      /^https:\/\/.*\.github\.io$/,
      /^https:\/\/.*\.duckdns\.org$/
    ];
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Check if origin matches any pattern
    if (allowedPatterns.some(pattern => pattern.test(origin))) {
      return callback(null, true);
    }
    
    // For development, allow all origins
    // Remove this in production if needed
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Versioned JS/CSS (?v=) can be cached; HTML always revalidated.
// NEVER Clear-Site-Data — it blanks Telegram WebView loads.
function setMiniAppStaticHeaders(res, filePath) {
  if (/\.(?:js|css|png|jpe?g|webp|gif|svg|woff2?)$/i.test(filePath)) {
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    return;
  }
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}
app.use('/mini-app', express.static(path.join(__dirname, 'mini-app'), {
  extensions: ['html'],
  etag: false,
  lastModified: false,
  setHeaders: setMiniAppStaticHeaders
}));
// Fresh alias path to bust stubborn Telegram WebView caches
app.use('/m', express.static(path.join(__dirname, 'mini-app'), {
  extensions: ['html'],
  etag: false,
  lastModified: false,
  setHeaders: setMiniAppStaticHeaders
}));
app.get('/logo.png', (req, res) => res.sendFile(path.join(__dirname, 'logo.png')));
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(__dirname, 'favicon.ico')));

// Firebase Admin SDK инициализация
let serviceAccount;

// Проверяем, есть ли файл service-private-key.json (для локальной разработки)
try {
  serviceAccount = require('./service-private-key.json');
  console.log('📁 Используем локальный файл service-private-key.json');
  console.log('🔧 Service account details:', {
    type: serviceAccount.type,
    project_id: serviceAccount.project_id,
    private_key_id: serviceAccount.private_key_id ? 'SET' : 'NOT SET',
    client_email: serviceAccount.client_email ? 'SET' : 'NOT SET',
    client_id: serviceAccount.client_id ? 'SET' : 'NOT SET'
  });
} catch (error) {
  // Если файла нет, используем переменные окружения
  console.log('🔧 Используем переменные окружения для Firebase');
  
  // Проверяем наличие всех необходимых переменных
  const requiredVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY_ID',
    'FIREBASE_PRIVATE_KEY', 
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_CLIENT_ID',
    'FIREBASE_CLIENT_X509_CERT_URL'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.error('❌ Отсутствуют переменные окружения:', missingVars);
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  
  // Обрабатываем private key - убираем лишние кавычки и заменяем \n на реальные переносы
  if (privateKey) {
    // Убираем лишние кавычки в начале и конце если есть
    privateKey = privateKey.replace(/^["']|["']$/g, '');
    // Заменяем \\n на реальные переносы строк
    privateKey = privateKey.replace(/\\n/g, '\n');
    console.log('🔑 Processed private key length:', privateKey.length);
    console.log('🔑 Private key starts with:', privateKey.substring(0, 30) + '...');
    console.log('🔑 Private key ends with:', '...' + privateKey.substring(privateKey.length - 30));
    
    // Проверяем, что private key имеет правильный формат
    if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
      console.error('❌ Private key format is invalid');
      throw new Error('Invalid private key format');
    }
  }
  
  serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID || "bar-menu-6145c",
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: privateKey,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
  };
  
  console.log('🔧 Service account object created with:', {
    type: serviceAccount.type,
    project_id: serviceAccount.project_id,
    private_key_id: serviceAccount.private_key_id ? 'SET' : 'NOT SET',
    private_key: serviceAccount.private_key ? 'SET' : 'NOT SET',
    client_email: serviceAccount.client_email ? 'SET' : 'NOT SET',
    client_id: serviceAccount.client_id ? 'SET' : 'NOT SET',
    client_x509_cert_url: serviceAccount.client_x509_cert_url ? 'SET' : 'NOT SET'
  });
}

if (!admin.apps.length) {
  try {
    // Проверяем, что serviceAccount содержит все необходимые поля
    if (!serviceAccount || !serviceAccount.private_key || !serviceAccount.client_email) {
      throw new Error('Invalid service account configuration');
    }
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
    console.log('✅ Firebase Admin SDK инициализирован успешно');
    console.log('🔧 Project ID:', serviceAccount.project_id);
    console.log('🔧 Service Account Email:', serviceAccount.client_email);
  } catch (error) {
    console.error('❌ Ошибка инициализации Firebase:', error);
    console.error('🔍 Проверьте переменные окружения Firebase на сервере (Render)');
    console.error('🔍 Service Account details:', {
      hasPrivateKey: !!serviceAccount?.private_key,
      hasClientEmail: !!serviceAccount?.client_email,
      hasPrivateKeyId: !!serviceAccount?.private_key_id,
      projectId: serviceAccount?.project_id
    });
    throw error; // Re-throw to stop the server if Firebase can't initialize
  }
}

const db = admin.firestore();

// Telegram bots:
// - ALERTS bot: уведомления бармену, inline-кнопки статусов, webhook callback
// - MINIAPP bot: Telegram Mini App (initData / Menu Button)
// Tokens MUST come from env — never hardcode (public GitHub Pages leaked old tokens).
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_ALERTS_BOT_TOKEN = process.env.TELEGRAM_ALERTS_BOT_TOKEN || TELEGRAM_BOT_TOKEN;
const TELEGRAM_MINIAPP_BOT_TOKEN = process.env.TELEGRAM_MINIAPP_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const MINI_APP_ASSET_VERSION = process.env.MINI_APP_ASSET_VERSION || 'fsfast1';

function alertsBotToken() {
  return TELEGRAM_ALERTS_BOT_TOKEN || TELEGRAM_BOT_TOKEN || '';
}

/** Outbound Telegram helper — logs + blocks junk keep-alive dots */
async function sendTelegramAlert(text, options = {}) {
  const token = options.token || alertsBotToken();
  const chatId = options.chatId || TELEGRAM_CHAT_ID;
  const trimmed = String(text ?? '').trim();
  if (!token || !chatId) {
    console.error('❌ Telegram send skipped: missing token/chatId');
    return { ok: false, error: 'missing_token_or_chat' };
  }
  // Block classic Render/cron keep-alive junk (lone "." / empty)
  if (!trimmed || trimmed === '.' || trimmed === '…' || trimmed === '...') {
    console.warn('🛑 Blocked junk Telegram message:', JSON.stringify(trimmed));
    return { ok: false, error: 'blocked_junk' };
  }
  const payload = {
    chat_id: chatId,
    text: trimmed,
    ...(options.parse_mode ? { parse_mode: options.parse_mode } : {}),
    ...(options.reply_markup ? { reply_markup: options.reply_markup } : {})
  };
  console.log('📤 Telegram send:', trimmed.slice(0, 80).replace(/\n/g, ' '));
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({ ok: false }));
  if (!result.ok) {
    console.error('❌ Telegram API error:', result);
  }
  return result;
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'AsafievBar Webhook Server is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      diagnose: '/diagnose',
      testFirebase: '/test-firebase',
      queueInfo: '/queue-info',
      ordersLast: '/orders-last',
      webhook: '/telegram-webhook',
      miniAppWebhook: '/telegram-miniapp-webhook',
      miniApp: '/mini-app/',
      miniAppAuth: '/api/mini-app/auth',
      miniAppCreateOrder: '/api/mini-app/create-order'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  // Разрешаем CORS для фронтенда (GitHub Pages, локальный файл и т.п.)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'AsafievBar Webhook Server'
  });
  // Warm caches after response (do not block health)
  try { refreshStoplistCache(false).catch(() => {}); } catch (_) { /* not ready yet */ }
});

// Диагностика переменных окружения
app.get('/diagnose', (req, res) => {
  try {
    console.log('🔍 Запуск диагностики переменных окружения...');
    
    const envVars = {
      PORT: process.env.PORT,
      RAILWAY_PUBLIC_DOMAIN: process.env.RAILWAY_PUBLIC_DOMAIN,
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ? 'SET' : 'NOT SET',
      TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID ? 'SET' : 'NOT SET',
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ? 'SET' : 'NOT SET',
      FIREBASE_PRIVATE_KEY_ID: process.env.FIREBASE_PRIVATE_KEY_ID ? 'SET' : 'NOT SET',
      FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL ? 'SET' : 'NOT SET',
      FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? 'SET' : 'NOT SET'
    };
    
    console.log('📊 Переменные окружения:', envVars);
    
    res.json({
      success: true,
      environment: envVars,
      timestamp: new Date().toISOString(),
      service: 'AsafievBar Webhook Server'
    });
  } catch (error) {
    console.error('❌ Ошибка диагностики:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test Firebase connection
app.get('/test-firebase', async (req, res) => {
  try {
    // Разрешаем CORS для фронтенда
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    console.log('🔥 Тестируем подключение к Firebase...');
    
    // Проверяем переменные окружения Firebase
    const envCheck = {
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ? 'SET' : 'NOT SET',
      FIREBASE_PRIVATE_KEY_ID: process.env.FIREBASE_PRIVATE_KEY_ID ? 'SET' : 'NOT SET',
      FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? 'SET' : 'NOT SET',
      FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL ? 'SET' : 'NOT SET',
      FIREBASE_CLIENT_ID: process.env.FIREBASE_CLIENT_ID ? 'SET' : 'NOT SET',
      FIREBASE_CLIENT_X509_CERT_URL: process.env.FIREBASE_CLIENT_X509_CERT_URL ? 'SET' : 'NOT SET'
    };
    
    console.log('🔍 Проверка переменных окружения Firebase:', envCheck);
    
    // Дополнительная диагностика private key
    if (process.env.FIREBASE_PRIVATE_KEY) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;
      console.log('🔑 Private key length:', privateKey.length);
      console.log('🔑 Private key starts with:', privateKey.substring(0, 50) + '...');
      console.log('🔑 Private key contains \\n:', privateKey.includes('\\n'));
      console.log('🔑 Private key contains actual newlines:', privateKey.includes('\n'));
    }
    
    // Проверяем, что Firebase инициализирован
    if (!db) {
      throw new Error('Firebase не инициализирован');
    }
    
    // Пробуем создать тестовый документ
    const testDoc = await db.collection('test').doc('connection').get();
    
    console.log('✅ Firebase подключение успешно');
    res.json({ 
      success: true, 
      message: 'Firebase connection successful',
      timestamp: new Date().toISOString(),
      projectId: serviceAccount.project_id,
      environment: envCheck
    });
  } catch (error) {
    console.error('❌ Firebase test error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    res.status(500).json({ 
      success: false, 
      error: error.message,
      code: error.code,
      details: 'Проверьте переменные окружения Firebase на сервере (Render)',
      environment: {
        FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ? 'SET' : 'NOT SET',
        FIREBASE_PRIVATE_KEY_ID: process.env.FIREBASE_PRIVATE_KEY_ID ? 'SET' : 'NOT SET',
        FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? 'SET' : 'NOT SET',
        FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL ? 'SET' : 'NOT SET',
        FIREBASE_CLIENT_ID: process.env.FIREBASE_CLIENT_ID ? 'SET' : 'NOT SET',
        FIREBASE_CLIENT_X509_CERT_URL: process.env.FIREBASE_CLIENT_X509_CERT_URL ? 'SET' : 'NOT SET'
      }
    });
  }
});

// Получение информации об очереди заказов
app.get('/queue-info', async (req, res) => {
  try {
    const queueInfo = await getQueueInfo();
    res.json({
      success: true,
      queueInfo: queueInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Ошибка получения информации об очереди:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Диагностика: заказы, которые видит webhook — сверьте id с ID в кнопке Telegram
app.get('/orders-last', async (req, res) => {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 20);
    const snap = await db.collection('orders').limit(limit).get();
    const projectId = admin.app().options?.projectId || serviceAccount?.project_id || '?';
    const orders = [];
    snap.forEach(doc => {
      const d = doc.data();
      orders.push({ id: doc.id, name: d.name, status: d.status });
    });
    res.json({ projectId, count: orders.length, orders });
  } catch (e) {
    console.error('orders-last error', e);
    res.status(500).json({ error: e.message, projectId: admin.app().options?.projectId || serviceAccount?.project_id });
  }
});

// Очистка всех заказов из базы данных (только для разработки)
app.delete('/cleanup-orders', async (req, res) => {
  try {
    console.log('🧹 Начинаем очистку всех заказов из базы данных...');
    
    // Получаем все заказы
    const ordersSnapshot = await db.collection('orders').get();
    console.log(`📊 Найдено заказов для удаления: ${ordersSnapshot.size}`);
    
    if (ordersSnapshot.empty) {
      return res.json({
        success: true,
        message: 'База данных уже пуста',
        deletedCount: 0
      });
    }
    
    // Удаляем заказы батчами
    const batch = db.batch();
    let deletedCount = 0;
    
    ordersSnapshot.forEach(doc => {
      batch.delete(doc.ref);
      deletedCount++;
    });
    
    await batch.commit();
    
    console.log(`✅ Успешно удалено ${deletedCount} заказов`);
    
    res.json({
      success: true,
      message: `Успешно удалено ${deletedCount} заказов`,
      deletedCount: deletedCount,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Ошибка очистки заказов:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Валидация промокода
app.post('/validate-promo', async (req, res) => {
  try {
    const { promoCode } = req.body;
    
    if (!promoCode) {
      return res.status(400).json({
        success: false,
        error: 'Промокод не указан'
      });
    }
    
    const promoRef = await db.collection('promocodes').doc(promoCode.toUpperCase()).get();
    
    if (!promoRef.exists) {
      return res.json({
        success: false,
        error: 'Промокод не найден'
      });
    }
    
    const promoData = promoRef.data();
    
    // Проверяем активность
    if (!promoData.active) {
      return res.json({
        success: false,
        error: 'Промокод неактивен'
      });
    }
    
    // Проверяем срок действия
    if (promoData.expiryDate) {
      const expiryDate = promoData.expiryDate.toDate();
      if (expiryDate < new Date()) {
        return res.json({
          success: false,
          error: 'Срок действия промокода истек'
        });
      }
    }
    
    // Проверяем количество использований
    if (promoData.maxUses && promoData.maxUses > 0) {
      const usedCount = promoData.usedCount || 0;
      if (usedCount >= promoData.maxUses) {
        return res.json({
          success: false,
          error: 'Промокод исчерпан'
        });
      }
    }
    
    res.json({
      success: true,
      promo: {
        code: promoCode.toUpperCase(),
        discount: promoData.discount,
        description: promoData.description
      }
    });
    
  } catch (error) {
    console.error('❌ Ошибка валидации промокода:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Отправка уведомления в Telegram о новом заказе
app.post('/notify-telegram', async (req, res) => {
  try {
    const { orderId, orderData } = req.body;
    
    if (!orderId || !orderData) {
      return res.status(400).json({
        success: false,
        error: 'Отсутствуют данные заказа'
      });
    }
    
    const message = formatOrderAlertHtml({
      mode: 'new',
      status: 'confirmed',
      cocktailName: orderData.name,
      customerName: orderData.user,
      price: orderData.price,
      queuePosition: orderData.queuePosition || 0,
      displayTime: orderData.displayTime || new Date().toLocaleString('ru-RU'),
      orderId
    });
    const inlineKeyboard = buildOrderActionKeyboard(orderId, 'pending');

    const telegramResult = await sendTelegramAlert(message, {
      parse_mode: 'HTML',
      reply_markup: inlineKeyboard
    });
    
    if (telegramResult.ok) {
      console.log('✅ Уведомление отправлено в Telegram');
      res.json({
        success: true,
        message: 'Уведомление отправлено'
      });
    } else {
      res.status(500).json({
        success: false,
        error: telegramResult.description || telegramResult.error || 'Ошибка Telegram API'
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка отправки в Telegram:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Использование промокода (увеличение счетчика)
app.post('/use-promo', async (req, res) => {
  try {
    const { promoCode } = req.body;
    
    if (!promoCode) {
      return res.status(400).json({
        success: false,
        error: 'Промокод не указан'
      });
    }
    
    const promoRef = db.collection('promocodes').doc(promoCode.toUpperCase());
    const promoDoc = await promoRef.get();
    
    if (!promoDoc.exists) {
      return res.json({
        success: false,
        error: 'Промокод не найден'
      });
    }
    
    // Увеличиваем счетчик использований
    await promoRef.update({
      usedCount: admin.firestore.FieldValue.increment(1),
      lastUsedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ Промокод ${promoCode} использован`);
    
    res.json({
      success: true,
      message: 'Промокод использован'
    });
    
  } catch (error) {
    console.error('❌ Ошибка использования промокода:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Очистка только тестовых заказов (по статусу или названию)
app.delete('/cleanup-test-orders', async (req, res) => {
  try {
    console.log('🧹 Начинаем очистку тестовых заказов...');
    
    // Получаем все заказы
    const ordersSnapshot = await db.collection('orders').get();
    console.log(`📊 Всего заказов в базе: ${ordersSnapshot.size}`);
    
    let deletedCount = 0;
    const batch = db.batch();
    
    ordersSnapshot.forEach(doc => {
      const orderData = doc.data();
      const orderName = orderData.name?.toLowerCase() || '';
      const isTestOrder = orderName.includes('тест') || 
                         orderName.includes('test') ||
                         orderName.includes('проверка') ||
                         orderData.status === 'completed' ||
                         orderData.status === 'cancelled';
      
      if (isTestOrder) {
        batch.delete(doc.ref);
        deletedCount++;
        console.log(`🗑️ Удаляем тестовый заказ: ${orderData.name} (${orderData.status})`);
      }
    });
    
    if (deletedCount > 0) {
      await batch.commit();
      console.log(`✅ Успешно удалено ${deletedCount} тестовых заказов`);
    } else {
      console.log('ℹ️ Тестовые заказы не найдены');
    }
    
    res.json({
      success: true,
      message: `Удалено ${deletedCount} тестовых заказов`,
      deletedCount: deletedCount,
      remainingOrders: ordersSnapshot.size - deletedCount,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Ошибка очистки тестовых заказов:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Отправка списка закупок в Telegram
app.options('/send-purchase-list', (req, res) => {
  // Явная обработка CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.status(200).end();
});

app.post('/send-purchase-list', async (req, res) => {
  // Устанавливаем CORS заголовки
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  try {
    console.log('🛒 Получен запрос на отправку списка закупок...');
    console.log('📨 Origin:', req.headers.origin);
    
    const { message, purchaseList } = req.body;
    
    if (!message || !purchaseList) {
      return res.status(400).json({
        success: false,
        error: 'Отсутствуют необходимые данные'
      });
    }
    
    // Отправляем сообщение в Telegram
    const telegramResult = await sendTelegramAlert(message, {
      parse_mode: 'Markdown'
    });
    
    if (telegramResult.ok) {
      console.log('✅ Список закупок успешно отправлен в Telegram');
      res.json({
        success: true,
        message: 'Список закупок отправлен',
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('❌ Ошибка отправки в Telegram:', telegramResult);
      res.status(500).json({
        success: false,
        error: telegramResult.description || 'Ошибка Telegram API'
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка отправки списка закупок:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

function getMiniAppPublicUrl() {
  const base = (process.env.PUBLIC_BASE_URL || 'https://asafievbar.duckdns.org').replace(/\/$/, '');
  // /m/ is a fresh alias — Telegram WebView often keeps a stale /mini-app/ shell
  return `${base}/m/?v=${MINI_APP_ASSET_VERSION}`;
}

const MINIAPP_BOT_DESCRIPTION =
  'Официальный бот бара AsafievBar.\n\n' +
  'Откройте Mini App кнопкой «Открыть» внизу экрана, чтобы:\n' +
  '• смотреть коктейли\n' +
  '• делать заказ\n' +
  '• следить за статусом\n' +
  '• пользоваться бонусами\n\n' +
  'Добро пожаловать в AsafievBar.';

const MINIAPP_START_TEXT =
  '👋 Добро пожаловать в <b>AsafievBar</b>!\n\n' +
  'Чтобы открыть меню и сделать заказ, нажмите синюю кнопку <b>«Открыть»</b> внизу экрана 👇\n\n' +
  'Или нажмите кнопку ниже:';

async function sendMiniAppBotMessage(chatId, text, replyMarkup) {
  if (!TELEGRAM_MINIAPP_BOT_TOKEN || !chatId) {
    return { ok: false, error: 'missing_token_or_chat' };
  }
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_MINIAPP_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }
  );
  return response.json().catch(() => ({ ok: false }));
}

function buildMiniAppOpenKeyboard(miniAppUrl) {
  return {
    inline_keyboard: [[{
      text: '🍸 Открыть меню',
      web_app: { url: miniAppUrl }
    }]]
  };
}

async function handleMiniAppBotMessage(message) {
  if (!message?.chat?.id) return;
  const text = String(message.text || '').trim();
  const isStart = text === '/start' || text.startsWith('/start@') || text.startsWith('/start ');
  if (!isStart) return;

  const miniAppUrl = getMiniAppPublicUrl();
  const result = await sendMiniAppBotMessage(
    message.chat.id,
    MINIAPP_START_TEXT,
    buildMiniAppOpenKeyboard(miniAppUrl)
  );
  if (!result.ok) {
    console.error('❌ Mini App /start reply failed:', result);
  } else {
    console.log('✅ Mini App /start reply sent to', message.chat.id);
  }
}

// Основной webhook для Telegram (alerts bot — callback buttons)
app.post('/telegram-webhook', async (req, res) => {
  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.error('❌ Webhook body не JSON:', body?.slice(0, 200));
        return res.status(400).json({ error: 'Invalid JSON' });
      }
    }
    body = body || {};
    const callback_query = body.callback_query;
    if (callback_query) {
      console.log('📨 Callback от кнопки:', { data: callback_query.data, id: callback_query.id });
      await handleCallbackQuery(callback_query);
    } else {
      console.log('📨 Webhook (не кнопка):', body.update_id ? 'update_id=' + body.update_id : Object.keys(body));
    }
    res.status(200).json({ status: 'OK' });
  } catch (error) {
    console.error('❌ Ошибка обработки webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook для Mini App бота (@asafievbar_bot) — /start → подсказка открыть Mini App
app.post('/telegram-miniapp-webhook', async (req, res) => {
  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.error('❌ Mini App webhook body не JSON:', body?.slice(0, 200));
        return res.status(400).json({ error: 'Invalid JSON' });
      }
    }
    body = body || {};
    if (body.message) {
      await handleMiniAppBotMessage(body.message);
    } else {
      console.log('📨 Mini App webhook (не message):', body.update_id ? 'update_id=' + body.update_id : Object.keys(body));
    }
    res.status(200).json({ status: 'OK' });
  } catch (error) {
    console.error('❌ Ошибка Mini App webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

// Обработка callback query от inline кнопок (ответ в Telegram можно отправить только один раз)
async function handleCallbackQuery(callbackQuery) {
  const id = callbackQuery.id;
  const data = callbackQuery.data != null ? String(callbackQuery.data) : '';
  const message = callbackQuery.message;
  let answered = false;
  const answerOnce = async (text, showAlert = false) => {
    if (answered) return;
    answered = true;
    await answerCallbackQuery(id, text, showAlert);
  };

  console.log('🔘 Callback:', { callbackId: id, data, dataLength: data.length });
  if (!data) {
    await answerOnce('❌ Нет данных кнопки', true);
    return;
  }
  if (data.length > 64) {
    console.warn('⚠️ callback_data обрезан Telegram (макс 64 байта), длина:', data.length);
  }

  try {
    const sep = data.indexOf('_');
    if (sep <= 0) {
      await answerOnce('❌ Неверный формат данных кнопки', true);
      return;
    }
    const status = data.slice(0, sep);
    const orderId = data.slice(sep + 1).trim();
    if (!status || !orderId) {
      await answerOnce('❌ Пустой ID заказа', true);
      return;
    }
    const validStatuses = ['confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      await answerOnce('❌ Неизвестный статус', true);
      return;
    }

    const updateResult = await updateOrderStatus(orderId, status);

    if (updateResult.success) {
      await answerOnce(`✅ Статус: ${getStatusText(status)}`, false);
      if (message && message.message_id != null) {
        try {
          const chatId = message.chat?.id || TELEGRAM_CHAT_ID;
          await updateTelegramMessage(message.message_id, orderId, status, updateResult.orderData, chatId);
        } catch (editErr) {
          console.warn('⚠️ Не удалось обновить текст сообщения в Telegram:', editErr?.message);
        }
      }
      console.log('✅ Статус заказа обновлен:', { orderId, status });
    } else {
      const errMsg = updateResult.error === 'Заказ не найден'
        ? `❌ Заказ не найден. Проверьте /orders-last на сервере.`
        : `❌ ${(updateResult.error || '').slice(0, 100)}`;
      await answerOnce(errMsg, true);
      console.error('❌ Ошибка обновления статуса:', updateResult.error);
    }
  } catch (error) {
    console.error('❌ Ошибка обработки callback query:', error);
    await answerOnce('❌ Ошибка сервера. Попробуйте позже.', true);
  }
}

// Получение следующей позиции в очереди
async function getNextQueuePosition() {
  const active = ['pending', 'confirmed', 'preparing', 'ready'];
  try {
    const snap = await db.collection('orders')
      .where('status', 'in', active)
      .orderBy('queuePosition', 'desc')
      .limit(1)
      .get();

    if (snap.empty) return 1;
    const lastPosition = Number(snap.docs[0].data().queuePosition) || 0;
    return Math.max(1, lastPosition + 1);
  } catch (error) {
    console.warn('queuePosition orderBy failed, counting active:', error.message);
    try {
      const snap = await db.collection('orders')
        .where('status', 'in', active)
        .limit(200)
        .get();
      return snap.size + 1;
    } catch (err2) {
      console.error('❌ Ошибка получения позиции в очереди:', err2.message);
      return Math.floor(Date.now() / 1000) % 100000;
    }
  }
}

function priceFromMenuBootstrapCache(cocktailId, name) {
  const list = menuBootstrapCache?.payload?.cocktails;
  if (!Array.isArray(list) || !list.length) return null;
  const id = String(cocktailId || '');
  if (id) {
    const byId = list.find((c) => c && c.id === id);
    const p = Number(byId?.price);
    if (Number.isFinite(p) && p >= 0) return p;
  }
  const nm = String(name || '').trim().toLowerCase();
  if (!nm) return null;
  const byName = list.find((c) => String(c?.name || '').trim().toLowerCase() === nm);
  const p = Number(byName?.price);
  return Number.isFinite(p) && p >= 0 ? p : null;
}

async function resolveMenuCocktailPrice({ cocktailId, name }) {
  const cached = priceFromMenuBootstrapCache(cocktailId, name);
  if (cached != null) return cached;
  try {
    if (cocktailId) {
      const doc = await db.collection('cocktails').doc(String(cocktailId)).get();
      if (doc.exists) {
        const p = Number(doc.data()?.price);
        if (Number.isFinite(p) && p >= 0) return p;
      }
    }
    const nm = String(name || '').trim();
    if (nm) {
      const snap = await db.collection('cocktails').where('name', '==', nm).limit(1).get();
      if (!snap.empty) {
        const p = Number(snap.docs[0].data()?.price);
        if (Number.isFinite(p) && p >= 0) return p;
      }
    }
  } catch (err) {
    console.warn('resolveMenuCocktailPrice:', err.message);
  }
  return null;
}

// Обновление позиций в очереди после завершения заказа
async function updateQueuePositions(completedOrderId) {
  try {
    const completedOrderRef = db.collection('orders').doc(completedOrderId);
    const completedOrderDoc = await completedOrderRef.get();
    
    if (!completedOrderDoc.exists) {
      console.error('❌ Завершенный заказ не найден:', completedOrderId);
      return;
    }
    
    const completedPosition = completedOrderDoc.data().queuePosition;
    if (!completedPosition) {
      console.log('⚠️ У заказа нет позиции в очереди:', completedOrderId);
      return;
    }
    
    // Находим все заказы с позицией больше завершенного
    const ordersToUpdate = await db.collection('orders')
      .where('status', 'in', ['confirmed', 'preparing', 'ready'])
      .where('queuePosition', '>', completedPosition)
      .orderBy('queuePosition', 'asc')
      .get();
    
    console.log(`🔄 Обновляем позиции для ${ordersToUpdate.size} заказов после завершения заказа #${completedPosition}`);
    
    // Обновляем позиции в batch операции
    const batch = db.batch();
    
    ordersToUpdate.forEach(doc => {
      const currentPosition = doc.data().queuePosition;
      batch.update(doc.ref, {
        queuePosition: currentPosition - 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    
    await batch.commit();
    console.log('✅ Позиции в очереди успешно обновлены');
    
  } catch (error) {
    console.error('❌ Ошибка обновления позиций в очереди:', error);
  }
}

// Получение информации об очереди
async function getQueueInfo() {
  try {
    const activeOrdersSnapshot = await db.collection('orders')
      .where('status', 'in', ['confirmed', 'preparing', 'ready'])
      .orderBy('queuePosition', 'asc')
      .get();
    
    const queueInfo = {
      totalOrders: activeOrdersSnapshot.size,
      orders: []
    };
    
    activeOrdersSnapshot.forEach(doc => {
      const orderData = doc.data();
      queueInfo.orders.push({
        id: doc.id,
        ...orderData
      });
    });
    
    return queueInfo;
    
  } catch (error) {
    console.error('❌ Ошибка получения информации об очереди:', error);
    return { totalOrders: 0, orders: [] };
  }
}

// Обновление статуса заказа в Firebase
async function updateOrderStatus(orderId, newStatus) {
  if (!orderId || typeof orderId !== 'string') {
    console.error('❌ updateOrderStatus: неверный orderId', orderId);
    return { success: false, error: 'Неверный ID заказа' };
  }
  const orderIdTrimmed = orderId.trim();
  if (!orderIdTrimmed) {
    return { success: false, error: 'Пустой ID заказа' };
  }

  try {
    const orderRef = db.collection('orders').doc(orderIdTrimmed);
    console.log('📋 Читаем заказ из Firestore:', orderIdTrimmed);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      console.error('❌ Заказ не найден:', orderIdTrimmed);
      return { success: false, error: 'Заказ не найден' };
    }

    const orderData = orderDoc.data();
    const prevStatus = String(orderData.status || '');

    try {
      await orderRef.set({
        status: newStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: 'telegram_admin'
      }, { merge: true });
    } catch (writeErr) {
      console.error('❌ Firestore write ошибка:', writeErr?.code, writeErr?.message);
      return { success: false, error: writeErr?.message || String(writeErr) };
    }

    // Keep open-bill line items in sync (status + total without cancelled)
    try {
      await syncBillItemStatusForOrder(orderIdTrimmed, newStatus, orderData);
    } catch (billSyncErr) {
      console.warn('⚠️ bill item sync failed:', billSyncErr?.message || billSyncErr);
    }

    // Return ingredients when admin cancels (not for already-served completed drinks)
    if (
      newStatus === 'cancelled'
      && prevStatus !== 'cancelled'
      && prevStatus !== 'completed'
      && !orderData.ingredientsRestored
    ) {
      try {
        await restoreIngredientsAdmin(orderData.name || orderData.cocktailName, orderIdTrimmed);
      } catch (restoreErr) {
        console.warn('⚠️ ingredient restore on cancel:', restoreErr?.message || restoreErr);
      }
    }

    if (newStatus === 'completed' && orderData.queuePosition) {
      try {
        await updateQueuePositions(orderIdTrimmed);
      } catch (queueErr) {
        const isQuota = queueErr?.code === 8 || (queueErr?.message && String(queueErr.message).toLowerCase().includes('quota'));
        if (isQuota) console.warn('⚠️ Квота при обновлении очереди, пропуск');
        else console.error('❌ Ошибка обновления очереди:', queueErr);
      }
    }

    return {
      success: true,
      orderData: { ...orderData, status: newStatus }
    };

  } catch (error) {
    const code = error?.code || error?.message;
    const msg = error?.message || String(error);
    const isQuota = code === 8 || code === 'resource-exhausted' || (msg && String(msg).toLowerCase().includes('quota'));
    console.error('❌ Ошибка обновления заказа в Firebase:', { orderId: orderIdTrimmed, code, message: msg }, error);
    if (isQuota) {
      return { success: false, error: 'Квота Firestore исчерпана. Попробуйте позже.' };
    }
    return { success: false, error: msg };
  }
}

/** Update matching bill line item(s) when an order status changes */
async function syncBillItemStatusForOrder(orderId, newStatus, orderData) {
  const userId = orderData?.userId;
  if (!userId || !orderId) return { updated: 0 };

  let billsSnap = await db.collection('bills')
    .where('userId', '==', userId)
    .where('status', '==', 'open')
    .limit(5)
    .get();

  // Fallback: recent bills (e.g. just closed) still need item status fixed
  if (billsSnap.empty) {
    try {
      billsSnap = await db.collection('bills')
        .where('userId', '==', userId)
        .orderBy('updatedAt', 'desc')
        .limit(5)
        .get();
    } catch (_) {
      billsSnap = await db.collection('bills')
        .where('userId', '==', userId)
        .limit(10)
        .get();
    }
  }

  let updated = 0;
  for (const billDoc of billsSnap.docs) {
    const bill = billDoc.data() || {};
    const items = Array.isArray(bill.items) ? bill.items : [];
    let changed = false;
    const nextItems = items.map((item) => {
      if (String(item.orderId || '') !== String(orderId)) return item;
      if (item.status === newStatus) return item;
      changed = true;
      return { ...item, status: newStatus };
    });
    if (!changed) continue;

    const totalAmount = nextItems
      .filter((i) => i.status !== 'cancelled')
      .reduce((sum, i) => sum + (Number(i.price) || 0), 0);

    await billDoc.ref.update({
      items: nextItems,
      totalAmount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    updated += 1;
  }
  return { updated };
}

function mapBillItemsForClient(items) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    orderId: item.orderId || '',
    cocktailName: item.cocktailName || item.name || 'Коктейль',
    price: Number(item.price) || 0,
    status: item.status || 'pending',
    cocktailImage: item.cocktailImage || ''
  }));
}

/** Prefer live order.status over stale bill item.status */
async function hydrateBillItemsWithOrderStatus(items) {
  const list = mapBillItemsForClient(items);
  const ids = [...new Set(list.map((i) => String(i.orderId || '').trim()).filter(Boolean))];
  if (!ids.length) return list;

  const statusById = new Map();
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const refs = chunk.map((id) => db.collection('orders').doc(id));
    const snaps = await db.getAll(...refs);
    snaps.forEach((snap) => {
      if (snap.exists) statusById.set(snap.id, snap.data().status || 'pending');
    });
  }

  return list.map((item) => {
    const live = statusById.get(String(item.orderId || ''));
    return live ? { ...item, status: live } : item;
  });
}

function billTotalFromItems(items) {
  return (Array.isArray(items) ? items : [])
    .filter((i) => i.status !== 'cancelled')
    .reduce((sum, i) => sum + (Number(i.price) || 0), 0);
}

// Ответ на callback query (обязательно вызвать, иначе у пользователя крутится загрузка на кнопке)
async function answerCallbackQuery(callbackQueryId, text, showAlert = false) {
  try {
    const token = alertsBotToken();
    if (!token) {
      console.error('❌ Alerts bot token не задан');
      return;
    }
    const response = await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: (text || 'OK').slice(0, 200),
        show_alert: !!showAlert
      })
    });
    
    if (!response.ok) {
      const errBody = await response.text();
      console.error('❌ Ошибка ответа на callback query:', response.status, errBody);
    }
  } catch (error) {
    console.error('❌ Ошибка отправки ответа на callback query:', error);
  }
}

// Обновление сообщения в Telegram с новыми кнопками
async function updateTelegramMessage(messageId, orderId, newStatus, orderData, chatIdParam) {
  const chatId = chatIdParam || TELEGRAM_CHAT_ID;
  try {
    const updatedMessage = formatOrderAlertHtml({
      mode: 'update',
      status: newStatus,
      cocktailName: orderData.name,
      customerName: orderData.user,
      price: orderData.price,
      bonusUsed: orderData.bonusUsed || orderData.discount || 0,
      queuePosition: orderData.queuePosition,
      displayTime: orderData.displayTime || new Date().toLocaleString('ru-RU'),
      orderId
    });
    const inlineKeyboard = buildOrderActionKeyboard(orderId, newStatus);

    const token = alertsBotToken();
    if (!token || !chatId) {
      console.error('❌ Alerts bot token или chat_id не заданы');
      return;
    }
    const response = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: updatedMessage,
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('❌ Ошибка обновления сообщения в Telegram:', response.status, errBody);
    }
  } catch (error) {
    console.error('❌ Ошибка обновления сообщения:', error);
  }
}

/** Escape text for Telegram HTML parse_mode */
function escapeTgHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getStatusEmoji(status) {
  switch (status) {
    case 'pending': return '🆕';
    case 'confirmed': return '✅';
    case 'preparing': return '👨‍🍳';
    case 'ready': return '🍸';
    case 'completed': return '✨';
    case 'cancelled': return '❌';
    default: return '🍸';
  }
}

/** Compact bartender alert card (HTML) */
function formatOrderAlertHtml({
  mode = 'new', // new | update
  status = 'pending',
  cocktailName,
  customerName,
  price,
  bonusUsed = 0,
  queuePosition,
  displayTime,
  orderId
}) {
  const statusText = getStatusText(status);
  const emoji = mode === 'new' ? '🆕' : getStatusEmoji(status);
  const title = mode === 'new'
    ? `${emoji} Новый заказ`
    : `${emoji} ${statusText}`;

  const lines = [];
  lines.push(`<b>${escapeTgHtml(title)}</b>`);
  lines.push('');
  lines.push(`<b>${escapeTgHtml(cocktailName || 'Коктейль')}</b>`);

  const meta = [];
  if (price != null && price !== '') {
    let priceLine = `${Number(price) || 0} ₽`;
    if (Number(bonusUsed) > 0) priceLine += ` · −${Number(bonusUsed)} бонусов`;
    meta.push(escapeTgHtml(priceLine));
  }
  if (queuePosition && ['pending', 'confirmed', 'preparing', 'ready'].includes(status)) {
    meta.push(`очередь #${escapeTgHtml(queuePosition)}`);
  }
  if (meta.length) lines.push(meta.join(' · '));

  lines.push('');
  if (customerName) lines.push(`👤 ${escapeTgHtml(customerName)}`);
  if (mode === 'update' || status !== 'pending') {
    lines.push(`Статус: <b>${escapeTgHtml(statusText)}</b>`);
  } else {
    lines.push('Статус: ожидание');
  }

  if (queuePosition && status === 'preparing') {
    const mins = Math.max(3, Number(queuePosition) * 3);
    lines.push(`⏱ ~${mins} мин`);
  }

  if (displayTime) {
    lines.push(`<i>${escapeTgHtml(displayTime)}</i>`);
  }

  // Short id footer for support, not the noisy full line-as-label
  if (orderId) {
    const shortId = String(orderId).slice(-6);
    lines.push(`<code>#${escapeTgHtml(shortId)}</code>`);
  }

  return lines.join('\n');
}

/** Action buttons depend on current status */
function buildOrderActionKeyboard(orderId, status = 'pending') {
  const id = String(orderId);
  const rows = [];

  if (['pending', 'confirmed'].includes(status)) {
    rows.push([
      { text: '👨‍🍳 Готовится', callback_data: `preparing_${id}` },
      { text: '🍸 Готов', callback_data: `ready_${id}` }
    ]);
    rows.push([{ text: 'Отменить', callback_data: `cancelled_${id}` }]);
  } else if (status === 'preparing') {
    rows.push([
      { text: '🍸 Готов', callback_data: `ready_${id}` },
      { text: 'Отменить', callback_data: `cancelled_${id}` }
    ]);
  } else if (status === 'ready') {
    rows.push([
      { text: '✨ Выдан', callback_data: `completed_${id}` },
      { text: 'Отменить', callback_data: `cancelled_${id}` }
    ]);
  }
  // completed / cancelled — no actions

  return { inline_keyboard: rows };
}

// Получение текста статуса
function getStatusText(status) {
  switch(status) {
    case 'pending': return 'Ожидание';
    case 'confirmed': return 'Подтверждён';
    case 'preparing': return 'Готовится';
    case 'ready': return 'Готов';
    case 'completed': return 'Выполнен';
    case 'cancelled': return 'Отменён';
    default: return 'В обработке';
  }
}

// ============================================
// TELEGRAM MINI APP API
// ============================================

function validateTelegramWebAppData(initData, botToken) {
  if (!initData || !botToken) {
    return { ok: false, reason: 'missing_init_data_or_token' };
  }

  // Parse raw pairs to avoid decoding mismatches
  const pairs = String(initData).split('&').filter(Boolean).map((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return [part, ''];
    return [part.slice(0, idx), part.slice(idx + 1)];
  });

  const map = new Map(pairs);
  const hash = map.get('hash');
  if (!hash) return { ok: false, reason: 'missing_hash' };

  const dataCheckString = pairs
    .filter(([key]) => key !== 'hash')
    .map(([key, value]) => {
      // Telegram signs URL-decoded values
      try {
        return `${key}=${decodeURIComponent(value.replace(/\+/g, ' '))}`;
      } catch (_) {
        return `${key}=${value}`;
      }
    })
    .sort()
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (calculatedHash !== hash) {
    // Fallback: URLSearchParams style (some clients)
    const params = new URLSearchParams(initData);
    const hash2 = params.get('hash');
    params.delete('hash');
    const dataCheckString2 = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    const calculatedHash2 = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString2)
      .digest('hex');
    if (calculatedHash2 !== hash2) {
      return { ok: false, reason: 'bad_hash' };
    }
  }

  const params = new URLSearchParams(initData);
  const authDate = Number(params.get('auth_date') || 0);
  const ageSec = Math.floor(Date.now() / 1000) - authDate;
  if (!authDate || ageSec > 86400) {
    return { ok: false, reason: 'expired', ageSec };
  }

  let user = null;
  try {
    user = JSON.parse(params.get('user') || 'null');
  } catch (_) {
    return { ok: false, reason: 'bad_user_json' };
  }

  if (!user?.id) return { ok: false, reason: 'missing_user' };
  return { ok: true, user, authDate, queryId: params.get('query_id') || null };
}

function getTelegramUserFromRequest(req) {
  const initData =
    req.body?.initData ||
    req.headers['x-telegram-init-data'] ||
    '';
  const parsed = validateTelegramWebAppData(initData, TELEGRAM_MINIAPP_BOT_TOKEN);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  const uid = `tg_${parsed.user.id}`;
  return { ok: true, uid, user: parsed.user, initData };
}

async function resolveMiniAppUser(req) {
  // Prefer Telegram initData (works without Firebase authorized domains)
  const tg = getTelegramUserFromRequest(req);
  if (tg.ok) {
    return {
      ok: true,
      userId: tg.uid,
      telegramId: tg.user.id,
      displayName: [tg.user.first_name, tg.user.last_name].filter(Boolean).join(' ') || 'Гость Telegram',
      via: 'initData'
    };
  }

  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (idToken) {
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      return {
        ok: true,
        userId: decoded.uid,
        telegramId: decoded.telegramId || null,
        displayName: decoded.name || 'Гость Telegram',
        via: 'firebase'
      };
    } catch (_) {
      return { ok: false, reason: 'bad_firebase_token' };
    }
  }

  return { ok: false, reason: tg.reason || 'unauthorized' };
}

// In-memory stoplist cache — avoids Firestore roundtrip on every order
const stoplistCache = { names: new Set(), at: 0, loading: null };
// Shared with menu-bootstrap + create-order price lookup
const menuBootstrapCache = { at: 0, payload: null };
const MENU_BOOTSTRAP_TTL_MS = 120000;

function invalidateStoplistCache() {
  stoplistCache.at = 0;
  stoplistCache.names = new Set();
  stoplistCache.loading = null;
  invalidateMenuBootstrapCache();
}

function invalidateMenuBootstrapCache() {
  try {
    menuBootstrapCache.at = 0;
    menuBootstrapCache.payload = null;
  } catch (_) { /* defined later */ }
}

async function refreshStoplistCache(force = false) {
  const fresh = Date.now() - stoplistCache.at < 20000;
  if (!force && fresh && stoplistCache.at > 0) return stoplistCache.names;
  if (stoplistCache.loading) return stoplistCache.loading;
  stoplistCache.loading = (async () => {
    try {
      const snap = await db.collection('stoplist').select('cocktailName').get();
      stoplistCache.names = new Set(
        snap.docs.map((d) => String(d.data().cocktailName || '').trim()).filter(Boolean)
      );
      stoplistCache.at = Date.now();
    } catch (err) {
      console.warn('stoplist cache refresh:', err.message);
    } finally {
      stoplistCache.loading = null;
    }
    return stoplistCache.names;
  })();
  return stoplistCache.loading;
}

async function isCocktailStoppedCached(name) {
  const names = await refreshStoplistCache(false);
  return names.has(String(name || '').trim());
}

async function ensureCocktailInStoplist(cocktailName, reason = 'Недостаточно ингредиентов') {
  const name = String(cocktailName || '').trim();
  if (!name) return false;
  const existing = await db.collection('stoplist')
    .where('cocktailName', '==', name)
    .limit(1)
    .get();
  if (!existing.empty) return false;
  await db.collection('stoplist').add({
    cocktailName: name,
    reason,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    source: 'telegram-mini-app',
    addedBy: 'system'
  });
  invalidateStoplistCache();
  return true;
}

/** When an ingredient hits 0, put all cocktails that use it (stockRecipe) into stoplist */
async function stoplistCocktailsForIngredient(ingredientName) {
  const ing = String(ingredientName || '').trim();
  if (!ing) return { added: 0, names: [] };
  const cocktailsSnap = await db.collection('cocktails').get();
  const addedNames = [];
  for (const doc of cocktailsSnap.docs) {
    const data = doc.data() || {};
    const cocktailName = String(data.name || '').trim();
    if (!cocktailName) continue;
    const recipe = Array.isArray(data.stockRecipe) ? data.stockRecipe : [];
    const uses = recipe.some((r) => String(r.ingredientName || '').trim().toLowerCase() === ing.toLowerCase());
    if (!uses) continue;
    const didAdd = await ensureCocktailInStoplist(
      cocktailName,
      `Недостаточно ингредиентов: ${ing}`
    );
    if (didAdd) addedNames.push(cocktailName);
  }
  if (addedNames.length) invalidateStoplistCache();
  return { added: addedNames.length, names: addedNames };
}

function isAutoStockStoplistEntry(data) {
  const reason = String(data?.reason || '');
  const by = String(data?.addedBy || '');
  return by === 'system' || /недостаточно ингредиент/i.test(reason);
}

async function loadIngredientStockMap() {
  const snap = await db.collection('ingredients').get();
  const byName = new Map();
  snap.forEach((doc) => {
    const d = doc.data() || {};
    const name = String(d.name || '').trim();
    if (!name) return;
    byName.set(name.toLowerCase(), Number(d.stock) || 0);
  });
  return byName;
}

function cocktailHasEnoughStock(cocktailData, stockByName) {
  const recipe = Array.isArray(cocktailData?.stockRecipe) ? cocktailData.stockRecipe : [];
  if (!recipe.length) return false;
  for (const item of recipe) {
    const ingName = String(item.ingredientName || '').trim().toLowerCase();
    const needed = Number(item.amount) || 0;
    if (!ingName || needed <= 0) continue;
    const have = stockByName.has(ingName) ? stockByName.get(ingName) : 0;
    if (have < needed) return false;
  }
  return true;
}

/**
 * After restocking an ingredient, remove auto-stoplist entries for cocktails
 * that now have enough of every stockRecipe ingredient.
 */
async function unstoplistCocktailsAfterRestock(ingredientName) {
  const ing = String(ingredientName || '').trim();
  if (!ing) return { removed: 0, names: [] };

  const [cocktailsSnap, stopSnap, stockByName] = await Promise.all([
    db.collection('cocktails').get(),
    db.collection('stoplist').get(),
    loadIngredientStockMap()
  ]);

  const stopByCocktail = new Map();
  stopSnap.docs.forEach((doc) => {
    const d = doc.data() || {};
    const name = String(d.cocktailName || '').trim();
    if (!name) return;
    if (!isAutoStockStoplistEntry(d)) return;
    const list = stopByCocktail.get(name) || [];
    list.push(doc.id);
    stopByCocktail.set(name, list);
  });

  if (!stopByCocktail.size) return { removed: 0, names: [] };

  const removedNames = [];
  for (const doc of cocktailsSnap.docs) {
    const data = doc.data() || {};
    const cocktailName = String(data.name || '').trim();
    if (!cocktailName || !stopByCocktail.has(cocktailName)) continue;

    const recipe = Array.isArray(data.stockRecipe) ? data.stockRecipe : [];
    const usesIng = recipe.some(
      (r) => String(r.ingredientName || '').trim().toLowerCase() === ing.toLowerCase()
    );
    if (!usesIng) continue;
    if (!cocktailHasEnoughStock(data, stockByName)) continue;

    const ids = stopByCocktail.get(cocktailName) || [];
    for (const id of ids) {
      await db.collection('stoplist').doc(id).delete();
    }
    removedNames.push(cocktailName);
  }

  if (removedNames.length) invalidateStoplistCache();
  return { removed: removedNames.length, names: removedNames };
}

async function createOrUpdateBillAdmin(userId, userName, orderData, orderId) {
  const billsSnapshot = await db.collection('bills')
    .where('userId', '==', userId)
    .where('status', '==', 'open')
    .get();

  const billItem = {
    orderId,
    cocktailId: orderData.cocktailId || '',
    cocktailName: orderData.name,
    cocktailImage: orderData.image || '',
    price: orderData.price,
    timestamp: new Date(),
    status: orderData.status || 'pending',
    rated: false,
    source: 'telegram-mini-app'
  };

  if (billsSnapshot.empty) {
    const ref = await db.collection('bills').add({
      userId,
      userName: userName || 'Гость',
      userPhone: '',
      items: [billItem],
      totalAmount: orderData.price,
      status: 'open',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      paidAt: null,
      paymentMethod: null,
      paymentId: null,
      source: 'telegram-mini-app'
    });
    return {
      id: ref.id,
      totalAmount: Number(orderData.price) || 0,
      items: [billItem]
    };
  }

  const billDoc = billsSnapshot.docs[0];
  const billData = billDoc.data();
  const nextTotal = (Number(billData.totalAmount) || 0) + (Number(orderData.price) || 0);
  const nextItems = [...(Array.isArray(billData.items) ? billData.items : []), billItem];
  await billDoc.ref.update({
    items: nextItems,
    totalAmount: nextTotal,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  return {
    id: billDoc.id,
    totalAmount: nextTotal,
    items: nextItems
  };
}

async function awardBonusPointsAdmin(userId, orderAmount, meta = {}) {
  const amount = Math.max(0, Number(orderAmount) || 0);
  if (!userId || amount <= 0) return { awarded: 0 };

  const settingsDoc = await db.collection('settings').doc('bonusSystem').get();
  const settings = settingsDoc.exists ? settingsDoc.data() : {};
  if (settings.active === false) return { awarded: 0, reason: 'inactive' };

  const percentage = Number(settings.percentage) || 5;
  const minOrder = Number(settings.minOrder) || 300;
  if (amount < minOrder) return { awarded: 0, reason: 'below_min' };

  const bonusPoints = Math.floor(amount * percentage / 100);
  if (bonusPoints <= 0) return { awarded: 0 };

  const bonusRef = db.collection('bonusAccounts').doc(userId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(bonusRef);
    const prev = snap.exists ? snap.data() : {};
    tx.set(bonusRef, {
      userId,
      balance: (Number(prev.balance) || 0) + bonusPoints,
      totalEarned: (Number(prev.totalEarned) || 0) + bonusPoints,
      lastEarned: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });

  await db.collection('bonusTransactions').add({
    userId,
    type: 'earn',
    amount: bonusPoints,
    orderAmount: amount,
    percentage,
    billId: meta.billId || null,
    source: 'telegram-mini-app',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { awarded: bonusPoints, percentage };
}

async function validatePromoCodeData(codeRaw) {
  const code = String(codeRaw || '').trim().toUpperCase();
  if (!code) return { ok: false, error: 'Промокод не указан' };
  const promoRef = await db.collection('promocodes').doc(code).get();
  if (!promoRef.exists) return { ok: false, error: 'Промокод не найден' };
  const promoData = promoRef.data();
  if (!promoData.active) return { ok: false, error: 'Промокод неактивен' };
  if (promoData.expiryDate) {
    const expiryDate = promoData.expiryDate.toDate ? promoData.expiryDate.toDate() : new Date(promoData.expiryDate);
    if (expiryDate < new Date()) return { ok: false, error: 'Срок действия промокода истек' };
  }
  if (promoData.maxUses && promoData.maxUses > 0) {
    const usedCount = promoData.usedCount || 0;
    if (usedCount >= promoData.maxUses) return { ok: false, error: 'Промокод исчерпан' };
  }
  return {
    ok: true,
    promo: {
      code,
      discount: Number(promoData.discount) || 0,
      description: promoData.description || ''
    }
  };
}

async function spendBonusPointsAdmin(userId, amount, orderId) {
  if (!amount || amount <= 0) return;
  const bonusRef = db.collection('bonusAccounts').doc(userId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(bonusRef);
    const balance = snap.exists ? Number(snap.data().balance) || 0 : 0;
    if (balance < amount) {
      throw new Error('Недостаточно бонусов');
    }
    tx.set(bonusRef, {
      balance: balance - amount,
      totalSpent: (snap.exists ? Number(snap.data().totalSpent) || 0 : 0) + amount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });

  await db.collection('bonusTransactions').add({
    userId,
    type: 'spend',
    amount,
    orderId,
    source: 'telegram-mini-app',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

async function deductIngredientsAdmin(cocktailName, orderId = null) {
  try {
    if (orderId) {
      const orderSnap = await db.collection('orders').doc(String(orderId)).get();
      if (!orderSnap.exists) return;
      const od = orderSnap.data() || {};
      if (od.status === 'cancelled' || od.ingredientsRestored || od.ingredientsDeducted === true) {
        return;
      }
    }

    const cocktailsSnap = await db.collection('cocktails')
      .where('name', '==', cocktailName)
      .limit(1)
      .get();
    if (cocktailsSnap.empty) {
      if (orderId) {
        await db.collection('orders').doc(String(orderId)).set({
          ingredientsDeducted: false
        }, { merge: true });
      }
      return;
    }

    const cocktail = cocktailsSnap.docs[0].data();
    if (!Array.isArray(cocktail.stockRecipe) || cocktail.stockRecipe.length === 0) {
      if (orderId) {
        await db.collection('orders').doc(String(orderId)).set({
          ingredientsDeducted: false
        }, { merge: true });
      }
      return;
    }

    const ingredientsSnapshot = await db.collection('ingredients').get();
    const byName = new Map();
    ingredientsSnapshot.forEach((doc) => {
      const d = doc.data();
      const name = (d.name || '').trim();
      if (name) byName.set(name.toLowerCase(), { id: doc.id, stock: Number(d.stock) || 0, name });
    });

    const batch = db.batch();
    let needsStoplist = false;
    let changed = false;

    for (const item of cocktail.stockRecipe) {
      const ingName = (item.ingredientName || '').trim();
      const needed = Number(item.amount) || 0;
      if (!ingName || needed <= 0) continue;
      const entry = byName.get(ingName.toLowerCase());
      if (!entry) continue;
      const next = Math.max(0, entry.stock - needed);
      batch.update(db.collection('ingredients').doc(entry.id), {
        stock: next,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      entry.stock = next;
      changed = true;
      if (next <= 0) needsStoplist = true;
    }

    if (changed) await batch.commit();

    if (orderId) {
      await db.collection('orders').doc(String(orderId)).set({
        ingredientsDeducted: changed
      }, { merge: true });
    }

    if (needsStoplist) {
      await ensureCocktailInStoplist(cocktailName, 'Недостаточно ингредиентов');
    }
  } catch (error) {
    console.error('⚠️ Mini App: не удалось списать ингредиенты:', error.message);
  }
}

/** Return stockRecipe amounts after an order is cancelled (idempotent per order). */
async function restoreIngredientsAdmin(cocktailName, orderId = null) {
  const orderRef = orderId ? db.collection('orders').doc(String(orderId)) : null;
  try {
    if (orderRef) {
      let shouldRestore = false;
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(orderRef);
        if (!snap.exists) return;
        const od = snap.data() || {};
        if (od.ingredientsRestored) return;
        // Back-compat: older orders have no flag but were deducted on create
        if (od.ingredientsDeducted === false) return;
        shouldRestore = true;
        tx.set(orderRef, {
          ingredientsRestored: true,
          ingredientsRestoredAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      });
      if (!shouldRestore) return { restored: false, reason: 'skip' };
    }

    const name = String(cocktailName || '').trim();
    if (!name) return { restored: false, reason: 'no-name' };

    const cocktailsSnap = await db.collection('cocktails')
      .where('name', '==', name)
      .limit(1)
      .get();
    if (cocktailsSnap.empty) return { restored: false, reason: 'cocktail-missing' };

    const cocktail = cocktailsSnap.docs[0].data() || {};
    const recipe = Array.isArray(cocktail.stockRecipe) ? cocktail.stockRecipe : [];
    if (!recipe.length) return { restored: false, reason: 'no-recipe' };

    const ingredientsSnapshot = await db.collection('ingredients').get();
    const byName = new Map();
    ingredientsSnapshot.forEach((doc) => {
      const d = doc.data() || {};
      const ingName = String(d.name || '').trim();
      if (!ingName) return;
      byName.set(ingName.toLowerCase(), { id: doc.id, stock: Number(d.stock) || 0, name: ingName });
    });

    const batch = db.batch();
    const touched = [];
    for (const item of recipe) {
      const ingName = String(item.ingredientName || '').trim();
      const amount = Number(item.amount) || 0;
      if (!ingName || amount <= 0) continue;
      const entry = byName.get(ingName.toLowerCase());
      if (!entry) continue;
      const next = entry.stock + amount;
      batch.update(db.collection('ingredients').doc(entry.id), {
        stock: next,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      entry.stock = next;
      touched.push(entry.name);
    }

    if (touched.length) await batch.commit();

    const uniqueIngs = [...new Set(touched)];
    for (const ing of uniqueIngs) {
      try {
        await unstoplistCocktailsAfterRestock(ing);
      } catch (err) {
        console.warn('unstoplist after cancel restore:', err?.message || err);
      }
    }

    console.log(`↩️ Ингредиенты возвращены после отмены «${name}»:`, uniqueIngs.join(', ') || '—');
    return { restored: true, ingredients: uniqueIngs };
  } catch (error) {
    // Allow a later retry if stock write failed after the claim
    if (orderRef) {
      try {
        await orderRef.set({ ingredientsRestored: false }, { merge: true });
      } catch (_) { /* ignore */ }
    }
    console.error('⚠️ Mini App: не удалось вернуть ингредиенты:', error.message);
    return { restored: false, reason: error.message };
  }
}

// Auth: validate Telegram initData → session (+ optional Firebase custom token)
app.post('/api/mini-app/auth', async (req, res) => {
  try {
    const { initData } = req.body || {};
    const parsed = validateTelegramWebAppData(initData, TELEGRAM_MINIAPP_BOT_TOKEN);

    if (!parsed.ok) {
      console.warn(' Mini App auth rejected:', parsed.reason);
      return res.status(401).json({
        success: false,
        error: 'Недействительные данные Telegram WebApp',
        reason: parsed.reason
      });
    }

    const tgUser = parsed.user;
    const uid = `tg_${tgUser.id}`;
    const displayName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || 'Гость Telegram';
    const adminIds = new Set(
      String(process.env.TELEGRAM_ADMIN_IDS || TELEGRAM_CHAT_ID || '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
    );
    // Owner chat id from project defaults
    adminIds.add('1743362083');
    const isAdminEnv = adminIds.has(String(tgUser.id));

    // Firebase Auth upsert is ~0.8s+ — never block login on it
    void (async () => {
      try {
        const updatePayload = { displayName };
        if (tgUser.photo_url) updatePayload.photoURL = tgUser.photo_url;
        await admin.auth().updateUser(uid, updatePayload);
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          try {
            const createPayload = { uid, displayName };
            if (tgUser.photo_url) createPayload.photoURL = tgUser.photo_url;
            await admin.auth().createUser(createPayload);
          } catch (createErr) {
            console.warn('Firebase user create skipped:', createErr.message);
          }
        } else {
          console.warn('Firebase user upsert skipped:', error.message);
        }
      }
    })();

    const userRef = db.collection('users').doc(uid);

    // Fast path: env admins don't need a Firestore role lookup.
    // Bonus/bill come from /me + polling right after login — don't block session.
    const [existingUser, customToken] = await Promise.all([
      isAdminEnv
        ? Promise.resolve(null)
        : userRef.get().catch(() => null),
      admin.auth().createCustomToken(uid, {
        telegramId: tgUser.id,
        provider: 'telegram-mini-app'
      }).catch((tokenError) => {
        console.warn('Custom token unavailable:', tokenError.message);
        return null;
      })
    ]);

    const existingRole = existingUser?.exists ? (existingUser.data().role || 'user') : 'user';
    const role = isAdminEnv ? 'admin' : (existingRole || 'user');

    // Profile + bonus/bill snapshot in background (client refreshes via /me)
    void userRef.set({
      displayName,
      telegramId: tgUser.id,
      telegramUsername: tgUser.username || null,
      photoURL: tgUser.photo_url || null,
      role,
      source: 'telegram-mini-app',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(existingUser?.exists ? {} : { createdAt: admin.firestore.FieldValue.serverTimestamp() })
    }, { merge: true }).catch((e) => console.warn('user profile write:', e.message));

    let bonusBalance = 0;
    let openBillTotal = 0;
    let openBillItems = [];

    // Non-blocking enrich — race a short timeout so cold Firestore can't stall login
    try {
      const enrich = Promise.all([
        db.collection('bonusAccounts').doc(uid).get().catch(() => null),
        db.collection('bills')
          .where('userId', '==', uid)
          .where('status', '==', 'open')
          .limit(1)
          .get()
          .catch(() => null)
      ]);
      const timed = await Promise.race([
        enrich.then((v) => ({ ok: true, v })),
        new Promise((resolve) => setTimeout(() => resolve({ ok: false }), 450))
      ]);
      if (timed.ok) {
        const [bonusDoc, billsSnap] = timed.v;
        bonusBalance = bonusDoc?.exists ? Number(bonusDoc.data().balance) || 0 : 0;
        if (billsSnap && !billsSnap.empty) {
          const billDoc = billsSnap.docs[0];
          const bill = billDoc.data() || {};
          openBillItems = mapBillItemsForClient(bill.items);
          openBillTotal = Number(bill.totalAmount);
          if (!Number.isFinite(openBillTotal)) openBillTotal = billTotalFromItems(openBillItems);
          void (async () => {
            try {
              const hydrated = await hydrateBillItemsWithOrderStatus(bill.items);
              const total = billTotalFromItems(hydrated);
              const stale = (Array.isArray(bill.items) ? bill.items : []).some((it, idx) => {
                const live = hydrated[idx];
                return live && it.status !== live.status;
              }) || Number(bill.totalAmount || 0) !== total;
              if (stale) {
                await billDoc.ref.update({
                  items: hydrated.map((it, idx) => ({
                    ...(Array.isArray(bill.items) ? bill.items[idx] : {}),
                    ...it
                  })),
                  totalAmount: total,
                  updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
              }
            } catch (_) { /* ignore */ }
          })();
        }
      } else {
        // Still load in background; client /me will pick it up
        enrich.catch(() => {});
      }
    } catch (_) { /* ignore */ }

    res.json({
      success: true,
      // Session works even if client cannot use Firebase Auth domains
      session: true,
      customToken,
      bonusBalance,
      openBillTotal,
      openBillItems,
      role,
      user: {
        id: tgUser.id,
        first_name: tgUser.first_name,
        last_name: tgUser.last_name || '',
        username: tgUser.username || '',
        photo_url: tgUser.photo_url || '',
        uid
      }
    });
  } catch (error) {
    console.error('❌ Mini App auth error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка авторизации Mini App'
    });
  }
});

// Profile snapshot via initData
app.post('/api/mini-app/me', async (req, res) => {
  try {
    const session = await resolveMiniAppUser(req);
    if (!session.ok) {
      return res.status(401).json({ success: false, error: 'Unauthorized', reason: session.reason });
    }

    const [bonusDoc, settingsDoc, billsSnap, historySnap] = await Promise.all([
      db.collection('bonusAccounts').doc(session.userId).get(),
      db.collection('settings').doc('bonusSystem').get(),
      db.collection('bills').where('userId', '==', session.userId).where('status', '==', 'open').limit(1).get(),
      db.collection('bills').where('userId', '==', session.userId).limit(30).get().catch(() => null)
    ]);

    let openBillTotal = 0;
    let openBillItems = [];
    let openBillPromo = null;
    if (!billsSnap.empty) {
      const billDoc = billsSnap.docs[0];
      const bill = billDoc.data();
      openBillItems = await hydrateBillItemsWithOrderStatus(bill.items);
      openBillTotal = Number(bill.totalAmount);
      if (!Number.isFinite(openBillTotal)) openBillTotal = billTotalFromItems(openBillItems);
      openBillPromo = bill.promoCode
        ? { code: bill.promoCode, discount: bill.discount || 0, originalTotal: bill.originalTotal || null }
        : null;
      const stale = (Array.isArray(bill.items) ? bill.items : []).some((it, idx) => {
        const live = openBillItems[idx];
        return live && it.status !== live.status;
      });
      if (stale) {
        billDoc.ref.update({
          items: openBillItems.map((it, idx) => ({
            ...(Array.isArray(bill.items) ? bill.items[idx] : {}),
            ...it
          })),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }).catch(() => {});
      }
    }

    const bonusData = bonusDoc.exists ? bonusDoc.data() : {};
    const settings = settingsDoc.exists ? settingsDoc.data() : {};
    const billHistory = [];
    if (historySnap && !historySnap.empty) {
      historySnap.docs.forEach((doc) => {
        const d = doc.data() || {};
        if (d.status !== 'paid') return;
        const items = Array.isArray(d.items) ? d.items : [];
        billHistory.push({
          id: doc.id,
          totalAmount: Number(d.totalAmount) || 0,
          itemsCount: items.length,
          paymentMethod: d.paymentMethod || null,
          promoCode: d.promoCode || null,
          paidAtMs: d.paidAt?.toMillis?.() || d.updatedAt?.toMillis?.() || 0,
          itemNames: items.slice(0, 3).map((i) => i.cocktailName || i.name || 'Коктейль')
        });
      });
      billHistory.sort((a, b) => b.paidAtMs - a.paidAtMs);
    }

    res.json({
      success: true,
      userId: session.userId,
      bonusBalance: Number(bonusData.balance) || 0,
      totalEarned: Number(bonusData.totalEarned) || 0,
      totalSpent: Number(bonusData.totalSpent) || 0,
      maxBonusUsage: Number(settings.maxUsage) || 50,
      bonusPercentage: Number(settings.percentage) || 5,
      bonusMinOrder: Number(settings.minOrder) || 300,
      bonusActive: settings.active !== false,
      openBillTotal,
      openBillItems,
      openBillPromo,
      billHistory: billHistory.slice(0, 10)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Orders list via initData
app.post('/api/mini-app/my-orders', async (req, res) => {
  try {
    const session = await resolveMiniAppUser(req);
    if (!session.ok) {
      return res.status(401).json({ success: false, error: 'Unauthorized', reason: session.reason });
    }

    let orders = [];
    try {
      const snap = await db.collection('orders')
        .where('userId', '==', session.userId)
        .orderBy('createdAt', 'desc')
        .limit(30)
        .get();
      orders = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (_) {
      const snap = await db.collection('orders')
        .where('userId', '==', session.userId)
        .limit(40)
        .get();
      orders = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          const am = a.createdAt?.toMillis?.() || 0;
          const bm = b.createdAt?.toMillis?.() || 0;
          if (bm !== am) return bm - am;
          return String(b.displayTime || '').localeCompare(String(a.displayTime || ''));
        });
    }

    // Reconcile with paid bills: closed bill items must not stay "pending" in UI
    try {
      const billsSnap = await db.collection('bills')
        .where('userId', '==', session.userId)
        .where('status', '==', 'paid')
        .limit(20)
        .get();
      const billStatusByOrder = new Map();
      billsSnap.forEach((doc) => {
        const items = Array.isArray(doc.data()?.items) ? doc.data().items : [];
        items.forEach((item) => {
          const oid = String(item.orderId || '').trim();
          if (!oid) return;
          // cancelled stays cancelled; everything else on a paid bill is completed
          const st = item.status === 'cancelled' ? 'cancelled' : 'completed';
          billStatusByOrder.set(oid, st);
        });
      });

      if (billStatusByOrder.size) {
        const fixes = [];
        orders = orders.map((o) => {
          const billStatus = billStatusByOrder.get(String(o.id));
          if (!billStatus) return o;
          const current = o.status || 'pending';
          if (current === 'cancelled' || current === billStatus) return o;
          // Live orders still in kitchen shouldn't be forced — only stale pending/confirmed after bill paid
          if (['pending', 'confirmed', 'preparing', 'ready'].includes(current)) {
            fixes.push({ id: o.id, from: current, to: billStatus });
            return { ...o, status: billStatus };
          }
          return o;
        });

        // Persist repairs so next reads / Telegram stay consistent
        if (fixes.length) {
          let batch = db.batch();
          let ops = 0;
          for (const fix of fixes) {
            batch.set(db.collection('orders').doc(fix.id), {
              status: fix.to,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedBy: 'reconcile-paid-bill'
            }, { merge: true });
            ops += 1;
            if (ops >= 400) {
              await batch.commit();
              batch = db.batch();
              ops = 0;
            }
          }
          if (ops > 0) await batch.commit();
          console.log('🔧 reconciled orders with paid bills:', fixes.length);
        }
      }
    } catch (reconcileErr) {
      console.warn('my-orders reconcile:', reconcileErr?.message || reconcileErr);
    }

    orders = orders.slice(0, 30).map((o) => ({
      id: o.id,
      name: o.name,
      status: o.status,
      price: o.price,
      displayTime: o.displayTime,
      queuePosition: o.queuePosition,
      rated: Boolean(o.rated),
      createdAtMs: o.createdAt?.toMillis?.() || 0
    }));

    const orderById = new Map(orders.map((o) => [o.id, o]));
    let bills = [];
    try {
      const allBills = await db.collection('bills')
        .where('userId', '==', session.userId)
        .limit(40)
        .get();
      bills = allBills.docs.map((doc) => {
        const d = doc.data() || {};
        const rawItems = Array.isArray(d.items) ? d.items : [];
        const items = rawItems.map((item) => {
          const oid = String(item.orderId || '').trim();
          const live = oid ? orderById.get(oid) : null;
          const status = live?.status || item.status || 'pending';
          return {
            orderId: oid,
            cocktailName: item.cocktailName || item.name || live?.name || 'Коктейль',
            price: Number(item.price) || Number(live?.price) || 0,
            status,
            displayTime: live?.displayTime || '',
            queuePosition: live?.queuePosition || 0,
            rated: Boolean(live?.rated)
          };
        });
        const chargeable = items
          .filter((i) => i.status !== 'cancelled')
          .reduce((s, i) => s + (Number(i.price) || 0), 0);
        return {
          id: doc.id,
          status: d.status || 'open',
          totalAmount: d.status === 'open'
            ? (Number.isFinite(Number(d.totalAmount)) ? Number(d.totalAmount) : chargeable)
            : (Number(d.totalAmount) || chargeable),
          paymentMethod: d.paymentMethod || null,
          promoCode: d.promoCode || null,
          discount: d.discount || 0,
          createdAtMs: d.createdAt?.toMillis?.() || 0,
          paidAtMs: d.paidAt?.toMillis?.() || d.updatedAt?.toMillis?.() || 0,
          items
        };
      });
      bills.sort((a, b) => {
        if (a.status === 'open' && b.status !== 'open') return -1;
        if (b.status === 'open' && a.status !== 'open') return 1;
        return (b.paidAtMs || b.createdAtMs) - (a.paidAtMs || a.createdAtMs);
      });
    } catch (billErr) {
      console.warn('my-orders bills:', billErr?.message || billErr);
    }

    // Orders that somehow are not attached to a bill (e.g. bill was deleted).
    // Active orphans must not appear as a fake open "Без счёта" bill — cancel them.
    const linked = new Set();
    bills.forEach((b) => b.items.forEach((i) => { if (i.orderId) linked.add(i.orderId); }));
    let orphanOrders = orders.filter((o) => !linked.has(o.id));
    const activeOrphanStatuses = new Set(['pending', 'confirmed', 'preparing', 'ready']);
    const orphansToCancel = orphanOrders.filter((o) =>
      activeOrphanStatuses.has(String(o.status || 'pending'))
    );
    if (orphansToCancel.length) {
      try {
        let batch = db.batch();
        let ops = 0;
        for (const o of orphansToCancel) {
          batch.set(db.collection('orders').doc(o.id), {
            status: 'cancelled',
            cancelledReason: 'orphan-no-bill',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: 'reconcile-orphan'
          }, { merge: true });
          ops += 1;
          if (ops >= 400) {
            await batch.commit();
            batch = db.batch();
            ops = 0;
          }
        }
        if (ops > 0) await batch.commit();
        console.log('🔧 cancelled orphan orders without bill:', orphansToCancel.length);
      } catch (orphanErr) {
        console.warn('my-orders orphan cancel:', orphanErr?.message || orphanErr);
      }
      const cancelledIds = new Set(orphansToCancel.map((o) => o.id));
      orphanOrders = orphanOrders.map((o) =>
        cancelledIds.has(o.id) ? { ...o, status: 'cancelled' } : o
      );
      orders = orders.map((o) =>
        cancelledIds.has(o.id) ? { ...o, status: 'cancelled' } : o
      );
    }
    // Do not invent a synthetic open bill for leftovers (cancelled/completed only)
    const visibleOrphans = orphanOrders.filter((o) =>
      !['cancelled', 'completed'].includes(String(o.status || ''))
    );
    if (visibleOrphans.length) {
      bills.push({
        id: 'orphan',
        status: 'open',
        totalAmount: visibleOrphans
          .reduce((s, o) => s + (Number(o.price) || 0), 0),
        paymentMethod: null,
        promoCode: null,
        discount: 0,
        createdAtMs: Date.now(),
        paidAtMs: 0,
        items: visibleOrphans.map((o) => ({
          orderId: o.id,
          cocktailName: o.name,
          price: o.price,
          status: o.status,
          displayTime: o.displayTime,
          queuePosition: o.queuePosition,
          rated: o.rated
        }))
      });
    }

    res.json({ success: true, orders, bills });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create order from Mini App (initData or Firebase ID token)
app.post('/api/mini-app/create-order', async (req, res) => {
  try {
    const session = await resolveMiniAppUser(req);
    if (!session.ok) {
      return res.status(401).json({
        success: false,
        error: 'Требуется авторизация',
        reason: session.reason
      });
    }

    const userId = session.userId;

    const {
      name,
      price,
      originalPrice,
      bonusUsed = 0,
      queuePosition = 0,
      user,
      image = '',
      cocktailId = '',
      source = 'telegram-mini-app'
    } = req.body || {};

    if (!name) {
      return res.status(400).json({ success: false, error: 'Не указан коктейль' });
    }

    // Fast stoplist via memory cache (refreshed every ~20s)
    if (await isCocktailStoppedCached(name)) {
      return res.status(409).json({ success: false, error: 'Коктейль в стоп-листе' });
    }

    const bonusAmount = Math.max(0, Number(bonusUsed) || 0);

    // Price, queue, and bonus docs in parallel — biggest create-order win
    const [menuPrice, nextQueue, bonusPair] = await Promise.all([
      resolveMenuCocktailPrice({ cocktailId, name }),
      getNextQueuePosition(),
      bonusAmount > 0
        ? Promise.all([
          db.collection('bonusAccounts').doc(userId).get(),
          db.collection('settings').doc('bonusSystem').get()
        ])
        : Promise.resolve(null)
    ]);

    let listedPrice = menuPrice;
    if (listedPrice == null) {
      const fallback = Number(originalPrice != null ? originalPrice : price);
      if (!Number.isFinite(fallback) || fallback < 0) {
        return res.status(400).json({ success: false, error: 'Коктейль не найден в меню' });
      }
      console.warn('create-order: menu price missing for', name, '— fallback', fallback);
      listedPrice = fallback;
    }

    if (bonusAmount > 0 && bonusPair) {
      const [bonusDoc, settingsDoc] = bonusPair;
      const balance = bonusDoc.exists ? Number(bonusDoc.data().balance) || 0 : 0;
      const maxUsage = settingsDoc.exists ? (Number(settingsDoc.data().maxUsage) || 50) : 50;
      const maxByPrice = Math.floor(listedPrice * (maxUsage / 100));
      const maxBonus = Math.min(balance, maxByPrice);
      if (bonusAmount > maxBonus) {
        const error = bonusAmount > balance
          ? `Недостаточно бонусов. У вас ${balance}`
          : `Можно списать не больше ${maxBonus} бонусов`;
        return res.status(400).json({ success: false, error, maxBonus, balance });
      }
    }
    const finalPrice = Math.max(0, listedPrice - bonusAmount);
    const now = new Date();
    const displayName = user || session.displayName || 'Гость Telegram';

    const orderData = {
      name,
      user: displayName,
      userId,
      displayTime: now.toLocaleString('ru-RU'),
      image: image || '',
      status: 'pending',
      price: finalPrice,
      originalPrice: listedPrice,
      discount: bonusAmount,
      bonusUsed: bonusAmount,
      promoCode: null,
      queuePosition: nextQueue,
      cocktailId: cocktailId || '',
      source,
      telegramId: session.telegramId || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const orderRef = await db.collection('orders').add(orderData);

    if (bonusAmount > 0) {
      try {
        await spendBonusPointsAdmin(userId, bonusAmount, orderRef.id);
      } catch (bonusError) {
        await orderRef.delete();
        throw bonusError;
      }
    }

    // Bill must be ready before response — profile reads it immediately
    let billSnapshot = { totalAmount: finalPrice, items: [] };
    try {
      billSnapshot = await createOrUpdateBillAdmin(userId, displayName, orderData, orderRef.id);
    } catch (billErr) {
      console.warn('bill update failed:', billErr.message);
    }

    res.json({
      success: true,
      orderId: orderRef.id,
      queuePosition: orderData.queuePosition,
      openBillTotal: Number(billSnapshot.totalAmount) || finalPrice,
      openBillItems: (billSnapshot.items || []).map((item) => ({
        orderId: item.orderId || orderRef.id,
        cocktailName: item.cocktailName || item.name || name,
        price: Number(item.price) || 0,
        status: item.status || 'pending',
        cocktailImage: item.cocktailImage || ''
      }))
    });

    deductIngredientsAdmin(name, orderRef.id).catch((e) => console.warn('deduct ingredients:', e.message));

    const message = formatOrderAlertHtml({
      mode: 'new',
      status: 'pending',
      cocktailName: orderData.name,
      customerName: orderData.user,
      price: orderData.price,
      bonusUsed: bonusAmount,
      queuePosition: orderData.queuePosition,
      displayTime: orderData.displayTime,
      orderId: orderRef.id
    });
    const inlineKeyboard = buildOrderActionKeyboard(orderRef.id, 'pending');

    sendTelegramAlert(message, {
      parse_mode: 'HTML',
      reply_markup: inlineKeyboard
    }).catch((notifyError) => {
      console.error('⚠️ Mini App: заказ создан, но Telegram notify failed:', notifyError.message);
    });
  } catch (error) {
    console.error('❌ Mini App create-order error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message || 'Ошибка создания заказа'
      });
    }
  }
});

// Helper: configure Telegram Menu Button to open Mini App
app.post('/api/mini-app/setup-menu-button', async (req, res) => {
  try {
    const miniAppUrl = (req.body?.url || '').trim() || getMiniAppPublicUrl();

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_MINIAPP_BOT_TOKEN}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: {
          type: 'web_app',
          text: 'Открыть',
          web_app: { url: miniAppUrl }
        }
      })
    });

    const result = await response.json();
    if (!result.ok) {
      return res.status(500).json({
        success: false,
        error: result.description || 'Не удалось настроить Menu Button'
      });
    }

    res.json({
      success: true,
      url: miniAppUrl,
      message: 'Menu Button настроен',
      mainMiniAppHint: 'Для кнопки ОТКРЫТЬ в списке чатов: @BotFather → Configure Mini App → Enable Mini App'
    });
  } catch (error) {
    console.error('❌ Mini App setup-menu-button error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Configure Mini App bot profile (name/description/menu)
app.post('/api/mini-app/setup-bot-profile', async (req, res) => {
  try {
    const token = TELEGRAM_MINIAPP_BOT_TOKEN;
    const miniAppUrl = (req.body?.url || '').trim() || getMiniAppPublicUrl();
    const name = req.body?.name || 'AsafievBar';
    const shortDescription = req.body?.shortDescription ||
      'Коктейли AsafievBar — нажмите «Открыть»';
    const description = req.body?.description || MINIAPP_BOT_DESCRIPTION;

    const calls = [];

    const setName = await fetch(`https://api.telegram.org/bot${token}/setMyName`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    }).then((r) => r.json());
    calls.push({ method: 'setMyName', ok: setName.ok, description: setName.description });

    const setShort = await fetch(`https://api.telegram.org/bot${token}/setMyShortDescription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ short_description: shortDescription })
    }).then((r) => r.json());
    calls.push({ method: 'setMyShortDescription', ok: setShort.ok, description: setShort.description });

    const setDesc = await fetch(`https://api.telegram.org/bot${token}/setMyDescription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description })
    }).then((r) => r.json());
    calls.push({ method: 'setMyDescription', ok: setDesc.ok, description: setDesc.description });

    const setMenu = await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: {
          type: 'web_app',
          text: 'Открыть',
          web_app: { url: miniAppUrl }
        }
      })
    }).then((r) => r.json());
    calls.push({ method: 'setChatMenuButton', ok: setMenu.ok, description: setMenu.description });

    // Profile photo from local logo.png if present
    let photoResult = { ok: false, description: 'logo.png not found' };
    const logoPath = path.join(__dirname, 'mini-app', 'logo.png');
    if (fs.existsSync(logoPath)) {
      const logoBuf = fs.readFileSync(logoPath);
      const form = new FormData();
      form.append('photo', new Blob([logoBuf], { type: 'image/png' }), 'logo.png');
      const photoRes = await fetch(`https://api.telegram.org/bot${token}/setMyProfilePhoto`, {
        method: 'POST',
        body: form
      });
      photoResult = await photoRes.json();
    }
    calls.push({ method: 'setMyProfilePhoto', ok: photoResult.ok, description: photoResult.description });

    const me = await fetch(`https://api.telegram.org/bot${token}/getMe`).then((r) => r.json());

    res.json({
      success: calls.every((c) => c.ok || c.method === 'setMyProfilePhoto'),
      bot: me.result || null,
      miniAppUrl,
      calls,
      mainMiniApp: {
        hasMainWebApp: Boolean(me.result?.has_main_web_app),
        note: 'Кнопка ОТКРЫТЬ в списке чатов включается только вручную в @BotFather',
        steps: [
          'Откройте @BotFather',
          '/mybots → @asafievbar_bot',
          'Bot Settings → Configure Mini App → Enable Mini App',
          `URL: ${String(miniAppUrl).split('?')[0]}`
        ]
      }
    });
  } catch (error) {
    console.error('❌ setup-bot-profile error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

async function ensureTelegramAdmin(telegramId) {
  const id = String(telegramId || '').trim();
  if (!id) throw new Error('telegramId required');

  const uid = `tg_${id}`;
  const payload = {
    telegramId: Number(id) || id,
    role: 'admin',
    source: 'telegram-mini-app',
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await db.collection('users').doc(uid).set(payload, { merge: true });

  // Also upgrade any linked docs with the same telegramId
  try {
    const snap = await db.collection('users').where('telegramId', '==', Number(id)).get();
    const batch = db.batch();
    snap.forEach((doc) => {
      batch.set(doc.ref, { role: 'admin', updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    });
    // string form too
    const snap2 = await db.collection('users').where('telegramId', '==', id).get();
    snap2.forEach((doc) => {
      batch.set(doc.ref, { role: 'admin', updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.warn('ensureTelegramAdmin linked users:', err.message);
  }

  return { uid, telegramId: id, role: 'admin' };
}

async function resolveMiniAppAdmin(req) {
  const session = await resolveMiniAppUser(req);
  if (!session.ok) return session;

  const allowed = new Set(
    String(process.env.TELEGRAM_ADMIN_IDS || TELEGRAM_CHAT_ID || '1743362083')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
  );
  allowed.add('1743362083');

  if (session.telegramId && allowed.has(String(session.telegramId))) {
    return { ...session, isAdmin: true };
  }

  try {
    const userDoc = await db.collection('users').doc(session.userId).get();
    if (userDoc.exists && userDoc.data().role === 'admin') {
      return { ...session, isAdmin: true };
    }
  } catch (_) { /* ignore */ }

  return { ok: false, reason: 'not_admin' };
}

// Admin: list active orders
app.post('/api/mini-app/admin/orders', async (req, res) => {
  try {
    const session = await resolveMiniAppAdmin(req);
    if (!session.ok) {
      return res.status(403).json({ success: false, error: 'Нет прав админа', reason: session.reason });
    }

    const activeStatuses = new Set(['pending', 'confirmed', 'preparing', 'ready', 'accepted']);
    let snap;
    try {
      snap = await db.collection('orders').orderBy('createdAt', 'desc').limit(150).get();
    } catch (_) {
      snap = await db.collection('orders').limit(150).get();
    }

    let orders = snap.docs
      .map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          name: d.name,
          user: d.user,
          status: d.status,
          price: d.price,
          displayTime: d.displayTime,
          queuePosition: d.queuePosition || 0,
          createdAtMs: d.createdAt?.toMillis?.() || 0
        };
      })
      .filter((o) => activeStatuses.has(o.status));
    orders.sort((a, b) => (a.queuePosition || 99) - (b.queuePosition || 99) || b.createdAtMs - a.createdAtMs);

    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: change order status
app.post('/api/mini-app/admin/order-status', async (req, res) => {
  try {
    const session = await resolveMiniAppAdmin(req);
    if (!session.ok) {
      return res.status(403).json({ success: false, error: 'Нет прав админа', reason: session.reason });
    }

    const { orderId, status } = req.body || {};
    const valid = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!orderId || !valid.includes(status)) {
      return res.status(400).json({ success: false, error: 'Некорректные данные' });
    }

    const result = await updateOrderStatus(String(orderId), status);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error || 'Не удалось обновить' });
    }

    // mark updater
    try {
      await db.collection('orders').doc(String(orderId)).set({
        updatedBy: `mini-app-admin:${session.userId}`
      }, { merge: true });
    } catch (_) { /* ignore */ }

    res.json({ success: true, status, orderId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: stoplist ops
app.post('/api/mini-app/admin/stoplist', async (req, res) => {
  try {
    const session = await resolveMiniAppAdmin(req);
    if (!session.ok) {
      return res.status(403).json({ success: false, error: 'Нет прав админа', reason: session.reason });
    }

    const action = req.body?.action || 'list';

    if (action === 'list') {
      const snap = await db.collection('stoplist').get();
      const items = snap.docs.map((doc) => ({
        id: doc.id,
        cocktailName: String(doc.data().cocktailName || '').trim(),
        reason: doc.data().reason || ''
      }));
      return res.json({ success: true, items });
    }

    if (action === 'add') {
      const cocktailName = String(req.body?.cocktailName || '').trim();
      const reason = String(req.body?.reason || 'Добавлено из Mini App').trim();
      if (!cocktailName) {
        return res.status(400).json({ success: false, error: 'Не указан коктейль' });
      }
      const existing = await db.collection('stoplist').where('cocktailName', '==', cocktailName).limit(1).get();
      if (!existing.empty) {
        invalidateStoplistCache();
        return res.json({ success: true, id: existing.docs[0].id, already: true });
      }
      const ref = await db.collection('stoplist').add({
        cocktailName,
        reason,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        source: 'telegram-mini-app',
        addedBy: session.userId
      });
      invalidateStoplistCache();
      await refreshStoplistCache(true);
      return res.json({ success: true, id: ref.id });
    }

    if (action === 'remove') {
      const id = String(req.body?.id || '').trim();
      const cocktailName = String(req.body?.cocktailName || '').trim();
      if (id) {
        await db.collection('stoplist').doc(id).delete();
        invalidateStoplistCache();
        await refreshStoplistCache(true);
        return res.json({ success: true });
      }
      if (cocktailName) {
        const snap = await db.collection('stoplist').where('cocktailName', '==', cocktailName).get();
        const batch = db.batch();
        snap.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        invalidateStoplistCache();
        await refreshStoplistCache(true);
        return res.json({ success: true, removed: snap.size });
      }
      return res.status(400).json({ success: false, error: 'Нужен id или cocktailName' });
    }

    res.status(400).json({ success: false, error: 'Неизвестное действие' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Public stoplist names for Mini App menu (no auth)
app.get('/api/mini-app/stoplist', async (req, res) => {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const names = [...(await refreshStoplistCache(false))];
    res.json({ success: true, names, count: names.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// One-shot menu bootstrap: cocktails + stoplist + ratings (reduces Mini App flicker)
async function warmMenuBootstrapCache() {
  try {
    const now = Date.now();
    if (menuBootstrapCache.payload && now - menuBootstrapCache.at < MENU_BOOTSTRAP_TTL_MS) {
      return menuBootstrapCache.payload;
    }
    const [cocktailsSnap, stopNames, ratingsSnap] = await Promise.all([
      db.collection('cocktails').get(),
      refreshStoplistCache(false),
      db.collection('ratings').limit(500).get().catch(() => null)
    ]);

    const cocktails = cocktailsSnap.docs.map((doc) => {
      const data = doc.data() || {};
      return {
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
      };
    }).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'));

    const averages = {};
    if (ratingsSnap) {
      const acc = new Map();
      ratingsSnap.forEach((doc) => {
        const d = doc.data() || {};
        const cocktailName = String(d.cocktailName || '').trim();
        const rating = Number(d.rating) || 0;
        if (!cocktailName || rating <= 0) return;
        const cur = acc.get(cocktailName) || { sum: 0, count: 0 };
        cur.sum += rating;
        cur.count += 1;
        acc.set(cocktailName, cur);
      });
      acc.forEach((v, cocktailName) => {
        averages[cocktailName] = Number((v.sum / v.count).toFixed(1));
      });
    }

    const payload = {
      success: true,
      cocktails,
      stoplist: [...stopNames],
      ratings: averages,
      ts: now
    };
    menuBootstrapCache.at = now;
    menuBootstrapCache.payload = payload;
    return payload;
  } catch (err) {
    console.warn('warmMenuBootstrapCache:', err.message);
    return null;
  }
}

app.get('/api/mini-app/menu-bootstrap', async (req, res) => {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=60');
    const now = Date.now();
    if (menuBootstrapCache.payload && now - menuBootstrapCache.at < MENU_BOOTSTRAP_TTL_MS) {
      return res.json(menuBootstrapCache.payload);
    }

    const payload = await warmMenuBootstrapCache();
    if (!payload) {
      return res.status(500).json({ success: false, error: 'menu bootstrap failed' });
    }
    res.json(payload);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: bills
app.post('/api/mini-app/admin/bills', async (req, res) => {
  try {
    const session = await resolveMiniAppAdmin(req);
    if (!session.ok) return res.status(403).json({ success: false, error: 'Нет прав админа', reason: session.reason });

    const action = req.body?.action || 'list';
    const filter = req.body?.filter || 'open';

    if (action === 'close') {
      const billId = String(req.body?.billId || '');
      if (!billId) return res.status(400).json({ success: false, error: 'billId required' });
      const paymentMethod = req.body?.paymentMethod || 'cash';
      const billRef = db.collection('bills').doc(billId);
      const billDoc = await billRef.get();
      if (!billDoc.exists) {
        return res.status(404).json({ success: false, error: 'Счёт не найден' });
      }
      const bill = billDoc.data() || {};
      const items = Array.isArray(bill.items) ? bill.items : [];
      const nextItems = items.map((item) => {
        if (item.status === 'cancelled') return item;
        return { ...item, status: 'completed' };
      });
      const totalAmount = billTotalFromItems(nextItems);

      await billRef.set({
        status: 'paid',
        items: nextItems,
        totalAmount,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        paymentMethod,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        closedBy: session.userId
      }, { merge: true });

      // Mark linked active orders as completed (skip already cancelled)
      try {
        let batch = db.batch();
        let ops = 0;
        for (const item of items) {
          const orderId = String(item.orderId || '').trim();
          if (!orderId || item.status === 'cancelled') continue;
          batch.set(db.collection('orders').doc(orderId), {
            status: 'completed',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: `bill-close:${session.userId}`
          }, { merge: true });
          ops += 1;
          if (ops >= 400) {
            await batch.commit();
            batch = db.batch();
            ops = 0;
          }
        }
        if (ops > 0) await batch.commit();
      } catch (orderSyncErr) {
        console.warn('⚠️ close-bill order sync:', orderSyncErr?.message || orderSyncErr);
      }

      let bonus = { awarded: 0 };
      try {
        if (bill.userId && totalAmount > 0) {
          bonus = await awardBonusPointsAdmin(bill.userId, totalAmount, { billId });
        }
      } catch (bonusErr) {
        console.warn('⚠️ close-bill bonus award:', bonusErr?.message || bonusErr);
      }

      return res.json({ success: true, totalAmount, bonusAwarded: bonus.awarded || 0 });
    }

    if (action === 'reopen') {
      const billId = String(req.body?.billId || '');
      if (!billId) return res.status(400).json({ success: false, error: 'billId required' });
      await db.collection('bills').doc(billId).set({
        status: 'open',
        paidAt: null,
        paymentMethod: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        reopenedBy: session.userId
      }, { merge: true });
      return res.json({ success: true });
    }

    if (action === 'delete') {
      const billId = String(req.body?.billId || '');
      if (!billId) return res.status(400).json({ success: false, error: 'billId required' });
      const billRef = db.collection('bills').doc(billId);
      const billDoc = await billRef.get();
      if (!billDoc.exists) {
        return res.status(404).json({ success: false, error: 'Счёт не найден' });
      }
      const bill = billDoc.data() || {};
      const items = Array.isArray(bill.items) ? bill.items : [];

      // Cancel linked kitchen orders — otherwise they resurface as "Без счёта"
      let cancelledOrders = 0;
      try {
        for (const item of items) {
          const orderId = String(item.orderId || '').trim();
          if (!orderId) continue;
          const orderRef = db.collection('orders').doc(orderId);
          const orderDoc = await orderRef.get();
          const prev = orderDoc.exists ? (orderDoc.data() || {}) : {};
          const prevStatus = String(prev.status || item.status || '');

          await orderRef.set({
            status: 'cancelled',
            cancelledReason: 'bill-deleted',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: `bill-delete:${session.userId}`
          }, { merge: true });
          cancelledOrders += 1;

          if (
            prevStatus !== 'cancelled'
            && prevStatus !== 'completed'
            && !prev.ingredientsRestored
          ) {
            const cocktailName = prev.name || prev.cocktailName || item.cocktailName || item.name;
            await restoreIngredientsAdmin(cocktailName, orderId);
          }
        }
      } catch (orderSyncErr) {
        console.warn('⚠️ delete-bill order sync:', orderSyncErr?.message || orderSyncErr);
      }

      await billRef.delete();
      return res.json({ success: true, cancelledOrders });
    }

    let query = db.collection('bills').limit(40);
    if (filter === 'open' || filter === 'paid') {
      query = db.collection('bills').where('status', '==', filter).limit(40);
    }
    const snap = await query.get();
    const bills = snap.docs.map((doc) => {
      const d = doc.data();
      const items = Array.isArray(d.items) ? d.items : [];
      return {
        id: doc.id,
        userName: d.userName || '',
        userId: d.userId || '',
        status: d.status || 'open',
        totalAmount: d.totalAmount || 0,
        itemsCount: items.length,
        paymentMethod: d.paymentMethod || null,
        promoCode: d.promoCode || null,
        discount: d.discount || 0,
        items: items.map((it) => ({
          orderId: it.orderId || '',
          cocktailName: it.cocktailName || it.name || 'Коктейль',
          price: Number(it.price) || 0,
          status: it.status || 'pending'
        }))
      };
    });

    const openCount = bills.filter((b) => b.status === 'open').length;
    const paidSum = bills.filter((b) => b.status === 'paid').reduce((s, b) => s + (Number(b.totalAmount) || 0), 0);

    res.json({ success: true, bills, stats: { openCount, paidSum } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Guest: apply promo to open bill
app.post('/api/mini-app/apply-promo', async (req, res) => {
  try {
    const session = await resolveMiniAppUser(req);
    if (!session.ok) return res.status(401).json({ success: false, error: 'Unauthorized', reason: session.reason });

    const checked = await validatePromoCodeData(req.body?.promoCode);
    if (!checked.ok) return res.status(400).json({ success: false, error: checked.error });

    const billsSnap = await db.collection('bills')
      .where('userId', '==', session.userId)
      .where('status', '==', 'open')
      .limit(1)
      .get();
    if (billsSnap.empty) {
      return res.status(400).json({ success: false, error: 'Нет открытого счёта' });
    }

    const billDoc = billsSnap.docs[0];
    const bill = billDoc.data() || {};
    if (bill.promoCode) {
      return res.status(400).json({ success: false, error: 'Промокод уже применён к этому счёту' });
    }

    const items = await hydrateBillItemsWithOrderStatus(bill.items);
    const originalTotal = billTotalFromItems(items);
    if (originalTotal <= 0) {
      return res.status(400).json({ success: false, error: 'Нечего оплачивать в счёте' });
    }

    const discountPct = Number(checked.promo.discount) || 0;
    const discountAmount = Math.round(originalTotal * discountPct / 100);
    const newTotal = Math.max(0, originalTotal - discountAmount);

    await billDoc.ref.update({
      promoCode: checked.promo.code,
      discount: discountPct,
      originalTotal,
      totalAmount: newTotal,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('promocodes').doc(checked.promo.code).set({
      usedCount: admin.firestore.FieldValue.increment(1),
      lastUsedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    res.json({
      success: true,
      promo: checked.promo,
      originalTotal,
      discountAmount,
      totalAmount: newTotal,
      openBillItems: items,
      openBillTotal: newTotal
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Wheel of fortune ───────────────────────────────────────────────
const DEFAULT_WHEEL_PRIZES = [
  { id: 'bonus_20', name: '20 бонусов', short: '+20', description: 'Небольшое пополнение бонусного счёта', type: 'bonus', value: 20, probability: 18, color: '#2a221c', icon: '20' },
  { id: 'bonus_50', name: '50 бонусов', short: '+50', description: '50 бонусов на счёт', type: 'bonus', value: 50, probability: 16, color: '#352c24', icon: '50' },
  { id: 'discount_10', name: 'Скидка 10%', short: '−10%', description: 'Персональный промокод −10% на 7 дней', type: 'promo', value: 10, probability: 14, color: '#3f342a', icon: '10%' },
  { id: 'bonus_30', name: '30 бонусов', short: '+30', description: '30 бонусов на счёт', type: 'bonus', value: 30, probability: 12, color: '#4a3c30', icon: '30' },
  { id: 'bonus_100', name: '100 бонусов', short: '+100', description: 'Крупное пополнение бонусов', type: 'bonus', value: 100, probability: 10, color: '#5a4a38', icon: '100' },
  { id: 'discount_15', name: 'Скидка 15%', short: '−15%', description: 'Персональный промокод −15% на 7 дней', type: 'promo', value: 15, probability: 8, color: '#6b563f', icon: '15%' },
  { id: 'bonus_10', name: '10 бонусов', short: '+10', description: 'Небольшое утешение', type: 'bonus', value: 10, probability: 8, color: '#2f2822', icon: '10' },
  { id: 'bonus_150', name: '150 бонусов', short: '+150', description: 'Редкий джекпот бонусов', type: 'bonus', value: 150, probability: 6, color: '#7a6048', icon: '150' },
  { id: 'discount_20', name: 'Скидка 20%', short: '−20%', description: 'Редкий промокод −20% на 7 дней', type: 'promo', value: 20, probability: 4, color: '#8a6a45', icon: '20%' },
  { id: 'nothing', name: 'Повезёт завтра', short: '—', description: 'В этот раз без приза — загляните завтра', type: 'nothing', value: 0, probability: 4, color: '#1f1a16', icon: '—' }
];

const wheelRuntimeCache = {
  prizesAt: 0,
  prizes: null,
  configAt: 0,
  config: null,
  seeding: null
};

async function ensureWheelPrizes() {
  const now = Date.now();
  if (wheelRuntimeCache.prizes && now - wheelRuntimeCache.prizesAt < 300000) {
    return wheelRuntimeCache.prizes;
  }
  if (wheelRuntimeCache.seeding) return wheelRuntimeCache.seeding;

  wheelRuntimeCache.seeding = (async () => {
    const all = await db.collection('wheelPrizes').get();
    const existing = new Map(all.docs.map((doc) => [doc.id, { id: doc.id, ...doc.data() }]));
    const defaultIds = new Set(DEFAULT_WHEEL_PRIZES.map((p) => p.id));
    let batch = db.batch();
    let ops = 0;
    let changed = false;

    const commitIfNeeded = async (force = false) => {
      if (ops >= 400 || (force && ops > 0)) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    };

    // Upsert canonical prizes only when missing or outdated labels/colors
    for (const prize of DEFAULT_WHEEL_PRIZES) {
      const prev = existing.get(prize.id);
      const needsWrite = !prev
        || prev.active === false
        || prev.short !== prize.short
        || prev.color !== prize.color
        || Number(prev.probability) !== Number(prize.probability);
      if (needsWrite) {
        batch.set(db.collection('wheelPrizes').doc(prize.id), {
          ...prize,
          active: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          ...(prev ? {} : { createdAt: admin.firestore.FieldValue.serverTimestamp() })
        }, { merge: true });
        ops += 1;
        changed = true;
        await commitIfNeeded();
      }
      existing.set(prize.id, { ...prev, ...prize, active: true });
    }

    // Disable legacy prizes (e.g. free_shot / −100%) that make the wheel look childish
    for (const [id, data] of existing.entries()) {
      if (defaultIds.has(id)) continue;
      if (data.active === false) continue;
      batch.set(db.collection('wheelPrizes').doc(id), {
        active: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      data.active = false;
      ops += 1;
      changed = true;
      await commitIfNeeded();
    }
    if (changed) await commitIfNeeded(true);

    const list = [...existing.values()]
      .filter((p) => p.active !== false)
      .sort((a, b) => (Number(b.probability) || 0) - (Number(a.probability) || 0));
    wheelRuntimeCache.prizes = list;
    wheelRuntimeCache.prizesAt = Date.now();
    return list;
  })();

  try {
    return await wheelRuntimeCache.seeding;
  } finally {
    wheelRuntimeCache.seeding = null;
  }
}

async function getWheelConfig() {
  const now = Date.now();
  if (wheelRuntimeCache.config && now - wheelRuntimeCache.configAt < 120000) {
    return wheelRuntimeCache.config;
  }
  const doc = await db.collection('wheelConfig').doc('settings').get();
  const data = doc.exists ? doc.data() : {};
  const config = {
    active: data.active !== false,
    cooldownHours: Number(data.cooldownHours) || 24
  };
  wheelRuntimeCache.config = config;
  wheelRuntimeCache.configAt = now;
  return config;
}

function pickWheelPrize(prizes) {
  const list = Array.isArray(prizes) ? prizes : [];
  if (!list.length) return null;
  const total = list.reduce((s, p) => s + (Number(p.probability) || 0), 0) || list.length;
  let roll = Math.random() * total;
  for (const prize of list) {
    roll -= Number(prize.probability) || (total / list.length);
    if (roll <= 0) return prize;
  }
  return list[list.length - 1];
}

async function creditBonusPoints(userId, points, meta = {}) {
  const amount = Math.max(0, Math.floor(Number(points) || 0));
  if (!userId || amount <= 0) return { awarded: 0 };
  const bonusRef = db.collection('bonusAccounts').doc(userId);
  let newBalance = amount;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(bonusRef);
    const prev = snap.exists ? snap.data() : {};
    newBalance = (Number(prev.balance) || 0) + amount;
    tx.set(bonusRef, {
      userId,
      balance: newBalance,
      totalEarned: (Number(prev.totalEarned) || 0) + amount,
      lastEarned: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });
  await db.collection('bonusTransactions').add({
    userId,
    type: 'earn',
    amount,
    source: meta.source || 'wheel',
    prizeId: meta.prizeId || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  return { awarded: amount, balance: newBalance };
}

async function createWheelPromoForUser(userId, prize) {
  const code = `WHEEL${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  const discount = Math.max(1, Math.min(100, Number(prize.value) || 10));
  const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.collection('promocodes').doc(code).set({
    code,
    discount,
    description: prize.description || `Приз колеса: −${discount}%`,
    active: true,
    maxUses: 1,
    usedCount: 0,
    expiryDate,
    createdBy: 'wheel',
    ownerUserId: userId,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  return { code, discount, expiryDateMs: expiryDate.getTime() };
}

async function listUserWheelPromos(userId) {
  if (!userId) return [];
  let docs = [];
  try {
    const snap = await db.collection('promocodes')
      .where('ownerUserId', '==', userId)
      .limit(20)
      .get();
    docs = snap.docs;
  } catch (err) {
    console.warn('listUserWheelPromos query:', err?.message || err);
    return [];
  }
  const now = Date.now();
  return docs
    .map((doc) => {
      const d = doc.data() || {};
      const expiry = d.expiryDate?.toMillis?.()
        || (d.expiryDate ? new Date(d.expiryDate).getTime() : 0);
      const maxUses = Number(d.maxUses) || 0;
      const usedCount = Number(d.usedCount) || 0;
      const exhausted = maxUses > 0 && usedCount >= maxUses;
      const expired = expiry > 0 && expiry < now;
      return {
        code: d.code || doc.id,
        discount: Number(d.discount) || 0,
        description: d.description || '',
        expiryDateMs: expiry || null,
        used: exhausted,
        expired,
        active: d.active !== false && !exhausted && !expired
      };
    })
    .filter((p) => p.active)
    .sort((a, b) => (b.expiryDateMs || 0) - (a.expiryDateMs || 0));
}

function publicWheelPrize(prize) {
  return {
    id: prize.id,
    name: prize.name,
    short: prize.short || '',
    description: prize.description || '',
    type: prize.type,
    value: Number(prize.value) || 0,
    color: prize.color || '#d4a35c',
    icon: prize.icon || '★',
    probability: Number(prize.probability) || 0
  };
}

app.post('/api/mini-app/wheel/status', async (req, res) => {
  try {
    const session = await resolveMiniAppUser(req);
    if (!session.ok) return res.status(401).json({ success: false, error: 'Unauthorized', reason: session.reason });

    const [config, prizes, spinDoc, myPromos] = await Promise.all([
      getWheelConfig(),
      ensureWheelPrizes(),
      db.collection('wheelSpins').doc(session.userId).get(),
      listUserWheelPromos(session.userId)
    ]);

    let canSpin = config.active;
    let nextSpinAt = null;
    let lastPrize = null;
    const spin = spinDoc.exists ? spinDoc.data() : {};
    if (spin.lastSpinDate) {
      const lastMs = spin.lastSpinDate.toMillis?.() || Date.parse(spin.lastSpinDate) || 0;
      const cooldownMs = (config.cooldownHours || 24) * 3600 * 1000;
      const unlockAt = lastMs + cooldownMs;
      if (Date.now() < unlockAt) {
        canSpin = false;
        nextSpinAt = unlockAt;
      }
      if (spin.prize) lastPrize = spin.prize;
    }

    // If last prize promo is missing from list but still stored on spin — include it
    if (lastPrize?.promoCode && !myPromos.some((p) => p.code === lastPrize.promoCode)) {
      try {
        const promoDoc = await db.collection('promocodes').doc(String(lastPrize.promoCode)).get();
        if (promoDoc.exists) {
          const d = promoDoc.data() || {};
          const expiry = d.expiryDate?.toMillis?.()
            || (d.expiryDate ? new Date(d.expiryDate).getTime() : 0);
          const maxUses = Number(d.maxUses) || 0;
          const usedCount = Number(d.usedCount) || 0;
          const ok = d.active !== false
            && !(maxUses > 0 && usedCount >= maxUses)
            && !(expiry > 0 && expiry < Date.now());
          if (ok) {
            myPromos.unshift({
              code: d.code || promoDoc.id,
              discount: Number(d.discount) || Number(lastPrize.value) || 0,
              description: d.description || '',
              expiryDateMs: expiry || null,
              used: false,
              expired: false,
              active: true
            });
          }
        }
      } catch (_) { /* ignore */ }
    }

    res.json({
      success: true,
      active: config.active,
      canSpin: Boolean(canSpin && config.active),
      cooldownHours: config.cooldownHours,
      nextSpinAt,
      totalSpins: Number(spin.totalSpins) || 0,
      lastPrize,
      myPromos,
      prizes: prizes.map(publicWheelPrize)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/mini-app/wheel/spin', async (req, res) => {
  try {
    const session = await resolveMiniAppUser(req);
    if (!session.ok) return res.status(401).json({ success: false, error: 'Unauthorized', reason: session.reason });

    const config = await getWheelConfig();
    if (!config.active) {
      return res.status(400).json({ success: false, error: 'Колесо временно выключено' });
    }

    const prizes = await ensureWheelPrizes();
    if (!prizes.length) {
      return res.status(500).json({ success: false, error: 'Призы не настроены' });
    }

    const spinRef = db.collection('wheelSpins').doc(session.userId);
    const cooldownMs = (config.cooldownHours || 24) * 3600 * 1000;

    // Atomic cooldown check + reserve spin slot before awarding
    let reserved = false;
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(spinRef);
      const prev = snap.exists ? snap.data() : {};
      if (prev.lastSpinDate) {
        const lastMs = prev.lastSpinDate.toMillis?.() || 0;
        if (Date.now() < lastMs + cooldownMs) {
          const err = new Error('Колесо ещё недоступно');
          err.code = 'cooldown';
          err.nextSpinAt = lastMs + cooldownMs;
          throw err;
        }
      }
      tx.set(spinRef, {
        userId: session.userId,
        lastSpinDate: admin.firestore.FieldValue.serverTimestamp(),
        totalSpins: (Number(prev.totalSpins) || 0) + 1,
        pending: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      reserved = true;
    });

    const prize = pickWheelPrize(prizes);
    const prizeIndex = Math.max(0, prizes.findIndex((p) => p.id === prize.id));
    let award = { type: prize.type, promoCode: null, bonusAwarded: 0, balance: null };

    try {
      if (prize.type === 'bonus') {
        const credited = await creditBonusPoints(session.userId, prize.value, {
          source: 'wheel',
          prizeId: prize.id
        });
        award.bonusAwarded = credited.awarded;
        award.balance = credited.balance;
      } else if (prize.type === 'promo') {
        const promo = await createWheelPromoForUser(session.userId, prize);
        award.promoCode = promo.code;
        award.discount = promo.discount;
      }

      const publicPrize = {
        ...publicWheelPrize(prize),
        promoCode: award.promoCode || null,
        claimed: true
      };

      await spinRef.set({
        pending: false,
        prize: publicPrize,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      res.json({
        success: true,
        prizeIndex,
        prize: publicPrize,
        award,
        nextSpinAt: Date.now() + cooldownMs,
        canSpin: false
      });
    } catch (awardErr) {
      if (reserved) {
        await spinRef.set({
          pending: false,
          awardError: String(awardErr.message || awardErr),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
      throw awardErr;
    }
  } catch (error) {
    if (error.code === 'cooldown') {
      return res.status(429).json({
        success: false,
        error: error.message,
        nextSpinAt: error.nextSpinAt || null
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// Guest: rate cocktail after ready
app.post('/api/mini-app/rate', async (req, res) => {
  try {
    const session = await resolveMiniAppUser(req);
    if (!session.ok) return res.status(401).json({ success: false, error: 'Unauthorized', reason: session.reason });

    const orderId = String(req.body?.orderId || '').trim();
    const rating = Number(req.body?.rating);
    const skip = Boolean(req.body?.skip);
    if (!orderId) return res.status(400).json({ success: false, error: 'orderId required' });

    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) return res.status(404).json({ success: false, error: 'Заказ не найден' });
    const order = orderDoc.data() || {};
    if (String(order.userId || '') !== String(session.userId)) {
      return res.status(403).json({ success: false, error: 'Чужой заказ' });
    }

    if (skip) {
      await orderRef.set({
        status: order.status === 'ready' ? 'completed' : order.status,
        rated: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      return res.json({ success: true, skipped: true });
    }

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Оценка 1–5' });
    }

    await db.collection('ratings').add({
      cocktailName: order.name || '',
      rating,
      userId: session.userId,
      userName: session.displayName || order.user || '',
      orderId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      source: 'telegram-mini-app'
    });

    await orderRef.set({
      status: 'completed',
      rated: true,
      ratingValue: rating,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    res.json({ success: true, rating });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Public rating averages for menu cards
app.get('/api/mini-app/ratings-summary', async (req, res) => {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const snap = await db.collection('ratings').limit(500).get();
    const acc = new Map();
    snap.forEach((doc) => {
      const d = doc.data() || {};
      const name = String(d.cocktailName || '').trim();
      const rating = Number(d.rating) || 0;
      if (!name || rating <= 0) return;
      const cur = acc.get(name) || { sum: 0, count: 0 };
      cur.sum += rating;
      cur.count += 1;
      acc.set(name, cur);
    });
    const averages = {};
    acc.forEach((v, name) => {
      averages[name] = Number((v.sum / v.count).toFixed(1));
    });
    res.json({ success: true, averages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
app.post('/api/mini-app/admin/cocktails', async (req, res) => {
  try {
    const session = await resolveMiniAppAdmin(req);
    if (!session.ok) return res.status(403).json({ success: false, error: 'Нет прав админа', reason: session.reason });

    const action = req.body?.action || 'list';

    if (action === 'delete') {
      const id = String(req.body?.id || '');
      if (!id) return res.status(400).json({ success: false, error: 'id required' });
      await db.collection('cocktails').doc(id).delete();
      invalidateMenuBootstrapCache();
      return res.json({ success: true });
    }

    if (action === 'upsert') {
      const c = req.body?.cocktail || {};
      const name = String(c.name || '').trim();
      const price = Number(c.price);
      if (!name || !Number.isFinite(price)) {
        return res.status(400).json({ success: false, error: 'Нужны name и price' });
      }
      const category = String(c.category || 'classic');
      const tasteTags = Array.isArray(c.tasteTags)
        ? c.tasteTags.map((t) => String(t)).filter((t) => ['sour', 'sweet', 'bitter'].includes(t))
        : [];
      let stockRecipe = [];
      if (Array.isArray(c.stockRecipe)) {
        stockRecipe = c.stockRecipe
          .map((r) => ({
            ingredientName: String(r.ingredientName || '').trim(),
            amount: Number(r.amount) || 0
          }))
          .filter((r) => r.ingredientName && r.amount > 0);
      }
      const payload = {
        name,
        price,
        ingredients: String(c.ingredients || ''),
        description: String(c.description || ''),
        mood: String(c.mood || ''),
        alcohol: c.alcohol == null || c.alcohol === '' ? null : Number(c.alcohol),
        category,
        image: String(c.image || ''),
        tasteTags,
        isShot: category === 'shots',
        isSignature: category === 'signature',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      if (stockRecipe.length) payload.stockRecipe = stockRecipe;
      else payload.stockRecipe = admin.firestore.FieldValue.delete();

      if (c.id) {
        await db.collection('cocktails').doc(String(c.id)).set(payload, { merge: true });
        invalidateMenuBootstrapCache();
        return res.json({ success: true, id: String(c.id) });
      }
      payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
      const ref = await db.collection('cocktails').add(payload);
      invalidateMenuBootstrapCache();
      return res.json({ success: true, id: ref.id });
    }

    const snap = await db.collection('cocktails').get();
    const cocktails = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    cocktails.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ru'));
    res.json({ success: true, cocktails });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: promocodes
app.post('/api/mini-app/admin/promos', async (req, res) => {
  try {
    const session = await resolveMiniAppAdmin(req);
    if (!session.ok) return res.status(403).json({ success: false, error: 'Нет прав админа', reason: session.reason });

    const action = req.body?.action || 'list';

    if (action === 'upsert') {
      const p = req.body?.promo || {};
      const code = String(p.code || '').trim().toUpperCase();
      if (!code) return res.status(400).json({ success: false, error: 'code required' });
      await db.collection('promocodes').doc(code).set({
        code,
        discount: Number(p.discount) || 0,
        description: String(p.description || ''),
        maxUses: Number(p.maxUses) || 0,
        usedCount: Number(p.usedCount) || 0,
        active: p.active !== false,
        expiryDate: p.expiryDate || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      return res.json({ success: true, code });
    }

    if (action === 'toggle') {
      const code = String(req.body?.code || '').trim().toUpperCase();
      const ref = db.collection('promocodes').doc(code);
      const doc = await ref.get();
      if (!doc.exists) return res.status(404).json({ success: false, error: 'not found' });
      await ref.set({ active: !doc.data().active, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      return res.json({ success: true, active: !doc.data().active });
    }

    if (action === 'delete') {
      const code = String(req.body?.code || '').trim().toUpperCase();
      await db.collection('promocodes').doc(code).delete();
      return res.json({ success: true });
    }

    const snap = await db.collection('promocodes').get();
    const promos = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, promos });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: bonus settings + users
app.post('/api/mini-app/admin/bonuses', async (req, res) => {
  try {
    const session = await resolveMiniAppAdmin(req);
    if (!session.ok) return res.status(403).json({ success: false, error: 'Нет прав админа', reason: session.reason });

    const action = req.body?.action || 'get';
    const ref = db.collection('settings').doc('bonusSystem');

    if (action === 'save') {
      const s = req.body?.settings || {};
      const settings = {
        percentage: Number(s.percentage) || 5,
        minOrder: Number(s.minOrder) || 300,
        maxUsage: Number(s.maxUsage) || 50,
        expireDays: Number(s.expireDays) || 180,
        active: s.active !== false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      await ref.set(settings, { merge: true });
      return res.json({ success: true, settings });
    }

    const doc = await ref.get();
    const settings = doc.exists ? doc.data() : {
      percentage: 5, minOrder: 300, maxUsage: 50, expireDays: 180, active: true
    };

    // Users with bonus balances (same source as website admin)
    let users = [];
    let stats = { usersCount: 0, totalPoints: 0, issuedToday: 0 };
    try {
      const accountsSnap = await db.collection('bonusAccounts').limit(80).get();
      const accountRows = accountsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      accountRows.sort((a, b) => (Number(b.balance) || 0) - (Number(a.balance) || 0));

      const userIds = accountRows.slice(0, 40).map((a) => a.id);
      const userMap = new Map();
      await Promise.all(userIds.map(async (uid) => {
        try {
          const u = await db.collection('users').doc(uid).get();
          if (u.exists) userMap.set(uid, u.data());
        } catch (_) { /* ignore */ }
      }));

      users = accountRows.slice(0, 40).map((a) => {
        const u = userMap.get(a.id) || {};
        return {
          id: a.id,
          name: u.displayName || u.firstName || u.name || a.id,
          phone: u.phoneNumber || u.phone || '',
          balance: Number(a.balance) || 0,
          totalEarned: Number(a.totalEarned) || 0,
          totalSpent: Number(a.totalSpent) || 0
        };
      });

      stats.usersCount = accountRows.filter((a) => (Number(a.balance) || 0) > 0).length;
      stats.totalPoints = accountRows.reduce((s, a) => s + (Number(a.balance) || 0), 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const txSnap = await db.collection('bonusTransactions').limit(200).get();
      txSnap.forEach((doc) => {
        const d = doc.data();
        if (d.type !== 'earn' || !d.createdAt?.toDate) return;
        if (d.createdAt.toDate() >= today) stats.issuedToday += Number(d.amount) || 0;
      });
    } catch (err) {
      console.warn('bonus users load:', err.message);
    }

    res.json({ success: true, settings, users, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: purchases / ingredients
app.post('/api/mini-app/admin/purchases', async (req, res) => {
  try {
    const session = await resolveMiniAppAdmin(req);
    if (!session.ok) return res.status(403).json({ success: false, error: 'Нет прав админа', reason: session.reason });

    const action = req.body?.action || 'list';

    if (action === 'upsert') {
      const ing = req.body?.ingredient || {};
      const name = String(ing.name || '').trim();
      const unit = String(ing.unit || 'шт').trim() || 'шт';
      const stock = Number(ing.stock);
      const minStock = Number(ing.minStock);
      if (!name) return res.status(400).json({ success: false, error: 'Название обязательно' });
      if (!Number.isFinite(stock) || stock < 0 || !Number.isFinite(minStock) || minStock < 0) {
        return res.status(400).json({ success: false, error: 'Остатки некорректны' });
      }
      const payload = {
        name,
        unit,
        stock,
        minStock,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      if (ing.id) {
        await db.collection('ingredients').doc(String(ing.id)).set(payload, { merge: true });
        let stoplist = { added: 0, removed: 0, names: [], restored: [] };
        if (stock <= 0) {
          const stopped = await stoplistCocktailsForIngredient(name);
          stoplist = { ...stoplist, ...stopped, restored: [] };
        } else {
          const restored = await unstoplistCocktailsAfterRestock(name);
          stoplist = {
            added: 0,
            names: [],
            removed: restored.removed,
            restored: restored.names
          };
        }
        return res.json({ success: true, id: String(ing.id), stoplist });
      }
      const existing = await db.collection('ingredients').where('name', '==', name).limit(1).get();
      if (!existing.empty) {
        return res.status(400).json({ success: false, error: 'Ингредиент с таким названием уже есть' });
      }
      payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
      const ref = await db.collection('ingredients').add(payload);
      let stoplist = { added: 0, removed: 0, names: [], restored: [] };
      if (stock <= 0) {
        const stopped = await stoplistCocktailsForIngredient(name);
        stoplist = { ...stoplist, ...stopped, restored: [] };
      } else {
        const restored = await unstoplistCocktailsAfterRestock(name);
        stoplist = {
          added: 0,
          names: [],
          removed: restored.removed,
          restored: restored.names
        };
      }
      return res.json({ success: true, id: ref.id, stoplist });
    }

    if (action === 'delete') {
      const id = String(req.body?.id || '').trim();
      if (!id) return res.status(400).json({ success: false, error: 'id required' });
      await db.collection('ingredients').doc(id).delete();
      return res.json({ success: true });
    }

    const snap = await db.collection('ingredients').get();
    const items = snap.docs.map((doc) => {
      const d = doc.data();
      const stock = Number(d.stock) || 0;
      const minStock = Number(d.minStock) || 0;
      return {
        id: doc.id,
        name: d.name || '',
        unit: d.unit || '',
        stock,
        minStock,
        low: stock <= minStock,
        out: stock <= 0
      };
    }).sort((a, b) => Number(b.low) - Number(a.low) || String(a.name).localeCompare(String(b.name), 'ru'));

    if (action === 'send') {
      const low = items.filter((i) => i.low);
      const text = low.length
        ? `🛒 *Список закупок AsafievBar*\n\n` + low.map((i) => `• ${i.name}: ${i.stock}${i.unit ? ' ' + i.unit : ''} (мин ${i.minStock})`).join('\n')
        : '🛒 Список закупок пуст — всё в норме.';
      await sendTelegramAlert(text, { parse_mode: 'Markdown' });
      return res.json({ success: true, sent: low.length });
    }

    const stats = {
      total: items.length,
      low: items.filter((i) => i.low && !i.out).length,
      out: items.filter((i) => i.out).length
    };
    res.json({ success: true, items, lowCount: items.filter((i) => i.low).length, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: monitoring (detailed)
app.post('/api/mini-app/admin/monitoring', async (req, res) => {
  try {
    const session = await resolveMiniAppAdmin(req);
    if (!session.ok) return res.status(403).json({ success: false, error: 'Нет прав админа', reason: session.reason });

    const started = Date.now();
    let firebaseOk = false;
    let firebaseMs = null;
    let firebaseError = null;
    try {
      const t0 = Date.now();
      await db.collection('test').doc('connection').get();
      firebaseMs = Date.now() - t0;
      firebaseOk = true;
    } catch (err) {
      firebaseOk = false;
      firebaseError = err.message;
    }

    const botCheck = async (token) => {
      if (!token) return { ok: false, status: 'NOT SET' };
      try {
        const t0 = Date.now();
        const r = await fetch(`https://api.telegram.org/bot${token}/getMe`);
        const j = await r.json();
        return {
          ok: Boolean(j.ok),
          status: j.ok ? 'OK' : 'ERROR',
          username: j.result?.username || null,
          name: j.result?.first_name || null,
          hasMainWebApp: Boolean(j.result?.has_main_web_app),
          ms: Date.now() - t0,
          error: j.ok ? null : (j.description || 'getMe failed')
        };
      } catch (err) {
        return { ok: false, status: 'ERROR', error: err.message };
      }
    };

    const webhookCheck = async (token) => {
      if (!token) return { ok: false, status: 'NOT SET' };
      try {
        const r = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
        const j = await r.json();
        if (!j.ok) return { ok: false, status: 'ERROR', error: j.description };
        const info = j.result || {};
        return {
          ok: Boolean(info.url),
          status: info.url ? 'OK' : 'EMPTY',
          url: info.url || null,
          pending: info.pending_update_count || 0,
          lastError: info.last_error_message || null,
          lastErrorDate: info.last_error_date || null
        };
      } catch (err) {
        return { ok: false, status: 'ERROR', error: err.message };
      }
    };

    const [alertsBot, miniAppBot, alertsWebhook] = await Promise.all([
      botCheck(TELEGRAM_ALERTS_BOT_TOKEN || TELEGRAM_BOT_TOKEN),
      botCheck(TELEGRAM_MINIAPP_BOT_TOKEN),
      webhookCheck(TELEGRAM_ALERTS_BOT_TOKEN || TELEGRAM_BOT_TOKEN)
    ]);

    // Business metrics (best-effort, capped reads)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    let ordersToday = 0;
    let revenueToday = 0;
    let activeOrders = 0;
    let openBills = 0;
    let stoplistCount = 0;
    let cocktailsCount = 0;
    let ingredientsLow = 0;
    let ingredientsOut = 0;

    try {
      const [ordersSnap, billsSnap, stopSnap, cocktailsSnap, ingSnap] = await Promise.all([
        db.collection('orders').orderBy('createdAt', 'desc').limit(120).get().catch(() => null),
        db.collection('bills').where('status', '==', 'open').limit(80).get().catch(() => null),
        db.collection('stoplist').select().get().catch(() => null),
        db.collection('cocktails').select().get().catch(() => null),
        db.collection('ingredients').get().catch(() => null)
      ]);

      if (ordersSnap) {
        ordersSnap.docs.forEach((doc) => {
          const d = doc.data() || {};
          const created = d.createdAt?.toDate?.() || null;
          const st = d.status || '';
          if (['pending', 'confirmed', 'preparing', 'ready', 'accepted'].includes(st)) activeOrders += 1;
          if (created && created >= todayStart) {
            ordersToday += 1;
            if (!['cancelled'].includes(st)) revenueToday += Number(d.price) || 0;
          }
        });
      }
      if (billsSnap) openBills = billsSnap.size;
      if (stopSnap) stoplistCount = stopSnap.size;
      if (cocktailsSnap) cocktailsCount = cocktailsSnap.size;
      if (ingSnap) {
        ingSnap.docs.forEach((doc) => {
          const d = doc.data() || {};
          const stock = Number(d.stock) || 0;
          const minStock = Number(d.minStock) || 0;
          if (stock <= 0) ingredientsOut += 1;
          else if (stock <= minStock) ingredientsLow += 1;
        });
      }
    } catch (err) {
      console.warn('monitoring metrics:', err.message);
    }

    const mem = process.memoryUsage();
    let hostMem = null;
    try {
      const os = require('os');
      hostMem = {
        totalMb: Math.round(os.totalmem() / 1024 / 1024),
        freeMb: Math.round(os.freemem() / 1024 / 1024),
        load1: Number(os.loadavg()[0].toFixed(2)),
        cpus: os.cpus()?.length || 1
      };
    } catch (_) { /* ignore */ }

    res.json({
      success: true,
      status: {
        server: 'OK',
        firebase: firebaseOk ? 'OK' : 'ERROR',
        alertsBot: alertsBot.status,
        miniAppBot: miniAppBot.status,
        timestamp: new Date().toISOString()
      },
      services: {
        api: {
          ok: true,
          status: 'OK',
          host: process.env.HOST || '0.0.0.0',
          port: Number(process.env.PORT || PORT),
          uptimeSec: Math.round(process.uptime()),
          node: process.version,
          responseMs: Date.now() - started
        },
        firebase: {
          ok: firebaseOk,
          status: firebaseOk ? 'OK' : 'ERROR',
          projectId: process.env.FIREBASE_PROJECT_ID || null,
          latencyMs: firebaseMs,
          error: firebaseError
        },
        alertsBot,
        miniAppBot,
        webhook: alertsWebhook
      },
      metrics: {
        ordersToday,
        revenueToday,
        activeOrders,
        openBills,
        stoplistCount,
        cocktailsCount,
        ingredientsLow,
        ingredientsOut
      },
      host: {
        memory: {
          rssMb: Math.round(mem.rss / 1024 / 1024),
          heapMb: Math.round(mem.heapUsed / 1024 / 1024)
        },
        system: hostMem
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Grant/ensure admin for owner Telegram id
app.post('/api/mini-app/ensure-admin', async (req, res) => {
  try {
    const requestedId = String(req.body?.telegramId || TELEGRAM_CHAT_ID || '1743362083');
    const allowed = new Set(
      String(process.env.TELEGRAM_ADMIN_IDS || TELEGRAM_CHAT_ID || '1743362083')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
    );
    allowed.add('1743362083');

    if (!allowed.has(requestedId)) {
      return res.status(403).json({ success: false, error: 'Этот Telegram ID не в списке админов' });
    }

    const result = await ensureTelegramAdmin(requestedId);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('❌ ensure-admin error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

async function ensureAlertsBotWebhook() {
  const token = alertsBotToken();
  if (!token) {
    console.warn('⚠️ Alerts bot token missing — skip alerts webhook');
    return;
  }
  const publicBase = (process.env.PUBLIC_BASE_URL || 'https://asafievbar.duckdns.org').replace(/\/$/, '');
  const webhookUrl = `${publicBase}/telegram-webhook`;
  try {
    const setRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: false
      })
    }).then((r) => r.json());
    console.log('📱 Alerts webhook:', setRes.ok ? webhookUrl : setRes);
  } catch (e) {
    console.warn('⚠️ ensureAlertsBotWebhook failed:', e.message);
  }
}

async function ensureMiniAppBotWebhook() {
  if (!TELEGRAM_MINIAPP_BOT_TOKEN) {
    console.warn('⚠️ TELEGRAM_MINIAPP_BOT_TOKEN missing — skip mini app webhook');
    return;
  }
  const publicBase = (process.env.PUBLIC_BASE_URL || 'https://asafievbar.duckdns.org').replace(/\/$/, '');
  const webhookUrl = `${publicBase}/telegram-miniapp-webhook`;
  try {
    const setRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_MINIAPP_BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message'],
        drop_pending_updates: false
      })
    }).then((r) => r.json());
    console.log('📲 Mini App webhook:', setRes.ok ? webhookUrl : setRes);

    const descRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_MINIAPP_BOT_TOKEN}/setMyDescription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: MINIAPP_BOT_DESCRIPTION })
    }).then((r) => r.json());
    if (!descRes.ok) console.warn('⚠️ setMyDescription:', descRes);

    const shortRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_MINIAPP_BOT_TOKEN}/setMyShortDescription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ short_description: 'Коктейли AsafievBar — нажмите «Открыть»' })
    }).then((r) => r.json());
    if (!shortRes.ok) console.warn('⚠️ setMyShortDescription:', shortRes);

    const menuRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_MINIAPP_BOT_TOKEN}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: {
          type: 'web_app',
          text: 'Открыть',
          web_app: { url: getMiniAppPublicUrl() }
        }
      })
    }).then((r) => r.json());
    if (!menuRes.ok) console.warn('⚠️ setChatMenuButton:', menuRes);
  } catch (e) {
    console.warn('⚠️ ensureMiniAppBotWebhook failed:', e.message);
  }
}

// Запуск сервера
app.listen(PORT, process.env.HOST || '0.0.0.0', () => {
  console.log(`🚀 Webhook сервер запущен на порту ${PORT}`);
  const publicBase = process.env.PUBLIC_BASE_URL || process.env.RAILWAY_PUBLIC_DOMAIN || 'https://asafievbar.duckdns.org';
  console.log(`📱 Telegram webhook: ${publicBase}/telegram-webhook`);
  console.log(`📲 Mini App webhook: ${publicBase}/telegram-miniapp-webhook`);
  console.log(`📲 Mini App: ${getMiniAppPublicUrl()}`);
  console.log(`🔍 Health check: ${publicBase}/health`);

  // Ensure owner is admin in Firestore on boot
  ensureTelegramAdmin(process.env.TELEGRAM_CHAT_ID || '1743362083')
    .then((r) => console.log('👑 Owner admin ensured:', r.uid))
    .catch((e) => console.warn('Owner admin ensure failed:', e.message));

  ensureAlertsBotWebhook().catch((e) => console.warn('Alerts webhook ensure failed:', e.message));
  ensureMiniAppBotWebhook().catch((e) => console.warn('Mini App webhook ensure failed:', e.message));
  warmMenuBootstrapCache()
    .then((p) => console.log('🍹 Menu bootstrap cache warm:', p?.cocktails?.length || 0, 'cocktails'))
    .catch((e) => console.warn('Menu bootstrap warm failed:', e.message));
  ensureWheelPrizes()
    .then((p) => console.log('🎡 Wheel prizes cache warm:', p?.length || 0))
    .catch((e) => console.warn('Wheel prizes warm failed:', e.message));
  getWheelConfig().catch(() => {});
});

module.exports = app;
