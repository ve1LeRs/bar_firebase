#!/usr/bin/env node

/**
 * Скрипт для проверки статуса системы AsafievBar
 */

const https = require('https');

const WEBHOOK_URL = 'https://web-production-72014.up.railway.app';
const TELEGRAM_BOT_TOKEN = '8326139522:AAG2fwHYd1vRPx0cUXt4ATaFYTNxmzInWJo';

console.log('🔍 Проверка статуса системы AsafievBar');
console.log('=' .repeat(50));

// Функция для HTTP запросов
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    }).on('error', reject);
  });
}

async function checkSystem() {
  try {
    // 1. Проверка health endpoint
    console.log('\n1. 🌐 Проверка webhook сервера...');
    const healthResponse = await makeRequest(`${WEBHOOK_URL}/health`);
    
    if (healthResponse.status === 200) {
      console.log('   ✅ Webhook сервер работает');
      console.log(`   📊 Статус: ${healthResponse.data.status}`);
      console.log(`   🕒 Время: ${healthResponse.data.timestamp}`);
    } else {
      console.log('   ❌ Webhook сервер недоступен');
      console.log(`   📊 Статус: ${healthResponse.status}`);
    }

    // 2. Проверка Firebase подключения
    console.log('\n2. 🔥 Проверка Firebase подключения...');
    const firebaseResponse = await makeRequest(`${WEBHOOK_URL}/test-firebase`);
    
    if (firebaseResponse.status === 200 && firebaseResponse.data.success) {
      console.log('   ✅ Firebase подключение работает');
      console.log(`   📊 Статус: ${firebaseResponse.data.message}`);
    } else {
      console.log('   ❌ Firebase подключение не работает');
      console.log(`   📊 Статус: ${firebaseResponse.status}`);
      if (firebaseResponse.data.error) {
        console.log(`   🚨 Ошибка: ${firebaseResponse.data.error}`);
      }
    }

    // 3. Проверка Telegram webhook
    console.log('\n3. 📱 Проверка Telegram webhook...');
    const webhookResponse = await makeRequest(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`);
    
    if (webhookResponse.status === 200 && webhookResponse.data.ok) {
      const webhookInfo = webhookResponse.data.result;
      if (webhookInfo.url && webhookInfo.url.length > 0) {
        console.log('   ✅ Telegram webhook настроен');
        console.log(`   🔗 URL: ${webhookInfo.url}`);
        console.log(`   📊 Ошибок: ${webhookInfo.pending_update_count || 0}`);
        if (webhookInfo.last_error_message) {
          console.log(`   ⚠️  Последняя ошибка: ${webhookInfo.last_error_message}`);
        }
      } else {
        console.log('   ❌ Telegram webhook не настроен');
      }
    } else {
      console.log('   ❌ Не удалось получить информацию о webhook');
    }

    // 4. Общий статус
    console.log('\n📋 Общий статус системы:');
    console.log('=' .repeat(50));
    
    const serverOk = healthResponse.status === 200;
    const firebaseOk = firebaseResponse.status === 200 && firebaseResponse.data.success;
    const webhookOk = webhookResponse.status === 200 && webhookResponse.data.ok && webhookResponse.data.result.url;
    
    if (serverOk && firebaseOk && webhookOk) {
      console.log('🎉 Все системы работают корректно!');
      console.log('✅ Кнопки в Telegram должны работать');
      console.log('✅ Статусы заказов должны обновляться');
    } else {
      console.log('⚠️  Обнаружены проблемы:');
      if (!serverOk) console.log('   ❌ Webhook сервер недоступен');
      if (!firebaseOk) console.log('   ❌ Firebase подключение не работает');
      if (!webhookOk) console.log('   ❌ Telegram webhook не настроен');
      
      console.log('\n🔧 Рекомендации:');
      if (!firebaseOk) {
        console.log('   1. Добавьте переменные окружения Firebase в Railway');
        console.log('   2. Запустите: node fix-railway-env.js');
      }
      if (!webhookOk) {
        console.log('   3. Настройте webhook в Telegram');
        console.log('   4. Используйте кнопку "Настроить Webhook" в админ-панели');
      }
    }

  } catch (error) {
    console.error('❌ Ошибка проверки системы:', error.message);
  }
}

checkSystem();
