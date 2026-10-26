/**
 * Rename cocktails/shots to English display names + update image URLs.
 * Run on VPS with .env.
 */
require('dotenv').config();
const admin = require('firebase-admin');

const BASE =
  'https://ve1lers.github.io/bar_firebase/mini-app/cocktail-images/';

function img(file) {
  return BASE + encodeURIComponent(file);
}

/** old name → { name, image? } */
const RENAMES = {
  // classics
  'Апероль Шприц': { name: 'Aperol Spritz', image: img('Aperol_Spritz.jpg') },
  'Белая леди': { name: 'White Lady', image: img('White_Lady.jpg') },
  'Виски Сауэр': { name: 'Whiskey Sour', image: img('Whiskey_Sour.jpg') },
  'Виски Смэш': { name: 'Whiskey Smash', image: img('Whiskey_Smash.jpg') },
  'Голубая лагуна': { name: 'Blue Lagoon', image: img('Blue_Lagoon.jpg') },
  'Дайкири': { name: 'Strawberry Daiquiri', image: img('Strawberry_Daiquiri.jpg') },
  'Daiquiri': { name: 'Strawberry Daiquiri', image: img('Strawberry_Daiquiri.jpg') },
  'Джин Тоник': { name: 'Gin Tonic', image: img('Gin_Tonic.jpg') },
  'Кловер Клаб': { name: 'Clover Club', image: img('Clover_Club.jpg') },
  'Космополитен': { name: 'Cosmopolitan', image: img('Cosmopolitan.jpg') },
  'Куба Либре': { name: 'Cuba Libre', image: img('Cuba_Libre.jpg') },
  'Лемон Дроп': { name: 'Lemon Drop', image: img('Lemon_Drop.jpg') },
  'Маргарита': { name: 'Margarita', image: img('Margarita.jpg') },
  'Мохито': { name: 'Mojito', image: img('Mojito.jpg') },
  'Палома': { name: 'Paloma', image: img('Paloma.jpg') },
  'Пина Колада': { name: 'Pina Colada', image: img('Pina_Colada.jpg') },
  'Порнстар': { name: 'Pornstar', image: img('Pornstar.jpg') },
  'Саутсайд': { name: 'Southside', image: img('Southside.jpg') },
  'Текила Санрайз': { name: 'Tequila Sunrise', image: img('Tequila_Sunrise.jpg') },
  'Том Коллинз': { name: 'Tom Collins', image: img('Tom_Collins.jpg') },
  'Электрик Лимонад': { name: 'Electric Lemonade', image: img('Electric_Lemonade.jpg') },

  // shots
  'Апероль-шот': { name: 'Aperol Shot', image: img('Shot_Aperol.jpg') },
  'Блю Мэджин': { name: 'Blue Magin', image: img('Shot_Blue_Magin.jpg') },
  'Виски-лайм': { name: 'Whiskey Lime', image: img('Shot_Whiskey_Lime.jpg') },
  'Грейпфрутовый удар': { name: 'Grapefruit Punch', image: img('Shot_Grapefruit_Punch.jpg') },
  'Камикадзе': { name: 'Kamikaze', image: img('Shot_Kamikaze.jpg') },
  'Клубничный поцелуй': { name: 'Strawberry Kiss', image: img('Shot_Strawberry_Kiss.jpg') },
  'Клюква-космо': { name: 'Cranberry Cosmo', image: img('Shot_Cranberry_Cosmo.jpg') },
  'Лонг-Айленд шот': { name: 'Long Island Shot', image: img('Shot_Long_Island.jpg') },
  'Малиновый удар': { name: 'Raspberry Punch', image: img('Shot_Raspberry_Punch.jpg') },
  'Мятный удар': { name: 'Mint Punch', image: img('Shot_Mint_Punch.jpg') },
  'Оргазм': { name: 'Orgasm', image: img('Shot_Orgasm.jpg') },
  'Пассион-бомба': { name: 'Passion Bomb', image: img('Shot_Passion_Bomb.jpg') },
  'Порнстар-шот': { name: 'Pornstar Shot', image: img('Shot_Pornstar.jpg') },
  'Ром-гренадин': { name: 'Rum Grenadine', image: img('Shot_Rum_Grenadine.jpg') },
  'Соджу-слам': { name: 'Soju Slam', image: img('Shot_Soju_Slam.jpg') },
  'Текила Сламмер': { name: 'Tequila Slammer', image: img('Shot_Tequila_Slammer.jpg') },
  'Чёрная смородина': { name: 'Blackcurrant', image: img('Shot_Blackcurrant.jpg') },

  // already-English names, but image path was Cyrillic
  'B-52': { name: 'B-52', image: img('Shot_B-52.jpg') },
  'Basil Smash': { name: 'Basil Smash', image: img('Basil_Smash.jpg') },
  'French 75': { name: 'French 75', image: img('French_75.jpg') },
  'Long Island Iced Tea': { name: 'Long Island Iced Tea', image: img('Long_Island_Iced_Tea.jpg') }
};

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
  const snap = await db.collection('cocktails').get();
  const byName = new Map();
  snap.forEach((d) => byName.set(String(d.data().name || '').trim(), d));

  let updated = 0;
  for (const [oldName, next] of Object.entries(RENAMES)) {
    const doc = byName.get(oldName);
    if (!doc) {
      console.log('skip missing', oldName);
      continue;
    }
    await doc.ref.set(
      {
        name: next.name,
        image: next.image,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );
    updated += 1;
    console.log(oldName, '→', next.name);
  }

  // Stoplist entries keyed/stored by cocktail name
  const stop = await db.collection('stoplist').get();
  let stopUpdated = 0;
  for (const d of stop.docs) {
    const data = d.data() || {};
    const nm = String(data.name || data.cocktailName || d.id || '').trim();
    if (RENAMES[nm]) {
      await d.ref.set(
        {
          name: RENAMES[nm].name,
          cocktailName: RENAMES[nm].name,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );
      stopUpdated += 1;
      console.log('stoplist', nm, '→', RENAMES[nm].name);
    }
  }

  console.log(JSON.stringify({ updated, stopUpdated }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
