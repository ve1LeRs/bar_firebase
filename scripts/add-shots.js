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
    mood: "Этот шот — точный удар без декораций: водка, Трипл Сек и сочный лайм. Резкий, чистый, как вспышка цитруса перед следующим раундом.",
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
    mood: "Ягодный хук с двумя лицами: водка и ароматная малина входят мягко, лимон и гренадин бьют кислинкой. Сладкий старт — дерзкий финиш.",
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
    mood: "Этот шот — маленькое кино в бокале: гренадин, сливки и ванильная водка ложатся слоями, сладко и эффектно. Нежный на вид — и чуть опасный в финале.",
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
    mood: "Этот шот — сливочное искушение: ванильная водка, нежные сливки, ванильный сироп и капля Трипл Сек. Сладкий, тёплый и нарочито игривый.",
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
    mood: "Не просто шот, а маленькое представление: текила и Спрайт вспыхивают пеной после удара о стол. Живой, резкий, с искрой веселья.",
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
    mood: "Неоновая вспышка в шоте: водка и блю курасао рисуют цвет праздника, лимон добавляет свежую искру. Выглядит смело — пьётся легко и весело.",
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
    mood: "Тропический взрыв в шоте: водка и ароматная маракуйя вспыхивают на лимоне и содовой. Сладкий, кислый и горячий характером — как маленькая бомба настроения.",
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
    mood: "Пахнет садом после дождя: свежий джин обнимает ароматную чёрную смородину, а лимон ставит звонкую точку. Нежный ягодный шот с тихой силой.",
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
    mood: "Солнечный удар в одном глотке: текила встречает сочный грейпфрут и мягкую сладость сахара. Яркий, короткозвучный, с летней горчинкой.",
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
    mood: "Тот же космо, только в ритме шота: водка, Трипл Сек, сочная клюква и лайм вспыхивают ярко и коротко. Ягодно-цитрусовый характер без лишних пауз.",
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
    mood: "Не просто шот, а закат Италии в одном глотке: горьковатый Апероль встречается с сочным апельсином и лёгким игристым. Короткий, солнечный, чуть дерзкий.",
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
    mood: "Весь остров в одном глотке: пять крепких характеров, лимон и кола собираются в короткий удар. Сладко на вид — опасно честно по силе.",
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
    mood: "Тот же соблазн, только быстрее: ванильная водка, маракуйя, лимон и капля шампанского. Тропическая сладость с искристым финишем — короче и смелее.",
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
    mood: "Не просто шот, а мгновенная прохлада: белый ром, лайм, сахар и ароматная мята. Как мохито без ожидания — свежий, зелёный, сразу в бой.",
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
    mood: "Взрослый шот без маски: виски, мягкая сладость сиропа и лимонная кислинка. Прямой, собранный, с характером, который не просит прощения.",
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
    mood: "Этот шот — розовый поцелуй с последствиями: водка, клубника, сливки и лимон. Сладкий, сливочный и опасно притягательный.",
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
    mood: "Маленький ромовый поцелуй: белый ром, гренадин и лайм. Нежный, ягодный, с цитрусовой искрой — как мини-дайкири с характером.",
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
    mood: "Лёгкий и беззаботный шот для «ещё по одному»: мягкое соджу, ароматная маракуйя и шипящий Спрайт. Игривый, сладкий, почти воздушный.",
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
