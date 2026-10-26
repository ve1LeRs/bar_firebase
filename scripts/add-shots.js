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
    name: 'Kamikaze',
    price: 220,
    ingredients: 'Водка, Трипл Сек, сок лайма',
    mood: 'Классика шотов — резко, чисто, по делу 💥',
    alcohol: 28,
    tasteTags: ['sour'],
    image: img('Shot_Kamikaze.jpg'),
    stockRecipe: [
      { ingredientName: 'Водка', amount: 20 },
      { ingredientName: 'Апельсиновый ликёр', amount: 15 },
      { ingredientName: 'Сок лайма', amount: 15 }
    ]
  },
  {
    name: 'Raspberry Punch',
    price: 220,
    ingredients: 'Водка, сироп малина, сок лимона, гренадин',
    mood: 'Ягодный хук — сладко на входе, кислинка на финише 🍓',
    alcohol: 22,
    tasteTags: ['sweet', 'sour'],
    image: img('Shot_Raspberry_Punch.jpg'),
    stockRecipe: [
      { ingredientName: 'Водка', amount: 20 },
      { ingredientName: 'Сироп малина', amount: 10 },
      { ingredientName: 'Сок лайма', amount: 10 },
      { ingredientName: 'Сироп гренадин', amount: 5 }
    ]
  },
  {
    name: 'B-52',
    price: 240,
    ingredients: 'Гренадин, сливки, водка ваниль',
    mood: 'Слоями, как в кино. Можно поджечь — если осмелишься 🔥',
    alcohol: 20,
    tasteTags: ['sweet'],
    image: img('Shot_B-52.jpg'),
    stockRecipe: [
      { ingredientName: 'Сироп гренадин', amount: 10 },
      { ingredientName: 'Сливки', amount: 15 },
      { ingredientName: 'Водка ваниль', amount: 15 }
    ]
  },
  {
    name: 'Orgasm',
    price: 240,
    ingredients: 'Водка ваниль, сливки, сироп ваниль, Трипл Сек',
    mood: 'Десертный шот. Название говорит само за себя 😉',
    alcohol: 18,
    tasteTags: ['sweet'],
    image: img('Shot_Orgasm.jpg'),
    stockRecipe: [
      { ingredientName: 'Водка ваниль', amount: 20 },
      { ingredientName: 'Сливки', amount: 15 },
      { ingredientName: 'Сироп ваниль', amount: 10 },
      { ingredientName: 'Апельсиновый ликёр', amount: 5 }
    ]
  },
  {
    name: 'Tequila Slammer',
    price: 200,
    ingredients: 'Текила, Спрайт',
    mood: 'Стукни об стол и пей, пока пена жива ⚡',
    alcohol: 25,
    tasteTags: ['sour'],
    image: img('Shot_Tequila_Slammer.jpg'),
    stockRecipe: [
      { ingredientName: 'Текила', amount: 25 },
      { ingredientName: 'Спрайт', amount: 25 }
    ]
  },
  {
    name: 'Blue Magin',
    price: 220,
    ingredients: 'Водка, блю курасао, сок лимона',
    mood: 'Неоновый синий — выглядит как химия, пьётся как праздник 💙',
    alcohol: 24,
    tasteTags: ['sour', 'sweet'],
    image: img('Shot_Blue_Magin.jpg'),
    stockRecipe: [
      { ingredientName: 'Водка', amount: 20 },
      { ingredientName: 'Сироп блю курасао', amount: 15 },
      { ingredientName: 'Сок лайма', amount: 10 }
    ]
  },
  {
    name: 'Passion Bomb',
    price: 230,
    ingredients: 'Водка, сироп маракуйя, сок лимона, содовая',
    mood: 'Тропический взрыв с шипением сверху 💥🥭',
    alcohol: 22,
    tasteTags: ['sweet', 'sour'],
    image: img('Shot_Passion_Bomb.jpg'),
    stockRecipe: [
      { ingredientName: 'Водка', amount: 20 },
      { ingredientName: 'Сироп маракуйя', amount: 15 },
      { ingredientName: 'Сок лайма', amount: 10 },
      { ingredientName: 'Спрайт', amount: 10 }
    ]
  },
  {
    name: 'Blackcurrant',
    price: 220,
    ingredients: 'Джин, сироп чёрная смородина, сок лимона',
    mood: 'Пахнет садом после дождя. Джин + ягода = любовь',
    alcohol: 24,
    tasteTags: ['sour', 'sweet'],
    image: img('Shot_Blackcurrant.jpg'),
    stockRecipe: [
      { ingredientName: 'Джин', amount: 20 },
      { ingredientName: 'Сироп чёрная смородина', amount: 15 },
      { ingredientName: 'Сок лайма', amount: 10 }
    ]
  },
  {
    name: 'Grapefruit Punch',
    price: 220,
    ingredients: 'Текила, сок грейпфрута, сироп сахар',
    mood: 'Палома, уменьшенная до одного глотка 🍊',
    alcohol: 24,
    tasteTags: ['bitter', 'sour'],
    image: img('Shot_Grapefruit_Punch.jpg'),
    stockRecipe: [
      { ingredientName: 'Текила', amount: 20 },
      { ingredientName: 'Сок грейпфрута', amount: 20 },
      { ingredientName: 'Сироп сахар', amount: 5 }
    ]
  },
  {
    name: 'Cranberry Cosmo',
    price: 220,
    ingredients: 'Водка, Трипл Сек, сок клюквы, лайм',
    mood: 'Мини-космополитен для тех, кто не ждёт бокал 💋',
    alcohol: 24,
    tasteTags: ['sour', 'sweet'],
    image: img('Shot_Cranberry_Cosmo.jpg'),
    stockRecipe: [
      { ingredientName: 'Водка', amount: 20 },
      { ingredientName: 'Апельсиновый ликёр', amount: 10 },
      { ingredientName: 'Сок клюквы', amount: 15 },
      { ingredientName: 'Сок лайма', amount: 5 }
    ]
  },
  {
    name: 'Aperol Shot',
    price: 200,
    ingredients: 'Ликёр апероль, сок апельсина, шампанское',
    mood: 'Spritz в формате «залпом». Горько-игристо 🧡',
    alcohol: 12,
    tasteTags: ['bitter', 'sweet'],
    image: img('Shot_Aperol.jpg'),
    stockRecipe: [
      { ingredientName: 'Ликёр апероль', amount: 25 },
      { ingredientName: 'Сок апельсина', amount: 15 },
      { ingredientName: 'Шампанское', amount: 10 }
    ]
  },
  {
    name: 'Long Island Shot',
    price: 250,
    ingredients: 'Водка, джин, ром, текила, Трипл Сек, лимон, кола',
    mood: 'Весь Long Island в одном глотке. Опасно и честно ⚠️',
    alcohol: 32,
    tasteTags: ['sweet', 'sour'],
    image: img('Shot_Long_Island.jpg'),
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
    name: 'Pornstar Shot',
    price: 240,
    ingredients: 'Водка ваниль, сироп маракуйя, лимон, шампанское',
    mood: 'Твой Порнстар, только быстрее и наглее 🌟',
    alcohol: 22,
    tasteTags: ['sweet', 'sour'],
    image: img('Shot_Pornstar.jpg'),
    stockRecipe: [
      { ingredientName: 'Водка ваниль', amount: 20 },
      { ingredientName: 'Сироп маракуйя', amount: 15 },
      { ingredientName: 'Сок лайма', amount: 8 },
      { ingredientName: 'Шампанское', amount: 8 }
    ]
  },
  {
    name: 'Mint Punch',
    price: 220,
    ingredients: 'Белый ром, сахар, лайм, мята',
    mood: 'Мохито без содовой и без ожидания — сразу в бой 🌿',
    alcohol: 24,
    tasteTags: ['sour'],
    image: img('Shot_Mint_Punch.jpg'),
    stockRecipe: [
      { ingredientName: 'Белый ром', amount: 20 },
      { ingredientName: 'Сироп сахар', amount: 8 },
      { ingredientName: 'Сок лайма', amount: 10 },
      { ingredientName: 'Мята', amount: 1 }
    ]
  },
  {
    name: 'Whiskey Lime',
    price: 230,
    ingredients: 'Виски, сироп сахар, сок лимона',
    mood: 'Взрослый шот. Без сюсюканья, только характер 🥃',
    alcohol: 28,
    tasteTags: ['sour', 'bitter'],
    image: img('Shot_Whiskey_Lime.jpg'),
    stockRecipe: [
      { ingredientName: 'Виски', amount: 25 },
      { ingredientName: 'Сироп сахар', amount: 8 },
      { ingredientName: 'Сок лайма', amount: 12 }
    ]
  },
  {
    name: 'Strawberry Kiss',
    price: 230,
    ingredients: 'Водка, сироп клубника, сливки, лимон',
    mood: 'Розовый, сливочный, опасный для репутации 💕',
    alcohol: 18,
    tasteTags: ['sweet'],
    image: img('Shot_Strawberry_Kiss.jpg'),
    stockRecipe: [
      { ingredientName: 'Водка', amount: 20 },
      { ingredientName: 'Сироп клубника', amount: 12 },
      { ingredientName: 'Сливки', amount: 12 },
      { ingredientName: 'Сок лайма', amount: 5 }
    ]
  },
  {
    name: 'Rum Grenadine',
    price: 200,
    ingredients: 'Белый ром, гренадин, лайм',
    mood: 'Мини-дайкири с ягодной помадой 🍒',
    alcohol: 24,
    tasteTags: ['sweet', 'sour'],
    image: img('Shot_Rum_Grenadine.jpg'),
    stockRecipe: [
      { ingredientName: 'Белый ром', amount: 25 },
      { ingredientName: 'Сироп гренадин', amount: 10 },
      { ingredientName: 'Сок лайма', amount: 10 }
    ]
  },
  {
    name: 'Soju Slam',
    price: 190,
    ingredients: 'Соджу, сироп маракуйя, Спрайт',
    mood: 'Лёгкий, игривый, «ещё по одному» гарантирован ✨',
    alcohol: 12,
    tasteTags: ['sweet'],
    image: img('Shot_Soju_Slam.jpg'),
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
