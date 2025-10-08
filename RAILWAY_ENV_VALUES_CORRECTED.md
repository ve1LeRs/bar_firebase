# Railway Environment Variables - CORRECTED VALUES

The previous environment variables were incorrect. Use these CORRECTED values that match your working local service account:

## Firebase Configuration - CORRECTED VALUES

```
FIREBASE_PRIVATE_KEY_ID=e7b9075cca0005b3c777c6946cdafb7690d13ed5
```

```
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCzN6Oos88yo3Fg\npf5zA4RcvBKVJzHHlceZusKykUrsQ1d4mpN/yJWPtaMTWY8bT5qWBtz2ItRSuzcB\ntc4Fhr921cNn2bxVmra8TZcNw9245QJxXwqR0p9MkCEFBtHdL6jvGZEs9RMjIi3o\nLPSIDvWG6I1iSohrkiLH+UWmNXyN8QoVZmmWkzuRBywj/wXHeb1D2R0IEgOlgvAh\nAfrbQcx1AQ/wAB8Dsczw+arzq+yBM7vNNikzHN/oSXhahb5ErLFKOC9htXOr/BJ8\nJU0mhVR+O23XMzsd2t2TzlqEWDQ31VCz+ScgABUc0Vn9U2QxJ1DvNLu9V3DxJNcZ\nni+beuv/AgMBAAECggEAUayapiiD1dUMt3oOswW4TbbcVSMOmaGV3GZzkoOKfI/Y\nDjuL2uFj36Fsl0XqZQzrK1InYvjOgIGXeO0M3hHhsduLeQmOvgiLHNfTbk+D/V5I\ntbgVjg1J0c+hbLQF8mJk/8pMEgwCU7Gg8D2El3kRxhC3VkMXVsa7mRzt8+hOQjUD\nH0BXerhQ4QhozwObTM5yTxJr/tWm0EqFsh7RXu9KRLFK4llxeM7UHFHF7gw9wsjQ\nOEZQCjde9IX6qLABuaaW75YQ8CaKGRHz1wAflMhoBfv3xvI4Mxz0TMegC/Nc7Ui1\nwmeKjCouUeEvRWXkA1+7PHoEAI29ORM4aU+9MIMB2QKBgQDY0V8yBVuRg2K8evPT\nBMa1sPw6FgybWx+Q+5NZ6Ed63ZcNI+yvAD0+WRTHTFJnjmbdyMfTROsIWwFzQH0E\nQQxBwLstYsWXBUiVKz7WchrQ3kYZAZzXhrC0UP9dn53R8W0FXvEW5rO+IkCc03dU\n20iK79Xa1RYEDmYsVJLsrprnUwKBgQDTmsHtwBq46bnZRc0hbP8q8XD0qP8TgOG/\nXMxt3blLevGjhXQza6vrgVxud82TqkpZ/gg/lsoPD4yL0fgcoVqKPmup2t+OnwDu\nqenyfiR6vdi9TW6OieC37K0FasEl0Nz+GnyZgTstASKhWmXOZ8LB0B1dHj1zPRmY\nnqBAqzvvJQKBgQC/3qirj2o1H1vlB7l16Cgg6XqLvK9zW/RXTQpc6d03sZjWnA/7\n3e5Ummh05emWksIdSmzrXXXQcxiZcVwww4+hMHlz9JB+0MImn5qAE4H/jHPj9TVi\n1WLSb0tNAs+a1ldwBVC8v3QYsh8TqV9UzKkpqoxJl4BgHo30dPOAWBPk2QKBgBb3\nX/7276+MJpCvY8Ex/Evj4pebU/wA6/+CCeoOu5K2qE1QKbl/ASzRYH/Y3uYdAG7e\nBHUqX4nc7SsrwdsRpCsG9VZ9G/B1z3sX0/1utXTg8AozwkEUM+CifnDtEkORdLrb\nkxRyE0MiMWkDz7LkTh4NAXLe2lqMkh+fb9M1Ao9FAoGAYDC1ujVegBC6U2gg7zRj\nCrPTbPn1t6K0bMSOKUOR5v3eXHC4hE3k6MafBdxSv/2OzYN9qcieDgi3SBS6GDF4\nuPw5C2rxSCxH6ZzrcQSOHUTQHg86+gbHeytyjj20G2b0e85jJY5wp0RSz7NTQ1SD\n4grduQxXD+JrV5yGSol98UA=\n-----END PRIVATE KEY-----\n"
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

## How to Update Railway Environment Variables

1. Go to your Railway project dashboard
2. Click on your service
3. Go to the **Variables** tab
4. **DELETE** the old Firebase variables:
   - FIREBASE_PRIVATE_KEY_ID
   - FIREBASE_PRIVATE_KEY
   - FIREBASE_CLIENT_EMAIL
   - FIREBASE_CLIENT_ID
   - FIREBASE_CLIENT_X509_CERT_URL
5. **ADD** the new corrected variables with the values above
6. **Important**: Keep the quotes around the `FIREBASE_PRIVATE_KEY` value
7. Save all variables
8. Railway will automatically redeploy your service

## Test the Connection

After updating these variables and redeploying:

1. Visit: `https://your-railway-app.railway.app/test-firebase`
2. You should see a JSON response with `"success": true`
3. Check your frontend admin panel - Firebase status should show "online"

## What Was Wrong

The previous environment variables were using a different service account key that doesn't have the correct permissions for your Firebase project. The corrected values above match your working local `service-private-key.json` file.

## Verification

You can verify these values match your local file by checking:
- `service-private-key.json` in your project root
- The `private_key_id` should be `e7b9075cca0005b3c777c6946cdafb7690d13ed5`
- The `client_email` should be `firebase-adminsdk-fbsvc@bar-menu-6145c.iam.gserviceaccount.com`
