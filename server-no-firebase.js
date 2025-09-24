const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

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

// Тест Firebase подключения (заглушка)
app.get('/test-firebase', (req, res) => {
  res.status(500).json({ 
    error: 'Firebase не настроен', 
    message: 'Firebase отключен для тестирования',
    details: 'Используйте server.js для полной функциональности'
  });
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

// Основной webhook endpoint
app.post('/telegram-webhook', async (req, res) => {
  let callbackQueryId = null;
  
  try {
    console.log('📨 Получен webhook от Telegram');
    
    const { callback_query } = req.body;
    
    if (callback_query) {
      callbackQueryId = callback_query.id;
      const { data, message, from } = callback_query;
      console.log(`🔘 Обработка callback: ${data} от пользователя ${from.username || from.first_name}`);
      
      // Сначала отвечаем на callback_query (только если есть токен)
      if (process.env.TELEGRAM_BOT_TOKEN) {
        try {
          await answerCallbackQuery(callback_query.id, '⏳ Обрабатываем запрос...', false);
          console.log('✅ Предварительный ответ на callback_query отправлен');
        } catch (error) {
          console.error('❌ Ошибка отправки предварительного ответа:', error);
        }
      } else {
        console.log('⚠️ TELEGRAM_BOT_TOKEN не настроен, пропускаем ответ на callback_query');
      }
      
      // Парсим callback_data
      const parts = data.split('_');
      const action = parts[0];
      const orderId = parts.slice(1).join('_');
      
      console.log(`🔍 Парсинг: action="${action}", orderId="${orderId}"`);
      
      if (!action || !orderId) {
        console.error('❌ Неверный формат callback_data:', data);
        if (process.env.TELEGRAM_BOT_TOKEN) {
          await answerCallbackQuery(callback_query.id, '❌ Ошибка: неверный формат данных', true);
        }
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
        if (process.env.TELEGRAM_BOT_TOKEN) {
          await answerCallbackQuery(callback_query.id, '❌ Ошибка: неизвестное действие', true);
        }
        return res.status(400).json({ error: 'Unknown action' });
      }
      
      // Специальная обработка для тестовых webhook запросов
      if (action === 'test' && orderId.startsWith('webhook_')) {
        console.log('🧪 Тестовый webhook запрос, отправляем подтверждение');
        if (process.env.TELEGRAM_BOT_TOKEN) {
          await answerCallbackQuery(callback_query.id, '✅ Webhook работает корректно!', false);
        }
        return res.status(200).json({ message: 'Test webhook OK' });
      }
      
      // Имитируем обновление статуса (без Firebase)
      console.log(`🔄 Имитация обновления статуса заказа ${orderId} на: ${newStatus}`);
      
      // Отправляем финальное подтверждение в Telegram
      if (process.env.TELEGRAM_BOT_TOKEN) {
        await answerCallbackQuery(callback_query.id, `✅ Статус обновлен: ${getStatusText(newStatus)}`, false);
        console.log(`📤 Финальное подтверждение отправлено в Telegram`);
      } else {
        console.log(`📤 Имитация отправки подтверждения: ${getStatusText(newStatus)}`);
      }
      
    } else {
      console.log('📝 Получено обычное сообщение (не callback)');
      console.log('📋 Полное тело запроса:', JSON.stringify(req.body, null, 2));
    }
    
    res.status(200).json({ message: 'OK' });
    
  } catch (error) {
    console.error('❌ Ошибка обработки webhook:', error);
    
    // Если есть callback_query_id, обязательно отвечаем на него
    if (callbackQueryId && process.env.TELEGRAM_BOT_TOKEN) {
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

// Обработка ошибок
app.use((error, req, res, next) => {
  console.error('💥 Необработанная ошибка:', error);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Запуск сервера
app.listen(port, () => {
  console.log(`🚀 Webhook сервер (без Firebase) запущен на порту ${port}`);
  console.log(`🌐 Health check: http://localhost:${port}/health`);
  console.log(`🧪 Firebase test: http://localhost:${port}/test-firebase`);
  console.log(`📨 Webhook URL: http://localhost:${port}/telegram-webhook`);
  console.log(`🌐 Frontend: http://localhost:${port}`);
  
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
