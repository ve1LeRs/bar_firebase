require('dotenv').config();
const admin = require('firebase-admin');

console.log('🔥 Тестирование нового Firebase проекта');
console.log('==========================================');

// Проверяем, есть ли новый service account key
let serviceAccount;
try {
  serviceAccount = require('./service-private-key.json');
  console.log('✅ Service account key загружен');
  console.log('📊 Детали проекта:');
  console.log('   Project ID:', serviceAccount.project_id);
  console.log('   Client Email:', serviceAccount.client_email);
  console.log('   Private Key ID:', serviceAccount.private_key_id);
} catch (error) {
  console.error('❌ Не удалось загрузить service-private-key.json:', error.message);
  console.log('💡 Убедитесь, что файл существует и содержит валидный JSON');
  process.exit(1);
}

// Инициализируем Firebase
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
    console.log('✅ Firebase Admin SDK инициализирован');
    console.log('🔧 Project ID:', serviceAccount.project_id);
  }
} catch (error) {
  console.error('❌ Ошибка инициализации Firebase:', error);
  process.exit(1);
}

const db = admin.firestore();

// Тестируем подключение
async function testNewFirebaseConnection() {
  try {
    console.log('\n🔍 Тестируем подключение к новому Firestore...');
    
    // Создаем тестовую коллекцию
    const testCollection = 'new_project_test';
    const testDoc = await db.collection(testCollection).doc('connection_test').get();
    
    console.log('✅ Подключение к Firestore успешно');
    console.log('📊 Test document exists:', testDoc.exists);
    
    // Тестируем запись
    console.log('✍️ Тестируем запись в новую коллекцию...');
    await db.collection(testCollection).doc('connection_test').set({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      message: 'New Firebase project connection successful',
      projectId: serviceAccount.project_id,
      testId: Date.now()
    });
    
    console.log('✅ Запись в Firestore успешна');
    
    // Тестируем чтение
    console.log('📖 Тестируем чтение из Firestore...');
    const testDoc2 = await db.collection(testCollection).doc('connection_test').get();
    const data = testDoc2.data();
    console.log('📄 Прочитанные данные:', {
      message: data.message,
      projectId: data.projectId,
      testId: data.testId,
      timestamp: data.timestamp
    });
    
    // Тестируем создание коллекции orders (для вашего приложения)
    console.log('🍸 Тестируем создание коллекции orders...');
    await db.collection('orders').doc('test_order').set({
      name: 'Test Cocktail',
      user: 'Test User',
      status: 'pending',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Коллекция orders создана успешно');
    
    console.log('\n🎉 Все тесты нового Firebase проекта прошли успешно!');
    console.log('📋 Готово к использованию:');
    console.log('   - Project ID:', serviceAccount.project_id);
    console.log('   - Firestore Database: активна');
    console.log('   - Collections: orders, new_project_test');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования нового Firebase:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
  }
}

testNewFirebaseConnection().then(() => {
  console.log('\n🏁 Тест нового Firebase проекта завершен');
  console.log('💡 Теперь можно обновить Railway переменные окружения');
  process.exit(0);
}).catch(error => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});
