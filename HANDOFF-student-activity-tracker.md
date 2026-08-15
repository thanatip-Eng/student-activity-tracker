# HANDOFF — Student Activity & Competency Tracking System

> เอกสารส่งต่อบริบทระบบ สำหรับผู้พัฒนา/AI ที่มารับงานต่อ
> เขียนจากการอ่านโค้ดจริง (ไม่ใช่จาก CLAUDE.md ซึ่งบางจุดล้าสมัย)
> จุดที่ไม่ได้ยืนยันจากโค้ดตรงๆ จะกำกับว่า **(ไม่แน่ใจ)**
> อัปเดต: 2026-07-18 · branch งานล่าสุด: `claude/code-understanding-hrvfad`

---

## 1. ระบบนี้ทำอะไร

**ระบบติดตามกิจกรรมและสมรรถนะนักศึกษา** คณะวิศวกรรมศาสตร์ มหาวิทยาลัยเชียงใหม่
ติดตามการเข้าร่วมกิจกรรมของนักศึกษา แล้วแปลงเป็น "ระดับสมรรถนะ" (competency) ใน
**6 domain × 3 sub-skill = 18 ทักษะ** (ระดับ 1–4) แสดงผลด้วย radar chart อินเทอร์เฟซสองภาษา (ไทยหลัก)

**ผู้ใช้ 3 กลุ่ม:**
- **นักศึกษา** — ดู dashboard สมรรถนะตัวเอง (`student-portal.html`) และแจ้งกิจกรรมที่เข้าร่วม (`student-form.html`)
- **ผู้จัดกิจกรรม (organizer)** — บันทึกกิจกรรมและรายชื่อผู้เข้าร่วม (`organizer-form.html`)
- **แอดมิน** — ตรวจ/อนุมัติ/ปฏิเสธ, จัดการข้อมูล (`admin-dashboard.html`)

**สถานะปัจจุบัน: ใช้งานจริงแบบ pilot + มีงาน overhaul ด้าน auth ค้างกลางทาง**
- ตัวเว็บแอปหลักทำงานได้จริง มีการใช้เก็บข้อมูลจริง (มี `analysis/` pipeline ทำ paper 2 ฉบับ
  จากข้อมูลช่วง 1 มิ.ย. 2025 – 30 เม.ย. 2026 → บ่งชี้ว่าถูกใช้เก็บข้อมูลจริง)
- **งานที่ค้าง:** การเปลี่ยน login มาผูกกับ Canvas (LTI) + rules ความปลอดภัยใหม่
  → เขียน backend/rules เสร็จแล้วแต่ **ยังไม่ deploy และยังไม่เชื่อมหน้าเว็บ** (ดูข้อ 6)

---

## 2. สถาปัตยกรรม

**Tech stack:**
- Frontend: static HTML5 + CSS3 + vanilla JavaScript (ES6) — **ไม่มี build tool / bundler / package.json** ที่ root
- Database: **Firebase Firestore** (SDK 10.7.1 compat mode) โหลดผ่าน CDN
- Charts: Chart.js (CDN jsdelivr)
- Export: SheetJS (xlsx 0.20.1), JSZip 3.10.1
- Auth (แอดมิน): Firebase Auth (Google provider)
- AI: Google **Gemini 2.0 Flash** เรียกตรงจาก client (student-form)
- Fonts: Google Fonts Sarabun
- **Multi-page app** (ไม่ใช่ SPA) — 14 ไฟล์ HTML

**Deploy:**
- ปัจจุบันน่าจะอยู่บน **GitHub Pages** (ลิงก์ในเอกสารชี้ `*.github.io`) — **(ไม่แน่ใจ 100% ว่า production URL ปัจจุบันคืออะไร)**
- ทิศทางใหม่ (จากงานค้าง): ย้ายไป **Firebase Hosting** (มี `firebase.json` เพิ่มเข้ามาแล้ว)
  เพราะ Cloud Function กับหน้าเว็บต้อง origin เดียวกัน

