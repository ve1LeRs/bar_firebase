# Как получить Firebase конфигурацию для проекта bar-menu-2

## 📋 Инструкция

### Шаг 1: Откройте Firebase Console
1. Перейдите на https://console.firebase.google.com
2. Войдите в аккаунт Google
3. Откройте проект **bar-menu-2**

### Шаг 2: Откройте настройки проекта
1. Кликните на **иконку шестеренки ⚙️** слева вверху (рядом с "Project Overview")
2. Выберите **"Project settings"** (Настройки проекта)

### Шаг 3: Найдите Web App конфигурацию
1. Прокрутите вниз до раздела **"Your apps"** (Ваши приложения)
2. Если у вас уже есть Web App:
   - Найдите секцию с **иконкой </> (Web)**
   - Кликните на иконку **{...}** чтобы показать конфигурацию
3. Если у вас НЕТ Web App:
   - Кликните **"Add app"** (Добавить приложение)
   - Выберите **Web (иконка </>)**
   - Введите название (например: "Bar Menu Web")
   - НЕ ставьте галочку "Firebase Hosting"
   - Кликните **"Register app"**

### Шаг 4: Скопируйте конфигурацию
Вы увидите код вида:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "bar-menu-2.firebaseapp.com",
  projectId: "bar-menu-2",
  storageBucket: "bar-menu-2.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:..."
};
```

### Шаг 5: Обновите script.js
1. Откройте файл `script.js`
2. Найдите в самом начале файла:
```javascript
// 🔥 ТВОИ КЛЮЧИ FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyDx_YOUR_NEW_API_KEY", // ⚠️ Замените
  authDomain: "bar-menu-2.firebaseapp.com",
  projectId: "bar-menu-2",
  storageBucket: "bar-menu-2.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID", // ⚠️ Замените
  appId: "YOUR_APP_ID" // ⚠️ Замените
};
```

3. Замените на ваши ключи из Firebase Console

### Пример:
```javascript
// 🔥 ТВОИ КЛЮЧИ FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyDxABCDEFGHIJKLMNOPQRSTUVWXYZ12345",
  authDomain: "bar-menu-2.firebaseapp.com",
  projectId: "bar-menu-2",
  storageBucket: "bar-menu-2.appspot.com",
  messagingSenderId: "987654321012",
  appId: "1:987654321012:web:abcdef123456789"
};
```

## ✅ После обновления:

1. Сохраните файл `script.js`
2. Закоммитьте изменения:
   ```bash
   git add script.js
   git commit -m "Обновление Firebase config на bar-menu-2"
   git push origin main
   ```

3. Откройте `index.html` в браузере
4. Проверьте консоль - не должно быть ошибок Firebase

## 🎯 Быстрая проверка:

Откройте `index.html` и в консоли браузера введите:
```javascript
console.log(firebaseConfig);
```

Должен вывести вашу конфигурацию с правильным `projectId: "bar-menu-2"`

---

**💡 Важно:** Эти ключи безопасны для публичного использования в frontend коде. Они НЕ секретные.

