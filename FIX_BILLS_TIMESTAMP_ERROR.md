# 🔧 Исправление ошибки серверной временной метки в счетах

## Проблема

Ошибка:
```
FirebaseError: Function addDoc() called with invalid data. 
FieldValue.serverTimestamp() is not currently supported inside arrays 
(found in document bills/ekAyRpThUSplgLkytkzt)
```

## Причина

Firebase Firestore **не поддерживает** использование `FieldValue.serverTimestamp()` внутри массивов. 

В коде при создании счета использовался `serverTimestamp()` для поля `timestamp` внутри объекта `billItem`, который затем добавлялся в массив `items`:

```javascript
// ❌ НЕПРАВИЛЬНО
const billItem = {
  orderId: orderId,
  cocktailName: orderData.name,
  timestamp: firebase.firestore.FieldValue.serverTimestamp(), // Ошибка!
  // ...
};

await db.collection('bills').add({
  items: [billItem], // serverTimestamp() внутри массива
  // ...
});
```

## Решение

Заменить `serverTimestamp()` на `new Date()` для всех полей, которые находятся внутри массивов:

```javascript
// ✅ ПРАВИЛЬНО
const billItem = {
  orderId: orderId,
  cocktailName: orderData.name,
  timestamp: new Date(), // Используем обычный Date объект
  // ...
};

await db.collection('bills').add({
  items: [billItem], // Теперь работает!
  createdAt: firebase.firestore.FieldValue.serverTimestamp(), // Это ОК - не в массиве
  updatedAt: firebase.firestore.FieldValue.serverTimestamp(), // Это ОК - не в массиве
  // ...
});
```

## Что было исправлено

**Файл:** `script.js`  
**Строка:** 2538

**Было:**
```javascript
timestamp: firebase.firestore.FieldValue.serverTimestamp(),
```

**Стало:**
```javascript
timestamp: new Date(), // Используем new Date() вместо serverTimestamp() для элементов массива
```

## Важно понимать

### Где можно использовать serverTimestamp():
✅ В полях документа верхнего уровня
```javascript
{
  createdAt: firebase.firestore.FieldValue.serverTimestamp(), // ОК
  updatedAt: firebase.firestore.FieldValue.serverTimestamp(), // ОК
  items: [...]
}
```

### Где НЕЛЬЗЯ использовать serverTimestamp():
❌ Внутри массивов
```javascript
{
  items: [
    {
      timestamp: firebase.firestore.FieldValue.serverTimestamp() // ОШИБКА!
    }
  ]
}
```

❌ Внутри вложенных объектов в массивах
```javascript
{
  items: [
    {
      data: {
        timestamp: firebase.firestore.FieldValue.serverTimestamp() // ОШИБКА!
      }
    }
  ]
}
```

## Альтернативные решения

Если нужна именно серверная временная метка для элементов массива, можно:

1. **Использовать `new Date()`** (текущее решение)
   - Временная метка создается на клиенте
   - Может быть небольшая разница с серверным временем

2. **Вынести временную метку из массива**
   - Хранить отдельное поле `itemsTimestamp` на уровне документа
   - Использовать `serverTimestamp()` для этого поля

3. **Создавать отдельные документы**
   - Вместо массива создавать подколлекцию
   - Каждый элемент - отдельный документ с `serverTimestamp()`

## Проверка

После исправления:
1. ✅ Счета создаются без ошибок
2. ✅ Временные метки корректно сохраняются
3. ✅ Все операции со счетами работают

## Дополнительная информация

Эта ошибка может возникнуть в любом месте, где:
- Используются массивы в Firestore
- Внутри массивов есть временные метки
- Используется `FieldValue.serverTimestamp()`

Всегда используйте `new Date()` для временных меток внутри массивов!

---

**Исправлено:** ✅  
**Дата:** 2025-10-08  
**Версия:** 1.0

