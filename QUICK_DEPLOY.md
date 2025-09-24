# Быстрое развертывание на Railway

## Вариант 1: Через GitHub (рекомендуется)

1. **Создайте GitHub репозиторий:**
   - Перейдите на [GitHub.com](https://github.com)
   - Создайте новый репозиторий (например: `asafiev-bar-webhook`)
   - Загрузите файлы из папки проекта

2. **Разверните на Railway:**
   - Перейдите на [Railway.app](https://railway.app)
   - Нажмите "New Project" → "Deploy from GitHub repo"
   - Выберите ваш репозиторий
   - Railway автоматически определит, что это Node.js проект

3. **Настройте переменные окружения:**
   - В настройках проекта Railway добавьте переменные из файла `.env`
   - Или скопируйте из `RAILWAY_DEPLOY.md`

## Вариант 2: Прямая загрузка

1. **Создайте проект на Railway:**
   - Перейдите на [Railway.app](https://railway.app)
   - Нажмите "New Project" → "Empty Project"

2. **Загрузите файлы:**
   - Используйте файл `railway-deploy.zip` из папки проекта
   - Или загрузите файлы вручную:
     - `webhook-server.js`
     - `package.json`
     - `railway.json`
     - `Procfile`

3. **Настройте переменные окружения:**
   - В настройках проекта Railway добавьте переменные из файла `.env`

## Переменные окружения для Railway

Скопируйте эти переменные в настройки Railway:

```
FIREBASE_PRIVATE_KEY_ID=8b6c9ee16cffc6760d7726240745510aded9b758
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCevCHjuDjiQ3uT\n87ntOc7X7V0D2zjrtyH0rp9itNFW/JoW7O+fQZ0PbVYYE8peTxVpAkoawqBVR7A0\nyXKgXcOruhApbKelHVVIpEYHUUli29n1jRtKNWtpDtUcFZBS5aUrAzr/EfLPiFSZ\nYbaTb7mU5QMAcAeWtLVbxkbLZzAekYdvbg1DePXzDtpOjPrRZFy3toP85TS4WY/Y\nU2GE8SZGUlzw22xn7lRxvZlYmmbK1XWUJ9WIaK3ykKLanyzwJCa+2/8c6Q5zmMmv\nY4dWlfNL2fOyCP/9xi8x5wNfWVim2jkE0TkexYqB0oCdy6mD14aAe2Z74mno69+/\nZQ7lsZ0tAgMBAAECggEAEI4wHatK2YRuyN9QarbPBTPHMf4FCYab5sRosLeJpuAp\nJQ94rXw/KIr/gfrcbioi4kUgG/rlFIfpz5OcHjAxVoGNKnjf4kd1K+KgQCag+AvU\nh3j8WejI51fp76grGY5EhAAuAMjrMWx3YFjx3R43tZkOD1df3z7BNI1xOEkuml1q\nvKOGnKeE/zSpXPFu+XFYYLT0/fXBN5FV2hmegQK6nLFIFjArWl0WW+UhGyNOF7Bq\nUaQPGBBBaC12NnQMNsQxgpVb0sVg+UgZZmJ5snrl9hYQuNhX4KKXhH5bK2lCvz+O\nJcJHne78pNJZ/GIkxsq8JWx72NPziwG7/543mPki4QKBgQDL2rfWnbY/hTYMBWPK\nls0yWZ/P8cNs8JA3RE2cJnr1QMG3qGgtFGVKcmm6XDqT4zMcYbSrGiIITM86Ug6K\nXf2ICs2MDn0P65Zipim4Kh2BZm83k+Rr8stWaiSHVxgYg9xJI3fgJ8Yz/hE+6Jj6\nLljdqaFQjobBE4JKXSlbX0dNjQKBgQDHVsrSaEuigUw5RoTKvHJMwbg4i64I77f9\nVgLO7Io5ZTlGuZOTuackkiS6JnchMORLGAzV6ed/wcs+a7w28C4LQnUS61Im5kaP\nWs2Mby4OZzC1b42/QUdDhJVRza5ffmmb0v0RdZDNWb4GMhk9MHQScPAKqTEi9bSG\nz4pyglCWIQKBgAyN16x74fFffsiWvGKJjvF+23yu4t4eooMEzdLD++aGqmdpE6FT\nFDnVefVkIKdi4o7o5Xt0DIx+TnTFAOg8iZSLNcVeTw1f8M76dK9GyLJjYI4HqZWM\nSkF0H/PFxVIdLL/EU2mWiXpCN0WshV9hC424jODAB1wKk9O0nd5iM8ZMxAoGAPsg+\nLxC8KZ1xhWSJdFTv5u7od56+nH/rwfVyAvwK+NLBvF28dj11wBXrTVnKEYEVlfUo\nLcNyrxE5UxqZd/AjgFZZCzFkeW3zcTkXHhDyP4UOmUZeLYuAx2odoVsXfWoSFwrX\nu8T8a0DFkav7uQLmu9woLiNln24lgoQhRbl3aiECgYBBNmczSwdGdBygiLcxUzDz\nQfENl2UwNGQ4WuHW7T7ellvg926TD4AAjo/X6anrVgcT+h5nEakVW5rajo36idGW\n7LMWL5gn+IwYQt/E541tidWoNvCxbVLZgjcCjVnIUu8ld3iYkHFGNeoHI5Ep8boG\n0v4/E7F0thBcV0uA1eVbJg==\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@bar-menu-6145c.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=109441409973504780055
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40bar-menu-6145c.iam.gserviceaccount.com
TELEGRAM_BOT_TOKEN=8326139522:AAG2fwHYd1vRPx0cUXt4ATaFYTNxmzInWJo
TELEGRAM_CHAT_ID=1743362083
PORT=3000
```

## После развертывания

1. **Получите URL приложения** (например: `https://your-app-name.railway.app`)

2. **Обновите URL в script.js:**
   ```javascript
   const WEBHOOK_SERVER_URL = "https://your-app-name.railway.app";
   ```

3. **Настройте webhook в Telegram:**
   - Откройте админ-панель на сайте
   - Перейдите в "Мониторинг"
   - Нажмите "Настроить Webhook"

4. **Протестируйте:**
   - Разместите заказ на сайте
   - Проверьте, что заказ приходит в Telegram
   - Нажмите кнопку в Telegram
   - Проверьте, что статус обновляется на сайте

## Проверка работы

После развертывания проверьте эти URL:
- `https://your-app-name.railway.app/health` - должен вернуть `{"status":"OK"}`
- `https://your-app-name.railway.app/test-firebase` - должен вернуть `{"success":true}`

Если что-то не работает, проверьте логи в Railway dashboard.