**โครงสร้างโฟลเดอร์สำคัญ:**
```
/                       ← หน้า HTML ทั้งหมดอยู่ที่ root
  index.html            portal หน้าแรก
  student-portal.html   dashboard นักศึกษา  → ใช้ js/app.js
  student-form.html     ฟอร์มแจ้งกิจกรรม (เรียก Gemini)
  organizer-form.html   ฟอร์มผู้จัด (~3,200 บรรทัด)
  admin-dashboard.html  แผงแอดมิน (~8,500 บรรทัด — ใหญ่สุด รวม HTML+CSS+JS)
  data-management.html  import/export CSV
  migrate-tool.html / migrate-activity.html   utility ย้ายข้อมูล
  competency-framework.html / skills-mapping.html / research-analytics.html / user-guide.html / setup.html
  js/app.js             logic ของ student-portal (แหล่ง CRITERIA_LIST/DOMAINS ตัวจริง)
  js/firebase-config.js firebase config ตัวที่ใช้จริง
  app.js  (root)        ⚠️ ไฟล์ตาย — ไม่มีหน้าไหน import (เวอร์ชันเก่าของ js/app.js)
  firebase-config.js (root)  ⚠️ ไฟล์ตาย — ไม่มีหน้าไหน import
  functions/            ⭐ ใหม่ — Cloud Function LTI (ยังไม่ deploy)
  firestore.rules       ⭐ ใหม่ — rules แบบ role-based (ยังไม่ deploy)
  firebase.json / .firebaserc   ⭐ ใหม่ — config hosting+functions
  analysis/             pipeline วิเคราะห์ข้อมูล (Python) สำหรับทำ paper — แยกจากเว็บแอป
```

**Environment variables (ระบุแค่ชื่อ):**
- `functions/.env` (สำหรับ LTI backend — ไม่ commit): `LTI_CONSUMER_KEY`, `LTI_CONSUMER_SECRET`, `LTI_LAUNCH_URL`
- ⚠️ **ค่าลับที่ควรเป็น env แต่ตอนนี้ hardcode ในโค้ด client:**
  - Gemini API key — hardcode ใน `student-form.html` (บรรทัด ~871)
  - Firebase web config — hardcode ใน `js/firebase-config.js` (อันนี้เป็น public config ปกติ ไม่ใช่ความลับจริง)

---

## 3. โครงสร้างข้อมูล (Firestore collections)

> ทุก collection ใช้ **Firestore auto-generated document ID** เป็น key เอกสาร
> การเชื่อมข้อมูลใช้ **field** (email หรือ studentId) ไม่ใช่ doc id

### `students` — ทะเบียนนักศึกษา
คีย์ที่ใช้จริง: **ค้นหาด้วย `email`** (lowercase) / **แต่ join กิจกรรมด้วย `studentId`**
```
{ studentId, name, email(lowercase), department, faculty, year, createdAt }
```
⚠️ จุดสำคัญ: ระบบใช้ `email` เป็นตัวระบุตัวตนตอน login แต่ใช้ `studentId` เป็นตัว join
กับ `participation` — สอง field นี้ต้องตรงกัน

### `activities` — แคตตาล็อกกิจกรรม (master)
```
{ name, level, skills[], description, createdAt, ... }
```
- upsert ด้วย `name`; app.js cache ทั้งหมด key ด้วย `name.toLowerCase()`
- รองรับ skill หลายรูปแบบ: `skills:[{code,level}]` / `criteria_1_1:2` / `"1.1":2`

### `participation` — บันทึกการเข้าร่วมที่อนุมัติแล้ว
```
{ studentId, activityName, date, status('Approved'), skills[], source, addedAt }
```
- `source` = `'csv-import'` (จาก data-management) หรือ `'student-submission'` (จากแอดมินกดอนุมัติ)
- ⚠️ **keyed ด้วย `studentId` ไม่มี email** — เป็นเหตุผลที่ rules ใหม่ยังให้ student อ่านไม่ได้ (ดูข้อ 7)
- กรณี csv-import บาง record `skills` อาจว่าง (แล้วไป fallback จาก activities/submissions)

### `submissions` — กิจกรรมที่นักศึกษาแจ้งเอง (หัวใจการเก็บ reflection)
```
{ studentId, studentName, studentEmail, activityName, activityOrganizer,
  startDate, endDate, duration, durationUnit, activityLevel,
  role, activities, learnings,          ← 3 คำถามสะท้อนคิด (reflection)
  description,                           ← รวม 3 ข้อบนเป็นข้อความเดียว
  evidenceLink, evidenceDescription,     ← หลักฐาน = "ลิงก์" (เช่น Google Drive) ไม่ใช่ไฟล์อัปโหลด
  isLinkedInLearning,
  aiSuggestedSkills[],                   ← ผลจาก Gemini/fallback
  approvedSkills[],                      ← แอดมินกำหนดตอนอนุมัติ
  status, rejectReason,
  submittedAt, reviewedAt,
  _research{ usedAI, aiResponseTimeMs, formCompletionTimeMs,
             reflectionLengths{...}, adminReview{...}, userAgent, ... } }
```
- **มี reflection: ใช่** — เก็บ `role` / `activities` / `learnings` แยก field ครบ
- **มีหลักฐานแนบ: มีแบบ "ลิงก์" เท่านั้น** (`evidenceLink`) — **ไม่มีการอัปโหลดไฟล์จริง/Firebase Storage**
  (ไม่แน่ใจว่ามีที่อื่นเก็บไฟล์ binary — จากที่อ่าน ไม่พบการใช้ Storage)
