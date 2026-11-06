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
    mood: "Резкий и чистый классический шот: водка, Трипл Сек и сочный лайм. Без украшений — только точный цитрусовый удар.",
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
    mood: "Ягодный шот с характером: водка, ароматная малина, лимон и гренадин. Сладко на входе, с яркой кислинкой на финише.",
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
    mood: "Сладкий слоистый шот: густой гренадин, нежные сливки и ванильная водка. Десертный, эффектный — и чуть дерзкий напоследок.",
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
    mood: "Нежный десертный шот: ванильная водка, сливки, ванильный сироп и капля Трипл Сек. Сливочно-сладкий, тёплый и чуть игривый.",
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
    mood: "Живой и резкий: текила и Спрайт во вспененном дуэте. Стукни, поймай пузырьки — и пей, пока игра ещё искрится.",
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
    mood: "Неоново-синий шот: водка, сладкий блю курасао и сочный лимон. Выглядит дерзко, пьётся легко — праздник в одном глотке.",
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
    mood: "Тропический шот со шипением: водка, ароматная маракуйя, лимон и содовая. Сладкая экзотика и яркая кислинка в одном ударе.",
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
    mood: "Нежный ягодный шот на джине: ароматная чёрная смородина и лимонная свежесть. Пахнет садом после дождя — мягко, но запоминающе.",
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
    mood: "Сочный шот на текиле: грейпфрутовая горчинка и мягкая сладость сахара. Как мини-Палома — ярко, коротко, по-летнему.",
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
    mood: "Короткий космо: водка, Трипл Сек, сочная клюква и лайм. Ягодно-цитрусовый удар — ярко, кисло-сладко, без ожидания полного бокала.",
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
    mood: "Горьковато-сладкий шот в духе Spritz: ароматный Апероль, сочный апельсиновый сок и лёгкое игристое. Короткий глоток — и уже итальянский закат.",
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
    mood: "Весь Long Island в одном глотке: водка, джин, ром, текила, Трипл Сек, лимон и кола. Плотный, честный и опасный своей лёгкостью.",
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
    mood: "Быстрый Порнстар: ванильная водка, маракуйя, лимон и капля шампанского. Тропическая сладость с игристым финишем — короче и смелее.",
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
    mood: "Свежий мятный шот на белом роме: лайм, сахар и ароматная мята. Как Мохито без ожидания — сразу прохлада и зелень.",
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
    mood: "Взрослый шот с характером: виски, мягкая сладость сиропа и лимонная кислинка. Без сюсюканья — только прямой, уверенный вкус.",
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
    mood: "Розовый сливочный шот: водка, клубничный сироп, нежные сливки и лимон. Сладкий поцелуй с лёгкой кислинкой — опасно притягательный.",
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
    mood: "Короткий ягодный ромовый шот: белый ром, гренадин и лайм. Как мини-дайкири с мягкой ягодной помадой — сладко и свежо.",
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
    mood: "Лёгкий и игривый шот: мягкое соджу, ароматная маракуйя и шипящий Спрайт. Сладко, воздушно — хочется ещё по одному.",
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
