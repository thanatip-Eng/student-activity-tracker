# สถานะโปรเจกต์ / Progress Notes

> ไฟล์นี้ให้ Claude (หรือคนที่มาทำต่อ) อ่านแล้วเข้าใจสถานะล่าสุดได้ทันที
> อัปเดตล่าสุด: 2026-07-18 · branch: `claude/code-understanding-hrvfad`

## เป้าหมายที่กำลังทำ

เปลี่ยนการยืนยันตัวตนจาก "พิมพ์อีเมลลอยๆ ไม่มีการตรวจสอบ" มาเป็น
**login ผ่าน Canvas (LTI 1.1)** เพื่อให้:
1. นักศึกษายืนยันตัวด้วยบัญชี CMU (ที่ล็อกอิน Canvas อยู่แล้ว) — **ไม่ต้องขอ Microsoft tenant**
2. ระบบเช็คอีเมลกับ allowlist (`admins` → `students`)
3. **บล็อกการเข้าผ่าน URL ตรง** (ไม่มี token = Firestore rules ปฏิเสธหมด)

การตัดสินใจหลัก: ใช้ **Firebase Cloud Functions** + ย้าย hosting มา **Firebase Hosting**
(แอปกับ function ต้อง origin เดียวกัน session ถึงจะอยู่)

## ✅ เสร็จแล้ว (Increment 1 — backend/rules/config)

| ไฟล์ | สถานะ |
|------|-------|
| `functions/index.js` | Cloud Function `ltiLaunch` — verify LTI signature, nonce replay-guard, allowlist, mint custom token |
| `functions/package.json`, `.env.example`, `.gitignore` | dependencies + config template |
| `firestore.rules` | rules ใหม่แบบ role-based (admin/student) + default deny |
| `firebase.json`, `.firebaserc` | Hosting + rewrite `/lti/launch` → function |
| `LTI_SETUP.md` | คู่มือ Canvas config + deploy step-by-step |

⚠️ **ยังไม่ได้ deploy/test กับ Canvas จริง** — ผ่านแค่ syntax check เท่านั้น
คาดว่าจะต้องปรับจูน LTI signature (URL ต้องตรงเป๊ะ ดู `LTI_LAUNCH_URL`)

## ⏳ ยังไม่ทำ (Increment 2 — รื้อ client)

หน้าเว็บยังใช้ระบบพิมพ์อีเมลแบบเดิมอยู่ ต้องแก้:
- `student-portal.html` + `js/app.js` — **ลบช่องพิมพ์อีเมล** → อ่านตัวตนจาก
  `firebase.auth().currentUser` (token); ถ้าไม่มี session → แสดง "กรุณาเข้าผ่าน Canvas"
- `admin-dashboard.html` — ใช้ role claim จาก token แทน/เสริม Google login เดิม
- `student-form.html` — ต้อง sign-in ก่อนถึง submit ได้ (rules ใหม่บังคับ auth)
- `organizer-form.html` — **เลิกเก็บ password plaintext** ย้ายไป auth จริง

## 🚨 ข้อควรระวังเรื่องข้อมูลเดิม (อ่านก่อน deploy!)

- **ข้อมูลเดิมทั้งหมดยังอยู่ครบ** — งานที่ทำไปแตะแค่ไฟล์โค้ดในโปรเจกต์
  ไม่ได้แตะ Firestore (database คนละส่วน) ไม่มีการลบ/แก้ข้อมูลนักศึกษาเลย
- rules ใหม่จะ**มีผลก็ต่อเมื่อ `firebase deploy` เท่านั้น** ตอนนี้ไซต์จริงยังใช้ rules เดิม
- **จุดที่ต้องแก้ใน Increment 2:** rules ใหม่ตั้งให้ `participation` เป็น **admin อ่านได้เท่านั้น**
  (เพราะ participation ใช้ `studentId` ไม่ใช่ email → รู้ว่าเป็นของใครยาก)
  แต่ student portal เดิมแสดงกิจกรรมจากทั้ง `participation` และ `submissions`
  → **ถ้า deploy rules ตอนนี้ นักศึกษาจะไม่เห็นกิจกรรมที่เก็บใน `participation`**
  ทางแก้: เพิ่มฟิลด์ `studentEmail` (หรือ uid) ลง participation docs แล้วเปิด rule
  ให้ student อ่านของตัวเองได้ — ต้องทำใน Increment 2 พร้อมกับ migration ข้อมูลเดิม
- allowlist: หลัง deploy **เฉพาะอีเมลที่อยู่ใน `students`/`admins` เท่านั้นที่ login ได้**
  นักศึกษาที่ยังไม่มีใน `students` ต้องถูกเพิ่มก่อน
- `submissions` มีฟิลด์ `studentEmail` อยู่แล้ว → rule student-อ่าน-ของตัวเองใช้ได้เลย ✅

## ปัญหา security อื่นที่ยังค้าง (นอกเหนือ auth)

- **XSS**: ทุกหน้า render ด้วย `innerHTML` ตรงจาก Firestore โดยไม่ escape — ต้องเพิ่ม escaping
- **organizer password plaintext** ใน collection `organizers` — ย้ายไป auth จริงใน Increment 2
- ไฟล์ตายที่ root: `app.js`, `firebase-config.js` (ไม่มีหน้าไหนอ้างถึง — ควรลบ)

## วิธี deploy/test (ย่อ — ละเอียดใน LTI_SETUP.md)

```bash
cd functions && cp .env.example .env    # เติมค่า 3 ตัว
npm install && cd ..
firebase deploy --only functions,firestore:rules,hosting
```
แล้วเพิ่ม App ใน Canvas (Manual Entry, Privacy=Public) + สร้าง admin คนแรกใน `admins`

## Repo / Git

- ทำงานบน branch: `claude/code-understanding-hrvfad`
- ยังไม่ได้เปิด PR
- โครงจริงใหญ่กว่า CLAUDE.md ระบุ (admin-dashboard.html ~8,500 บรรทัด, มี analysis/ pipeline วิจัย)
