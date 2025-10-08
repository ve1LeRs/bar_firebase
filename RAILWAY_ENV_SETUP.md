# Настройка переменных окружения на Railway

## Проблема
Railway сервер работает, но не может подключиться к Firebase из-за отсутствия переменных окружения.

## Решение
Добавить переменные окружения Firebase в настройки Railway проекта.

## Пошаговая инструкция

### 1. Откройте Railway Dashboard

1. Перейдите на [Railway.app](https://railway.app)
2. Войдите в аккаунт
3. Найдите проект `web-production-72014`
4. Откройте его

### 2. Добавьте переменные окружения

В настройках проекта Railway добавьте следующие переменные:

#### Firebase Service Account:
```
FIREBASE_PRIVATE_KEY_ID=4ebdb087de715548df2f34b5b97cad165fc6c273
```

```
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCbDxbfwbIQ33XP\nGBTZFsJu4uEgmUhlRXWxo/SuJoDjytC4tnZAtaMuekDrVUSVEigKnbnna29NcHoZ\nf98iAVeiKTT806Rv8Y95/JKUIGc61p1tP+cJKL/iMJ+SMU4dChVtbnWtvoWMY8vG\n485inGam1SRgs6ljw8jJ4bnig6r7Se/help2GJllRCYrPocYMDt7OeelW6MlANFO\nKUWcRHnLw5cX8wARoqzaLVtX71ravi2q63wo5bq2CGV2IU3ztrob1Z8dBozqFeHv\no4/RKIS2rGKRTFi6rx9N3+9ui/pEtMNKWE3IMSsZTlndLNyslnNDbZgbySAPpP0r\neyM1aLAzAgMBAAECggEAKyRzJlWz0CsEkdbu8gn5ljWtEs9jS74cRY1LRmszIG4t\nTb+CvnVrTkK4rmG+n8V5+54v+/ox8Tdy2YZxFHqQIe/aLOBMF9N7qqLCO9GaN05A\nZgXKKAu8+9ewhlIOnFjSZmy99FYWvV2E9LUsltZSX2fdY8SJRFdUlgsml6Yv3BOi\nquaoC8Jj8IA//PBegH3TDjMQDqpixTdCYUZuDlkn5sbAqql1ntDmUOsFrZWuJTnm\nDHn4O6/wIhLV616SFQjhEXimb8T2EcF4LfnngJ3T04j786lHtyWbUBxqlwsMBZU2\nXo8+Psw3TVYLeSA3iAvG+S/E4XXo/gfuAfvXEXlhnQKBgQDWvOn0t8fHPWPprV7/\nA5Mp3/E3SYrq8ag5z/Iwe7k+ffCeAiFz8lBuXGrnO/NvpmlET4xa3SfV52lBfsLp\nigqwHMgSp54U+iv9m8o2zFK77eGyApaaXmFajphc1P8x29YuRQbdkrKFEYbUhKPk\n+FygpVAzXeppkg1S5X66C2oOBQKBgQC42oe4zR0yD1Ugue2puH86QAUJbYw6x2Pp\nw1HCda6vOHmkPy8CmnPt+nHvy1K4fRqYajtiDM7gec9/wKL2AY6VRoYnnYUVOUEn\nenaGdsCmH4lPCc2ur8qFw4QoEevQaQVGcFoxz4VJqjsC0eNkhONRtYdsr0k61xDt\n4YXR5mVi1wKBgFYxqi8ifbxJtgscHh96jd2nGCm7CVnY+k+KWop/fxHId4bVEBx8\nTTCfRAHhHIvaXjKfQ5VNZCoGI0e42//l+vhJ9T0Xrup4qKO5nud0CFmK2KcdRtpb\nu/QffKT2kiCvPz9/UYwq0CF9sYMoYqkL0BJjiNe1gNwzVcnKeJ2w6zcJAoGBAIy2\nFIAw6ptznmpV/bqm7XoKx4rAr/ECXGTSQEdVS46n37iOPBuwNLUfYmGVlTdIS9lf\nbCqb81JehvwJSEMZNk8dKvu25VodhiImD1kVxlnuQZg/ryjdOb2O8eeKlMXFW7Wd\nypqGDEDh6x+fY4fdvCgzlY2+9HBsy784X6RCzERrAoGAPdQBLq7DwmwoZb3Ylpub\nZyhv5JH/1dhAVi18bAmhzBfMrt8iXwLT4N9r6uC5A6Dc72LrDhToBQ5MrEOa09Ta\nHdVmi9AtpwXqVeACWyAK5kgKv+ccvXkVK1VIRrsmzPItU31KeQg4WLpSuzVz1pwN\nHMwZOjlpGHhk50GnhkEx6UM=\n-----END PRIVATE KEY-----\n"
```

```
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@bar-menu-6145c.iam.gserviceaccount.com
```

```
FIREBASE_CLIENT_ID=109441409973504780055
```

```
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40bar-menu-6145c.iam.gserviceaccount.com
```

#### Telegram Bot:
```
TELEGRAM_BOT_TOKEN=8326139522:AAG2fwHYd1vRPx0cUXt4ATaFYTNxmzInWJo
```

```
TELEGRAM_CHAT_ID=1743362083
```

#### Server:
```
PORT=3000
```

### 3. Как добавить переменные в Railway

1. В Railway dashboard откройте ваш проект
2. Перейдите в раздел "Variables"
3. Нажмите "New Variable"
4. Добавьте каждую переменную по отдельности:
   - **Name**: `FIREBASE_PRIVATE_KEY_ID`
   - **Value**: `4ebdb087de715548df2f34b5b97cad165fc6c273`
   - Нажмите "Add"

5. Повторите для всех переменных выше

### 4. Перезапуск сервера

После добавления всех переменных:
1. Railway автоматически перезапустит сервер
2. Дождитесь завершения развертывания
3. Проверьте логи на наличие ошибок

### 5. Проверка работы

После настройки переменных проверьте:

1. **Health endpoint:**
   ```
   https://web-production-72014.up.railway.app/health
   ```
   Должен вернуть: `{"status":"OK"}`

2. **Firebase подключение:**
   ```
   https://web-production-72014.up.railway.app/test-firebase
   ```
   Должен вернуть: `{"success":true}`

3. **Webhook в Telegram:**
   ```bash
   curl "https://api.telegram.org/bot8326139522:AAG2fwHYd1vRPx0cUXt4ATaFYTNxmzInWJo/getWebhookInfo"
   ```
   Должен показать `"pending_update_count": 0` и отсутствие ошибок

### 6. Тестирование

После успешной настройки:

1. **Разместите заказ на сайте**
2. **Проверьте, что заказ приходит в Telegram**
3. **Нажмите кнопку в Telegram**
4. **Проверьте, что статус обновляется на сайте**

## Если что-то не работает

1. **Проверьте логи в Railway dashboard**
2. **Убедитесь, что все переменные добавлены правильно**
3. **Проверьте, что нет лишних пробелов в значениях переменных**
4. **Убедитесь, что сервер перезапустился после добавления переменных**

## Результат

После успешной настройки:
- ✅ Railway сервер работает
- ✅ Firebase подключение настроено
- ✅ Telegram webhook работает
- ✅ Кнопки в Telegram обрабатываются
- ✅ Статусы заказов обновляются в реальном времени
