# Firebase Configuration for Railway

## Problem
Your Railway server is getting a 500 error on `/test-firebase` because Firebase credentials are not properly configured.

## Solution
You need to set up Firebase environment variables in your Railway project.

## Step-by-Step Setup

### 1. Get Firebase Service Account Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`bar-menu-6145c`)
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Download the JSON file

### 2. Extract Values from JSON

From the downloaded JSON file, extract these values:

```json
{
  "type": "service_account",
  "project_id": "bar-menu-6145c",
  "private_key_id": "YOUR_PRIVATE_KEY_ID",
  "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@bar-menu-6145c.iam.gserviceaccount.com",
  "client_id": "YOUR_CLIENT_ID",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40bar-menu-6145c.iam.gserviceaccount.com"
}
```

### 3. Set Environment Variables in Railway

1. Go to your Railway project dashboard
2. Click on your service
3. Go to **Variables** tab
4. Add these environment variables:

```
FIREBASE_PRIVATE_KEY_ID=your_private_key_id_here
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@bar-menu-6145c.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_client_id_here
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40bar-menu-6145c.iam.gserviceaccount.com
```

**Important Notes:**
- Keep the quotes around `FIREBASE_PRIVATE_KEY` value
- The private key should include the `\n` characters (newlines)
- Replace `xxxxx` with your actual values from the JSON file

### 4. Deploy and Test

1. Redeploy your Railway service (it should happen automatically when you save variables)
2. Test the connection by visiting: `https://your-railway-app.railway.app/test-firebase`
3. You should see a JSON response with `"success": true`

### 5. Verify in Your Frontend

1. Open your GitHub Pages site
2. Go to the admin panel
3. Click "Диагностика системы"
4. Check that Firebase status shows "online"

## Troubleshooting

### If you still get 500 errors:

1. **Check Railway logs** for detailed error messages
2. **Verify all environment variables** are set correctly
3. **Check the private key format** - it should include `\n` characters
4. **Ensure the service account** has proper permissions in Firebase

### Common Issues:

- **Missing quotes** around `FIREBASE_PRIVATE_KEY`
- **Incorrect newline characters** in the private key
- **Wrong project ID** in the client email
- **Missing environment variables**

## Files Modified

- `webhook-server.js`: Updated Firebase initialization to use environment variables
- Added better error handling and diagnostics for Firebase connection

## Next Steps

After setting up the environment variables:
1. Redeploy your Railway service
2. Test the `/test-firebase` endpoint
3. Verify the connection in your frontend admin panel
4. Your app should now work without CORS or Firebase errors!
