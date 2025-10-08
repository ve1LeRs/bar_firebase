// Скрипт для настройки webhook в Telegram
// TELEGRAM_BOT_TOKEN будет объявлен в script.js

// Функция для настройки webhook
async function setupWebhook(webhookUrl) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query']
      })
    });
    
    const data = await response.json();
    console.log('Webhook setup result:', data);
    return data;
  } catch (error) {
    console.error('Error setting up webhook:', error);
    return { ok: false, error: error.message };
  }
}

// Функция для получения информации о webhook
async function getWebhookInfo() {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`);
    const data = await response.json();
    console.log('Webhook info:', data);
    return data;
  } catch (error) {
    console.error('Error getting webhook info:', error);
    return { ok: false, error: error.message };
  }
}

// Функция для удаления webhook
async function deleteWebhook() {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        drop_pending_updates: true
      })
    });
    
    const data = await response.json();
    console.log('Webhook deletion result:', data);
    return data;
  } catch (error) {
    console.error('Error deleting webhook:', error);
    return { ok: false, error: error.message };
  }
}

// Экспортируем функции для использования в браузере
if (typeof window !== 'undefined') {
  window.setupWebhook = setupWebhook;
  window.getWebhookInfo = getWebhookInfo;
  window.deleteWebhook = deleteWebhook;
}

// Если запускается в Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { setupWebhook, getWebhookInfo, deleteWebhook };
}
