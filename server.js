const express = require('express');
const admin = require('firebase-admin');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Инициализация Firebase Admin
let db;
try {
  // Проверяем, не инициализирован ли уже Firebase
  if (admin.apps.length === 0) {
    if (process.env.FIREBASE_PRIVATE_KEY) {
      // Для продакшн (Heroku, Vercel и т.д.)
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID || 'bar-menu-6145c',
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
      });
    } else {
      // Для локальной разработки (используйте service account key)
      const serviceAccount = require('./service-account-key.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
    }
  } else {
    // Используем уже инициализированное приложение
    console.log('✅ Firebase уже инициализирован, используем существующее приложение');
  }
  
  db = admin.firestore();
  console.log('✅ Firebase Admin инициализирован');
} catch (error) {
  console.error('❌ Ошибка инициализации Firebase:', error.message);
  console.log('💡 Убедитесь, что у вас есть service-account-key.json или настроены переменные окружения');
  // Не останавливаем сервер, продолжаем работу без Firebase
}

// Middleware
app.use(express.json());

// Статический сервер для frontend
app.use(express.static('frontend'));

// Логирование всех запросов
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Проверка здоровья сервера
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Тест Firebase подключения
app.get('/test-firebase', async (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Firebase не инициализирован' });
  }
  
  try {
    const testDoc = await db.collection('test').add({
      message: 'Webhook сервер работает!',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      server: 'webhook-server'
    });
    
    res.json({ 
      success: true, 
      docId: testDoc.id,
      message: 'Firebase подключение работает'
    });
  } catch (error) {
    console.error('❌ Ошибка тестирования Firebase:', error);
    res.status(500).json({ 
      error: 'Ошибка Firebase', 
      message: error.message,
      details: 'Проверьте настройки Firebase и service account key'
    });
  }
});

