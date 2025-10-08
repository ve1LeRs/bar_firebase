#!/usr/bin/env node

/**
 * Скрипт для исправления проблемы с обновлением статуса заказов в Telegram
 * 
 * Проблема: Railway сервер не может подключиться к Firebase из-за отсутствующих переменных окружения
 * Решение: Добавить все необходимые переменные окружения в Railway
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Исправление проблемы с обновлением статуса заказов в Telegram');
console.log('=' .repeat(70));

// Читаем приватный ключ Firebase
const serviceKeyPath = path.join(__dirname, 'service-private-key.json');
let serviceKey;

try {
  serviceKey = JSON.parse(fs.readFileSync(serviceKeyPath, 'utf8'));
  console.log('✅ Firebase service key загружен');
} catch (error) {
  console.error('❌ Ошибка загрузки Firebase service key:', error.message);
  process.exit(1);
}

// Переменные окружения для Railway
const envVars = {
  'FIREBASE_PRIVATE_KEY_ID': serviceKey.private_key_id,
  'FIREBASE_PRIVATE_KEY': serviceKey.private_key,
  'FIREBASE_CLIENT_EMAIL': serviceKey.client_email,
  'FIREBASE_CLIENT_ID': serviceKey.client_id,
  'FIREBASE_CLIENT_X509_CERT_URL': serviceKey.client_x509_cert_url,
  'TELEGRAM_BOT_TOKEN': '8326139522:AAG2fwHYd1vRPx0cUXt4ATaFYTNxmzInWJo',
  'TELEGRAM_CHAT_ID': '1743362083',
  'PORT': '3000'
};

console.log('\n📋 Переменные окружения для добавления в Railway:');
console.log('=' .repeat(70));

Object.entries(envVars).forEach(([key, value]) => {
  console.log(`\n${key}:`);
  if (key === 'FIREBASE_PRIVATE_KEY') {
    // Для приватного ключа показываем только начало и конец
    const lines = value.split('\n');
    console.log(`  ${lines[0]}`);
    console.log(`  ... (${lines.length - 2} строк) ...`);
    console.log(`  ${lines[lines.length - 1]}`);
  } else {
    console.log(`  ${value}`);
  }
});

console.log('\n🚀 Инструкции по настройке:');
console.log('=' .repeat(70));
console.log('1. Откройте Railway Dashboard: https://railway.app');
console.log('2. Найдите проект "web-production-72014"');
console.log('3. Перейдите в раздел "Variables"');
console.log('4. Добавьте каждую переменную выше по отдельности');
console.log('5. Дождитесь автоматического перезапуска сервера');
console.log('6. Проверьте работу: https://web-production-72014.up.railway.app/test-firebase');

console.log('\n🧪 Команды для проверки:');
console.log('=' .repeat(70));
console.log('Health check:');
console.log('curl https://web-production-72014.up.railway.app/health');
console.log('\nFirebase test:');
console.log('curl https://web-production-72014.up.railway.app/test-firebase');
console.log('\nTelegram webhook info:');
console.log('curl "https://api.telegram.org/bot8326139522:AAG2fwHYd1vRPx0cUXt4ATaFYTNxmzInWJo/getWebhookInfo"');

console.log('\n✅ После настройки переменных:');
console.log('- Кнопки в Telegram будут работать');
console.log('- Статусы заказов будут обновляться');
console.log('- Пользователи будут видеть изменения в реальном времени');

// Создаем файл с переменными для удобства
const envFile = Object.entries(envVars)
  .map(([key, value]) => `${key}=${value}`)
  .join('\n');

fs.writeFileSync('railway-env-vars.txt', envFile);
console.log('\n💾 Переменные сохранены в файл: railway-env-vars.txt');
console.log('   Можете скопировать их оттуда для добавления в Railway');
