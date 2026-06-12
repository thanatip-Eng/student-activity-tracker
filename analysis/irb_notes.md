# IRB / ethics checklist (Thailand context)

## เส้นทาง

ที่ CMU มี **Research Ethics Committee, Faculty of Engineering** หรือ **CMU Human Research Ethics Committee** (มช.).

ข้อมูลที่ใช้คือ secondary data จากระบบ internal — มักเข้าข่าย **exempt** (ไม่ใช่ minimal risk) เพราะ:
- ไม่มี intervention
- ข้อมูล de-identified ก่อน analyze
- ไม่เปิดเผยตัวตน

แต่ต้องยื่นขอ **certificate of exemption** ก่อน publish (ที่ประชุมส่วนใหญ่ require IRB number).

## เอกสารต้องเตรียม

1. โครงร่างวิจัย (research protocol) — 3-5 หน้า
2. แบบฟอร์ม CMU EC / Faculty EC
3. แบบฟอร์ม conflict of interest
4. CV ผู้วิจัยหลัก
5. หนังสือแสดงความยินยอม (consent / waiver of consent) — ถ้าเป็น secondary data ขอ waiver
6. คำอธิบายมาตรการคุ้มครองข้อมูล (data protection plan)

## Data protection plan (สรุป)

- Store: ไฟล์ CSV เก็บเครื่องส่วนตัวที่ encrypt + Firestore ของคณะ
- Access: เฉพาะ PI + co-author ที่ระบุชื่อ
- Transmission: ไม่อัปโหลด raw data ขึ้น cloud share (Google Drive/GitHub)
- Identifier: studentId/email → SHA-256 hashed ก่อน analyze; ลบ raw หลัง publish
- Retention: เก็บ analyzed CSV 5 ปีหลัง publish; ทำลาย raw หลังจบโครงการ
- Reporting threshold: ห้ามรายงาน cell ที่ N<5

## ลำดับเวลาแนะนำ

| สัปดาห์ | งาน |
|---------|-----|
| 0 | เตรียมโครงร่าง + ดึง template EC |
| 1 | ยื่น Faculty EC |
| 2-4 | รอผล / แก้ไข |
| 5 | ได้ certificate → เริ่ม analyze เพื่อ publish |

ระหว่างรอ EC: ยัง **export data ภายในและทำ exploratory analysis ได้** (เพื่อ internal QA / curriculum review). แต่อย่า publish ภายนอกจนกว่าจะได้ EC.

## ใน manuscript ต้องเขียน

- "This study was reviewed and approved (or exempted) by the [committee name] under protocol no. [xxx], date [yyy]."
- "Informed consent was waived because the analysis used de-identified institutional records collected for educational improvement purposes."
- "All data were de-identified before analysis; no individual student is identifiable in the reported results."
