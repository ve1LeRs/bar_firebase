# 🔧 Диагностика проблем с Railway

## Проблемы и решения

### 1. ❌ 404 ошибки для `/health` и `/test-firebase`

**Проблема**: `GET https://your-app.railway.app/health 404 (Not Found)`

**Причина**: Railway развертывает только `webhook-server.js`, но endpoints могут быть недоступны.

**Решение**:
1. **Проверьте, что сервер запущен**:
   ```bash
   # В Railway Dashboard → Logs
   # Должно быть: "🚀 Webhook сервер запущен на порту 3000"
   ```

2. **Проверьте переменные окружения**:
   - `PORT=3000`
   - `RAILWAY_PUBLIC_DOMAIN=https://your-app.railway.app`

3. **Проверьте, что используется правильный сервер**:
   ```json
   // package.json должен содержать:
   {
     "main": "webhook-server.js",
     "scripts": {
       "start": "node webhook-server.js"
     }
   }
   ```

### 2. ❌ Двойной слеш в URL

**Проблема**: `https://your-app.railway.app//health` (два слеша)

**Решение**: ✅ **Исправлено** - теперь система автоматически убирает лишние слеши.

### 3. ❌ Telegram webhook настроен, но система его не видит

**Проблема**: `⚠️ Telegram webhook не настроен: {ok: true, result: {...}}`

**Решение**: ✅ **Исправлено** - улучшена логика проверки webhook.

### 4. 🔍 Как проверить статус Railway

1. **Railway Dashboard** → ваш проект → **Logs**
2. **Ищите сообщения**:
   ```
   🚀 Webhook сервер запущен на порту 3000
   📱 Telegram webhook: https://your-app.railway.app/telegram-webhook
   🔍 Health check: https://your-app.railway.app/health
   ```

3. **Проверьте endpoints вручную**:
   - `https://your-app.railway.app/health`
   - `https://your-app.railway.app/test-firebase`

### 5. 🚀 Правильная настройка Railway

1. **Переменные окружения**:
   ```
   PORT=3000
   RAILWAY_PUBLIC_DOMAIN=https://your-app.railway.app
   TELEGRAM_BOT_TOKEN=your_bot_token
   TELEGRAM_CHAT_ID=your_chat_id
   FIREBASE_PRIVATE_KEY_ID=your_key_id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=your_service_account@project.iam.gserviceaccount.com
   FIREBASE_CLIENT_ID=your_client_id
   FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/...
   ```

2. **package.json**:
   ```json
   {
     "main": "webhook-server.js",
     "scripts": {
       "start": "node webhook-server.js"
     }
   }
   ```

### 6. 🧪 Тестирование

1. **Откройте админ панель** → Мониторинг
2. **Нажмите "Настроить URL сервера"**
3. **Введите ваш Railway URL**: `https://your-app.railway.app`
4. **Нажмите "Проверить систему"**

### 7. 📊 Ожидаемые результаты

**✅ Все работает**:
```
🌐 Webhook Сервер: ✅ Онлайн
🔥 Firebase: ✅ Онлайн  
📱 Telegram Webhook: ✅ Онлайн
```

**❌ Проблемы**:
```
🌐 Webhook Сервер: ❌ HTTP 404: Not Found
🔥 Firebase: ❌ HTTP 404: Not Found
📱 Telegram Webhook: ⚠️ Не настроен
```

## 🆘 Если ничего не помогает

1. **Перезапустите Railway**:
   - Railway Dashboard → ваш проект → Settings → Restart

2. **Проверьте логи**:
   - Railway Dashboard → Logs
   - Ищите ошибки и предупреждения

3. **Проверьте переменные**:
   - Railway Dashboard → Variables
   - Убедитесь, что все переменные установлены

4. **Проверьте домен**:
   - Railway Dashboard → Settings → Domains
   - Убедитесь, что домен активен
