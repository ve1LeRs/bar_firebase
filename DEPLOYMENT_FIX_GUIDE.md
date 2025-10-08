# 🚀 Railway Deployment Fix - Step by Step

## 🚨 Current Issue
Railway is running the wrong server file (`server.js` instead of `webhook-server.js`), causing:
- ❌ `/test-firebase` endpoint returns 500 error
- ❌ `/diagnose` endpoint returns 404 error
- ❌ Firebase authentication fails

## ✅ Solution

### Step 1: Force Railway to Use Correct Server
I've updated the configuration files to force Railway to run `webhook-server.js`:

**railway.json** - Updated startCommand:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node webhook-server.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Procfile** - Updated to direct command:
```
web: node webhook-server.js
```

### Step 2: Set Firebase Environment Variables in Railway
Go to your Railway project dashboard → Variables tab and add these EXACT values:

```
FIREBASE_PRIVATE_KEY_ID=3c4560703da3667b9a61117c3e37b0327052b24e
```

```
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCrPnvmRAG2iUkj\nojQgCi21lj8UDZRjW7ivzVWHC0Qm4/dOzJr5bhGjAT+E3iS2XqHI65/ElOaVVL/Y\n8XpSu2/kes0fRdW6Z6XhiqdcwpKNzvesgjGh6PAKOWwkUmq72WHQJShEiAYGP1bN\n4vhmcplJgltppPAs9XWRaEii4DJoM6xgXuGbQz+W/3mBwDvRL5aeIIUuHUeDtxUM\nr42O8WsC9hGGz8vh/IdzB3lOrsE1HWIBe9fipmxoT7gZNQOMbiyoseqiPuefXkP7\nTmsDYs61M6pBADED7q0vUR09B20l6Du9e7hWOosm50zTRgsddab85yEPIzNanOJe\nuRkyE71vAgMBAAECggEAP0SzNzS6I0xeuu0jcBECqVwNCyYnRHxvZHirWF0nvWyt\ngy4iNfTeTEjaRIdkrgKRqK+xlEplVRf+V7OEO8vnv9VFMwA0wo2n4og9ZI644e7t\nYA2sM8Nh6I0lsNfIeoYK1wHbelJ9U1KUijYJC6TckKW6i3I2kI3R9bq/V3oY9ZlB\nlpRHY42+3WAuboDtPxk6Ue6xDcsEhrejuxnsNC+HjaNRxnutCUrD3lhzdRqh0Kbr\n5zw93eUoaAubunidOAwGzqJye4XxNgA5s6QZtyNuQKJ6H6BifRmkF90KaHKFFpjW\numaLPdE23m4zvBPBaiBkzUTWGQpszKPSYBQI/deeFQKBgQDxYfjhkXfPhOp0MBIB\nBzltiazKi/6TsOyZMVWhbhiG5N6aDmYGIWZRcJuYVrJu57cZjOEize4TYzVtP8R2\neABhpEgvKyiobVzf6k+uyLhLttHTGzq1IEgj591w1mYsFsBNfRIMDnM0xBbneHVB\nqRst7pRz1PxFS/y5PDOJPOk5TQKBgQC1nTCf6JWtSOfqLV16iUX2ouGD5MudOixr\nIjp7QlwlxulGncxneKnSTEc/K4wdfTeL0+uSJyHObpSKZohpVl4gPyWALJ08SzNd\nkM3gHYl2fanZB0OZIMOf76klmEunEANcoekaarH33YOGpnZ1uzEj1sXh8C+Rxfw2\nA2sE4FDTqwKBgDJ7NNun2pCx0X6fFwTUB/SamGJ7yLAGjlSzdp8eMU70yoEZhci+\nb3GUxVWkvAhpuWdEiUkIHEQ9uUyxy1qjWiERhG8o7YXb6VKC5Es/exuKjnNB/JMo\nvy2TLkKM9C1ATNNn1sBivUFJySh7jro+rYp7nNxkrKWpcJ8ksfp/nJ75AoGABYAy\nVdWUmwAHTjd7ileYD+VVEUqfxC5b5A7QWKVk5xwEOshSxZuJAT6gNdCa2NXPFeQg\nUXfv9TGyPBLo9M/R4AYpm50+UfIxJxdYtP4QCM+7kkA/EudEJZb7t5DKUdARWf/p\ncIxkwY4rCqwGEIDP9zbtHW/J8Q9fGT+3QRmOOSsCgYEAgIY53cdLYwpHmrSurrsV\n06lPEBKs+teOWUIuxVCcCU6spl4/DP3hQQGU+oO8aRWxmM6s60mjPLVWC38DnLg2\nR9BM9CuSGtKoXvGB9VbaAwyuDKMGdzoRSY5ElQ9iC0xoULysbLg3Vhe/HSO3FcrC\nlZHT6lIRfcYHUSLeEX3ZqWQ=\n-----END PRIVATE KEY-----\n"
```

```
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@bar-menu-6145c.iam.gserviceaccount.com
```

```
FIREBASE_CLIENT_ID=109441409973504780055
```

```
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40bar-menu-6145c.iam.gserviceaccount.com
```

### Step 3: Deploy Changes
Run these commands to deploy the fixes:

```bash
git add .
git commit -m "Fix Railway server configuration and Firebase setup"
git push origin main
```

### Step 4: Verify the Fix
After Railway redeploys (wait 2-3 minutes), test these endpoints:

1. **Health Check**: `https://web-production-72014.up.railway.app/health`
   - Should return: `{"status": "OK"}`

2. **Diagnose**: `https://web-production-72014.up.railway.app/diagnose`
   - Should show all Firebase variables as "SET"

3. **Firebase Test**: `https://web-production-72014.up.railway.app/test-firebase`
   - Should return: `{"success": true}`

### Step 5: Run Verification Script
You can also run the verification script locally:
```bash
node verify-railway-env.js
```

## 🎯 Expected Results After Fix

✅ **Health endpoint**: Returns 200 OK  
✅ **Diagnose endpoint**: Returns 200 with all Firebase vars "SET"  
✅ **Firebase endpoint**: Returns 200 with `{"success": true}`  
✅ **Frontend**: Firebase status shows "online"  

## 🚨 If Still Not Working

1. **Check Railway Logs**: Go to Railway dashboard → Deployments → View logs
2. **Verify Environment Variables**: Make sure all 5 Firebase variables are set
3. **Check Private Key Format**: Ensure it's wrapped in quotes and `\n` characters are preserved
4. **Force Redeploy**: Try deleting and recreating the Railway service

## 📋 Quick Checklist

- [ ] Updated `railway.json` with `"startCommand": "node webhook-server.js"`
- [ ] Updated `Procfile` with `web: node webhook-server.js`
- [ ] All 5 Firebase environment variables set in Railway
- [ ] `FIREBASE_PRIVATE_KEY` wrapped in quotes
- [ ] Changes committed and pushed to git
- [ ] Railway redeployed successfully
- [ ] All test endpoints return 200 OK

## 🔗 Test URLs
- Health: `https://web-production-72014.up.railway.app/health`
- Diagnose: `https://web-production-72014.up.railway.app/diagnose`
- Firebase: `https://web-production-72014.up.railway.app/test-firebase`
