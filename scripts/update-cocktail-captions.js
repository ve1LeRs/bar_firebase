/**
 * Apply sensory menu captions to Firestore cocktails (mood + description).
 * Captions: scripts/cocktail-captions.json
 * Run on VPS with .env Firebase credentials:
 *   node scripts/update-cocktail-captions.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const captionsPath = path.join(__dirname, 'cocktail-captions.json');
const CAPTIONS = JSON.parse(fs.readFileSync(captionsPath, 'utf8'));

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
  snap.forEach((doc) => {
    const n = String(doc.data().name || '').trim();
    if (n) byName.set(n, doc);
  });

  let updated = 0;
  let missing = [];
  for (const [name, caption] of Object.entries(CAPTIONS)) {
    const doc = byName.get(name);
    if (!doc) {
      missing.push(name);
      continue;
    }
    const prev = doc.data() || {};
    if (prev.mood === caption && prev.description === caption) {
      console.log('skip unchanged', name);
      continue;
    }
    await doc.ref.set(
      {
        mood: caption,
        description: caption,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );
    updated += 1;
    console.log('updated', name);
  }

  const extra = [...byName.keys()].filter((n) => !CAPTIONS[n]);
  console.log(
    JSON.stringify(
      {
        updated,
        captions: Object.keys(CAPTIONS).length,
        missingInFirestore: missing,
        cocktailsWithoutCaption: extra
      },
      null,
      2
    )
  );
  if (missing.length) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
