# Asafiev Bar - Система управления заказами через Telegram

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

#### Развертывание на Railway:

**Быстрый старт:**
1. Создайте аккаунт на [Railway.app](https://railway.app)
2. Подключите GitHub репозиторий
3. Настройте переменные окружения (см. `RAILWAY_DEPLOY.md`)
4. Деплой автоматически запустится

**Подробная инструкция:** См. файл `RAILWAY_DEPLOY.md`

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
    "url": "https://your-webhook-server.railway.app/telegram-webhook",
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

## Структура проекта

```
├── index.html              # Главная страница
├── script.js               # Основная логика сайта
├── style.css               # Стили
├── webhook-server.js       # Webhook сервер для Telegram
├── package.json            # Зависимости Node.js
└── README.md              # Документация
```

## API Endpoints

### Webhook сервер:

- `GET /health` - Проверка состояния сервера
- `GET /test-firebase` - Тест подключения к Firebase
- `POST /telegram-webhook` - Обработка webhook от Telegram

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
