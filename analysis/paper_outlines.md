# Paper outlines

## Paper A — IEEE TALE (English, ~6 pages)

**Working title:** *Design and Pilot of a Competency-Tracking Web System for Engineering Co-curricular Activities*

**Target track:** Innovative Practices / Work-in-Progress

### Outline
1. **Introduction** (0.5 p)
   - Outcome-based engineering education + need for co-curricular evidence
   - Gap: most LMS track formal courses only; co-curricular skills invisible
   - Contribution: framework + open implementation + pilot evidence
2. **Related work** (0.75 p)
   - CBE / CDIO / KEEN
   - Learning analytics dashboards
   - Co-curricular records (Kuh's HIPs)
3. **Competency framework** (1 p)
   - 6 domains × 3 sub-criteria = 18 skills (table)
   - Scoring rule: MAX over approved activities
   - Mapping process from faculty workshop
4. **System architecture** (1.5 p)
   - Static front-end + Firestore + Chart.js
   - Multi-actor flows: student, organizer, admin
   - Auth (Google), data model, skill payload formats
   - Screenshots: portal, organizer form, admin dashboard
5. **Pilot deployment** (1 p)
   - Period, # users, # activities, # participation
   - T1 summary table
   - F3 activity skill coverage
6. **Discussion + future work** (0.75 p)
   - Lessons (Firestore rules, low-friction Google auth)
   - Limits (single-faculty, no longitudinal yet)
   - Next: rubric calibration, LO mapping
7. **Conclusion + references**

### Figures
- F1 framework diagram
- F2 system architecture
- F3 activity-skill heatmap
- F6 monthly participation

---

## Paper B — วิศวศึกษา National Conference (ภาษาไทย, ~6-8 หน้า)

**Working title:** *การติดตามและประเมินสมรรถนะนักศึกษาวิศวกรรมศาสตร์ผ่านกิจกรรมเสริมหลักสูตร: กรณีศึกษามหาวิทยาลัยเชียงใหม่*

**ประเภท:** บทความวิจัย / กรณีศึกษา

### โครงร่าง
1. **บทนำ** (0.5 หน้า)
   - การศึกษาวิศวกรรมเชิงผลลัพธ์ (OBE) ในไทย + ABET / AUN-QA
   - ปัญหา: กิจกรรมเสริมหลักสูตรขาดหลักฐานสมรรถนะเชิงปริมาณ
2. **วัตถุประสงค์** (0.25 หน้า)
   - ออกแบบและทดลองใช้ระบบติดตามสมรรถนะ
   - วิเคราะห์การพัฒนาสมรรถนะ 18 ด้านในช่วงปีการศึกษา 2568
   - ระบุช่องว่าง (gap) และเสนอแนะเชิงนโยบาย
3. **กรอบสมรรถนะ + ทบทวนวรรณกรรม** (1 หน้า)
   - 6 ด้าน 18 ตัวชี้วัด (ตาราง)
   - เปรียบเทียบ CDIO / KEEN / TQF Thailand 2.0
4. **วิธีดำเนินงาน** (1 หน้า)
   - ระบบติดตาม (สรุปสั้น ๆ; ละเอียดให้อ้าง paper A หรือ system note)
   - การเก็บข้อมูล: นักศึกษาคณะวิศวฯ ม.ช. ช่วง มิ.ย. 2568 – เม.ย. 2569
   - การวิเคราะห์: descriptive + radar + gap
   - จริยธรรมการวิจัย / การปกป้องข้อมูล
5. **ผลการวิจัย** (2 หน้า)
   - ตาราง T1 ปริมาณข้อมูล
   - ตาราง T4 mean ± SD per domain
   - รูป F5 radar (รูปหลัก)
   - รูป F4 distribution per skill
   - การระบุ skill ที่ต่ำกว่าเกณฑ์ (gap)
6. **อภิปรายผล + ข้อเสนอแนะ** (1 หน้า)
   - ด้านที่นักศึกษายังขาด → กิจกรรมที่ควรเพิ่ม
   - ข้อจำกัด (เฉพาะกิจกรรมที่ approve, MAX rule อาจ overestimate)
   - ข้อเสนอเชิงนโยบายระดับคณะ
7. **สรุป + บรรณานุกรม**

### รูป/ตาราง
- T1, T4
- F1 กรอบสมรรถนะ (ภาษาไทย)
- F5 radar
- F4 distribution
- F6 participation time series (optional)

---

## เลี่ยง overlap

| ส่วน | Paper A (TALE) | Paper B (วิศวศึกษา) |
|------|---------------|----------------------|
| Framework | บอกสั้น ๆ ตาราง 1 | อธิบายเต็ม + ทบทวนวรรณกรรมไทย |
| System | เป็นจุดเด่น | สรุป 1 ย่อหน้า + อ้าง paper A |
| Data | descriptive + coverage | competency outcomes + gap + นโยบาย |
| Audience | global researchers | Thai faculty/policy |
| ภาษา | Eng | Thai |

ไม่ใช้ paragraph ซ้ำ. ตารางและรูป F3 (TALE) vs F5+F4 (วิศวศึกษา) แยกชัด.
