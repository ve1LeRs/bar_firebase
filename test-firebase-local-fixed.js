require('dotenv').config();
const admin = require('firebase-admin');

console.log('🔥 Тестируем Firebase подключение локально...');

// Используем локальный файл service-private-key.json
let serviceAccount;
try {
  serviceAccount = require('./service-private-key.json');
  console.log('📁 Используем локальный файл service-private-key.json');
  console.log('🔧 Service account details:', {
    type: serviceAccount.type,
    project_id: serviceAccount.project_id,
    private_key_id: serviceAccount.private_key_id ? 'SET' : 'NOT SET',
    client_email: serviceAccount.client_email ? 'SET' : 'NOT SET',
    client_id: serviceAccount.client_id ? 'SET' : 'NOT SET'
  });
} catch (error) {
  console.error('❌ Не удалось загрузить service-private-key.json:', error.message);
  process.exit(1);
}

// Инициализируем Firebase
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'bar-menu-6145c'
    });
    console.log('✅ Firebase Admin SDK инициализирован успешно');
  }
} catch (error) {
  console.error('❌ Ошибка инициализации Firebase:', error);
  process.exit(1);
}

const db = admin.firestore();

// Тестируем подключение
async function testFirebaseConnection() {
  try {
    console.log('🔍 Тестируем подключение к Firestore...');
    
    // Пробуем создать тестовый документ
    const testDoc = await db.collection('test').doc('connection').get();
    
    console.log('✅ Firebase подключение успешно');
    console.log('📊 Test document exists:', testDoc.exists);
    
    if (testDoc.exists) {
      console.log('📄 Test document data:', testDoc.data());
    }
    
    // Тестируем запись
    console.log('✍️ Тестируем запись в Firestore...');
    await db.collection('test').doc('connection').set({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      message: 'Test connection successful',
      testId: Date.now()
    });
    
    console.log('✅ Запись в Firestore успешна');
    
    // Тестируем чтение
    console.log('📖 Тестируем чтение из Firestore...');
    const testDoc2 = await db.collection('test').doc('connection').get();
    console.log('📄 Прочитанные данные:', testDoc2.data());
    
    console.log('🎉 Все тесты Firebase прошли успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования Firebase:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
  }
}

testFirebaseConnection().then(() => {
  console.log('🏁 Тест завершен');
  process.exit(0);
}).catch(error => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});
