
const admin = require("firebase-admin");
require("dotenv").config();
let pk = process.env.FIREBASE_PRIVATE_KEY || "";
pk = pk.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n");
admin.initializeApp({ credential: admin.credential.cert({
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key: pk,
  client_email: process.env.FIREBASE_CLIENT_EMAIL
})});
const db = admin.firestore();
(async () => {
  const uid = "tg_1743362083";
  const orders = await db.collection("orders").where("userId","==",uid).limit(10).get();
  console.log("Orders for", uid, ":", orders.size);
  orders.forEach(d => console.log(" -", d.id, d.data().name, d.data().status));
  
  const bonus = await db.collection("bonusAccounts").doc(uid).get();
  console.log("Bonus:", bonus.exists ? bonus.data() : "none");
  
  const bills = await db.collection("bills").where("userId","==",uid).limit(5).get();
  console.log("Bills:", bills.size);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
