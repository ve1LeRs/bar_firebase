const fs = require('fs');
const admin = require('firebase-admin');
const BASE = 'https://ve1lers.github.io/bar_firebase/mini-app/cocktail-images/';
const BUST = 'img5';
function img(file) { return `${BASE}${encodeURIComponent(file)}?v=${BUST}`; }

const BY_NAME = {
  'Angela Forever': img('Angela_Forever.jpg'),
  'Hong Kong': img('Hong_Kong.jpg'),
  'LP': img('LP.jpg'),
  'Saint P': img('Saint_P.jpg'),
  'Chick': img('Chick.jpg'),
  // retarget :8443 leftovers to Pages
  'Cuba Libre': img('Cuba_Libre.jpg'),
  'Lemon Drop': img('Lemon_Drop.jpg'),
  'Long Island Iced Tea': img('Long_Island_Iced_Tea.jpg'),
  'Tom Collins': img('Tom_Collins.jpg'),
  'Whiskey Smash': img('Whiskey_Smash.jpg'),
  'White Lady': img('White_Lady.jpg'),
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
    let next = BY_NAME[name];
    const cur = String(d.image || '');
    // also fix any remaining pinimg / :8443
    if (!next) {
      if (cur.includes('pinimg.com') || cur.includes('5d5d5d')) {
        console.log('UNMAPPED_PLACEHOLDER', name, doc.id);
        continue;
      }
      if (cur.includes(':8443/')) {
        const fn = decodeURIComponent(cur.split('cocktail-images/')[1] || '').split('?')[0];
        if (fn) next = img(fn);
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
