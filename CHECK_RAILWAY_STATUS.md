# 🚨 Проблема: Railway приложение не найдено

## Ошибка
```
{"status":"error","code":404,"message":"Application not found"}
```

## ✅ Что нужно сделать:

### 1. Проверьте статус Railway приложения

Зайдите на https://railway.app/ и проверьте:

- ✅ **Приложение запущено** (должен быть зеленый статус)
- ✅ **Последний деплой успешен** (не должно быть ошибок)
- ✅ **Правильный URL** (может отличаться от `asafiev-bar-production.up.railway.app`)

### 2. Найдите правильный URL

В Railway:
1. Откройте ваш проект
2. Перейдите в **Settings** → **Domains**
3. Скопируйте **публичный URL** (например: `your-app-name.up.railway.app`)

### 3. Обновите URL в приложении

Если URL отличается, нужно:

**Вариант A: Через админ-панель (если есть функция настройки)**
1. Откройте https://ve1lers.github.io/bar_firebase/
2. Админ-панель → Мониторинг
3. "Настроить URL сервера"
4. Введите правильный Railway URL

**Вариант Б: Через консоль браузера**
```javascript
// Откройте консоль (F12) и выполните:
localStorage.setItem('railwayUrl', 'https://lucid-cat-production.up.railway.app');
location.reload();
```

### 4. Проверьте переменные окружения Railway

Убедитесь, что установлены:
```
TELEGRAM_BOT_TOKEN = ваш_токен
TELEGRAM_CHAT_ID = ваш_chat_id
PORT = 3000 (или автоматически)
```

### 5. Проверьте логи Railway

В Railway → Deployments → View Logs

Должно быть:
```
✅ Firebase Admin SDK инициализирован успешно
🚀 Webhook сервер запущен на порту 3000
```

## 🔍 Возможные причины

1. **Приложение не задеплоено** - нажмите "Redeploy" в Railway
2. **Приложение упало** - проверьте логи на ошибки
3. **Неправильный URL** - проверьте текущий домен в Settings
4. **Нет переменных окружения** - добавьте TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID

## 💡 Быстрое решение

1. Зайдите в Railway
2. Найдите правильный URL в Settings → Domains
3. Скопируйте его
4. Вставьте в консоль браузера:
   ```javascript
   localStorage.setItem('railwayUrl', 'https://lucid-cat-production.up.railway.app');
   location.reload();
   ```

## 📞 Что мне нужно знать

Чтобы помочь дальше, напишите:
1. Какой URL показан в Railway → Settings → Domains?
2. Какой статус деплоя? (успешно/ошибка)
3. Есть ли ошибки в логах Railway?

