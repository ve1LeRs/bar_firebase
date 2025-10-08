const fs = require('fs');

console.log('🔧 Railway Environment Variables Update Script');
console.log('===============================================');

// Read the local service account key
let serviceAccount;
try {
  serviceAccount = require('./service-private-key.json');
  console.log('✅ Local service account key loaded successfully');
} catch (error) {
  console.error('❌ Could not load service-private-key.json:', error.message);
  process.exit(1);
}

// Generate the environment variables
const envVars = {
  FIREBASE_PRIVATE_KEY_ID: serviceAccount.private_key_id,
  FIREBASE_PRIVATE_KEY: `"${serviceAccount.private_key}"`,
  FIREBASE_CLIENT_EMAIL: serviceAccount.client_email,
  FIREBASE_CLIENT_ID: serviceAccount.client_id,
  FIREBASE_CLIENT_X509_CERT_URL: serviceAccount.client_x509_cert_url
};

console.log('\n📋 Copy these environment variables to Railway:');
console.log('===============================================');

Object.entries(envVars).forEach(([key, value]) => {
  console.log(`${key}=${value}`);
});

console.log('\n📝 Instructions:');
console.log('================');
console.log('1. Go to your Railway project dashboard');
console.log('2. Click on your service');
console.log('3. Go to the Variables tab');
console.log('4. DELETE the old Firebase variables');
console.log('5. ADD the new variables above');
console.log('6. Save and redeploy');

console.log('\n🔍 Verification:');
console.log('================');
console.log('Project ID:', serviceAccount.project_id);
console.log('Client Email:', serviceAccount.client_email);
console.log('Private Key ID:', serviceAccount.private_key_id);
console.log('Private Key Length:', serviceAccount.private_key.length);

console.log('\n✅ Environment variables generated successfully!');
