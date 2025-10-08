# 🚀 Проблемы с развертыванием Railway

## ❌ Текущие проблемы

1. **Firebase 500 ошибка** - `/test-firebase` возвращает 500
2. **Диагностика 404** - `/diagnose` не найден
3. **Telegram webhook работает** ✅

## 🔍 Диагностика

### Шаг 1: Проверка Railway логов
1. **Railway Dashboard** → ваш проект → **Logs**
2. **Ищите сообщения**:
   ```
   🚀 Webhook сервер запущен на порту 3000
   📱 Telegram webhook: https://your-app.railway.app/telegram-webhook
   🔍 Health check: https://your-app.railway.app/health
   ```

### Шаг 2: Проверка endpoints
Попробуйте открыть в браузере:
- `https://web-production-72014.up.railway.app/health` - должен работать
- `https://web-production-72014.up.railway.app/diagnose` - должен работать
- `https://web-production-72014.up.railway.app/test-firebase` - может давать 500

## 🔧 Решения

### 1. Проверка конфигурации Railway

**Убедитесь, что Railway использует правильный файл:**
```json
// package.json должен содержать:
{
  "main": "webhook-server.js",
  "scripts": {
    "start": "node webhook-server.js"
  }
}
```

### 2. Настройка переменных окружения

**Railway Dashboard** → ваш проект → **Variables**:

```
PORT=3000
RAILWAY_PUBLIC_DOMAIN=https://web-production-72014.up.railway.app
TELEGRAM_BOT_TOKEN=8326139522:AAG2fwHYd1vRPx0cUXt4ATaFYTNxmzInWJo
TELEGRAM_CHAT_ID=1743362083
FIREBASE_PRIVATE_KEY_ID=your_private_key_id_here
FIREBASE_CLIENT_EMAIL=your_service_account@project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_client_id_here
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

### 3. Перезапуск Railway

1. **Railway Dashboard** → Settings → **Restart**
2. **Подождите 1-2 минуты**
3. **Проверьте логи** - должны появиться сообщения о запуске

### 4. Проверка Firebase переменных

**Если Firebase все еще 500:**
1. **Проверьте формат FIREBASE_PRIVATE_KEY** - должен содержать `\n`
2. **Убедитесь, что service account имеет права** на Firestore
3. **Проверьте, что все Firebase переменные установлены**

## 🚀 Быстрое решение

### Вариант 1: Полное пересоздание
1. **Railway Dashboard** → Settings → **Delete Service**
2. **Создайте новый сервис**
3. **Настройте переменные окружения**
4. **Разверните код заново**

### Вариант 2: Исправление текущего
1. **Проверьте Railway логи** - найдите ошибки
2. **Настройте переменные Firebase** в Railway
3. **Перезапустите сервис**
4. **Проверьте endpoints** в браузере

## 🔍 Проверка результатов

После исправления должны работать:
- ✅ `https://web-production-72014.up.railway.app/health`
- ✅ `https://web-production-72014.up.railway.app/diagnose`
- ✅ `https://web-production-72014.up.railway.app/test-firebase`

## 💡 Возможные причины проблем

1. **Railway развертывает server.js вместо webhook-server.js**
2. **Переменные окружения не установлены**
3. **Firebase service account не настроен**
4. **Сетевые проблемы Railway**

## 🆘 Если ничего не помогает

1. **Проверьте Railway Dashboard** → Logs
2. **Убедитесь, что используется webhook-server.js**
3. **Проверьте переменные окружения**
4. **Попробуйте пересоздать сервис**

## 📋 Полезные команды

### Проверка Railway статуса:
```bash
railway status
```

### Просмотр логов:
```bash
railway logs
```

### Перезапуск:
```bash
railway restart
```
