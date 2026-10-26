/**
 * Upsert fun shot cocktails into Firestore (run on VPS with .env).
 * Images must already be on GitHub Pages under mini-app/cocktail-images/.
 */
require('dotenv').config();
const admin = require('firebase-admin');

const BASE =
  'https://ve1lers.github.io/bar_firebase/mini-app/cocktail-images/';

function img(file) {
  return BASE + encodeURIComponent(file);
}

const shots = [
  {
    name: 'Камикадзе',
    price: 350,
    ingredients: 'Водка, Трипл Сек, сок лайма',
    mood: 'Классика шотов — резко, чисто, по делу 💥',
    alcohol: 28,
    tasteTags: ['sour'],
    image: img('Шот_Камикадзе.jpg'),
    stockRecipe: [
      { ingredientName: 'Водка', amount: 20 },
      { ingredientName: 'Апельсиновый ликёр', amount: 15 },
      { ingredientName: 'Сок лайма', amount: 15 }
    ]
  },
  {
    name: 'Малиновый удар',
    price: 350,
    ingredients: 'Водка, сироп малина, сок лимона, гренадин',
    mood: 'Ягодный хук — сладко на входе, кислинка на финише 🍓',
    alcohol: 22,
    tasteTags: ['sweet', 'sour'],
    image: img('Шот_Малиновый_удар.jpg'),
    stockRecipe: [
      { ingredientName: 'Водка', amount: 20 },
      { ingredientName: 'Сироп малина', amount: 10 },
      { ingredientName: 'Сок лайма', amount: 10 },
      { ingredientName: 'Сироп гренадин', amount: 5 }
    ]
  },
  {
    name: 'B-52',
    price: 400,
    ingredients: 'Гренадин, сливки, водка ваниль',
    mood: 'Слоями, как в кино. Можно поджечь — если осмелишься 🔥',
    alcohol: 20,
    tasteTags: ['sweet'],
    image: img('Шот_B-52.jpg'),
    stockRecipe: [
      { ingredientName: 'Сироп гренадин', amount: 10 },
      { ingredientName: 'Сливки', amount: 15 },
      { ingredientName: 'Водка ваниль', amount: 15 }
    ]
  },
  {
    name: 'Оргазм',
    price: 380,
    ingredients: 'Водка ваниль, сливки, сироп ваниль, Трипл Сек',
    mood: 'Десертный шот. Название говорит само за себя 😉',
    alcohol: 18,
    tasteTags: ['sweet'],
    image: img('Шот_Оргазм.jpg'),
    stockRecipe: [
      { ingredientName: 'Водка ваниль', amount: 20 },
      { ingredientName: 'Сливки', amount: 15 },
      { ingredientName: 'Сироп ваниль', amount: 10 },
      { ingredientName: 'Апельсиновый ликёр', amount: 5 }
    ]
  },
  {
    name: 'Текила Сламмер',
    price: 350,
    ingredients: 'Текила, Спрайт',
    mood: 'Стукни об стол и пей, пока пена жива ⚡',
    alcohol: 25,
    tasteTags: ['sour'],
    image: img('Шот_Текила_Сламмер.jpg'),
    stockRecipe: [
      { ingredientName: 'Текила', amount: 25 },
      { ingredientName: 'Спрайт', amount: 25 }
    ]
  },
  {
    name: 'Блю Мэджин',
    price: 350,
    ingredients: 'Водка, блю курасао, сок лимона',
    mood: 'Неоновый синий — выглядит как химия, пьётся как праздник 💙',
    alcohol: 24,
    tasteTags: ['sour', 'sweet'],
    image: img('Шот_Блю_Мэджин.jpg'),
    stockRecipe: [
      { ingredientName: 'Водка', amount: 20 },
      { ingredientName: 'Сироп блю курасао', amount: 15 },
      { ingredientName: 'Сок лайма', amount: 10 }
    ]
  },
  {
    name: 'Пассион-бомба',
    price: 380,
    ingredients: 'Водка, сироп маракуйя, сок лимона, содовая',
    mood: 'Тропический взрыв с шипением сверху 💥🥭',
    alcohol: 22,
    tasteTags: ['sweet', 'sour'],
    image: img('Шот_Пассион-бомба.jpg'),
    stockRecipe: [
      { ingredientName: 'Водка', amount: 20 },
      { ingredientName: 'Сироп маракуйя', amount: 15 },
      { ingredientName: 'Сок лайма', amount: 10 },
      { ingredientName: 'Спрайт', amount: 10 }
    ]
  },
  {
    name: 'Чёрная смородина',
    price: 350,
    ingredients: 'Джин, сироп чёрная смородина, сок лимона',
    mood: 'Пахнет садом после дождя. Джин + ягода = любовь',
    alcohol: 24,
    tasteTags: ['sour', 'sweet'],
    image: img('Шот_Чёрная_смородина.jpg'),
    stockRecipe: [
      { ingredientName: 'Джин', amount: 20 },
      { ingredientName: 'Сироп чёрная смородина', amount: 15 },
      { ingredientName: 'Сок лайма', amount: 10 }
    ]
  },
  {
    name: 'Грейпфрутовый удар',
    price: 350,
    ingredients: 'Текила, сок грейпфрута, сироп сахар',
    mood: 'Палома, уменьшенная до одного глотка 🍊',
    alcohol: 24,
    tasteTags: ['bitter', 'sour'],
    image: img('Шот_Грейпфрутовый_удар.jpg'),
    stockRecipe: [
      { ingredientName: 'Текила', amount: 20 },
      { ingredientName: 'Сок грейпфрута', amount: 20 },
      { ingredientName: 'Сироп сахар', amount: 5 }
    ]
  },
  {
    name: 'Клюква-космо',
    price: 350,
    ingredients: 'Водка, Трипл Сек, сок клюквы, лайм',
    mood: 'Мини-космополитен для тех, кто не ждёт бокал 💋',
    alcohol: 24,
    tasteTags: ['sour', 'sweet'],
    image: img('Шот_Клюква-космо.jpg'),
    stockRecipe: [
      { ingredientName: 'Водка', amount: 20 },
      { ingredientName: 'Апельсиновый ликёр', amount: 10 },
      { ingredientName: 'Сок клюквы', amount: 15 },
      { ingredientName: 'Сок лайма', amount: 5 }
    ]
  },
  {
    name: 'Апероль-шот',
    price: 320,
    ingredients: 'Ликёр апероль, сок апельсина, шампанское',
    mood: 'Spritz в формате «залпом». Горько-игристо 🧡',
    alcohol: 12,
    tasteTags: ['bitter', 'sweet'],
    image: img('Шот_Апероль.jpg'),
    stockRecipe: [
      { ingredientName: 'Ликёр апероль', amount: 25 },
      { ingredientName: 'Сок апельсина', amount: 15 },
      { ingredientName: 'Шампанское', amount: 10 }
    ]
  },
  {
    name: 'Лонг-Айленд шот',
    price: 450,
    ingredients: 'Водка, джин, ром, текила, Трипл Сек, лимон, кола',
    mood: 'Весь Long Island в одном глотке. Опасно и честно ⚠️',
    alcohol: 32,
    tasteTags: ['sweet', 'sour'],
    image: img('Шот_Лонг-Айленд.jpg'),
    stockRecipe: [
      { ingredientName: 'Водка', amount: 8 },
      { ingredientName: 'Джин', amount: 8 },
      { ingredientName: 'Белый ром', amount: 8 },
      { ingredientName: 'Текила', amount: 8 },
      { ingredientName: 'Апельсиновый ликёр', amount: 8 },
      { ingredientName: 'Сок лайма', amount: 8 },
      { ingredientName: 'Coca-Cola', amount: 10 }
    ]
  },
  {
    name: 'Порнстар-шот',
    price: 400,
    ingredients: 'Водка ваниль, сироп маракуйя, лимон, шампанское',
    mood: 'Твой Порнстар, только быстрее и наглее 🌟',
    alcohol: 22,
    tasteTags: ['sweet', 'sour'],
    image: img('Шот_Порнстар.jpg'),
    stockRecipe: [
      { ingredientName: 'Водка ваниль', amount: 20 },
      { ingredientName: 'Сироп маракуйя', amount: 15 },
      { ingredientName: 'Сок лайма', amount: 8 },
      { ingredientName: 'Шампанское', amount: 8 }
    ]
  },
  {
    name: 'Мятный удар',
    price: 350,
    ingredients: 'Белый ром, сахар, лайм, мята',
    mood: 'Мохито без содовой и без ожидания — сразу в бой 🌿',
    alcohol: 24,
    tasteTags: ['sour'],
    image: img('Шот_Мятный_удар.jpg'),
    stockRecipe: [
      { ingredientName: 'Белый ром', amount: 20 },
      { ingredientName: 'Сироп сахар', amount: 8 },
      { ingredientName: 'Сок лайма', amount: 10 },
      { ingredientName: 'Мята', amount: 1 }
    ]
  },
  {
    name: 'Виски-лайм',
    price: 380,
    ingredients: 'Виски, сироп сахар, сок лимона',
    mood: 'Взрослый шот. Без сюсюканья, только характер 🥃',
    alcohol: 28,
    tasteTags: ['sour', 'bitter'],
    image: img('Шот_Виски-лайм.jpg'),
    stockRecipe: [
      { ingredientName: 'Виски', amount: 25 },
      { ingredientName: 'Сироп сахар', amount: 8 },
      { ingredientName: 'Сок лайма', amount: 12 }
    ]
  },
  {
    name: 'Клубничный поцелуй',
    price: 380,
    ingredients: 'Водка, сироп клубника, сливки, лимон',
    mood: 'Розовый, сливочный, опасный для репутации 💕',
    alcohol: 18,
    tasteTags: ['sweet'],
    image: img('Шот_Клубничный_поцелуй.jpg'),
    stockRecipe: [
      { ingredientName: 'Водка', amount: 20 },
      { ingredientName: 'Сироп клубника', amount: 12 },
      { ingredientName: 'Сливки', amount: 12 },
      { ingredientName: 'Сок лайма', amount: 5 }
    ]
  },
  {
    name: 'Ром-гренадин',
    price: 320,
    ingredients: 'Белый ром, гренадин, лайм',
    mood: 'Мини-дайкири с ягодной помадой 🍒',
    alcohol: 24,
    tasteTags: ['sweet', 'sour'],
    image: img('Шот_Ром-гренадин.jpg'),
    stockRecipe: [
      { ingredientName: 'Белый ром', amount: 25 },
      { ingredientName: 'Сироп гренадин', amount: 10 },
      { ingredientName: 'Сок лайма', amount: 10 }
    ]
  },
  {
    name: 'Соджу-слам',
    price: 300,
    ingredients: 'Соджу, сироп маракуйя, Спрайт',
    mood: 'Лёгкий, игривый, «ещё по одному» гарантирован ✨',
    alcohol: 12,
    tasteTags: ['sweet'],
    image: img('Шот_Соджу-слам.jpg'),
    stockRecipe: [
      { ingredientName: 'Соджу', amount: 30 },
      { ingredientName: 'Сироп маракуйя', amount: 10 },
      { ingredientName: 'Спрайт', amount: 15 }
    ]
  }
];

async function main() {
  if (!admin.apps.length) {
    const pk = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: pk
      })
    });
  }
  const db = admin.firestore();
  const existing = await db.collection('cocktails').get();
  const byName = new Map();
  existing.forEach((d) => {
    const n = String(d.data().name || '').trim().toLowerCase();
    if (n) byName.set(n, d.id);
  });

  let added = 0;
  let updated = 0;
  for (const shot of shots) {
    const key = shot.name.trim().toLowerCase();
    const payload = {
      ...shot,
      category: 'shots',
      isShot: true,
      isSignature: false,
      description: shot.mood || '',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    const id = byName.get(key);
    if (id) {
      await db.collection('cocktails').doc(id).set(payload, { merge: true });
      updated += 1;
      console.log('updated', shot.name, id);
    } else {
      payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
      const ref = await db.collection('cocktails').add(payload);
      added += 1;
      console.log('added', shot.name, ref.id);
    }
  }
  console.log(JSON.stringify({ added, updated, total: shots.length }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