- `status`: `'Pending Review'` → `'Approved'` / (ปฏิเสธน่าจะ `'Rejected'` — **string ค่าปฏิเสธไม่ได้ยืนยันเป๊ะ**)
- มี **research logging** ฝังลึก (เก็บเวลา, ความยาว reflection, AI accuracy) — ระบบนี้ทำวิจัยควบคู่

### `organizerActivities` — กิจกรรมที่ผู้จัดสร้าง
```
{ organizerEmail, organizerName, department, activityNameBase, activityName,
  startDate, startTime, endDate, endTime, activityDate, duration, durationUnit,
  description, roleDescription, role, roleName, activityLevel,
  skills[], studentIds[], status, updatedAt }
```
- ผูกนักศึกษาผ่าน `studentIds[]`

### `organizers` — บัญชีผู้จัด
```
{ email, name, password, createdAt }
```
- ⚠️ **เก็บ `password` เป็น plaintext** และเทียบฝั่ง client — ช่องโหว่ (ดูข้อ 7)

### `admins` — allowlist แอดมิน
```
{ email, name, uid, photoURL, createdAt, firstLoginAt, lastLoginAt, addedBy }
```
- ใช้เป็น allowlist ตรวจสิทธิ์แอดมิน (Google Auth)

### `surveys` — แบบสอบถามนักศึกษา
- สร้างจาก student-form หลัง submit — **(schema ไม่ได้อ่านละเอียด ไม่แน่ใจ field ครบ)**

### `lti_nonces` — ⭐ ใหม่ (จากงาน LTI)
- เก็บ nonce กัน replay ของ LTI launch; server เขียนเท่านั้น; มี `expireAt` สำหรับ TTL

---

## 4. ระบบ login (สถานะปัจจุบัน — ยังไม่ผูก Canvas)

| ผู้ใช้ | วิธียืนยันตัวตนตอนนี้ | ไฟล์ | ความปลอดภัย |
|--------|----------------------|------|-------------|
| นักศึกษา | พิมพ์ **email อย่างเดียว** → lookup ใน `students` (ไม่มีรหัสผ่าน ไม่ยืนยัน) | `js/app.js` `searchStudent()`, `student-form.html` `loginStudent()` | 🔴 สวมรอยได้ |
| ผู้จัด | email + **password (plaintext)** เทียบฝั่ง client | `organizer-form.html` | 🔴 auth ปลอม |
| แอดมิน | **Firebase Google Auth** + เช็ค allowlist `admins` ฝั่ง client + bootstrap admin คนแรกอัตโนมัติถ้า collection ว่าง | `admin-dashboard.html` `setupAuthListener()` | 🟠 ดีสุดในบรรดา 3 แต่ยังเช็คฝั่ง client |

**ปัจจุบัน: ยังไม่ผูกกับ Canvas เลย** — Canvas assignment แค่ลิงก์ไปหน้าเว็บสาธารณะ

**ทิศทางใหม่ (งานค้าง): ผูก Canvas ผ่าน LTI 1.1**
- Canvas ส่ง launch ที่เซ็น (OAuth 1.0/HMAC-SHA1) → Cloud Function `functions/index.js` (`ltiLaunch`)
  → verify ลายเซ็น → กัน replay ด้วย nonce → เช็คอีเมลกับ allowlist (`admins`→`students`)
  → mint Firebase custom token (แนบ claim `role`) → หน้า bootstrap sign-in → เข้า dashboard
- เหตุผลเลือก LTI 1.1: เพิ่มได้ที่ระดับ course เอง **ไม่ต้องขอ Microsoft tenant / ไม่ต้องเป็น Canvas admin**
- รายละเอียด setup: `LTI_SETUP.md`

---

## 5. การตัดสินใจสำคัญที่ผ่านมา

1. **Serverless / static-only** — ไม่มี backend, ประมวลผล (scoring, chart, filter) ฝั่ง client ทั้งหมด
   เพื่อให้ deploy ง่าย (GitHub Pages) แต่แลกมาด้วยความปลอดภัยที่พึ่ง Firestore rules ล้วน
2. **Scoring = MAX ไม่ใช่ AVG** — คะแนนแต่ละทักษะ = ระดับสูงสุดจากกิจกรรมที่อนุมัติ,
   domain score = MAX ของ sub-skill (ดู `js/app.js` `calculateDomainScores`)
   นับเฉพาะกิจกรรมสถานะ Approved
