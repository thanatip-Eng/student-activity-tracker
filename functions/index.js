// ============================================================
// LTI 1.1 launch endpoint  →  Firebase custom token
// ============================================================
// Canvas POSTs a signed (OAuth 1.0 / HMAC-SHA1) launch to this
// function. We:
//   1. verify the signature with the shared secret  (proves the
//      request really came from Canvas — a direct/forged POST fails)
//   2. reject replays via a Firestore nonce store
//   3. read the Canvas-verified email
//   4. check it against the allowlist (admins → students)
//   5. mint a Firebase custom token carrying a `role` claim
//   6. return a tiny page that signs the browser into Firebase and
//      forwards to the right dashboard (same origin → session sticks)
//
// Config (functions/.env — see .env.example):
//   LTI_CONSUMER_KEY     shared key, also entered in Canvas
//   LTI_CONSUMER_SECRET  shared secret, also entered in Canvas
//   LTI_LAUNCH_URL       the exact Launch URL registered in Canvas
// ------------------------------------------------------------

const crypto = require('crypto');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const lti = require('ims-lti');

admin.initializeApp();
const db = admin.firestore();

// --- public Firebase web config (safe to embed; not a secret) ---
const FIREBASE_WEB_CONFIG = {
  apiKey: 'AIzaSyANurmMx-jye_Jqf6x63Y6oAO1903D7yy4',
  authDomain: 'student-activity-tracker-13eb5.firebaseapp.com',
  projectId: 'student-activity-tracker-13eb5',
  storageBucket: 'student-activity-tracker-13eb5.firebasestorage.app',
  messagingSenderId: '142207116884',
  appId: '1:142207116884:web:7bf08528f01674c61aefc1'
};

const NONCE_TTL_MS = 90 * 1000; // matches ims-lti's default ±90s window

// --- Firestore-backed nonce store (replay protection across instances) ---
class FirestoreNonceStore {
  constructor(consumerKey) {
    this.col = db.collection('lti_nonces');
    this.consumerKey = consumerKey;
  }
  _docId(nonce) {
    return crypto.createHash('sha256')
      .update(`${this.consumerKey}:${nonce}`).digest('hex');
  }
  isNew(nonce, timestamp, next) {
    if (nonce == null) return next(new Error('Invalid nonce'), false);
    this.col.doc(this._docId(nonce)).get()
      .then((doc) => next(null, !doc.exists))
      .catch((err) => next(err, false));
  }
  setUsed(nonce, timestamp, next) {
    this.col.doc(this._docId(nonce)).set({
      used: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      // expireAt lets a Firestore TTL policy auto-clean old nonces
      expireAt: admin.firestore.Timestamp.fromMillis(Date.now() + NONCE_TTL_MS)
    }).then(() => next(null)).catch((err) => next(err));
  }
}

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// A minimal HTML page: sign in with the custom token, then forward.
function bootstrapPage(customToken, dest) {
  return `<!doctype html><html lang="th"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>กำลังเข้าสู่ระบบ…</title>
<style>body{font-family:'Sarabun',system-ui,sans-serif;display:flex;min-height:100vh;
margin:0;align-items:center;justify-content:center;background:#1a1a2e;color:#fff}
.box{text-align:center}.spin{width:42px;height:42px;border:4px solid rgba(255,255,255,.25);
border-top-color:#667eea;border-radius:50%;animation:s 1s linear infinite;margin:0 auto 16px}
@keyframes s{to{transform:rotate(360deg)}}</style></head>
<body><div class="box"><div class="spin"></div><div>กำลังเข้าสู่ระบบ | Signing in…</div></div>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js"></script>
<script>
  firebase.initializeApp(${JSON.stringify(FIREBASE_WEB_CONFIG)});
  firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(function(){ return firebase.auth().signInWithCustomToken(${JSON.stringify(customToken)}); })
    .then(function(){ window.location.replace(${JSON.stringify(dest)}); })
    .catch(function(e){ document.body.innerHTML =
      '<div class="box"><p>เข้าสู่ระบบไม่สำเร็จ | Sign-in failed</p><pre>'+ (e && e.message) +'</pre></div>'; });
</script></body></html>`;
}

