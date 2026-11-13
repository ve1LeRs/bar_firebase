const fs = require('fs');
const admin = require('firebase-admin');
const BASE = 'https://ve1lers.github.io/bar_firebase/mini-app/cocktail-images/';
const BUST = 'img6';
function img(file) { return `${BASE}${encodeURIComponent(file)}?v=${BUST}`; }

const BY_NAME = {
  'Angela Forever': img('Angela_Forever.jpg'),
  'Hong Kong': img('Hong_Kong.jpg'),
  'LP': img('LP.jpg'),
  'Saint P': img('Saint_P.jpg'),
  'Chick': img('Chick.jpg'),
  'Cuba Libre': img('Cuba_Libre.jpg'),
  'Lemon Drop': img('Lemon_Drop.jpg'),
  'Long Island Iced Tea': img('Long_Island_Iced_Tea.jpg'),
  'Tom Collins': img('Tom_Collins.jpg'),
  'Whiskey Smash': img('Whiskey_Smash.jpg'),
  'White Lady': img('White_Lady.jpg'),
  'Blue Lagoon': img('Blue_Lagoon.jpg'),
  'Electric Lemonade': img('Electric_Lemonade.jpg'),
  'Aperol Spritz': img('Aperol_Spritz.jpg'),
  'Basil Smash': img('Basil_Smash.jpg'),
  'Clover Club': img('Clover_Club.jpg'),
  'Cosmopolitan': img('Cosmopolitan.jpg'),
  'French 75': img('French_75.jpg'),
  'Gin Tonic': img('Gin_Tonic.jpg'),
  'Margarita': img('Margarita.jpg'),
  'Mojito': img('Mojito.jpg'),
  'Paloma': img('Paloma.jpg'),
  'Pina Colada': img('Pina_Colada.jpg'),
  'Pornstar': img('Pornstar.jpg'),
  'Southside': img('Southside.jpg'),
  'Strawberry Daiquiri': img('Strawberry_Daiquiri.jpg'),
  'Tequila Sunrise': img('Tequila_Sunrise.jpg'),
  'Whiskey Sour': img('Whiskey_Sour.jpg'),
};

function loadEnv() {
  const e = {};
  for (const line of fs.readFileSync('.env', 'utf8').split(/\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i <= 0) continue;
    let k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    e[k] = v;
  }
  return e;
}

function filenameFromUrl(cur) {
  try {
    const m = String(cur).match(/cocktail-images\/([^?&#]+)/);
    if (!m) return null;
    return decodeURIComponent(m[1]);
  } catch { return null; }
}

(async () => {
  const env = loadEnv();
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  }
  const db = admin.firestore();
  const snap = await db.collection('cocktails').get();
  let n = 0;
  for (const doc of snap.docs) {
    const d = doc.data();
    const name = d.name || '';
    const cur = String(d.image || '');
    let next = BY_NAME[name];
    if (!next) {
      const fn = filenameFromUrl(cur);
      if (fn && !cur.includes('pinimg.com') && !cur.includes('5d5d5d')) next = img(fn);
    }
    if (cur.includes('pinimg.com') || cur.includes('5d5d5d')) {
      if (!next) {
        console.log('UNMAPPED_PLACEHOLDER', name, doc.id, cur.slice(0, 80));
        continue;
      }
    }
    if (!next || next === cur) continue;
    await doc.ref.update({ image: next });
    console.log('UPDATED', name, '->', next);
    n++;
  }
  console.log('done', n);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
