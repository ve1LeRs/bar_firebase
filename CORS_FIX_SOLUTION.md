# CORS Fix Solution

## Problem
Your frontend deployed on GitHub Pages (`https://ve1lers.github.io`) was trying to access `http://localhost:3000`, which caused CORS errors because:
1. `localhost:3000` is not accessible from the internet
2. The frontend was hardcoded to use localhost in production

## Solution Applied

### 1. Updated Frontend Logic (`script.js`)
- Added specific detection for GitHub Pages (`github.io` domains)
- When running on GitHub Pages, the app now shows clear error messages asking users to configure the webhook server URL
- Users can use the "Настроить URL сервера" button in the admin panel to set their Railway URL

### 2. Added CORS Headers to Static Server (`server.js`)
- Added proper CORS headers to the static file server
- Added OPTIONS request handling for preflight requests
- This ensures the static server can serve files with proper CORS support

## How to Use

### For Production (GitHub Pages)
1. Deploy your webhook server to Railway (or another hosting service)
2. When you access your GitHub Pages site, you'll see error messages asking to configure the webhook server URL
3. Click the "Настроить URL сервера" button in the admin panel
4. Enter your Railway URL (e.g., `https://your-app.railway.app`)
5. The app will now use your production webhook server instead of localhost

### For Development
- The app automatically detects localhost and uses `http://localhost:3000`
- No changes needed for local development

## Files Modified
- `script.js`: Updated URL detection logic for GitHub Pages
- `server.js`: Added CORS headers for static file serving

## Next Steps
1. Deploy your webhook server to Railway
2. Update your GitHub Pages deployment with the modified files
3. Configure the webhook server URL in the admin panel
4. Test the connection

## Testing
After deployment, you can test the connection by:
1. Opening the admin panel
2. Clicking "Диагностика системы" to test the webhook server connection
3. Verifying that the CORS errors are resolved
