# การเชื่อมระบบเข้ากับ Canvas ผ่าน LTI 1.1

เป้าหมาย: ให้นักศึกษาเข้าระบบ **ผ่าน Canvas เท่านั้น** (ยืนยันตัวตนด้วยบัญชี CMU ที่ล็อกอิน Canvas อยู่แล้ว) โดย
ระบบจะเช็คอีเมลกับรายชื่อผู้มีสิทธิ์ และ **บล็อกการเข้าผ่าน URL ตรง** — ไม่ต้องขอ tenant จาก Microsoft

## ภาพรวมสถาปัตยกรรม

```
นักศึกษาคลิกจาก Canvas
   → Canvas POST (เซ็น OAuth 1.0) ไปที่ Launch URL
   → Cloud Function `ltiLaunch`  (ไฟล์ functions/index.js)
        1. ตรวจลายเซ็นด้วย Shared Secret   ← กันการปลอม/เข้าตรง
        2. กัน replay ด้วย nonce (Firestore)
        3. อ่านอีเมลที่ Canvas รับรอง
        4. เช็ค allowlist: admins → students
        5. mint Firebase Custom Token (แนบ role)
        6. คืนหน้า bootstrap → sign-in → เด้งเข้า dashboard
   → Firestore rules เชื่อ role/email ใน token
เปิด URL ตรง = ไม่มี token = rules ปฏิเสธทุกอย่าง
```

## สิ่งที่ต้องมี

- โปรเจกต์ Firebase อัปเป็นแผน **Blaze** (Cloud Functions ต้องใช้; งานปริมาณนี้แทบไม่มีค่าใช้จ่าย)
- Firebase CLI: `npm i -g firebase-tools` แล้ว `firebase login`
- สิทธิ์เพิ่ม External App ในวิชา Canvas (ระดับ course ก็พอ — ไม่ต้องเป็น account admin)

---

## ขั้นตอนที่ 1 — ตั้งค่าและ deploy backend

```bash
cd functions
cp .env.example .env
# แก้ .env: ตั้ง LTI_CONSUMER_KEY, สุ่ม LTI_CONSUMER_SECRET (openssl rand -hex 24)
# LTI_LAUNCH_URL ให้ตรงกับที่จะกรอกใน Canvas เป๊ะๆ
npm install
cd ..

firebase deploy --only functions,firestore:rules,hosting
```

หลัง deploy หน้าเว็บจะอยู่ที่ `https://student-activity-tracker-13eb5.web.app`
และ Launch URL คือ `https://student-activity-tracker-13eb5.web.app/lti/launch`

> **ตั้ง TTL ให้ nonce (แนะนำ):** Firestore Console → collection `lti_nonces` →
> สร้าง TTL policy บนฟิลด์ `expireAt` เพื่อให้ลบเอกสารเก่าอัตโนมัติ

---

## ขั้นตอนที่ 2 — เพิ่ม App ใน Canvas

ไปที่ **Course → Settings → Apps → View App Configurations → + App**

| ช่อง | ค่าที่กรอก |
|------|-----------|
| **Configuration Type** | `Manual Entry` |
| **Name** | ระบบติดตามกิจกรรมนักศึกษา |
| **Consumer Key** | ค่าเดียวกับ `LTI_CONSUMER_KEY` ใน `.env` |
| **Shared Secret** | ค่าเดียวกับ `LTI_CONSUMER_SECRET` ใน `.env` |
| **Launch URL** | `https://student-activity-tracker-13eb5.web.app/lti/launch` |
| **Domain** | `student-activity-tracker-13eb5.web.app` |
| **Privacy** | `Public` (สำคัญ! ถ้าไม่ตั้ง Canvas จะไม่ส่งอีเมลมา) |

> **แนะนำให้เปิดในแท็บใหม่:** การเปิด SSO ใน iframe ของ Canvas อาจถูกเบราว์เซอร์บล็อก
> (นโยบาย third-party cookies) ถ้าเจอปัญหา ให้ตั้ง placement ของลิงก์เป็น "Open in new tab"

เสร็จแล้วสร้างลิงก์เข้าใช้งานผ่าน **Modules → + → External Tool** เลือก app ที่เพิ่งเพิ่ม

---

## ขั้นตอนที่ 3 — เตรียมรายชื่อผู้มีสิทธิ์ (allowlist)

ระบบใช้ 2 collection ที่มีอยู่แล้วเป็น allowlist:

- อีเมลอยู่ใน `admins`   → เข้าเป็น **admin** (ไปหน้า admin-dashboard)
- อีเมลอยู่ใน `students` → เข้าเป็น **student** (ไปหน้า student-portal)
- ไม่อยู่ในทั้งสอง → **ถูกปฏิเสธ**

**สร้าง admin คนแรก** (bootstrap — ทำครั้งเดียวจาก Firebase Console):
Firestore → collection `admins` → Add document → ฟิลด์ `email` = อีเมล CMU ของคุณ (ตัวพิมพ์เล็ก)

> การเช็คอีเมลใช้ตัวพิมพ์เล็กทั้งหมด — เก็บอีเมลใน Firestore เป็น lowercase

---

## ทำไมการเข้า URL ตรงถึงถูกบล็อก

- หน้า HTML ยังโหลดได้ (เป็นไฟล์ static สาธารณะ) แต่**ไม่มีข้อมูล** เพราะ Firestore rules
  ปฏิเสธทุก request ที่ไม่มี token ที่ถูกต้อง
- Token ออกได้ทางเดียวคือผ่าน `ltiLaunch` ซึ่งต้องมีลายเซ็น Canvas ที่ถูกต้องเท่านั้น
- ปลอมลายเซ็นไม่ได้เพราะไม่มี Shared Secret (อยู่ใน `.env` ฝั่ง server ไม่เคยส่งออก client)

---

## หมายเหตุ / ข้อจำกัด

- **LTI 1.1** เป็นเวอร์ชันเก่าที่ IMS จะเลิกในระยะยาว แต่ Canvas ยังรองรับ ใช้ได้เพราะตั้งค่าเองได้
  โดยไม่ต้องพึ่ง Canvas admin (LTI 1.3 ต้องให้ admin สร้าง Developer Key)
- ขั้นตอนนี้ทำเฉพาะ **backend + rules + hosting** ส่วนการแก้หน้า `student-portal.html` /
  `js/app.js` ให้รับ session จาก token (แทนการพิมพ์อีเมล) จะทำในก้อนถัดไปหลัง deploy/ทดสอบผ่าน
