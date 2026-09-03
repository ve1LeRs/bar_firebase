# AsafievBar — Telegram Mini App

Быстрый чеклист запуска.

## 1. Деплой

Backend (Render / Railway) уже отдаёт приложение по пути:

```text
https://<your-server>/mini-app/
```

Либо хостите папку `mini-app/` на GitHub Pages, а API оставьте на Render (`https://bar-firebase.onrender.com`).

## 2. BotFather

1. `@BotFather` → ваш бот → **Bot Settings** → **Menu Button**
2. URL: `https://<your-server>/mini-app/`
3. Текст кнопки: `AsafievBar`

Или одной командой после деплоя:

```bash
curl -X POST "https://<your-server>/api/mini-app/setup-menu-button" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://<your-server>/mini-app/"}'
```

## 3. Firebase

Custom Token auth уже используется Admin SDK на webhook-сервере.

Рекомендуемые правила (дополнительно к существующим): пользователи с `uid` вида `tg_<telegramId>` должны иметь те же права, что и обычные клиенты, на `orders`, `bills`, `bonusAccounts`.

Если listener заказов ругается на индекс, создайте composite index:

- Collection: `orders`
- Fields: `userId` Asc + `createdAt` Desc

## 4. Проверка

1. Откройте бота в Telegram → Menu Button
2. Должны загрузиться коктейли
3. После входа через Telegram можно оформить заказ
4. Бармен получает сообщение с inline-кнопками статусов
