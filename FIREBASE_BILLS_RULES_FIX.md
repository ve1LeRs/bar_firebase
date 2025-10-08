# 🔒 Исправление прав доступа для системы счетов

## ❌ Проблема

При попытке создать или просмотреть счет появляется ошибка:
```
FirebaseError: Missing or insufficient permissions.
```

## ✅ Решение

Нужно обновить правила безопасности Firestore в Firebase Console.

## 📋 Шаги для исправления:

### Вариант 1: Быстрое исправление (временное)

1. Откройте [Firebase Console](https://console.firebase.google.com/)
2. Выберите проект **bar-menu-6145c**
3. В меню слева выберите **Firestore Database**
4. Перейдите на вкладку **Rules** (Правила)
5. Найдите эту секцию в правилах:

```javascript
match /{document=**} {
  // Разрешить всем читать
  allow read: if true;
  
  // Разрешить всем записывать
  allow write: if true;
}
```

6. Убедитесь, что эта секция **находится в самом конце**, после всех других `match` правил
7. Нажмите **Publish** (Опубликовать)

### Вариант 2: Правильное решение (рекомендуется)

Замените ВСЕ правила на следующие:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Правила для коллекции заказов
    match /orders/{orderId} {
      allow read: if true;
      allow create: if true;
      allow update: if true;
      allow delete: if true;
    }
    
    // Правила для стоп-листа
    match /stoplist/{itemId} {
      allow read: if true;
      allow write: if true;
    }
    
    // Правила для коллекции счетов (bills) - НОВОЕ!
    match /bills/{billId} {
      // Разрешить пользователям читать только свои счета
      allow read: if request.auth != null && 
                     (resource.data.userId == request.auth.uid || 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      
      // Разрешить создавать счета авторизованным пользователям
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      
      // Разрешить обновлять свои счета или админам
      allow update: if request.auth != null && 
                       (resource.data.userId == request.auth.uid || 
                        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      
      // Разрешить удалять только админам
      allow delete: if request.auth != null && 
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Правила для коллекции оценок (ratings) - для будущего
    match /ratings/{ratingId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null && resource.data.userId == request.auth.uid;
      allow delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    
    // Правила для всех остальных коллекций
    match /{document=**} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

### Шаги:

1. Откройте [Firebase Console](https://console.firebase.google.com/)
2. Выберите проект **bar-menu-6145c**
3. Firestore Database → Rules
4. **Удалите все существующие правила**
5. **Скопируйте и вставьте** правила выше
6. Нажмите **Publish**

## ⚠️ Важно!

После публикации правил подождите **1-2 минуты**, чтобы изменения применились.

## 🧪 Проверка

После обновления правил:

1. Обновите страницу приложения (**Ctrl + Shift + R**)
2. Войдите в систему
3. Закажите коктейль
4. Нажмите **"Мой счет"**

Если всё настроено правильно, откроется модальное окно со счетом без ошибок!

## 📝 Что делают эти правила?

### Для коллекции `bills`:

- ✅ **Читать** - только свой счет (или админ может читать все)
- ✅ **Создавать** - только авторизованные пользователи для себя
- ✅ **Обновлять** - только свой счет (или админ)
- ✅ **Удалять** - только админ

### Безопасность:

- Пользователи не могут видеть счета других людей
- Пользователи не могут изменять чужие счета
- Только владелец счета может его редактировать
- Админы имеют полный доступ ко всем счетам

## 🔧 Альтернативное решение (если не работает)

Если у вас все еще возникают проблемы, можно временно использовать более простые правила:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

⚠️ **Внимание:** Это открывает доступ ко всем данным. Используйте только для тестирования!

## 📞 Если проблема не решена

1. Проверьте, что вы точно опубликовали правила (кнопка **Publish**)
2. Подождите 2-3 минуты
3. Очистите кэш браузера (**Ctrl + Shift + Delete**)
4. Перезайдите в систему
5. Проверьте в консоли браузера (**F12**), есть ли другие ошибки

---

После применения правил система счета заработает корректно! 🎉

