const fs = require('fs');
const path = require('path');

console.log('🔥 Настройка нового проекта Firebase');
console.log('=====================================');

console.log('\n📋 Инструкции:');
console.log('===============');
console.log('1. Создайте новый проект в Firebase Console');
console.log('2. Настройте Firestore Database в тестовом режиме');
console.log('3. Скачайте новый service account key JSON файл');
console.log('4. Замените файл service-private-key.json новым файлом');
console.log('5. Запустите этот скрипт снова для обновления конфигурации');

console.log('\n🔧 После получения нового JSON файла:');
console.log('====================================');
console.log('1. Замените service-private-key.json новым файлом');
console.log('2. Запустите: node setup-new-firebase.js --update');
console.log('3. Запустите: node update-railway-env.js');
console.log('4. Обновите переменные окружения в Railway');

// Проверяем, есть ли флаг --update
if (process.argv.includes('--update')) {
  console.log('\n🔄 Обновление конфигурации...');
  
  try {
    // Читаем новый service account key
    const serviceAccount = require('./service-private-key.json');
    
    console.log('✅ Новый service account key загружен');
    console.log('📊 Детали проекта:');
    console.log('   Project ID:', serviceAccount.project_id);
    console.log('   Client Email:', serviceAccount.client_email);
    console.log('   Private Key ID:', serviceAccount.private_key_id);
    
    // Создаем обновленный webhook-server.js
    console.log('\n📝 Обновление webhook-server.js...');
    
    // Читаем текущий файл
    let webhookContent = fs.readFileSync('./webhook-server.js', 'utf8');
    
    // Обновляем project_id в коде
    const newProjectId = serviceAccount.project_id;
    webhookContent = webhookContent.replace(
      /projectId: 'bar-menu-6145c'/g,
      `projectId: '${newProjectId}'`
    );
    
    // Записываем обновленный файл
    fs.writeFileSync('./webhook-server.js', webhookContent);
    
    console.log('✅ webhook-server.js обновлен с новым Project ID:', newProjectId);
    
    // Создаем файл с новыми переменными окружения
    const envVars = {
      FIREBASE_PRIVATE_KEY_ID: serviceAccount.private_key_id,
      FIREBASE_PRIVATE_KEY: `"${serviceAccount.private_key}"`,
      FIREBASE_CLIENT_EMAIL: serviceAccount.client_email,
      FIREBASE_CLIENT_ID: serviceAccount.client_id,
      FIREBASE_CLIENT_X509_CERT_URL: serviceAccount.client_x509_cert_url
    };
    
    const envContent = `# Новые переменные окружения для Railway
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
    
    fs.writeFileSync('./NEW_RAILWAY_ENV_VARS.txt', envContent);
    console.log('✅ Создан файл NEW_RAILWAY_ENV_VARS.txt с новыми переменными');
    
    console.log('\n🎉 Конфигурация обновлена!');
    console.log('📋 Следующие шаги:');
    console.log('1. Скопируйте переменные из NEW_RAILWAY_ENV_VARS.txt в Railway');
    console.log('2. Дождитесь перезапуска Railway');
    console.log('3. Протестируйте: https://your-app.railway.app/test-firebase');
    
  } catch (error) {
    console.error('❌ Ошибка обновления:', error.message);
    console.log('💡 Убедитесь, что файл service-private-key.json существует и содержит валидный JSON');
  }
} else {
  console.log('\n💡 Для обновления конфигурации запустите:');
  console.log('   node setup-new-firebase.js --update');
}