3. **AI ช่วยแนะนำทักษะ + rule-based fallback** — student-form เรียก Gemini วิเคราะห์ reflection
   ให้ทักษะ/ระดับ ถ้า Gemini ล้มเหลวใช้ `fallbackAnalysis()` (ให้คะแนนตามบทบาท/keyword)
   → แอดมินเป็นคนตัดสินสุดท้าย (`approvedSkills`)
4. **แยก participation / submission** — อนุมัติ submission แล้วสร้าง participation record ใหม่
   (batch write: update submission + set participation + upsert activity)
5. **เลือก Firebase + LTI 1.1 (งานล่าสุด)** — หลังพิจารณาแล้ว: Microsoft Entra ID โดยตรงติดเรื่อง
   ขอ tenant ยาก, LTI 1.3 ต้องใช้ Canvas admin สร้าง Developer Key → **LTI 1.1 คือจุดสมดุล**

**สิ่งที่ลอง/พบว่าไม่เวิร์ค:**
- Firestore rules เดิม `allow read, write: if isSignedIn()` — ดูปลอดภัยแต่จริงๆ ผู้ล็อกอินคนใดก็อ่าน/เขียน
  ทุก collection ได้ และ **ใครก็สร้าง doc `admins` เป็นอีเมลตัวเองเพื่อยกระดับเป็นแอดมินได้**
  → เป็นเหตุผลที่ต้องเขียน rules ใหม่
- `firebase-config.js` (root) ตั้ง `experimentalAutoDetectLongPolling` ส่วน `js/firebase-config.js`
  (ตัวใช้จริง) ใช้ `experimentalForceLongPolling: true, useFetchStreams: false`
  → comment ในโค้ดบอกว่าแก้ปัญหา "WebChannel 404 transport errors"

---

## 6. ใช้งานได้จริง vs ยังไม่เสร็จ/มี bug

**✅ ใช้งานได้จริงตอนนี้:**
- Student portal: search + radar chart + สรุปสมรรถนะ + รายการกิจกรรม + filter
- Student form: แจ้งกิจกรรม + AI วิเคราะห์ทักษะ (Gemini + fallback) + กันแจ้งซ้ำ
- Organizer form: สร้างกิจกรรม + ผูก studentIds
- Admin dashboard: อนุมัติ/ปฏิเสธ submission และ organizerActivity, จัดการ admin/organizer, export
- Data management: import นักศึกษา/participation จาก CSV, export
- In-memory cache (5 นาที) ลด Firebase reads

**⏳ ยังไม่เสร็จ / ค้าง:**
- **LTI/Canvas auth** — backend (`functions/`) + `firestore.rules` เขียนแล้ว แต่
  **ยังไม่ deploy, ยังไม่ test กับ Canvas จริง** (ผ่านแค่ syntax check) และ
  **ยังไม่แก้หน้าเว็บให้รับ token** (student-portal/app.js/admin/forms ยังใช้ email-lookup เดิม)
- rules ใหม่ตั้ง `participation` ให้ **admin อ่านได้เท่านั้น** → ถ้า deploy ตอนนี้
  **นักศึกษาจะไม่เห็นกิจกรรมจาก participation** จนกว่าจะเติม `studentEmail`/uid + เปิด rule (ดูข้อ 7)

**🐞 ความเสี่ยง/หนี้ที่รู้อยู่:**
- **Gemini API key hardcode** ใน student-form.html — ใครเปิด view-source ก็เห็น (ควรย้ายไป proxy/function)
- **XSS**: ทุกหน้า render ด้วย `innerHTML` จากข้อมูล Firestore โดยไม่ escape
- **organizer password plaintext**
- **ไฟล์ตาย** `app.js` + `firebase-config.js` ที่ root (ควรลบ กันสับสน)
- ความไม่ตรงกันของเกณฑ์ผ่าน: `canvas-assignment.md` ระบุ "≥10 คะแนน & ≥3 ทักษะ" แต่ portal
  แสดง totalScore + จำนวน domain ที่ maxLevel≥2 — **(ไม่แน่ใจว่าเกณฑ์ผ่านถูก enforce ที่ไหนจริง)**

---

## 7. จุดที่ต้องระวังถ้ามาพัฒนาต่อ

