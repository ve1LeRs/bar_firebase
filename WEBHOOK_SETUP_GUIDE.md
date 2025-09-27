# 🔧 Руководство по настройке Telegram Webhook

## Проблема
Ошибка 400 (Bad Request) при настройке webhook возникает потому, что Telegram не может достучаться до `localhost:3000`. Для работы webhook нужен **публичный URL**.

## Решение

### 1. 🚀 Развертывание на Railway

1. **Подключите проект к Railway:**
   ```bash
   # Установите Railway CLI
   npm install -g @railway/cli
   
   # Войдите в аккаунт
   railway login
   
   # Инициализируйте проект
   railway init
   ```

2. **Установите переменные окружения в Railway:**
   - `RAILWAY_PUBLIC_DOMAIN` = ваш публичный URL (например: `https://your-app-name.railway.app`)
   - `TELEGRAM_BOT_TOKEN` = ваш токен бота
   - `TELEGRAM_CHAT_ID` = ваш chat ID
   - Firebase переменные (из `service-private-key.json`)

3. **Разверните проект:**
   ```bash
   railway up
   ```

### 2. 🔗 Настройка Webhook

После развертывания на Railway:

1. **Получите публичный URL** из Railway Dashboard
2. **Обновите переменную `RAILWAY_PUBLIC_DOMAIN`** в Railway
3. **Перезапустите приложение** в Railway
4. **Настройте webhook** через интерфейс приложения

### 3. 🧪 Тестирование

1. **Проверьте health endpoint:**
   ```
   https://your-app-name.railway.app/health
   ```

2. **Проверьте webhook endpoint:**
   ```
   https://your-app-name.railway.app/telegram-webhook
   ```

3. **Настройте webhook** через кнопку в интерфейсе

## 📝 Важные моменты

- ❌ **НЕ используйте** `localhost` для webhook
- ✅ **Используйте** публичный URL от Railway
- 🔒 **Убедитесь**, что все переменные окружения настроены
- 🚀 **Перезапустите** приложение после изменения переменных

## 🆘 Если что-то не работает

1. **Проверьте логи** в Railway Dashboard
2. **Убедитесь**, что все переменные окружения установлены
3. **Проверьте**, что сервер запущен на порту, указанном в `PORT`
4. **Убедитесь**, что URL webhook доступен публично

## 🔍 Отладка

Добавьте в консоль браузера:
```javascript
console.log('Webhook URL:', WEBHOOK_SERVER_URL);
```

Должен показать ваш публичный Railway URL, а не localhost!
