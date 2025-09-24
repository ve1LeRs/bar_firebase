require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Firebase Admin SDK инициализация
const serviceAccount = {
  "type": "service_account",
  "project_id": "bar-menu-6145c",
  "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
  "private_key": process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  "client_email": process.env.FIREBASE_CLIENT_EMAIL,
  "client_id": process.env.FIREBASE_CLIENT_ID,
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": process.env.FIREBASE_CLIENT_X509_CERT_URL
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'bar-menu-6145c'
  });
}

const db = admin.firestore();

// Telegram Bot Token
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8326139522:AAG2fwHYd1vRPx0cUXt4ATaFYTNxmzInWJo";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "1743362083";

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Asafiev Bar Webhook Server'
  });
});

// Test Firebase connection
app.get('/test-firebase', async (req, res) => {
  try {
    const testDoc = await db.collection('test').doc('connection').get();
    res.json({ 
      success: true, 
      message: 'Firebase connection successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Firebase test error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Основной webhook для Telegram
app.post('/telegram-webhook', async (req, res) => {
  try {
    console.log('📨 Получен webhook от Telegram:', JSON.stringify(req.body, null, 2));
    
    const { callback_query } = req.body;
    
    if (callback_query) {
      await handleCallbackQuery(callback_query);
    }
    
    res.status(200).json({ status: 'OK' });
  } catch (error) {
    console.error('❌ Ошибка обработки webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

// Обработка callback query от inline кнопок
async function handleCallbackQuery(callbackQuery) {
  const { id, data, message, from } = callbackQuery;
  
  console.log('🔘 Обработка callback query:', { id, data, from: from.username });
  
  try {
    // Парсим данные кнопки (формат: "status_orderId")
    const [status, orderId] = data.split('_');
    
    if (!status || !orderId) {
      console.error('❌ Неверный формат callback data:', data);
      await answerCallbackQuery(id, '❌ Ошибка: неверный формат данных');
      return;
    }
    
    // Обновляем статус заказа в Firebase
    const updateResult = await updateOrderStatus(orderId, status);
    
    if (updateResult.success) {
      // Отвечаем на callback query
      await answerCallbackQuery(id, `✅ Статус изменен на: ${getStatusText(status)}`);
      
      // Обновляем сообщение с новыми кнопками
      await updateTelegramMessage(message.message_id, orderId, status, updateResult.orderData);
      
      console.log('✅ Статус заказа успешно обновлен:', { orderId, status });
    } else {
      await answerCallbackQuery(id, '❌ Ошибка обновления статуса');
      console.error('❌ Ошибка обновления статуса:', updateResult.error);
    }
    
  } catch (error) {
    console.error('❌ Ошибка обработки callback query:', error);
    await answerCallbackQuery(id, '❌ Произошла ошибка');
  }
}

// Обновление статуса заказа в Firebase
async function updateOrderStatus(orderId, newStatus) {
  try {
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      return { success: false, error: 'Заказ не найден' };
    }
    
    const orderData = orderDoc.data();
    
    // Обновляем статус и время обновления
    await orderRef.update({
      status: newStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: 'telegram_admin'
    });
    
    return { 
      success: true, 
      orderData: { ...orderData, status: newStatus }
    };
    
  } catch (error) {
    console.error('❌ Ошибка обновления заказа в Firebase:', error);
    return { success: false, error: error.message };
  }
}

// Ответ на callback query
async function answerCallbackQuery(callbackQueryId, text) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text,
        show_alert: false
      })
    });
    
    if (!response.ok) {
      console.error('❌ Ошибка ответа на callback query:', response.status);
    }
  } catch (error) {
    console.error('❌ Ошибка отправки ответа на callback query:', error);
  }
}

// Обновление сообщения в Telegram с новыми кнопками
async function updateTelegramMessage(messageId, orderId, newStatus, orderData) {
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
    
    const updatedMessage = `
${emoji} *Заказ обновлен - ${statusText}*

🍸 *Коктейль:* ${orderData.name}
👤 *Клиент:* ${orderData.user}
📊 *Статус:* ${statusText}
🕒 *Время:* ${orderData.displayTime || new Date().toLocaleString('ru-RU')}
🆔 *ID заказа:* ${orderId}
    `.trim();
    
    // Создаем обновленные inline-кнопки
    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: "✅ Подтвердить", callback_data: `confirmed_${orderId}` },
          { text: "❌ Отменить", callback_data: `cancelled_${orderId}` }
        ],
        [
          { text: "👨‍🍳 Готовится", callback_data: `preparing_${orderId}` },
          { text: "🍸 Готов", callback_data: `ready_${orderId}` }
        ],
        [
          { text: "✅ Выполнен", callback_data: `completed_${orderId}` }
        ]
      ]
    };
    
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        message_id: messageId,
        text: updatedMessage,
        parse_mode: 'Markdown',
        reply_markup: inlineKeyboard
      })
    });
    
    if (!response.ok) {
      console.error('❌ Ошибка обновления сообщения в Telegram:', response.status);
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
app.listen(PORT, () => {
  console.log(`🚀 Webhook сервер запущен на порту ${PORT}`);
  console.log(`📱 Telegram webhook: http://localhost:${PORT}/telegram-webhook`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
