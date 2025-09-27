require('dotenv').config();
const admin = require('firebase-admin');

console.log('🔥 Тестирование Firebase credentials...');

// Проверяем переменные окружения
const envCheck = {
  FIREBASE_PRIVATE_KEY_ID: process.env.FIREBASE_PRIVATE_KEY_ID ? 'SET' : 'NOT SET',
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? 'SET' : 'NOT SET',
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL ? 'SET' : 'NOT SET',
  FIREBASE_CLIENT_ID: process.env.FIREBASE_CLIENT_ID ? 'SET' : 'NOT SET',
  FIREBASE_CLIENT_X509_CERT_URL: process.env.FIREBASE_CLIENT_X509_CERT_URL ? 'SET' : 'NOT SET'
};

console.log('🔍 Переменные окружения:', envCheck);

// Проверяем private key
if (process.env.FIREBASE_PRIVATE_KEY) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  console.log('🔑 Private key length:', privateKey.length);
  console.log('🔑 Private key starts with:', privateKey.substring(0, 50) + '...');
  console.log('🔑 Private key contains \\n:', privateKey.includes('\\n'));
  console.log('🔑 Private key contains actual newlines:', privateKey.includes('\n'));
  
  // Обрабатываем private key
  const processedKey = privateKey.replace(/\\n/g, '\n');
  console.log('🔑 Processed key length:', processedKey.length);
  console.log('🔑 Processed key starts with:', processedKey.substring(0, 50) + '...');
}

// Создаем service account объект
const serviceAccount = {
  type: "service_account",
  project_id: "bar-menu-6145c",
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
};

console.log('🔧 Service account object:', {
  type: serviceAccount.type,
  project_id: serviceAccount.project_id,
  private_key_id: serviceAccount.private_key_id ? 'SET' : 'NOT SET',
  private_key: serviceAccount.private_key ? 'SET' : 'NOT SET',
  client_email: serviceAccount.client_email ? 'SET' : 'NOT SET',
  client_id: serviceAccount.client_id ? 'SET' : 'NOT SET',
  client_x509_cert_url: serviceAccount.client_x509_cert_url ? 'SET' : 'NOT SET'
});

// Пробуем инициализировать Firebase
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'bar-menu-6145c'
  });
  
  console.log('✅ Firebase Admin SDK инициализирован успешно');
  
  // Тестируем подключение
  const db = admin.firestore();
  
  db.collection('test').doc('connection').get()
    .then(() => {
      console.log('✅ Firebase подключение успешно');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Ошибка подключения к Firebase:', error);
      process.exit(1);
    });
    
} catch (error) {
  console.error('❌ Ошибка инициализации Firebase:', error);
  process.exit(1);
}