1. **อย่าเพิ่ง `firebase deploy --only firestore:rules`** จนกว่าจะแก้เรื่อง participation
   — ไม่งั้นนักศึกษาเห็นประวัติหายครึ่งหนึ่ง (เห็นแค่ submissions ไม่เห็น participation)
   วิธีแก้: เพิ่มฟิลด์ `studentEmail` (หรือ uid) ลง `participation` + migration ข้อมูลเก่า + เปิด rule
   ให้ student อ่านของตัวเอง (มี note ใน `firestore.rules` แล้ว)
2. **allowlist gating** — หลัง deploy LTI เฉพาะอีเมลใน `students`/`admins` ถึง login ได้;
   ต้องมั่นใจว่านักศึกษาทุกคนถูก import เข้า `students` ก่อน (email lowercase!)
3. **studentId vs email** — สอง identifier คู่ขนาน; การ join พึ่ง `studentId` ให้ตรงกับ students
4. **แก้ competency framework ต้องแก้ที่ `js/app.js`** (`CRITERIA_LIST`/`DOMAINS`) ซึ่งเป็นแหล่งจริง
   — และมี logic scoring ถูก copy ซ้ำใน `admin-dashboard.html` (มี comment อ้าง `app.js:...`)
   ระวังแก้ที่เดียวไม่ครบ
5. **ไฟล์ config ซ้ำ** — แก้ firebase config ต้องแก้ `js/firebase-config.js` (ตัวใช้จริง) ไม่ใช่ root
6. **admin-dashboard.html ยาว ~8,500 บรรทัด** รวม HTML+CSS+JS — แก้ยาก/เสี่ยง ควรระวัง/ทยอย refactor
7. **Firestore rules คือด่านความปลอดภัยเดียว** (static site + client SDK) — ตรรกะซ่อน UI ฝั่ง client
   ไม่ใช่ security; ต้อง enforce ที่ rules เสมอ
8. **ข้อมูลจริงมีอยู่ใน Firestore** — งานที่ทำมาแตะแค่ไฟล์โค้ด ไม่ได้แตะ database;
   การเปลี่ยน rules เปลี่ยน "ใครเห็น" ไม่ได้ลบข้อมูล แต่ต้องทดสอบ read path ก่อน deploy

**เอกสารประกอบที่ควรอ่านต่อ:** `PROGRESS.md` (สถานะงาน LTI ละเอียด), `LTI_SETUP.md` (ขั้น deploy+Canvas),
`CLAUDE.md` (บริบทเดิม — บางจุดล้าสมัย เช่น บอกแอดมินใช้ password ทั้งที่จริงใช้ Google Auth)

---

## ตารางสรุปฟีเจอร์

| ฟีเจอร์หลัก | สถานะ | ไฟล์ที่เกี่ยวข้อง |
|-------------|-------|-------------------|
| Student portal (radar + สมรรถนะ) | ✅ ใช้งานได้ | `student-portal.html`, `js/app.js` |
| แจ้งกิจกรรม + AI วิเคราะห์ทักษะ | ✅ ใช้งานได้ (Gemini + fallback) | `student-form.html` |
| ฟอร์มผู้จัดกิจกรรม | ✅ ใช้งานได้ / 🔴 auth ไม่ปลอดภัย | `organizer-form.html` |
| แอดมิน: อนุมัติ/ปฏิเสธ/จัดการ | ✅ ใช้งานได้ | `admin-dashboard.html` |
| Import/Export CSV | ✅ ใช้งานได้ | `data-management.html` |
| Migration utilities | ✅ utility | `migrate-tool.html`, `migrate-activity.html` |
| เอกสาร framework/skills | ✅ static | `competency-framework.html`, `skills-mapping.html`, `user-guide.html` |
| Research analytics (หน้าเว็บ) | ❓ ไม่ได้ตรวจละเอียด | `research-analytics.html` |
| Analysis pipeline (paper) | ✅ แยกต่างหาก | `analysis/` (Python) |
| Login แอดมิน (Google Auth) | ✅ ใช้งานได้ / 🟠 เช็ค client | `admin-dashboard.html` |
| Login นักศึกษา/ผู้จัด | 🔴 email/plaintext ไม่ปลอดภัย | `js/app.js`, `student-form.html`, `organizer-form.html` |
| **Canvas LTI auth (backend)** | ⏳ เขียนแล้ว ยังไม่ deploy/test | `functions/`, `LTI_SETUP.md` |
| **Firestore rules ใหม่ (role-based)** | ⏳ เขียนแล้ว ยังไม่ deploy | `firestore.rules` |
| **Firebase Hosting + config** | ⏳ เพิ่มแล้ว ยังไม่ deploy | `firebase.json`, `.firebaserc` |
| เชื่อมหน้าเว็บกับ token (Increment 2) | ❌ ยังไม่ทำ | `js/app.js`, `*.html` |
