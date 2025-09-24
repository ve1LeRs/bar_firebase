# Развертывание на Railway

## Пошаговая инструкция

### 1. Подготовка проекта

Убедитесь, что у вас есть все необходимые файлы:
- `webhook-server.js` - основной сервер
- `package.json` - зависимости
- `.env` - переменные окружения (НЕ загружайте в Git!)
- `railway.json` - конфигурация Railway
- `Procfile` - команда запуска

### 2. Создание проекта на Railway

1. Перейдите на [Railway.app](https://railway.app)
2. Войдите в аккаунт (или создайте новый)
3. Нажмите "New Project"
4. Выберите "Deploy from GitHub repo"
5. Подключите ваш GitHub репозиторий

### 3. Настройка переменных окружения

В настройках проекта Railway добавьте следующие переменные:

```
FIREBASE_PRIVATE_KEY_ID=8b6c9ee16cffc6760d7726240745510aded9b758
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCevCHjuDjiQ3uT\n87ntOc7X7V0D2zjrtyH0rp9itNFW/JoW7O+fQZ0PbVYYE8peTxVpAkoawqBVR7A0\nyXKgXcOruhApbKelHVVIpEYHUUli29n1jRtKNWtpDtUcFZBS5aUrAzr/EfLPiFSZ\nYbaTb7mU5QMAcAeWtLVbxkbLZzAekYdvbg1DePXzDtpOjPrRZFy3toP85TS4WY/Y\nU2GE8SZGUlzw22xn7lRxvZlYmmbK1XWUJ9WIaK3ykKLanyzwJCa+2/8c6Q5zmMmv\nY4dWlfNL2fOyCP/9xi8x5wNfWVim2jkE0TkexYqB0oCdy6mD14aAe2Z74mno69+/\nZQ7lsZ0tAgMBAAECggEAEI4wHatK2YRuyN9QarbPBTPHMf4FCYab5sRosLeJpuAp\nJQ94rXw/KIr/gfrcbioi4kUgG/rlFIfpz5OcHjAxVoGNKnjf4kd1K+KgQCag+AvU\nh3j8WejI51fp76grGY5EhAAuAMjrMWx3YFjx3R43tZkOD1df3z7BNI1xOEkuml1q\nvKOGnKeE/zSpXPFu+XFYYLT0/fXBN5FV2hmegQK6nLFIFjArWl0WW+UhGyNOF7Bq\nUaQPGBBBaC12NnQMNsQxgpVb0sVg+UgZZmJ5snrl9hYQuNhX4KKXhH5bK2lCvz+O\nJcJHne78pNJZ/GIkxsq8JWx72NPziwG7/543mPki4QKBgQDL2rfWnbY/hTYMBWPK\nls0yWZ/P8cNs8JA3RE2cJnr1QMG3qGgtFGVKcmm6XDqT4zMcYbSrGiIITM86Ug6K\nXf2ICs2MDn0P65Zipim4Kh2BZm83k+Rr8stWaiSHVxgYg9xJI3fgJ8Yz/hE+6Jj6\nLljdqaFQjobBE4JKXSlbX0dNjQKBgQDHVsrSaEuigUw5RoTKvHJMwbg4i64I77f9\nVgLO7Io5ZTlGuZOTuackkiS6JnchMORLGAzV6ed/wcs+a7w28C4LQnUS61Im5kaP\nWs2Mby4OZzC1b42/QUdDhJVRza5ffmmb0v0RdZDNWb4GMhk9MHQScPAKqTEi9bSG\nz4pyglCWIQKBgAyN16x74fFffsiWvGKJjvF+23yu4t4eooMEzdLD++aGqmdpE6FT\nFDnVefVkIKdi4o7o5Xt0DIx+TnTFAOg8iZSLNcVeTw1f8M76dK9GyLJjYI4HqZWM\nSkF0H/PFxVIdLL/EU2mWiXpCN0WshV9C424jODAB1wKk9O0nd5iM8ZMxAoGAPsg+\nLxC8KZ1xhWSJdFTv5u7od56+nH/rwfVyAvwK+NLBvF28dj11wBXrTVnKEYEVlfUo\nLcNyrxE5UxqZd/AjgFZZCzFkeW3zcTkXHhDyP4UOmUZeLYuAx2odoVsXfWoSFwrX\nu8T8a0DFkav7uQLmu9woLiNln24lgoQhRbl3aiECgYBBNmczSwdGdBygiLcxUzDz\nQfENl2UwNGQ4WuHW7T7ellvg926TD4AAjo/X6anrVgcT+h5nEakVW5rajo36idGW\n7LMWL5gn+IwYQt/E541tidWoNvCxbVLZgjcCjVnIUu8ld3iYkHFGNeoHI5Ep8boG\n0v4/E7F0thBcV0uA1eVbJg==\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@bar-menu-6145c.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=109441409973504780055
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40bar-menu-6145c.iam.gserviceaccount.com
TELEGRAM_BOT_TOKEN=8326139522:AAG2fwHYd1vRPx0cUXt4ATaFYTNxmzInWJo
TELEGRAM_CHAT_ID=1743362083
PORT=3000
```

### 4. Развертывание

1. Railway автоматически начнет развертывание после подключения репозитория
2. Дождитесь завершения сборки
3. Получите URL вашего приложения (например: `https://your-app-name.railway.app`)

### 5. Настройка webhook в Telegram

После успешного развертывания:

1. Откройте админ-панель на сайте
2. Перейдите в "Мониторинг"
3. Нажмите "Настроить Webhook"
4. Или настройте вручную через API:

```bash
curl -X POST "https://api.telegram.org/bot8326139522:AAG2fwHYd1vRPx0cUXt4ATaFYTNxmzInWJo/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app-name.railway.app/telegram-webhook",
    "allowed_updates": ["message", "callback_query"]
  }'
```

### 6. Тестирование

1. Проверьте health endpoint: `https://your-app-name.railway.app/health`
2. Проверьте Firebase подключение: `https://your-app-name.railway.app/test-firebase`
3. Разместите тестовый заказ на сайте
4. Проверьте, что заказ приходит в Telegram
5. Нажмите кнопку в Telegram и проверьте, что статус обновляется на сайте

### 7. Обновление URL в коде

После получения URL от Railway обновите в `script.js`:

```javascript
const WEBHOOK_SERVER_URL = "https://your-app-name.railway.app";
```

## Troubleshooting

### Если развертывание не удается:
1. Проверьте логи в Railway dashboard
2. Убедитесь, что все переменные окружения настроены
3. Проверьте, что `package.json` содержит все необходимые зависимости

### Если webhook не работает:
1. Проверьте URL webhook в Telegram API
2. Убедитесь, что сервер отвечает на `/health`
3. Проверьте логи Railway на наличие ошибок

### Если Firebase не подключается:
1. Проверьте правильность переменных окружения
2. Убедитесь, что Service Account имеет права на Firestore
3. Проверьте правила безопасности Firestore
