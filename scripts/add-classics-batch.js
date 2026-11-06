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
    name: 'Strawberry Daiquiri',
    price: 600,
    ingredients: 'Белый ром, сироп клубника, сок лайма, сахар',
    mood: "Нежный курортный классик: белый ром, ароматная клубника, сочный лайм и лёгкая сладость сахара. Яркий, мягкий, с настроением тёплого пляжа.",
    alcohol: 20,
    tasteTags: ['sweet', 'sour'],
    image: img('Strawberry_Daiquiri.jpg'),
    stockRecipe: [
      { ingredientName: 'Белый ром', amount: 50 },
      { ingredientName: 'Сироп клубника', amount: 20 },
      { ingredientName: 'Сок лайма', amount: 20 },
      { ingredientName: 'Сироп сахар', amount: 10 }
    ]
  },
  {
    name: 'Cuba Libre',
    price: 550,
    ingredients: 'Белый ром, Coca-Cola, лайм',
    mood: "Не просто ром с колой, а уличный ритм в хайболе: мягкий белый ром, знакомая сладость колы и свежий лайм. Простой, бодрый, с кубинским пульсом.",
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
    mood: "Высокий и ясный, как прохладное утро: джин, сочный лайм, сахар и содовая. Освежающий лонг с чистой цитрусовой линией и лёгким характером.",
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
    mood: "Коктейль как яркий лимонный леденец со взрослым характером: водка, Трипл Сек, сочный лайм и лёгкая сладость сахара. Звонкий, чистый, освежающе дерзкий.",
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
    mood: "Этот коктейль — светлая элегантность sour: свежий джин, ароматный Трипл Сек и сочный лайм. Нежный, яркий и безупречно собранный, как вечернее платье.",
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
    mood: "Этот коктейль — зелёная свежесть в шёлковых перчатках: джин, лайм, сахар и ароматная мята. Как мохито на джине — чисто, прохладно, элегантно.",
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
    mood: "Летний характер в крепком бокале: виски встречается с мятой, лаймом и лёгкой сладостью сахара. Свежий, травяной — и всё же по-взрослому уверенный.",
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
    mood: "Этот лонг — летняя молния в бокале: водка, блю курасао и сочный лайм на шипящей содовой. Яркий, кисло-сладкий, с электрическим настроением.",
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
