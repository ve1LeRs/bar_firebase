require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

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
      'null' // For file:// protocol
    ];
    
    const allowedPatterns = [
      /^https:\/\/.*\.railway\.app$/,
      /^https:\/\/.*\.github\.io$/
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

// Telegram Bot Token
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8326139522:AAG2fwHYd1vRPx0cUXt4ATaFYTNxmzInWJo";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "1743362083";

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
      webhook: '/telegram-webhook'
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
    
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
        reply_markup: inlineKeyboard
      })
    });
    
    const telegramResult = await response.json();
    
    if (telegramResult.ok) {
      console.log('✅ Уведомление отправлено в Telegram');
      res.json({
        success: true,
        message: 'Уведомление отправлено'
      });
    } else {
      console.error('❌ Ошибка Telegram API:', telegramResult);
      res.status(500).json({
        success: false,
        error: telegramResult.description || 'Ошибка Telegram API'
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
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    });
    
    const telegramResult = await response.json();
    
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

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Webhook сервер запущен на порту ${PORT}`);
  console.log(`📱 Telegram webhook: ${process.env.RAILWAY_PUBLIC_DOMAIN || 'https://your-railway-app.railway.app'}/telegram-webhook`);
  console.log(`🔍 Health check: ${process.env.RAILWAY_PUBLIC_DOMAIN || 'https://your-railway-app.railway.app'}/health`);
});

module.exports = app;