// Основной webhook endpoint
app.post('/telegram-webhook', async (req, res) => {
  let callbackQueryId = null;
  
  // Устанавливаем таймаут для обработки
  const timeout = setTimeout(() => {
    if (callbackQueryId) {
      console.warn('⚠️ Таймаут обработки callback_query, отправляем ответ об ошибке');
      answerCallbackQuery(callbackQueryId, '⏰ Превышено время ожидания', true).catch(console.error);
    }
  }, 25000); // 25 секунд
  
  try {
    console.log('📨 Получен webhook от Telegram');
    
    const { callback_query } = req.body;
    
    if (callback_query) {
      callbackQueryId = callback_query.id;
      const { data, message, from } = callback_query;
      console.log(`🔘 Обработка callback: ${data} от пользователя ${from.username || from.first_name}`);
      console.log(`📋 Полный callback_query:`, JSON.stringify(callback_query, null, 2));
      
      // Сначала отвечаем на callback_query, чтобы убрать состояние загрузки
      try {
        await answerCallbackQuery(callback_query.id, '⏳ Обрабатываем запрос...', false);
        console.log('✅ Предварительный ответ на callback_query отправлен');
      } catch (error) {
        console.error('❌ Ошибка отправки предварительного ответа:', error);
      }
      
      // Парсим callback_data: "confirmed_order_123" -> action="confirmed", orderId="order_123"
      const parts = data.split('_');
      const action = parts[0];
      const orderId = parts.slice(1).join('_'); // Объединяем все части после первого подчеркивания
      
      console.log(`🔍 Парсинг: action="${action}", orderId="${orderId}"`);
      
      if (!action || !orderId) {
        console.error('❌ Неверный формат callback_data:', data);
        await answerCallbackQuery(callback_query.id, '❌ Ошибка: неверный формат данных', true);
        return res.status(400).json({ error: 'Invalid callback data' });
      }
      
      // Маппинг действий на статусы
      const statusMap = {
        'confirmed': 'confirmed',
        'preparing': 'preparing',
        'ready': 'ready',
        'completed': 'completed',
        'cancelled': 'cancelled',
        'cancel': 'cancelled', // Добавляем поддержку 'cancel'
        'confirm': 'confirmed', // Добавляем поддержку 'confirm'
        'test': 'test' // Для тестовых заказов
      };
      
      const newStatus = statusMap[action];
      
      if (!newStatus) {
        console.error('❌ Неизвестное действие:', action);
        await answerCallbackQuery(callback_query.id, '❌ Ошибка: неизвестное действие', true);
        return res.status(400).json({ error: 'Unknown action' });
      }
      
      // Специальная обработка для тестовых webhook запросов
      if (action === 'test' && orderId.startsWith('webhook_')) {
        console.log('🧪 Тестовый webhook запрос, отправляем подтверждение');
        await answerCallbackQuery(callback_query.id, '✅ Webhook работает корректно!', false);
        return res.status(200).json({ message: 'Test webhook OK' });
      }
      
      if (!db) {
        console.error('❌ Firebase не инициализирован');
        await answerCallbackQuery(callback_query.id, '❌ Ошибка: база данных недоступна', true);
        return res.status(500).json({ error: 'Database not initialized' });
      }
      
      // Обновляем статус в Firestore
      console.log(`🔄 Обновление статуса заказа ${orderId} на: ${newStatus}`);
      
      try {
        const orderRef = db.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();
        
        if (orderDoc.exists) {
          // Документ существует, обновляем
          await orderRef.update({
            status: newStatus,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: 'telegram',
            updatedByUser: from.username || from.first_name || 'Unknown'
          });
          console.log(`✅ Статус заказа ${orderId} успешно обновлен на: ${newStatus}`);
        } else {
          // Документ не существует, создаем новый
          await orderRef.set({
            id: orderId,
            status: newStatus,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: 'telegram',
            updatedBy: 'telegram',
            updatedByUser: from.username || from.first_name || 'Unknown',
            testOrder: true // Помечаем как тестовый заказ
          });
          console.log(`✅ Тестовый заказ ${orderId} создан со статусом: ${newStatus}`);
        }
        
        // Отправляем финальное подтверждение в Telegram
        await answerCallbackQuery(callback_query.id, `✅ Статус обновлен: ${getStatusText(newStatus)}`, false);
        console.log(`📤 Финальное подтверждение отправлено в Telegram`);
        
      } catch (firebaseError) {
        console.error('❌ Ошибка обновления Firebase:', firebaseError);
        await answerCallbackQuery(callback_query.id, '❌ Ошибка обновления заказа', true);
        return res.status(500).json({ error: 'Firebase error', details: firebaseError.message });
      }
      
    } else {
      console.log('📝 Получено обычное сообщение (не callback)');
      console.log('📋 Полное тело запроса:', JSON.stringify(req.body, null, 2));
    }
    
    clearTimeout(timeout);
    res.status(200).json({ message: 'OK' });
    
  } catch (error) {
    clearTimeout(timeout);
    console.error('❌ Ошибка обработки webhook:', error);
    
    // Если есть callback_query_id, обязательно отвечаем на него
    if (callbackQueryId) {
      try {
        await answerCallbackQuery(callbackQueryId, '❌ Произошла ошибка при обработке запроса', true);
        console.log('📤 Ответ об ошибке отправлен в Telegram');
      } catch (answerError) {
        console.error('❌ Критическая ошибка: не удалось ответить на callback_query:', answerError);
      }
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Функция для отправки ответа на callback_query
async function answerCallbackQuery(callbackQueryId, text, showAlert = false) {
  try {
    const telegramUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text,
        show_alert: showAlert
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    if (!result.ok) {
      throw new Error(`Telegram API error: ${result.description}`);
    }
    
    console.log(`📤 Ответ на callback_query отправлен: ${text}`);
    return result;
  } catch (error) {
    console.error('❌ Ошибка отправки ответа на callback_query:', error);
    throw error;
  }
}

// Функция для получения текста статуса
function getStatusText(status) {
  const statusTexts = {
    'confirmed': '✅ Подтвержден',
    'preparing': '👨‍🍳 Готовится',
    'ready': '🍸 Готов',
    'completed': '✅ Выдан',
    'cancelled': '❌ Отменен'
  };
  return statusTexts[status] || status;
}

// Обработка ошибок
app.use((error, req, res, next) => {
  console.error('💥 Необработанная ошибка:', error);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Запуск сервера
app.listen(port, () => {
  console.log(`🚀 Webhook сервер запущен на порту ${port}`);
  console.log(`🌐 Health check: http://localhost:${port}/health`);
  console.log(`🧪 Firebase test: http://localhost:${port}/test-firebase`);
  console.log(`📨 Webhook URL: http://localhost:${port}/telegram-webhook`);
  
  if (process.env.TELEGRAM_BOT_TOKEN) {
    console.log(`🤖 Telegram Bot Token: ${process.env.TELEGRAM_BOT_TOKEN.substring(0, 10)}...`);
  } else {
    console.log('⚠️  TELEGRAM_BOT_TOKEN не настроен');
  }
  
  if (process.env.TELEGRAM_CHAT_ID) {
    console.log(`💬 Telegram Chat ID: ${process.env.TELEGRAM_CHAT_ID}`);
  } else {
    console.log('⚠️  TELEGRAM_CHAT_ID не настроен');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Получен SIGTERM, завершение работы...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Получен SIGINT, завершение работы...');
  process.exit(0);
});

module.exports = app;
