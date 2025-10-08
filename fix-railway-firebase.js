#!/usr/bin/env node

/**
 * Скрипт для проверки и исправления Firebase конфигурации в Railway
 */

const https = require('https');

const RAILWAY_URL = 'https://web-production-72014.up.railway.app';

console.log('🔧 Проверка Firebase конфигурации в Railway...\n');

// Тестируем различные эндпоинты
async function testEndpoint(path) {
  return new Promise((resolve) => {
    const url = `${RAILWAY_URL}${path}`;
    console.log(`📡 Тестируем: ${url}`);
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    }).on('error', (error) => {
      resolve({ status: 'ERROR', error: error.message });
    });
  });
}

async function main() {
  console.log('1️⃣ Тестируем health endpoint...');
  const health = await testEndpoint('/health');
  console.log(`   Статус: ${health.status}`);
  if (health.status === 200) {
    console.log('   ✅ Health endpoint работает');
  } else {
    console.log('   ❌ Health endpoint не работает');
    return;
  }

  console.log('\n2️⃣ Тестируем Firebase endpoint...');
  const firebase = await testEndpoint('/test-firebase');
  console.log(`   Статус: ${firebase.status}`);
  
  if (firebase.status === 200 && firebase.data.success) {
    console.log('   ✅ Firebase работает корректно');
    console.log('   📊 Переменные окружения:', firebase.data.environment);
  } else if (firebase.status === 500 && firebase.data.error) {
    console.log('   ❌ Firebase ошибка:', firebase.data.error);
    
    if (firebase.data.error.includes('UNAUTHENTICATED')) {
      console.log('\n🔧 РЕШЕНИЕ: Проблема с аутентификацией Firebase');
      console.log('   Нужно добавить переменные окружения в Railway:');
      console.log('\n   📋 Скопируйте эти переменные в Railway:');
      console.log('   ──────────────────────────────────────────────');
      console.log('   FIREBASE_PRIVATE_KEY_ID=3c4560703da3667b9a61117c3e37b0327052b24e');
      console.log('   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@bar-menu-6145c.iam.gserviceaccount.com');
      console.log('   FIREBASE_CLIENT_ID=109441409973504780055');
      console.log('   FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40bar-menu-6145c.iam.gserviceaccount.com');
      console.log('\n   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCrPnvmRAG2iUkj\\nojQgCi21lj8UDZRjW7ivzVWHC0Qm4/dOzJr5bhGjAT+E3iS2XqHI65/ElOaVVL/Y\\n8XpSu2/kes0fRdW6Z6XhiqdcwpKNzvesgjGh6PAKOWwkUmq72WHQJShEiAYGP1bN\\n4vhmcplJgltppPAs9XWRaEii4DJoM6xgXuGbQz+W/3mBwDvRL5aeIIUuHUeDtxUM\\nr42O8WsC9hGGz8vh/IdzB3lOrsE1HWIBe9fipmxoT7gZNQOMbiyoseqiPuefXkP7\\nTmsDYs61M6pBADED7q0vUR09B20l6Du9e7hWOosm50zTRgsddab85yEPIzNanOJe\\nuRkyE71vAgMBAAECggEAP0SzNzS6I0xeuu0jcBECqVwNCyYnRHxvZHirWF0nvWyt\\ngy4iNfTeTEjaRIdkrgKRqK+xlEplVRf+V7OEO8vnv9VFMwA0wo2n4og9ZI644e7t\\nYA2sM8Nh6I0lsNfIeoYK1wHbelJ9U1KUijYJC6TckKW6i3I2kI3R9bq/V3oY9ZlB\\nlpRHY42+3WAuboDtPxk6Ue6xDcsEhrejuxnsNC+HjaNRxnutCUrD3lhzdRqh0Kbr\\n5zw93eUoaAubunidOAwGzqJye4XxNgA5s6QZtyNuQKJ6H6BifRmkF90KaHKFFpjW\\numaLPdE23m4zvBPBaiBkzUTWGQpszKPSYBQI/deeFQKBgQDxYfjhkXfPhOp0MBIB\\nBzltiazKi/6TsOyZMVWhbhiG5N6aDmYGIWZRcJuYVrJu57cZjOEize4TYzVtP8R2\\neABhpEgvKyiobVzf6k+uyLhLttHTGzq1IEgj591w1mYsFsBNfRIMDnM0xBbneHVB\\nqRst7pRz1PxFS/y5PDOJPOk5TQKBgQC1nTCf6JWtSOfqLV16iUX2ouGD5MudOixr\\nIjp7QlwlxulGncxneKnSTEc/K4wdfTeL0+uSJyHObpSKZohpVl4gPyWALJ08SzNd\\nkM3gHYl2fanZB0OZIMOf76klmEunEANcoekaarH33YOGpnZ1uzEj1sXh8C+Rxfw2\\nA2sE4FDTqwKBgDJ7NNun2pCx0X6fFwTUB/SamGJ7yLAGjlSzdp8eMU70yoEZhci+\\nb3GUxVWkvAhpuWdEiUkIHEQ9uUyxy1qjWiERhG8o7YXb6VKC5Es/exuKjnNB/JMo\\nvy2TLkKM9C1ATNNn1sBivUFJySh7jro+rYp7nNxkrKWpcJ8ksfp/nJ75AoGABYAy\\nVdWUmwAHTjd7ileYD+VVEUqfxC5b5A7QWKVk5xwEOshSxZuJAT6gNdCa2NXPFeQg\\nUXfv9TGyPBLo9M/R4AYpm50+UfIxJxdYtP4QCM+7kkA/EudEJZb7t5DKUdARWf/p\\ncIxkwY4rCqwGEIDP9zbtHW/J8Q9fGT+3QRmOOSsCgYEAgIY53cdLYwpHmrSurrsV\\n06lPEBKs+teOWUIuxVCcCU6spl4/DP3hQQGU+oO8aRWxmM6s60mjPLVWC38DnLg2\\nR9BM9CuSGtKoXvGB9VbaAwyuDKMGdzoRSY5ElQ9iC0xoULysbLg3Vhe/HSO3FcrC\\nlZHT6lIRfcYHUSLeEX3ZqWQ=\\n-----END PRIVATE KEY-----\\n"');
      console.log('   ──────────────────────────────────────────────');
      console.log('\n   📝 Инструкции:');
      console.log('   1. Откройте Railway Dashboard');
      console.log('   2. Выберите ваш проект');
      console.log('   3. Перейдите в Variables');
      console.log('   4. Добавьте каждую переменную выше');
      console.log('   5. Сохраните и дождитесь перезапуска');
      console.log('   6. Запустите этот скрипт снова для проверки');
    }
  } else {
    console.log('   ❌ Неожиданная ошибка:', firebase);
  }

  console.log('\n3️⃣ Тестируем webhook endpoint...');
  const webhook = await testEndpoint('/telegram-webhook');
  console.log(`   Статус: ${webhook.status}`);
  if (webhook.status === 405) {
    console.log('   ✅ Webhook endpoint настроен (ожидает POST запросы)');
  } else {
    console.log('   ⚠️ Webhook endpoint: неожиданный статус');
  }

  console.log('\n📊 Сводка:');
  console.log(`   Health: ${health.status === 200 ? '✅' : '❌'}`);
  console.log(`   Firebase: ${firebase.status === 200 && firebase.data?.success ? '✅' : '❌'}`);
  console.log(`   Webhook: ${webhook.status === 405 ? '✅' : '❌'}`);
}

main().catch(console.error);
