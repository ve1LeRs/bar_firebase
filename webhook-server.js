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

// Telegram Mini App static files + shared brand assets
app.use('/mini-app', express.static(path.join(__dirname, 'mini-app'), {
  extensions: ['html'],
  etag: false,
  lastModified: false,
  setHeaders: (res, filePath) => {
    if (String(filePath).endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
    } else {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
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

/** Outbound Telegram helper — logs + blocks junk keep-alive dots */
async function sendTelegramAlert(text, options = {}) {
  const token = options.token || TELEGRAM_ALERTS_BOT_TOKEN || TELEGRAM_BOT_TOKEN;
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
    
    const queuePosition = orderData.queuePosition || 0;
    const queueInfoText = queuePosition > 0 ? `🎯 *Позиция в очереди:* #${queuePosition}\n` : '';
    
    const message = `
🍸 *Новый заказ!*

🍸 *Коктейль:* ${orderData.name}
👤 *Клиент:* ${orderData.user}
📊 *Статус:* Подтверждён
${queueInfoText}🕒 *Время:* ${orderData.displayTime || new Date().toLocaleString('ru-RU')}
🆔 *ID заказа:* ${orderId}
    `.trim();
    
    // Отправляем с упрощёнными кнопками
    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: "👨‍🍳 Готовится", callback_data: `preparing_${orderId}` },
          { text: "🍸 Готов", callback_data: `ready_${orderId}` }
        ],
        [
          { text: "❌ Отменить", callback_data: `cancelled_${orderId}` }
        ]
      ]
    };
    
    const telegramResult = await sendTelegramAlert(message, {
      parse_mode: 'Markdown',
      reply_markup: inlineKeyboard,
      token: TELEGRAM_BOT_TOKEN
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
      parse_mode: 'Markdown',
      token: TELEGRAM_BOT_TOKEN
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

// Основной webhook для Telegram
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
  try {
    const activeOrdersSnapshot = await db.collection('orders')
      .where('status', 'in', ['confirmed', 'preparing', 'ready'])
      .orderBy('queuePosition', 'desc')
      .limit(1)
      .get();
    
    if (activeOrdersSnapshot.empty) {
      return 1; // Первый заказ в очереди
    }
    
    const lastOrder = activeOrdersSnapshot.docs[0];
    const lastPosition = lastOrder.data().queuePosition || 0;
    return lastPosition + 1;
    
  } catch (error) {
    console.error('❌ Ошибка получения позиции в очереди:', error);
    // Fallback: используем timestamp как позицию
    return Date.now();
  }
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

// Ответ на callback query (обязательно вызвать, иначе у пользователя крутится загрузка на кнопке)
async function answerCallbackQuery(callbackQueryId, text, showAlert = false) {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      console.error('❌ TELEGRAM_BOT_TOKEN не задан');
      return;
    }
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
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
    const statusEmojis = {
      'confirmed': '✅',
      'preparing': '👨‍🍳',
      'ready': '🍸',
      'completed': '🎉',
      'cancelled': '❌'
    };
    
    const emoji = statusEmojis[newStatus] || '📝';
    const statusText = getStatusText(newStatus);
    const queuePosition = orderData.queuePosition;

    let queueInfoText = '';
    if (queuePosition && ['confirmed', 'preparing', 'ready'].includes(newStatus)) {
      queueInfoText = `🎯 *Позиция в очереди:* #${queuePosition}\n`;
      const estimatedMinutes = queuePosition * 3;
      if (estimatedMinutes > 0) {
        queueInfoText += `⏰ *Примерное время:* ${estimatedMinutes} мин\n`;
      }
    } else if (newStatus === 'completed') {
      queueInfoText = `🎉 *Заказ выполнен!*\n`;
    }
    
    const updatedMessage = `
${emoji} *Заказ обновлен - ${statusText}*

🍸 *Коктейль:* ${orderData.name}
👤 *Клиент:* ${orderData.user}
📊 *Статус:* ${statusText}
${queueInfoText}🕒 *Время:* ${orderData.displayTime || new Date().toLocaleString('ru-RU')}
🆔 *ID заказа:* ${orderId}
    `.trim();
    
    // Создаем inline-кнопки (только актуальные статусы)
    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: "👨‍🍳 Готовится", callback_data: `preparing_${orderId}` },
          { text: "🍸 Готов", callback_data: `ready_${orderId}` }
        ],
        [
          { text: "❌ Отменить", callback_data: `cancelled_${orderId}` }
        ]
      ]
    };
    
    if (!TELEGRAM_BOT_TOKEN || !chatId) {
      console.error('❌ TELEGRAM_BOT_TOKEN или chat_id не заданы');
      return;
    }
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: updatedMessage,
        parse_mode: 'Markdown',
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

