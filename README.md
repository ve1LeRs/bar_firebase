# AsafievBar - Система управления заказами через Telegram

## Описание

Система позволяет администраторам управлять статусами заказов через Telegram бота с автоматической синхронизацией на веб-сайте в реальном времени.

## Функциональность

### Для пользователей:
- Просмотр меню коктейлей
- Размещение заказов
- **Real-time обновления статуса заказов** - статус автоматически обновляется на сайте при изменении через Telegram
- Уведомления об изменении статуса

### Для администраторов:
- Управление коктейлями и стоп-листом
- **Изменение статуса заказов через Telegram бота** с inline кнопками
- Просмотр всех заказов в админ-панели
- **Real-time синхронизация** - изменения в Telegram мгновенно отображаются на сайте

## Архитектура

```
Telegram Bot ←→ Webhook Server ←→ Firebase ←→ Website
```

1. **Telegram Bot** - отправляет заказы с inline кнопками для управления статусом
2. **Webhook Server** - обрабатывает callback от Telegram и обновляет Firebase
3. **Firebase** - хранит данные заказов и обеспечивает real-time синхронизацию
4. **Website** - отображает заказы с автоматическими обновлениями

## Установка и настройка

### 1. Настройка Firebase

1. Создайте проект в Firebase Console
2. Включите Firestore Database
3. Создайте Service Account и скачайте ключ
4. Настройте правила безопасности Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /orders/{document} {
      allow read, write: if request.auth != null;
    }
    match /cocktails/{document} {
      allow read: if true;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    match /users/{document} {
      allow read, write: if request.auth != null;
    }
    match /stoplist/{document} {
      allow read: if true;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### 2. Настройка Telegram бота

1. Создайте бота через @BotFather
2. Получите токен бота
3. Получите Chat ID для уведомлений

### 3. Развертывание Webhook сервера

#### Локальная разработка:

```bash
# Установка зависимостей
npm install

# Настройка переменных окружения
cp env.example .env
# Отредактируйте .env файл с вашими данными

# Запуск сервера
npm start
```

#### Развертывание backend на Render:

**Быстрый старт:**
1. Создайте аккаунт на [Render.com](https://render.com)
2. Подключите GitHub репозиторий
3. Настройте переменные окружения (Firebase + Telegram) в веб-сервисе
4. Render автоматически задеплоит Node.js сервер (`npm start` → `webhook-server.js`)

**Примечание:** старые инструкции Railway больше не актуальны, используйте Render Dashboard.

### 4. Настройка Webhook в Telegram

После развертывания webhook сервера:

1. Откройте админ-панель на сайте
2. Перейдите в раздел "Мониторинг"
3. Нажмите "Настроить Webhook"
4. Проверьте статус через "Информация о Webhook"

Или настройте вручную:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-webhook-server.onrender.com/telegram-webhook",
    "allowed_updates": ["message", "callback_query"]
  }'
```

## Использование

### Для администраторов:

1. **Получение заказов в Telegram:**
   - При новом заказе бот автоматически отправляет сообщение с inline кнопками
   - Кнопки: "Подтвердить", "Отменить", "Готовится", "Готов", "Выполнен"

2. **Изменение статуса:**
   - Нажмите на соответствующую кнопку в Telegram
   - Статус автоматически обновится в Firebase
   - Пользователи увидят обновление на сайте в реальном времени

3. **Мониторинг:**
   - Используйте админ-панель для просмотра всех заказов
   - Проверяйте статус webhook сервера в разделе "Мониторинг"

### Для пользователей:

1. **Размещение заказа:**
   - Выберите коктейль и нажмите "Заказать"
   - Заказ автоматически отправляется в Telegram администратору

2. **Отслеживание статуса:**
   - Откройте "Мои заказы" для просмотра истории
   - Статус обновляется автоматически при изменении администратором
   - Получайте уведомления об обновлениях

## Telegram Mini App

Клиентское Mini App для заказа коктейлей прямо из Telegram.

### Что умеет
- Авторизация через Telegram `initData` → Firebase Custom Token
- Меню коктейлей с фильтрами и стоп-листом
- Заказ с бонусами, очередь, уведомление бармену
- Real-time статусы заказов и профиль с балансом бонусов

### Файлы
- `mini-app/index.html` — UI
- `mini-app/app.js` — логика Mini App
- `mini-app/app.css` — мобильные стили
- API: `POST /api/mini-app/auth`, `POST /api/mini-app/create-order`, `POST /api/mini-app/setup-menu-button`

### Подключение в BotFather
1. Задеплойте backend (Render) так, чтобы открывался `https://<your-server>/mini-app/`
2. В @BotFather → Bot Settings → Menu Button → Configure menu button
3. Укажите URL: `https://<your-server>/mini-app/`
4. Либо вызовите API:
```bash
curl -X POST "https://<your-server>/api/mini-app/setup-menu-button" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://<your-server>/mini-app/"}'
```

> Mini App должен открываться по HTTPS. Для GitHub Pages можно указать `https://<user>.github.io/<repo>/mini-app/`, а API оставить на Render.

## Структура проекта

```
├── index.html              # Главная страница
├── script.js               # Основная логика сайта
├── style.css               # Стили
├── mini-app/               # Telegram Mini App
├── webhook-server.js       # Webhook сервер для Telegram
├── package.json            # Зависимости Node.js
└── README.md              # Документация
```

## API Endpoints

### Webhook сервер:

- `GET /health` - Проверка состояния сервера
- `GET /test-firebase` - Тест подключения к Firebase
- `POST /telegram-webhook` - Обработка webhook от Telegram
- `GET /mini-app/` - Telegram Mini App
- `POST /api/mini-app/auth` - Авторизация Mini App (initData → custom token)
- `POST /api/mini-app/create-order` - Создание заказа из Mini App
- `POST /api/mini-app/setup-menu-button` - Настройка Menu Button бота

## Безопасность

- Все операции с Firebase требуют аутентификации
- Webhook сервер проверяет валидность callback данных
- Административные функции доступны только пользователям с ролью 'admin'

## Мониторинг

В админ-панели доступны инструменты мониторинга:

- Статус webhook сервера
- Подключение к Firebase
- Настройки Telegram webhook
- Тестирование системы

## Поддержка

При возникновении проблем:

1. Проверьте логи webhook сервера
2. Убедитесь в правильности настроек Firebase
3. Проверьте статус Telegram webhook
4. Используйте инструменты мониторинга в админ-панели

## Лицензия

MIT License
