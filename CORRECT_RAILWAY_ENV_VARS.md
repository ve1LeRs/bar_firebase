# ✅ Правильные переменные окружения для Railway

## Проблема
На Railway используются переменные для проекта `bar-menu-6145c`, но локально используется `bar-menu-2`.

## Решение: Используйте эти переменные (из service-private-key.json)

Скопируйте эти переменные в Railway:

### FIREBASE_PROJECT_ID
```
bar-menu-2
```

### FIREBASE_PRIVATE_KEY_ID
```
edd2a998036e8d43d3a12a3241b9a190597c810d
```

### FIREBASE_PRIVATE_KEY
```
"-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCamsBeq9/bbFDX\nlf99cu3KutpAEg5Ty9hh1i3/FaHvDWsX3LdmWDXer7+5rMu3EBbjsMc03HhgwDtD\naVIKWSY19jKp8puwvTlg6iKhbaX0k4iQtoN8jX/h0xQGl/iMLtpUnmxrJepMgCOJ\ng5yD+OdpRRT4EJElfUbDRJu/LLJYHGek4QFdic2X3J4E3Ig15sgPqkbUIfuWOcOL\nVv9vU3NeIjRMCkqm427etNHGoQxYMv2Yyk2y0Ec9UPfBoMI39gquKhSOx6xAr0oL\nyfxSlE9VfKYP07nIxQ2NbyDd1w+f2zYH4Bu+J/gwiXehZDNDmkbkiAjDdSv+wP/2\nWEYiAJiTAgMBAAECggEABWCfk0toIGIul6kMd2kRc003fSYDoI+FCbYg6G/wr3do\ng652JJWp3gJ/6S3k8guZuDa0XxbSCw90oD4gD+MU7KiRD480MhwKzF+ob7P4Iz8k\nb2Ahx6nGSm0Ek8wiZYHVrz7JZ5qsgRet5MESpxZ3uhYgihZNbh/i37TZs/cShvT8\nH1ndoiK5mBDurNg9jMBJ4mXd9SQoyojpRmVbKWLlPuRsJzV7tn4uXN3eqoNthOyL\nXbxj4JApTSf1/OOBKJyjt3+vj3ZxkHZ1UJXbi5UTj5kAaNmyitkp25ZPj3a1hir2\naE7w8DJJjVZ86uPB3YHBqR1Rf322Op4nGT/2W3+9EQKBgQDNEMNPX2Xew8EhoEma\npyO73m5QFTaTAnxDqxGc/I3wNOZFRWqz7Ek/MQkEZjhY3CE3xT4FQzrb5JqvgYfk\nzwgDT9bIBouUTtpZ6BIbPi+UoNPF7OoFx1bg2czB4b/vjCDzdbL19Je5vZJb9BIr\nXnaXq04ARO5rGZJBbchmi8SL8QKBgQDBAWPxq3GClvRDpcbTKrdL55cA6JJbo+O0\nZoRwApJ0arByA+mpthDaYIwg44PRth/HQT3TMcFYjk7x9euZu5vz7JIu7Exf8WFJ\n3dhSHyk/X/l0K+Kj1BeQZpLpmEbbP2p1ajZw9deyyImU7KQY75HzEgjUr84K7HCH\n6Ghi0eoAwwKBgDLkqyRiz7yGpsL6renE+3hfzs7vRNkdb8u3hCqK/4sTBedBQCch\nSFh3if5ehDOBhnj56deShOQYC0/tfNWLkDiKMwr3nOKU41oW34+FUne3pndjwfzn\nKSeqxkeECIeiJndlyaGDL7i4VL+fhnbe/d3MdRJaCTXpZcP5RBg3LfNxAoGATO9M\n86yvlqqtu7l9Q/enES7D1qzeioEN539mE3AzCQzuQMSmg+v7U9Fgikum5BWBHWA4\nUNNoivBPL8wjmihaxiTrMKEo4KXLbjJsZG/fdU/AlDpaIYwNyJXawhrdQ9BHk34/\nLVASJ0Yg8ahS0U3OE+KAeqeJrnkJcmOGGL4sVRkCgYAZG5GYeDCMD1XozduOVNWc\n45/A5gB1orgLR9tUfJ1xbOZ0VEpoE0eAT34Iffaz9OjZUOnZSpBo4aIoIyDwmkPc\nFLQskOn9gBG4LFGxJDUbYfxqZQP3+/UFlUjLHwvjCuSZhDErhmQwCnI3RJ3SpKuU\nW+L+mYDnzo+PSAB+hhIDDA==\n-----END PRIVATE KEY-----\n"
```

### FIREBASE_CLIENT_EMAIL
```
firebase-adminsdk-fbsvc@bar-menu-2.iam.gserviceaccount.com
```

### FIREBASE_CLIENT_ID
```
100753734449970105354
```

### FIREBASE_CLIENT_X509_CERT_URL
```
https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40bar-menu-2.iam.gserviceaccount.com
```

### TELEGRAM_BOT_TOKEN (если еще не добавлен)
```
8326139522:AAG2fwHYd1vRPx0cUXt4ATaFYTNxmzInWJo
```

### TELEGRAM_CHAT_ID (если еще не добавлен)
```
1743362083
```

## Как добавить в Railway

1. Откройте ваш проект на Railway
2. Нажмите на ваш сервис
3. Перейдите во вкладку **Variables**
4. Удалите старые переменные Firebase (если есть)
5. Добавьте новые переменные, используя кнопку **+ New Variable**
6. **ВАЖНО**: Сохраняйте кавычки вокруг `FIREBASE_PRIVATE_KEY`
7. После добавления всех переменных Railway автоматически перезапустит сервис

## Проверка после обновления

1. Дождитесь завершения развертывания на Railway
2. Откройте: `https://ваш-домен.railway.app/test-firebase`
3. Вы должны увидеть JSON с `"success": true` и `"projectId": "bar-menu-2"`
4. Проверьте панель администратора - статус Firebase должен быть "онлайн" ✅

## Если проблема остается

1. Проверьте логи Railway на наличие ошибок
2. Убедитесь, что все 6 переменных Firebase установлены
3. Проверьте, что `FIREBASE_PRIVATE_KEY` содержит кавычки
4. Убедитесь, что нет лишних пробелов в начале или конце значений

