// Сервер для обработки webhook'ов от Telegram
// Этот файл нужно запустить на сервере для обработки нажатий кнопок в Telegram

const express = require('express');
const admin = require('firebase-admin');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Инициализация Firebase Admin
let db;
try {
  if (admin.apps.length === 0) {
    if (process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID || 'bar-menu-6145c',
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
      });
    } else {
      const serviceAccount = require('./service-account-key.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
    }
  }
  db = admin.firestore();
  console.log('✅ Firebase Admin инициализирован в telegram-webhook.js');
} catch (error) {
  console.error('❌ Ошибка инициализации Firebase в telegram-webhook.js:', error.message);
}

// Middleware для парсинга JSON
app.use(express.json());

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

// Обработка webhook'ов от Telegram
app.post('/telegram-webhook', async (req, res) => {
  let callbackQueryId = null;
  
  try {
    console.log('📨 Получен webhook от Telegram');
    const { callback_query } = req.body;
    
    if (callback_query) {
      callbackQueryId = callback_query.id;
      const { data, message, from } = callback_query;
      console.log(`🔘 Обработка callback: ${data} от пользователя ${from.username || from.first_name}`);
      
      // Сначала отвечаем на callback_query
      try {
        await answerCallbackQuery(callback_query.id, '⏳ Обрабатываем запрос...', false);
        console.log('✅ Предварительный ответ на callback_query отправлен');
      } catch (error) {
        console.error('❌ Ошибка отправки предварительного ответа:', error);
      }
      
      // Парсим callback_data
      const parts = data.split('_');
      const action = parts[0];
      const orderId = parts.slice(1).join('_');
      
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
        'cancel': 'cancelled',
        'confirm': 'confirmed',
        'test': 'test'
      };
      
      const newStatus = statusMap[action];
      
      if (!newStatus) {
        console.error('❌ Неизвестное действие:', action);
        await answerCallbackQuery(callback_query.id, '❌ Ошибка: неизвестное действие', true);
        return res.status(400).json({ error: 'Unknown action' });
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
          await orderRef.update({
            status: newStatus,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: 'telegram',
            updatedByUser: from.username || from.first_name || 'Unknown'
          });
          console.log(`✅ Статус заказа ${orderId} успешно обновлен на: ${newStatus}`);
        } else {
          await orderRef.set({
            id: orderId,
            status: newStatus,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: 'telegram',
            updatedBy: 'telegram',
            updatedByUser: from.username || from.first_name || 'Unknown',
            testOrder: true
          });
          console.log(`✅ Тестовый заказ ${orderId} создан со статусом: ${newStatus}`);
        }
        
        await answerCallbackQuery(callback_query.id, `✅ Статус обновлен: ${getStatusText(newStatus)}`, false);
        console.log(`📤 Финальное подтверждение отправлено в Telegram`);
        
      } catch (firebaseError) {
        console.error('❌ Ошибка обновления Firebase:', firebaseError);
        await answerCallbackQuery(callback_query.id, '❌ Ошибка обновления заказа', true);
        return res.status(500).json({ error: 'Firebase error', details: firebaseError.message });
      }
      
    } else {
      console.log('📝 Получено обычное сообщение (не callback)');
    }
    
    res.status(200).json({ message: 'OK' });
    
  } catch (error) {
    console.error('❌ Ошибка обработки webhook:', error);
    
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

// Проверка здоровья сервера
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Запуск сервера
app.listen(port, () => {
  console.log(`🚀 Telegram webhook сервер запущен на порту ${port}`);
  console.log(`🌐 Health check: http://localhost:${port}/health`);
  console.log(`📨 Webhook URL: http://localhost:${port}/telegram-webhook`);
});

// Экспорт для использования в других модулях
module.exports = app;
