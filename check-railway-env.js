const fs = require('fs');

console.log('🔍 Проверка Railway Environment Variables');
console.log('==========================================');

// Читаем локальный service account key
let localServiceAccount;
try {
  localServiceAccount = require('./service-private-key.json');
  console.log('✅ Локальный service account key загружен');
  console.log('📊 Локальные данные:');
  console.log('   Project ID:', localServiceAccount.project_id);
  console.log('   Private Key ID:', localServiceAccount.private_key_id);
  console.log('   Client Email:', localServiceAccount.client_email);
} catch (error) {
  console.error('❌ Не удалось загрузить service-private-key.json:', error.message);
  process.exit(1);
}

// Читаем файл с новыми переменными
let newEnvVars;
try {
  const envContent = fs.readFileSync('./NEW_RAILWAY_ENV_VARS.txt', 'utf8');
  console.log('✅ Файл NEW_RAILWAY_ENV_VARS.txt найден');
  
  // Парсим переменные из файла
  const lines = envContent.split('\n');
  newEnvVars = {};
  
  lines.forEach(line => {
    if (line.includes('=') && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=');
      newEnvVars[key.trim()] = value.trim();
    }
  });
  
  console.log('📋 Новые переменные для Railway:');
  Object.entries(newEnvVars).forEach(([key, value]) => {
    const displayValue = key === 'FIREBASE_PRIVATE_KEY' ? 
      `${value.substring(0, 50)}...` : value;
    console.log(`   ${key}: ${displayValue}`);
  });
  
} catch (error) {
  console.error('❌ Не удалось прочитать NEW_RAILWAY_ENV_VARS.txt:', error.message);
  process.exit(1);
}

console.log('\n🚨 ПРОБЛЕМА ОБНАРУЖЕНА!');
console.log('========================');
console.log('Railway все еще использует старые переменные окружения!');
console.log('Нужно обновить переменные в Railway Dashboard.');

console.log('\n📋 ИНСТРУКЦИИ ДЛЯ ОБНОВЛЕНИЯ RAILWAY:');
console.log('=====================================');
console.log('1. Перейдите в Railway Dashboard');
console.log('2. Выберите ваш сервис');
console.log('3. Перейдите на вкладку "Variables"');
console.log('4. УДАЛИТЕ все старые Firebase переменные:');
console.log('   - FIREBASE_PRIVATE_KEY_ID');
console.log('   - FIREBASE_PRIVATE_KEY');
console.log('   - FIREBASE_CLIENT_EMAIL');
console.log('   - FIREBASE_CLIENT_ID');
console.log('   - FIREBASE_CLIENT_X509_CERT_URL');
console.log('5. ДОБАВЬТЕ новые переменные:');

console.log('\n📝 СКОПИРУЙТЕ ЭТИ ПЕРЕМЕННЫЕ В RAILWAY:');
console.log('=======================================');
Object.entries(newEnvVars).forEach(([key, value]) => {
  console.log(`${key}=${value}`);
});

console.log('\n⚠️  ВАЖНО:');
console.log('==========');
console.log('1. Убедитесь, что FIREBASE_PRIVATE_KEY имеет кавычки');
console.log('2. Сохраните все переменные');
console.log('3. Дождитесь перезапуска Railway (1-2 минуты)');
console.log('4. Протестируйте: https://your-app.railway.app/test-firebase');

console.log('\n🔍 ПРОВЕРКА:');
console.log('============');
console.log('После обновления переменных в Railway:');
console.log('- Railway должен использовать Project ID:', localServiceAccount.project_id);
console.log('- Private Key ID должен быть:', localServiceAccount.private_key_id);
console.log('- Client Email должен быть:', localServiceAccount.client_email);

console.log('\n✅ После обновления Railway переменных Firebase должен работать!');
