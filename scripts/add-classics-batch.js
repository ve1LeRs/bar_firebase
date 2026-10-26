/**
 * Upsert classic cocktails (batch from bar stock recommendations).
 * Run on VPS with .env Firebase credentials.
 */
require('dotenv').config();
const admin = require('firebase-admin');

const BASE =
  'https://ve1lers.github.io/bar_firebase/mini-app/cocktail-images/';

function img(file) {
  return BASE + encodeURIComponent(file);
}

const classics = [
  {
    name: 'Daiquiri',
    price: 600,
    ingredients: 'Белый ром, сок лайма, сахар',
    mood: 'Чистая классика: ром, лайм, сахар — ничего лишнего',
    alcohol: 22,
    tasteTags: ['sour'],
    image: img('Daiquiri.jpg'),
    stockRecipe: [
      { ingredientName: 'Белый ром', amount: 50 },
      { ingredientName: 'Сок лайма', amount: 25 },
      { ingredientName: 'Сироп сахар', amount: 15 }
    ]
  },
  {
    name: 'Cuba Libre',
    price: 550,
    ingredients: 'Белый ром, Coca-Cola, лайм',
    mood: 'Хайбол без лишней драмы — ром и кола с лаймом',
    alcohol: 12,
    tasteTags: ['sweet', 'sour'],
    image: img('Cuba_Libre.jpg'),
    stockRecipe: [
      { ingredientName: 'Белый ром', amount: 50 },
      { ingredientName: 'Coca-Cola', amount: 120 },
      { ingredientName: 'Сок лайма', amount: 10 }
    ]
  },
  {
    name: 'Tom Collins',
    price: 600,
    ingredients: 'Джин, сок лайма, сахар, содовая',
    mood: 'Высокий, сухой, освежающий джин-лонга',
    alcohol: 12,
    tasteTags: ['sour'],
    image: img('Tom_Collins.jpg'),
    stockRecipe: [
      { ingredientName: 'Джин', amount: 50 },
      { ingredientName: 'Сок лайма', amount: 25 },
      { ingredientName: 'Сироп сахар', amount: 15 },
      { ingredientName: 'Спрайт', amount: 100 }
    ]
  },
  {
    name: 'French 75',
    price: 700,
    ingredients: 'Джин, сок лайма, сахар, шампанское',
    mood: 'Игристое с характером — праздник в бокале',
    alcohol: 15,
    tasteTags: ['sour'],
    image: img('French_75.jpg'),
    stockRecipe: [
      { ingredientName: 'Джин', amount: 30 },
      { ingredientName: 'Сок лайма', amount: 15 },
      { ingredientName: 'Сироп сахар', amount: 10 },
      { ingredientName: 'Шампанское', amount: 60 }
    ]
  },
  {
    name: 'Lemon Drop',
    price: 650,
    ingredients: 'Водка, Трипл Сек, сок лайма, сахар',
    mood: 'Цитрусовый sour на водке — ярко и чисто',
    alcohol: 20,
    tasteTags: ['sour', 'sweet'],
    image: img('Lemon_Drop.jpg'),
    stockRecipe: [
      { ingredientName: 'Водка', amount: 40 },
      { ingredientName: 'Апельсиновый ликёр', amount: 20 },
      { ingredientName: 'Сок лайма', amount: 20 },
      { ingredientName: 'Сироп сахар', amount: 10 }
    ]
  },
  {
    name: 'White Lady',
    price: 700,
    ingredients: 'Джин, Трипл Сек, сок лайма',
    mood: 'Элегантный sour — джин и апельсин в балансе',
    alcohol: 22,
    tasteTags: ['sour'],
    image: img('White_Lady.jpg'),
    stockRecipe: [
      { ingredientName: 'Джин', amount: 40 },
      { ingredientName: 'Апельсиновый ликёр', amount: 20 },
      { ingredientName: 'Сок лайма', amount: 20 }
    ]
  },
  {
    name: 'Southside',
    price: 650,
    ingredients: 'Джин, лайм, сахар, мята',
    mood: 'Как мохито, только на джине — свежо и зелено',
    alcohol: 18,
    tasteTags: ['sour'],
    image: img('Southside.jpg'),
    stockRecipe: [
      { ingredientName: 'Джин', amount: 50 },
      { ingredientName: 'Сок лайма', amount: 25 },
      { ingredientName: 'Сироп сахар', amount: 15 },
      { ingredientName: 'Мята', amount: 6 }
    ]
  },
  {
    name: 'Whiskey Smash',
    price: 650,
    ingredients: 'Виски, мята, лайм, сахар',
    mood: 'Мятный виски с цитрусом — летний характер',
    alcohol: 20,
    tasteTags: ['sour'],
    image: img('Whiskey_Smash.jpg'),
    stockRecipe: [
      { ingredientName: 'Виски', amount: 50 },
      { ingredientName: 'Сок лайма', amount: 25 },
      { ingredientName: 'Сироп сахар', amount: 15 },
      { ingredientName: 'Мята', amount: 6 }
    ]
  },
  {
    name: 'Electric Lemonade',
    price: 650,
    ingredients: 'Водка, блю курасао, сок лайма, содовая',
    mood: 'Неоновый лонг — ярко, кисло, с шипением',
    alcohol: 14,
    tasteTags: ['sour', 'sweet'],
    image: img('Electric_Lemonade.jpg'),
    stockRecipe: [
      { ingredientName: 'Водка', amount: 40 },
      { ingredientName: 'Сироп блю курасао', amount: 20 },
      { ingredientName: 'Сок лайма', amount: 15 },
      { ingredientName: 'Спрайт', amount: 100 }
    ]
  }
];

async function main() {
  if (!admin.apps.length) {
    let pk = process.env.FIREBASE_PRIVATE_KEY || '';
    pk = pk.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
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
  for (const drink of classics) {
    const key = drink.name.trim().toLowerCase();
    const payload = {
      ...drink,
      category: 'classic',
      isShot: false,
      isSignature: false,
      description: drink.mood || '',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    const id = byName.get(key);
    if (id) {
      await db.collection('cocktails').doc(id).set(payload, { merge: true });
      updated += 1;
      console.log('updated', drink.name, id);
    } else {
      payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
      const ref = await db.collection('cocktails').add(payload);
      added += 1;
      console.log('added', drink.name, ref.id);
    }
  }
  console.log(JSON.stringify({ added, updated, total: classics.length }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
