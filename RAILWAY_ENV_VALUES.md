# Railway Environment Variables - Exact Values

Copy and paste these exact values into your Railway project environment variables:

## Firebase Configuration

```
FIREBASE_PRIVATE_KEY_ID=3c4560703da3667b9a61117c3e37b0327052b24e
```

```
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCrPnvmRAG2iUkj\nojQgCi21lj8UDZRjW7ivzVWHC0Qm4/dOzJr5bhGjAT+E3iS2XqHI65/ElOaVVL/Y\n8XpSu2/kes0fRdW6Z6XhiqdcwpKNzvesgjGh6PAKOWwkUmq72WHQJShEiAYGP1bN\n4vhmcplJgltppPAs9XWRaEii4DJoM6xgXuGbQz+W/3mBwDvRL5aeIIUuHUeDtxUM\nr42O8WsC9hGGz8vh/IdzB3lOrsE1HWIBe9fipmxoT7gZNQOMbiyoseqiPuefXkP7\nTmsDYs61M6pBADED7q0vUR09B20l6Du9e7hWOosm50zTRgsddab85yEPIzNanOJe\nuRkyE71vAgMBAAECggEAP0SzNzS6I0xeuu0jcBECqVwNCyYnRHxvZHirWF0nvWyt\ngy4iNfTeTEjaRIdkrgKRqK+xlEplVRf+V7OEO8vnv9VFMwA0wo2n4og9ZI644e7t\nYA2sM8Nh6I0lsNfIeoYK1wHbelJ9U1KUijYJC6TckKW6i3I2kI3R9bq/V3oY9ZlB\nlpRHY42+3WAuboDtPxk6Ue6xDcsEhrejuxnsNC+HjaNRxnutCUrD3lhzdRqh0Kbr\n5zw93eUoaAubunidOAwGzqJye4XxNgA5s6QZtyNuQKJ6H6BifRmkF90KaHKFFpjW\numaLPdE23m4zvBPBaiBkzUTWGQpszKPSYBQI/deeFQKBgQDxYfjhkXfPhOp0MBIB\nBzltiazKi/6TsOyZMVWhbhiG5N6aDmYGIWZRcJuYVrJu57cZjOEize4TYzVtP8R2\neABhpEgvKyiobVzf6k+uyLhLttHTGzq1IEgj591w1mYsFsBNfRIMDnM0xBbneHVB\nqRst7pRz1PxFS/y5PDOJPOk5TQKBgQC1nTCf6JWtSOfqLV16iUX2ouGD5MudOixr\nIjp7QlwlxulGncxneKnSTEc/K4wdfTeL0+uSJyHObpSKZohpVl4gPyWALJ08SzNd\nkM3gHYl2fanZB0OZIMOf76klmEunEANcoekaarH33YOGpnZ1uzEj1sXh8C+Rxfw2\nA2sE4FDTqwKBgDJ7NNun2pCx0X6fFwTUB/SamGJ7yLAGjlSzdp8eMU70yoEZhci+\nb3GUxVWkvAhpuWdEiUkIHEQ9uUyxy1qjWiERhG8o7YXb6VKC5Es/exuKjnNB/JMo\nvy2TLkKM9C1ATNNn1sBivUFJySh7jro+rYp7nNxkrKWpcJ8ksfp/nJ75AoGABYAy\nVdWUmwAHTjd7ileYD+VVEUqfxC5b5A7QWKVk5xwEOshSxZuJAT6gNdCa2NXPFeQg\nUXfv9TGyPBLo9M/R4AYpm50+UfIxJxdYtP4QCM+7kkA/EudEJZb7t5DKUdARWf/p\ncIxkwY4rCqwGEIDP9zbtHW/J8Q9fGT+3QRmOOSsCgYEAgIY53cdLYwpHmrSurrsV\n06lPEBKs+teOWUIuxVCcCU6spl4/DP3hQQGU+oO8aRWxmM6s60mjPLVWC38DnLg2\nR9BM9CuSGtKoXvGB9VbaAwyuDKMGdzoRSY5ElQ9iC0xoULysbLg3Vhe/HSO3FcrC\nlZHT6lIRfcYHUSLeEX3ZqWQ=\n-----END PRIVATE KEY-----\n"
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

## How to Add These to Railway

1. Go to your Railway project dashboard
2. Click on your service
3. Go to the **Variables** tab
4. Click **+ New Variable** for each one
5. Copy and paste the exact values above
6. **Important**: Keep the quotes around the `FIREBASE_PRIVATE_KEY` value
7. Save all variables
8. Railway will automatically redeploy your service

## Test the Connection

After adding these variables and redeploying:

1. Visit: `https://your-railway-app.railway.app/test-firebase`
2. You should see a JSON response with `"success": true`
3. Check your frontend admin panel - Firebase status should show "online"

## Troubleshooting

If you still get errors:
- Check Railway logs for detailed error messages
- Verify all 5 variables are set correctly
- Make sure the `FIREBASE_PRIVATE_KEY` has quotes around it
- Ensure there are no extra spaces or characters
