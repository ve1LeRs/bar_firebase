#!/usr/bin/env node

/**
 * Скрипт для проверки конфигурации Firebase
 * Показывает, какой проект используется локально и что нужно установить на Railway
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Проверка конфигурации Firebase\n');

// Читаем локальный файл
const serviceKeyPath = path.join(__dirname, 'service-private-key.json');

if (!fs.existsSync(serviceKeyPath)) {
  console.error('❌ Файл service-private-key.json не найден');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceKeyPath, 'utf8'));

console.log('📁 Локальная конфигурация (service-private-key.json):');
console.log('   Project ID:', serviceAccount.project_id);
console.log('   Client Email:', serviceAccount.client_email);
console.log('   Private Key ID:', serviceAccount.private_key_id);
console.log('');

console.log('🚀 Переменные для Railway:');
console.log('');
console.log('FIREBASE_PROJECT_ID=');
console.log(serviceAccount.project_id);
console.log('');

console.log('FIREBASE_PRIVATE_KEY_ID=');
console.log(serviceAccount.private_key_id);
console.log('');

console.log('FIREBASE_PRIVATE_KEY=');
console.log(`"${serviceAccount.private_key}"`);
console.log('');

console.log('FIREBASE_CLIENT_EMAIL=');
console.log(serviceAccount.client_email);
console.log('');

console.log('FIREBASE_CLIENT_ID=');
console.log(serviceAccount.client_id);
console.log('');

console.log('FIREBASE_CLIENT_X509_CERT_URL=');
console.log(serviceAccount.client_x509_cert_url);
console.log('');

console.log('✅ Скопируйте эти значения в Railway (Variables tab)');
console.log('⚠️  ВАЖНО: Сохраните кавычки вокруг FIREBASE_PRIVATE_KEY');