function denyPage(message) {
  return `<!doctype html><html lang="th"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ไม่ได้รับอนุญาต</title>
<style>body{font-family:'Sarabun',system-ui,sans-serif;display:flex;min-height:100vh;margin:0;
align-items:center;justify-content:center;background:#1a1a2e;color:#fff;text-align:center;padding:24px}</style>
</head><body><div><h2>⛔ ไม่ได้รับอนุญาตให้เข้าระบบ</h2><p>${esc(message)}</p>
<p style="opacity:.6">Not authorized. Please contact the course staff.</p></div></body></html>`;
}

// Authoritative allowlist check: admins first, then student roster.
async function resolveRole(email) {
  const adminSnap = await db.collection('admins').where('email', '==', email).limit(1).get();
  if (!adminSnap.empty) return 'admin';
  const studentSnap = await db.collection('students').where('email', '==', email).limit(1).get();
  if (!studentSnap.empty) return 'student';
  return null;
}

exports.ltiLaunch = functions
  .region('us-central1')
  .https.onRequest(async (req, res) => {
    // Canvas launches with a form POST.
    if (req.method !== 'POST') {
      res.status(405).send(denyPage('ต้องเปิดจาก Canvas เท่านั้น (method not allowed)'));
      return;
    }

    const consumerKey = process.env.LTI_CONSUMER_KEY;
    const consumerSecret = process.env.LTI_CONSUMER_SECRET;
    const launchUrl = process.env.LTI_LAUNCH_URL;
    if (!consumerKey || !consumerSecret || !launchUrl) {
      console.error('Missing LTI_* environment configuration');
      res.status(500).send(denyPage('ระบบยังตั้งค่าไม่ครบ (server misconfigured)'));
      return;
    }

    try {
      // The OAuth signature base string is built from the request URL.
      // Behind the Hosting → Function proxy, host/proto can differ, so we
      // coerce the request to the exact URL registered in Canvas.
      const u = new URL(launchUrl);
      req.headers.host = u.host;
      req.url = u.pathname + (u.search || '');
      Object.defineProperty(req, 'protocol', {
        value: u.protocol.replace(':', ''), configurable: true
      });
      req.connection = req.connection || {};

      const provider = new lti.Provider(
        consumerKey, consumerSecret,
        new FirestoreNonceStore(consumerKey),
        'HMAC-SHA1'
      );

      const isValid = await new Promise((resolve, reject) => {
        provider.valid_request(req, (err, valid) => (err ? reject(err) : resolve(valid)));
      });
      if (!isValid) {
        res.status(401).send(denyPage('ลายเซ็นไม่ถูกต้อง (invalid LTI signature)'));
        return;
      }

      const email = (
        provider.body.lis_person_contact_email_primary ||
        provider.body.custom_canvas_user_login_id || ''
      ).trim().toLowerCase();
      const name = provider.body.lis_person_name_full ||
        (email ? email.split('@')[0] : 'user');

      if (!email) {
        res.status(403).send(denyPage(
          'Canvas ไม่ได้ส่งอีเมลมา — ตั้งค่า Privacy ของ App เป็น Public/Email'));
        return;
      }

      const role = await resolveRole(email);
      if (!role) {
        res.status(403).send(denyPage(`${email} ไม่อยู่ในรายชื่อผู้มีสิทธิ์`));
        return;
      }

      // Deterministic uid per email so the same person maps to one account.
      const uid = 'lti_' + crypto.createHash('sha256').update(email).digest('hex').slice(0, 40);
      try {
        await admin.auth().updateUser(uid, { email, displayName: name });
      } catch (e) {
        if (e.code === 'auth/user-not-found') {
          await admin.auth().createUser({ uid, email, displayName: name });
        } else {
          throw e;
        }
      }
      await admin.auth().setCustomUserClaims(uid, { role });

      const customToken = await admin.auth().createCustomToken(uid, { role });
      const dest = role === 'admin' ? '/admin-dashboard.html' : '/student-portal.html';

      res.set('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(bootstrapPage(customToken, dest));
    } catch (err) {
      console.error('LTI launch error:', err);
      res.status(500).send(denyPage('เกิดข้อผิดพลาดภายในระบบ'));
    }
  });
