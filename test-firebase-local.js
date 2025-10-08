// Test Firebase connection locally
// Run with: node test-firebase-local.js

const admin = require('firebase-admin');
const serviceAccount = require('./service-private-key.json');

console.log('🔥 Testing Firebase connection locally...');

try {
  // Initialize Firebase Admin SDK
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'bar-menu-6145c'
  });

  const db = admin.firestore();

  // Test connection
  async function testConnection() {
    try {
      console.log('📡 Testing Firestore connection...');
      const testDoc = await db.collection('test').doc('connection').get();
      console.log('✅ Firebase connection successful!');
      console.log('📊 Test document exists:', testDoc.exists);
      
      if (testDoc.exists) {
        console.log('📄 Document data:', testDoc.data());
      }
      
      console.log('🎉 All tests passed! Your Firebase credentials are working.');
    } catch (error) {
      console.error('❌ Firebase test failed:', error.message);
      console.error('🔍 Error details:', error);
    }
  }

  testConnection();

} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  console.error('🔍 Check your service-private-key.json file');
}