// Получение текста статуса
function getStatusText(status) {
  switch(status) {
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
async function refreshStoplistCache(force = false) {
  const fresh = Date.now() - stoplistCache.at < 20000;
  if (!force && fresh) return stoplistCache.names;
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

async function deductIngredientsAdmin(cocktailName) {
  try {
    const cocktailsSnap = await db.collection('cocktails')
      .where('name', '==', cocktailName)
      .limit(1)
      .get();
    if (cocktailsSnap.empty) return;

    const cocktail = cocktailsSnap.docs[0].data();
    if (!Array.isArray(cocktail.stockRecipe) || cocktail.stockRecipe.length === 0) return;

    const ingredientsSnapshot = await db.collection('ingredients').get();
    const byName = new Map();
    ingredientsSnapshot.forEach((doc) => {
      const d = doc.data();
      const name = (d.name || '').trim();
      if (name) byName.set(name, { id: doc.id, stock: Number(d.stock) || 0 });
    });

    const batch = db.batch();
    let needsStoplist = false;

    for (const item of cocktail.stockRecipe) {
      const ingName = (item.ingredientName || '').trim();
      const needed = Number(item.amount) || 0;
      if (!ingName || needed <= 0) continue;
      const entry = byName.get(ingName);
      if (!entry) continue;
      const next = Math.max(0, entry.stock - needed);
      batch.update(db.collection('ingredients').doc(entry.id), {
        stock: next,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      if (next <= 0) needsStoplist = true;
    }

    await batch.commit();

    if (needsStoplist) {
      const existing = await db.collection('stoplist')
        .where('cocktailName', '==', cocktailName)
        .limit(1)
        .get();
      if (existing.empty) {
        await db.collection('stoplist').add({
          cocktailName,
          reason: 'Недостаточно ингредиентов',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          source: 'telegram-mini-app'
        });
      }
    }
  } catch (error) {
    console.error('⚠️ Mini App: не удалось списать ингредиенты:', error.message);
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
    const isAdmin = adminIds.has(String(tgUser.id));

    try {
      const updatePayload = { displayName };
      if (tgUser.photo_url) updatePayload.photoURL = tgUser.photo_url;
      await admin.auth().updateUser(uid, updatePayload);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        const createPayload = { uid, displayName };
        if (tgUser.photo_url) createPayload.photoURL = tgUser.photo_url;
        await admin.auth().createUser(createPayload);
      } else {
        console.warn('Firebase user upsert skipped:', error.message);
      }
    }

    const userRef = db.collection('users').doc(uid);
    const existingUser = await userRef.get();
    const existingRole = existingUser.exists ? (existingUser.data().role || 'user') : 'user';
    await userRef.set({
      displayName,
      telegramId: tgUser.id,
      telegramUsername: tgUser.username || null,
      photoURL: tgUser.photo_url || null,
      role: isAdmin ? 'admin' : existingRole,
      source: 'telegram-mini-app',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(existingUser.exists ? {} : { createdAt: admin.firestore.FieldValue.serverTimestamp() })
    }, { merge: true });

    let customToken = null;
    try {
      customToken = await admin.auth().createCustomToken(uid, {
        telegramId: tgUser.id,
        provider: 'telegram-mini-app'
      });
    } catch (tokenError) {
      console.warn('Custom token unavailable:', tokenError.message);
    }

    const bonusDoc = await db.collection('bonusAccounts').doc(uid).get();
    const bonusBalance = bonusDoc.exists ? Number(bonusDoc.data().balance) || 0 : 0;

    let openBillTotal = 0;
    let openBillItems = [];
    try {
      const billsSnap = await db.collection('bills')
        .where('userId', '==', uid)
        .where('status', '==', 'open')
        .limit(1)
        .get();
      if (!billsSnap.empty) {
        const bill = billsSnap.docs[0].data();
        openBillTotal = Number(bill.totalAmount || bill.total || 0);
        openBillItems = Array.isArray(bill.items) ? bill.items.map((item) => ({
          orderId: item.orderId || '',
          cocktailName: item.cocktailName || item.name || 'Коктейль',
          price: Number(item.price) || 0,
          status: item.status || 'pending',
          cocktailImage: item.cocktailImage || ''
        })) : [];
      }
    } catch (_) { /* index optional */ }

    res.json({
      success: true,
      // Session works even if client cannot use Firebase Auth domains
      session: true,
      customToken,
      bonusBalance,
      openBillTotal,
      openBillItems,
      role: isAdmin ? 'admin' : (existingRole || 'user'),
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

    const [bonusDoc, settingsDoc, billsSnap] = await Promise.all([
      db.collection('bonusAccounts').doc(session.userId).get(),
      db.collection('settings').doc('bonusSystem').get(),
      db.collection('bills').where('userId', '==', session.userId).where('status', '==', 'open').limit(1).get()
    ]);

    let openBillTotal = 0;
    let openBillItems = [];
    if (!billsSnap.empty) {
      const bill = billsSnap.docs[0].data();
      openBillTotal = Number(bill.totalAmount || bill.total || 0);
      openBillItems = Array.isArray(bill.items) ? bill.items.map((item) => ({
        orderId: item.orderId || '',
        cocktailName: item.cocktailName || item.name || 'Коктейль',
        price: Number(item.price) || 0,
        status: item.status || 'pending',
        cocktailImage: item.cocktailImage || ''
      })) : [];
    }

    res.json({
      success: true,
      userId: session.userId,
      bonusBalance: bonusDoc.exists ? Number(bonusDoc.data().balance) || 0 : 0,
      maxBonusUsage: settingsDoc.exists ? Number(settingsDoc.data().maxUsage) || 50 : 50,
      openBillTotal,
      openBillItems
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
        .limit(20)
        .get();
      orders = snap.docs.map((doc) => ({ id: doc.id, ...doc.data(), createdAt: undefined }));
    } catch (_) {
      const snap = await db.collection('orders')
        .where('userId', '==', session.userId)
        .limit(20)
        .get();
      orders = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => String(b.displayTime || '').localeCompare(String(a.displayTime || '')));
    }

    // Strip heavy/unserializable fields
    orders = orders.map((o) => ({
      id: o.id,
      name: o.name,
      status: o.status,
      price: o.price,
      displayTime: o.displayTime,
      queuePosition: o.queuePosition
    }));

    res.json({ success: true, orders });
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

    if (!name || price == null) {
      return res.status(400).json({ success: false, error: 'Не указан коктейль или цена' });
    }

    // Fast stoplist via memory cache (refreshed every ~20s)
    if (await isCocktailStoppedCached(name)) {
      return res.status(409).json({ success: false, error: 'Коктейль в стоп-листе' });
    }

    const bonusAmount = Math.max(0, Number(bonusUsed) || 0);
    const finalPrice = Math.max(0, Number(price) || 0);
    const now = new Date();
    const displayName = user || session.displayName || 'Гость Telegram';
    // Skip Firestore queue scan — position is approximate and non-blocking for UX
    const nextQueue = Math.max(1, Number(queuePosition) || 1);

    const orderData = {
      name,
      user: displayName,
      userId,
      displayTime: now.toLocaleString('ru-RU'),
      image: image || '',
      status: 'pending',
      price: finalPrice,
      originalPrice: Number(originalPrice) != null ? Number(originalPrice) : finalPrice + bonusAmount,
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

    deductIngredientsAdmin(name).catch((e) => console.warn('deduct ingredients:', e.message));

    const queueInfoText = orderData.queuePosition > 0
      ? `🎯 *Позиция в очереди:* #${orderData.queuePosition}\n`
      : '';
    const message = `
🍸 *Новый заказ (Mini App)!*

🍸 *Коктейль:* ${orderData.name}
👤 *Клиент:* ${orderData.user}
💰 *Цена:* ${orderData.price}₽${bonusAmount ? ` (бонусы: −${bonusAmount})` : ''}
📊 *Статус:* Ожидание
${queueInfoText}🕒 *Время:* ${orderData.displayTime}
🆔 *ID заказа:* ${orderRef.id}
    `.trim();

    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: '👨‍🍳 Готовится', callback_data: `preparing_${orderRef.id}` },
          { text: '🍸 Готов', callback_data: `ready_${orderRef.id}` }
        ],
        [
          { text: '❌ Отменить', callback_data: `cancelled_${orderRef.id}` }
        ]
      ]
    };

    sendTelegramAlert(message, {
      parse_mode: 'Markdown',
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
    const miniAppUrl = (req.body?.url || '').trim() ||
      `${req.protocol}://${req.get('host')}/mini-app/`;

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
    const miniAppUrl = (req.body?.url || '').trim() ||
      'https://asafievbar.duckdns.org/mini-app/?v=domain1';
    const name = req.body?.name || 'AsafievBar';
    const shortDescription = req.body?.shortDescription ||
      'Коктейли AsafievBar — заказ из Telegram';
    const description = req.body?.description ||
      'Официальное Mini App бара AsafievBar. Смотрите меню, заказывайте коктейли и следите за статусом заказа в реальном времени.';

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
        cocktailName: doc.data().cocktailName,
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
        return res.json({ success: true, id: existing.docs[0].id, already: true });
      }
      const ref = await db.collection('stoplist').add({
        cocktailName,
        reason,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        source: 'telegram-mini-app',
        addedBy: session.userId
      });
      return res.json({ success: true, id: ref.id });
    }

    if (action === 'remove') {
      const id = String(req.body?.id || '').trim();
      const cocktailName = String(req.body?.cocktailName || '').trim();
      if (id) {
        await db.collection('stoplist').doc(id).delete();
        return res.json({ success: true });
      }
      if (cocktailName) {
        const snap = await db.collection('stoplist').where('cocktailName', '==', cocktailName).get();
        const batch = db.batch();
        snap.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        return res.json({ success: true, removed: snap.size });
      }
      return res.status(400).json({ success: false, error: 'Нужен id или cocktailName' });
    }

    res.status(400).json({ success: false, error: 'Неизвестное действие' });
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
      await db.collection('bills').doc(billId).set({
        status: 'paid',
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        paymentMethod,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        closedBy: session.userId
      }, { merge: true });
      return res.json({ success: true });
    }

    let query = db.collection('bills').limit(40);
    if (filter === 'open' || filter === 'paid') {
      query = db.collection('bills').where('status', '==', filter).limit(40);
    }
    const snap = await query.get();
    const bills = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        userName: d.userName || '',
        userId: d.userId || '',
        status: d.status || 'open',
        totalAmount: d.totalAmount || 0,
        itemsCount: Array.isArray(d.items) ? d.items.length : 0,
        paymentMethod: d.paymentMethod || null
      };
    });

    const openCount = bills.filter((b) => b.status === 'open').length;
    const paidSum = bills.filter((b) => b.status === 'paid').reduce((s, b) => s + (Number(b.totalAmount) || 0), 0);

    res.json({ success: true, bills, stats: { openCount, paidSum } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: cocktails CRUD (lite)
app.post('/api/mini-app/admin/cocktails', async (req, res) => {
  try {
    const session = await resolveMiniAppAdmin(req);
    if (!session.ok) return res.status(403).json({ success: false, error: 'Нет прав админа', reason: session.reason });

    const action = req.body?.action || 'list';

    if (action === 'delete') {
      const id = String(req.body?.id || '');
      if (!id) return res.status(400).json({ success: false, error: 'id required' });
      await db.collection('cocktails').doc(id).delete();
      return res.json({ success: true });
    }

    if (action === 'upsert') {
      const c = req.body?.cocktail || {};
      const name = String(c.name || '').trim();
      const price = Number(c.price);
      if (!name || !Number.isFinite(price)) {
        return res.status(400).json({ success: false, error: 'Нужны name и price' });
      }
      const payload = {
        name,
        price,
        ingredients: String(c.ingredients || ''),
        description: String(c.description || ''),
        mood: String(c.mood || ''),
        alcohol: c.alcohol == null || c.alcohol === '' ? null : Number(c.alcohol),
        category: String(c.category || 'classic'),
        image: String(c.image || ''),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      if (c.id) {
        await db.collection('cocktails').doc(String(c.id)).set(payload, { merge: true });
        return res.json({ success: true, id: String(c.id) });
      }
      payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
      const ref = await db.collection('cocktails').add(payload);
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
        return res.json({ success: true, id: String(ing.id) });
      }
      const existing = await db.collection('ingredients').where('name', '==', name).limit(1).get();
      if (!existing.empty) {
        return res.status(400).json({ success: false, error: 'Ингредиент с таким названием уже есть' });
      }
      payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
      const ref = await db.collection('ingredients').add(payload);
      return res.json({ success: true, id: ref.id });
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

// Запуск сервера
app.listen(PORT, process.env.HOST || '0.0.0.0', () => {
  console.log(`🚀 Webhook сервер запущен на порту ${PORT}`);
  const publicBase = process.env.PUBLIC_BASE_URL || process.env.RAILWAY_PUBLIC_DOMAIN || 'https://asafievbar.duckdns.org';
  console.log(`📱 Telegram webhook: ${publicBase}/telegram-webhook`);
  console.log(`📲 Mini App: ${publicBase}/mini-app/`);
  console.log(`🔍 Health check: ${publicBase}/health`);

  // Ensure owner is admin in Firestore on boot
  ensureTelegramAdmin(process.env.TELEGRAM_CHAT_ID || '1743362083')
    .then((r) => console.log('👑 Owner admin ensured:', r.uid))
    .catch((e) => console.warn('Owner admin ensure failed:', e.message));
});

module.exports = app;
