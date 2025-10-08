# Настройка переменных окружения в Railway

## ⚠️ КРИТИЧНО: Отсутствует FIREBASE_PROJECT_ID

Ваш сервер не запускается, потому что в Railway не настроены переменные окружения Firebase.

## 🚀 Пошаговая инструкция

### Шаг 1: Откройте Railway Dashboard

1. Перейдите на https://railway.app/dashboard
2. Найдите проект: **web-production-72014**
3. Кликните на него

### Шаг 2: Перейдите в Variables

1. В верхнем меню найдите вкладку **"Variables"** (Переменные)
2. Кликните на неё

### Шаг 3: Добавьте переменные Firebase

**ВАЖНО:** Добавляйте по одной переменной!

#### 1️⃣ FIREBASE_PROJECT_ID
```
bar-menu-6145c
```

#### 2️⃣ FIREBASE_PRIVATE_KEY_ID
```
4ebdb087de715548df2f34b5b97cad165fc6c273
```

#### 3️⃣ FIREBASE_PRIVATE_KEY
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCbDxbfwbIQ33XP
GBTZFsJu4uEgmUhlRXWxo/SuJoDjytC4tnZAtaMuekDrVUSVEigKnbnna29NcHoZ
f98iAVeiKTT806Rv8Y95/JKUIGc61p1tP+cJKL/iMJ+SMU4dChVtbnWtvoWMY8vG
485inGam1SRgs6ljw8jJ4bnig6r7Se/help2GJllRCYrPocYMDt7OeelW6MlANFO
KUWcRHnLw5cX8wARoqzaLVtX71ravi2q63wo5bq2CGV2IU3ztrob1Z8dBozqFeHv
o4/RKIS2rGKRTFi6rx9N3+9ui/pEtMNKWE3IMSsZTlndLNyslnNDbZgbySAPpP0r
eyM1aLAzAgMBAAECggEAKyRzJlWz0CsEkdbu8gn5ljWtEs9jS74cRY1LRmszIG4t
Tb+CvnVrTkK4rmG+n8V5+54v+/ox8Tdy2YZxFHqQIe/aLOBMF9N7qqLCO9GaN05A
ZgXKKAu8+9ewhlIOnFjSZmy99FYWvV2E9LUsltZSX2fdY8SJRFdUlgsml6Yv3BOi
quaoC8Jj8IA//PBegH3TDjMQDqpixTdCYUZuDlkn5sbAqql1ntDmUOsFrZWuJTnm
DHn4O6/wIhLV616SFQjhEXimb8T2EcF4LfnngJ3T04j786lHtyWbUBxqlwsMBZU2
Xo8+Psw3TVYLeSA3iAvG+S/E4XXo/gfuAfvXEXlhnQKBgQDWvOn0t8fHPWPprV7/
A5Mp3/E3SYrq8ag5z/Iwe7k+ffCeAiFz8lBuXGrnO/NvpmlET4xa3SfV52lBfsLp
igqwHMgSp54U+iv9m8o2zFK77eGyApaaXmFajphc1P8x29YuRQbdkrKFEYbUhKPk
+FygpVAzXeppkg1S5X66C2oOBQKBgQC42oe4zR0yD1Ugue2puH86QAUJbYw6x2Pp
w1HCda6vOHmkPy8CmnPt+nHvy1K4fRqYajtiDM7gec9/wKL2AY6VRoYnnYUVOUEn
enaGdsCmH4lPCc2ur8qFw4QoEevQaQVGcFoxz4VJqjsC0eNkhONRtYdsr0k61xDt
4YXR5mVi1wKBgFYxqi8ifbxJtgscHh96jd2nGCm7CVnY+k+KWop/fxHId4bVEBx8
TTCfRAHhHIvaXjKfQ5VNZCoGI0e42//l+vhJ9T0Xrup4qKO5nud0CFmK2KcdRtpb
u/QffKT2kiCvPz9/UYwq0CF9sYMoYqkL0BJjiNe1gNwzVcnKeJ2w6zcJAoGBAIy2
FIAw6ptznmpV/bqm7XoKx4rAr/ECXGTSQEdVS46n37iOPBuwNLUfYmGVlTdIS9lf
bCqb81JehvwJSEMZNk8dKvu25VodhiImD1kVxlnuQZg/ryjdOb2O8eeKlMXFW7Wd
ypqGDEDh6x+fY4fdvCgzlY2+9HBsy784X6RCzERrAoGAPdQBLq7DwmwoZb3Ylpub
Zyhv5JH/1dhAVi18bAmhzBfMrt8iXwLT4N9r6uC5A6Dc72LrDhToBQ5MrEOa09Ta
HdVmi9AtpwXqVeACWyAK5kgKv+ccvXkVK1VIRrsmzPItU31KeQg4WLpSuzVz1pwN
HMwZOjlpGHhk50GnhkEx6UM=
-----END PRIVATE KEY-----
```
**ВАЖНО для FIREBASE_PRIVATE_KEY:** 
- Скопируйте ВЕСЬ ключ целиком, включая `-----BEGIN PRIVATE KEY-----` и `-----END PRIVATE KEY-----`
- НЕ добавляйте кавычки в начале и конце
- Railway сам обработает переносы строк

#### 4️⃣ FIREBASE_CLIENT_EMAIL
```
firebase-adminsdk-fbsvc@bar-menu-6145c.iam.gserviceaccount.com
```

#### 5️⃣ FIREBASE_CLIENT_ID
```
109441409973504780055
```

#### 6️⃣ FIREBASE_CLIENT_X509_CERT_URL
```
https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40bar-menu-6145c.iam.gserviceaccount.com
```

### Шаг 4: Добавьте Telegram переменные (если ещё не добавлены)

#### 7️⃣ TELEGRAM_BOT_TOKEN
```
8326139522:AAG2fwHYd1vRPx0cUXt4ATaFYTNxmzInWJo
```

#### 8️⃣ TELEGRAM_CHAT_ID
```
1743362083
```

## 📝 Как добавить переменную в Railway:

1. Нажмите кнопку **"New Variable"** или **"+ Variable"**
2. В поле **"Key"** введите имя переменной (например: `FIREBASE_PROJECT_ID`)
3. В поле **"Value"** вставьте значение (например: `bar-menu-6145c`)
4. Нажмите **"Add"** или **"Save"**
5. Повторите для всех переменных

## ⚡ После добавления всех переменных:

1. Railway автоматически перезапустит ваш сервер
2. Подождите 1-2 минуты
3. Проверьте логи - больше не должно быть ошибки про FIREBASE_PROJECT_ID

## ✅ Проверка что всё работает:

### 1. Проверьте логи Railway
В логах должна быть строка:
```
✅ Firebase Admin SDK инициализирован успешно
🚀 Webhook сервер запущен на порту 3000
```

### 2. Откройте в браузере:
```
https://web-production-72014.up.railway.app/health
```
Должен вернуть:
```json
{
  "status": "OK",
  "timestamp": "2025-10-08T...",
  "service": "Asafiev Bar Webhook Server"
}
```

### 3. Проверьте Firebase:
```
https://web-production-72014.up.railway.app/test-firebase
```
Должен вернуть:
```json
{
  "success": true,
  "message": "Firebase connection successful"
}
```

## 🆘 Если не работает:

1. Убедитесь, что добавили **ВСЕ** переменные из списка
2. Проверьте, что нет лишних пробелов в начале или конце значений
3. Для `FIREBASE_PRIVATE_KEY` убедитесь, что скопировали ВЕСЬ ключ
4. Проверьте логи Railway на наличие других ошибок

## 📸 Скриншот как должно выглядеть в Railway:

В разделе Variables у вас должно быть 8 переменных:
- ✅ FIREBASE_PROJECT_ID
- ✅ FIREBASE_PRIVATE_KEY_ID
- ✅ FIREBASE_PRIVATE_KEY
- ✅ FIREBASE_CLIENT_EMAIL
- ✅ FIREBASE_CLIENT_ID
- ✅ FIREBASE_CLIENT_X509_CERT_URL
- ✅ TELEGRAM_BOT_TOKEN
- ✅ TELEGRAM_CHAT_ID

После этого сервер заработает!

