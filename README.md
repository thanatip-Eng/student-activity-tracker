# 🎓 Student Activity Tracking System

ระบบติดตามกิจกรรมและ Competency นักศึกษา พัฒนาด้วย HTML/CSS/JavaScript + Firebase

![Demo](https://img.shields.io/badge/Demo-Live-brightgreen)
![Firebase](https://img.shields.io/badge/Database-Firebase-orange)
![GitHub Pages](https://img.shields.io/badge/Hosting-GitHub%20Pages-blue)

---

## 📖 สารบัญ

1. [สร้างโปรเจค Firebase](#1-สร้างโปรเจค-firebase)
2. [ตั้งค่า Firestore Database](#2-ตั้งค่า-firestore-database)
3. [นำเข้าข้อมูลตัวอย่าง](#3-นำเข้าข้อมูลตัวอย่าง)
4. [อัพโหลดขึ้น GitHub](#4-อัพโหลดขึ้น-github)
5. [เปิดใช้งาน GitHub Pages](#5-เปิดใช้งาน-github-pages)
6. [การใช้งาน](#6-การใช้งาน)

---

## 1. สร้างโปรเจค Firebase

### 1.1 ไปที่ Firebase Console
เปิด [https://console.firebase.google.com](https://console.firebase.google.com) แล้ว Login ด้วย Google Account

### 1.2 สร้างโปรเจคใหม่
1. คลิก **"Add project"** หรือ **"สร้างโปรเจค"**
2. ตั้งชื่อโปรเจค เช่น `student-activity-tracker`
3. เลือก Enable/Disable Google Analytics (ไม่จำเป็น)
4. คลิก **"Create project"**

### 1.3 เพิ่ม Web App
1. ในหน้า Project Overview คลิกไอคอน **Web (</>)**
2. ตั้งชื่อ App เช่น `Student Tracker Web`
3. ✅ เลือก "Also set up Firebase Hosting" (ถ้าต้องการ)
4. คลิก **"Register app"**
5. **📋 คัดลอก Firebase Config** เก็บไว้:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
};
```

---

## 2. ตั้งค่า Firestore Database

### 2.1 เปิดใช้งาน Firestore
1. ในเมนูซ้าย คลิก **"Build" → "Firestore Database"**
2. คลิก **"Create database"**
3. เลือก **"Start in test mode"** (สำหรับทดสอบ)
4. เลือก Location ที่ใกล้ที่สุด (asia-southeast1 สำหรับไทย)
5. คลิก **"Enable"**

### 2.2 ตั้ง Security Rules (สำคัญ!)
ไปที่ **Firestore → Rules** แล้วแก้ไขเป็น:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // อนุญาตให้อ่านข้อมูลได้ทุกคน (ไม่ต้อง auth)
    match /students/{document=**} {
      allow read: if true;
      allow write: if false;
    }
    match /activities/{document=**} {
      allow read: if true;
      allow write: if false;
    }
    match /participation/{document=**} {
      allow read: if true;
      allow write: if false;
    }
    match /submissions/{document=**} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

คลิก **"Publish"** เพื่อบันทึก

---

## 3. นำเข้าข้อมูลตัวอย่าง

### 3.1 สร้าง Collection: `students`
ไปที่ **Firestore → Data → Start collection**

**Collection ID:** `students`

**เพิ่ม Document ตัวอย่าง:**

| Field | Type | Value |
|-------|------|-------|
| name | string | สมชาย ใจดี |
| email | string | somchai@cmu.ac.th |
| studentId | string | 640610001 |

### 3.2 สร้าง Collection: `activities`
**Collection ID:** `activities`

**เพิ่ม Document ตัวอย่าง:**

| Field | Type | Value |
|-------|------|-------|
| name | string | Workshop AI for Beginners |
| description | string | เวิร์คชอปเรียนรู้พื้นฐาน AI |
| level | number | 2 |
| 1.1 | number | 2 |
| 4.1 | number | 2 |
| 4.2 | number | 1 |

### 3.3 สร้าง Collection: `participation`
**Collection ID:** `participation`

**เพิ่ม Document ตัวอย่าง:**

| Field | Type | Value |
|-------|------|-------|
| studentId | string | 640610001 |
| activityName | string | Workshop AI for Beginners |
| status | string | Approved |
| date | string | 2024-01-15 |

---

## 4. อัพโหลดขึ้น GitHub

### 4.1 อัพเดท Firebase Config
แก้ไขไฟล์ `js/firebase-config.js` ใส่ค่าจากข้อ 1.3:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",           // ← แก้ตรงนี้
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### 4.2 สร้าง Repository บน GitHub
1. ไปที่ [https://github.com/new](https://github.com/new)
2. ตั้งชื่อ Repository เช่น `student-activity-tracker`
3. เลือก **Public**
4. คลิก **"Create repository"**

### 4.3 Push Code ขึ้น GitHub

```bash
# เริ่มต้น Git
cd student-activity-tracker
git init

# เพิ่มไฟล์ทั้งหมด
git add .

# Commit
git commit -m "Initial commit - Student Activity Tracker"

# เชื่อมต่อ GitHub (แก้ URL เป็นของคุณ)
git remote add origin https://github.com/YOUR_USERNAME/student-activity-tracker.git

# Push ขึ้น GitHub
git branch -M main
git push -u origin main
```

---

## 5. เปิดใช้งาน GitHub Pages

### 5.1 ตั้งค่า Pages
1. ไปที่ Repository บน GitHub
2. คลิก **Settings** (tab บนสุด)
3. เมนูซ้าย คลิก **Pages**
4. ใน **Source** เลือก:
   - Branch: `main`
   - Folder: `/ (root)`
5. คลิก **Save**

### 5.2 รอ Deploy
- GitHub จะ build และ deploy อัตโนมัติ
- ใช้เวลาประมาณ 1-2 นาที
- URL จะเป็น: `https://YOUR_USERNAME.github.io/student-activity-tracker/`

---

## 6. การใช้งาน

### สำหรับนักศึกษา
1. เข้าเว็บไซต์
2. กรอก Email ที่ลงทะเบียนในระบบ
3. ดูข้อมูลกิจกรรมและคะแนน Competency

### โครงสร้าง Competency (18 Sub-criteria)

| Domain | Code | ชื่อทักษะ |
|--------|------|----------|
| **1. Critical Thinking** | 1.1 | Analytical Reasoning |
| | 1.2 | Systematic Problem Solving |
| | 1.3 | Systems Thinking |
| **2. Communication** | 2.1 | Presentation Skills |
| | 2.2 | Listening & Comprehension |
| | 2.3 | English Communication |
| **3. Teamwork** | 3.1 | Role Understanding |
| | 3.2 | Task Management |
| | 3.3 | Collaborative Work |
| **4. Digital & Learning** | 4.1 | Learning Agility |
| | 4.2 | Digital Literacy |
| | 4.3 | Tool Proficiency |
| **5. Innovation** | 5.1 | Human-Centered Design |
| | 5.2 | Project Management |
| | 5.3 | Business Awareness |
| **6. Self Development** | 6.1 | Personal Growth |
| | 6.2 | Resilience |
| | 6.3 | Empathy |

---

## 📁 โครงสร้างไฟล์

```
student-activity-tracker/
├── index.html          # หน้าหลัก
├── css/
│   └── style.css       # Stylesheet
├── js/
│   ├── firebase-config.js  # Firebase configuration
│   └── app.js          # Main application logic
└── README.md           # คู่มือนี้
```

---

## 🔧 การแก้ไขปัญหา

### ❌ "Firebase is not defined"
- ตรวจสอบว่า Firebase SDK โหลดสำเร็จ
- ตรวจสอบลำดับ script tags

### ❌ "ไม่พบข้อมูลนักศึกษา"
- ตรวจสอบว่าใส่ email ถูกต้อง (ตัวพิมพ์เล็กทั้งหมด)
- ตรวจสอบว่ามีข้อมูลใน Firestore แล้ว

### ❌ "Permission denied"
- ตรวจสอบ Security Rules ของ Firestore
- ให้แน่ใจว่า allow read: if true

---

## 📝 License

MIT License - ใช้งานได้อิสระ

---

## 🤝 Contact

สร้างโดย: [Your Name]
Email: [your@email.com]
