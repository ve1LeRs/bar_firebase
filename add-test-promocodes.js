// Скрипт для добавления тестовых промокодов в Firebase
// Запустите этот файл в консоли браузера на странице приложения

async function addTestPromocodes() {
  console.log('🎯 Начинаем добавление тестовых промокодов...');
  
  const testPromocodes = [
    {
      code: 'WELCOME10',
      discount: 10,
      description: 'Скидка для новых клиентов',
      maxUses: 0,
      active: true,
      expiryDate: null
    },
    {
      code: 'HAPPY20',
      discount: 20,
      description: 'Happy Hour скидка',
      maxUses: 50,
      active: true,
      expiryDate: new Date('2025-12-31')
    },
    {
      code: 'VIP30',
      discount: 30,
      description: 'VIP скидка для особых гостей',
      maxUses: 10,
      active: true,
      expiryDate: new Date('2025-12-31')
    },
    {
      code: 'SUMMER25',
      discount: 25,
      description: 'Летняя скидка',
      maxUses: 100,
      active: true,
      expiryDate: new Date('2025-08-31')
    },
    {
      code: 'FRIDAY15',
      discount: 15,
      description: 'Пятничная скидка',
      maxUses: 0,
      active: true,
      expiryDate: null
    }
  ];
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const promo of testPromocodes) {
    try {
      const promoData = {
        code: promo.code,
        discount: promo.discount,
        description: promo.description,
        maxUses: promo.maxUses,
        usedCount: 0,
        active: promo.active,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      if (promo.expiryDate) {
        promoData.expiryDate = firebase.firestore.Timestamp.fromDate(promo.expiryDate);
      }
      
      // Проверяем, существует ли уже такой промокод
      const existingPromo = await db.collection('promocodes').doc(promo.code).get();
      
      if (existingPromo.exists) {
        console.log(`⚠️ Промокод ${promo.code} уже существует, пропускаем...`);
        continue;
      }
      
      await db.collection('promocodes').doc(promo.code).set(promoData);
      console.log(`✅ Промокод ${promo.code} создан (скидка ${promo.discount}%)`);
      successCount++;
      
    } catch (error) {
      console.error(`❌ Ошибка создания промокода ${promo.code}:`, error);
      errorCount++;
    }
  }
  
  console.log('\n📊 Статистика:');
  console.log(`✅ Успешно создано: ${successCount}`);
  console.log(`❌ Ошибок: ${errorCount}`);
  console.log(`📝 Всего промокодов: ${testPromocodes.length}`);
  console.log('\n🎉 Готово! Промокоды добавлены в Firebase.');
  console.log('\n💡 Доступные промокоды:');
  testPromocodes.forEach(promo => {
    console.log(`   - ${promo.code}: ${promo.discount}% скидка (${promo.description})`);
  });
}

// Запуск скрипта
addTestPromocodes();

