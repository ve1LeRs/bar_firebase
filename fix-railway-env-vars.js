const fs = require('fs');

console.log('🔧 Исправление Railway Environment Variables');
console.log('============================================');

// Читаем локальный service account key
let serviceAccount;
try {
  serviceAccount = require('./service-private-key.json');
  console.log('✅ Service account key загружен');
} catch (error) {
  console.error('❌ Не удалось загрузить service-private-key.json:', error.message);
  process.exit(1);
}

// Создаем правильно отформатированные переменные
const envVars = {
  FIREBASE_PRIVATE_KEY_ID: serviceAccount.private_key_id,
  FIREBASE_PRIVATE_KEY: `"${serviceAccount.private_key}"`,
  FIREBASE_CLIENT_EMAIL: serviceAccount.client_email,
  FIREBASE_CLIENT_ID: serviceAccount.client_id,
  FIREBASE_CLIENT_X509_CERT_URL: serviceAccount.client_x509_cert_url
};

// Создаем исправленный файл
const envContent = `# Исправленные переменные окружения для Railway
# Скопируйте эти значения в Railway Variables

${Object.entries(envVars).map(([key, value]) => `${key}=${value}`).join('\n')}

# Инструкции:
# 1. Перейдите в Railway Dashboard
# 2. Выберите ваш сервис
# 3. Перейдите на вкладку Variables
# 4. Удалите старые Firebase переменные
# 5. Добавьте новые переменные выше
# 6. Сохраните и дождитесь перезапуска
`;

fs.writeFileSync('./FIXED_RAILWAY_ENV_VARS.txt', envContent);

console.log('✅ Создан исправленный файл FIXED_RAILWAY_ENV_VARS.txt');
console.log('\n📋 ИСПРАВЛЕННЫЕ ПЕРЕМЕННЫЕ ДЛЯ RAILWAY:');
console.log('=======================================');

Object.entries(envVars).forEach(([key, value]) => {
  const displayValue = key === 'FIREBASE_PRIVATE_KEY' ? 
    `${value.substring(0, 50)}...` : value;
  console.log(`${key}=${displayValue}`);
});

console.log('\n📝 ИНСТРУКЦИИ:');
console.log('==============');
console.log('1. Откройте файл FIXED_RAILWAY_ENV_VARS.txt');
console.log('2. Скопируйте все переменные');
console.log('3. Перейдите в Railway Dashboard');
console.log('4. Удалите старые Firebase переменные');
console.log('5. Добавьте новые переменные');
console.log('6. Сохраните и дождитесь перезапуска');

console.log('\n🔍 ПРОВЕРКА:');
console.log('============');
console.log('Project ID:', serviceAccount.project_id);
console.log('Private Key ID:', serviceAccount.private_key_id);
console.log('Client Email:', serviceAccount.client_email);
console.log('Private Key Length:', serviceAccount.private_key.length);

console.log('\n✅ Исправленные переменные готовы для Railway!');
