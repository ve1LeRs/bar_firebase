# CORS and Deployment Fix Guide

## What Was Fixed

### 1. **CORS Configuration** ✅
- Fixed wildcard origin patterns (like `*.railway.app`) that don't work in Express CORS
- Properly configured CORS to allow:
  - File protocol (`null` origin) for local HTML files
  - Railway domains
  - GitHub Pages
  - All origins (for development)

### 2. **Added Root Endpoint** ✅
- Added `/` endpoint to help verify server is running
- Provides list of all available endpoints

## How to Deploy to Railway

### Option 1: Using Git (Recommended)

```bash
# 1. Stage the updated files
git add webhook-server.js

# 2. Commit the changes
git commit -m "Fix CORS configuration for Railway deployment"

# 3. Push to your repository
git push origin main
```

Railway will automatically detect the push and redeploy your application.

### Option 2: Using Railway CLI

```bash
# Deploy directly from local directory
railway up
```

## Testing After Deployment

### 1. Test the Server is Running
Open in your browser or use curl:
```
https://web-production-72014.up.railway.app/
```

Expected response:
```json
{
  "status": "OK",
  "message": "Asafiev Bar Webhook Server is running",
  "timestamp": "2025-10-08T...",
  "endpoints": {
    "health": "/health",
    "diagnose": "/diagnose",
    "testFirebase": "/test-firebase",
    "queueInfo": "/queue-info",
    "webhook": "/telegram-webhook"
  }
}
```

### 2. Test Health Endpoint
```
https://web-production-72014.up.railway.app/health
```

### 3. Test Firebase Connection
```
https://web-production-72014.up.railway.app/test-firebase
```

### 4. Test From Your Frontend
Open your `index.html` file and check the browser console. The CORS errors should be gone.

## If Still Getting 404 Errors

This means the server isn't running on Railway. Check:

1. **Railway Dashboard**: 
   - Go to https://railway.app/dashboard
   - Check if your service is running
   - View logs to see if there are any startup errors

2. **Check Environment Variables**:
   Make sure all required Firebase environment variables are set in Railway:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_PRIVATE_KEY_ID`
   - `FIREBASE_PRIVATE_KEY`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_CLIENT_ID`
   - `FIREBASE_CLIENT_X509_CERT_URL`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`

3. **Check Deployment Logs**:
   In Railway dashboard, click on your service → Deployments → View logs

## Common Issues and Solutions

### Issue: Server won't start on Railway
**Solution**: Check Railway logs for errors. Usually related to missing environment variables.

### Issue: CORS errors persist
**Solution**: 
- Clear browser cache
- Hard refresh (Ctrl + Shift + R or Cmd + Shift + R)
- Make sure you deployed the latest code

### Issue: 404 on all endpoints
**Solution**: 
- Server not running on Railway
- Check Railway dashboard and logs
- Verify deployment was successful

## Next Steps

1. Deploy the updated code to Railway
2. Wait for deployment to complete (usually 1-2 minutes)
3. Test all endpoints
4. Open your `index.html` and verify CORS errors are gone
5. Test placing an order from your frontend

## Quick Deploy Command

```bash
# One-liner to commit and push
git add webhook-server.js && git commit -m "Fix CORS" && git push origin main
```

After pushing, check your Railway dashboard for deployment status.

