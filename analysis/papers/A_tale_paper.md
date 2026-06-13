# Design and Pilot of a Competency-Tracking Web System for Engineering Co-curricular Activities

**Authors:** Thanatip Chankong¹, {{Co-author}}¹
¹ Faculty of Engineering, Chiang Mai University, Thailand
Corresponding: thanatip@eng.cmu.ac.th

**Target venue:** IEEE TALE 2026 (Innovative Practices / WIP track)
**Status:** Skeleton draft v0.1 — placeholders marked `{{...}}`

---

## Abstract

Outcome-based engineering education increasingly emphasises competencies
that extend beyond formal courses, yet co-curricular activities — clubs,
competitions, service learning — rarely produce structured competency
evidence that programs can aggregate. We present the design and pilot of a
lightweight, serverless web system that records student participation in
co-curricular activities and maps each activity to a six-domain, eighteen-
sub-criterion competency framework. The system uses a static front-end,
Cloud Firestore back-end, and Google-based authentication gated by an admin
allow-list. Per-student competency is computed as the maximum demonstrated
level across approved activities and visualised as a radar chart. A pilot
deployment at Chiang Mai University's Faculty of Engineering during
academic year 2025-2026 captured 5,203 students and 205 activities,
yielding 7,545 approved participation records. A role-aware analysis
shows that students participating as activity organisers reach the
faculty competency threshold (level 3 in at least three skills) at
49.4%, more than nineteen times the rate of plain participants (2.6%).
We discuss design lessons and outline a roadmap toward formal
course-outcome integration and longitudinal tracking.

**Keywords:** competency-based education; co-curricular activities;
learning analytics; outcome-based education; engineering education;
web system; Firestore.

---

## I. Introduction

Outcome-based education (OBE) frameworks such as ABET EAC criteria [1],
AUN-QA [2], and CDIO [3] expect engineering programmes to demonstrate that
graduates achieve a broad set of professional competencies, not just
disciplinary knowledge. Within Thailand, the Office of the Higher
Education Commission's TQF 2.0 [4] mirrors this expectation by mandating
six learning-outcome domains.

While formal courses are routinely tracked through Learning Management
Systems (LMS), the co-curricular sphere — student clubs, competitions,
service-learning projects, organiser roles — produces evidence that is
mostly narrative, unstructured, and not aggregated against programme
outcomes [5]. Co-curricular records (CCRs) exist [6] but typically list
events rather than evidence-based competencies.

We present a lightweight web system, deployed at Chiang Mai University's
Faculty of Engineering, that closes this gap. Each activity is mapped to
sub-criteria within a six-domain, eighteen-skill framework before students
participate, organisers approve attendance, and administrators audit
records. The system computes per-student competency vectors and renders
them as radar charts that students, advisors, and the faculty can use for
self-reflection and curriculum review.

**Contribution.** (i) A faculty-derived eighteen-skill framework and the
mapping rules used to anchor each activity to it; (ii) a serverless
architecture (static HTML + Firestore + Google Auth) that any institution
can replicate without infrastructure procurement; (iii) early pilot data
from one academic year showing skill-coverage patterns and design lessons.

## II. Related Work

**Competency-based engineering education.** Crawley et al.'s CDIO
syllabus [3] and Spady's outcome-based model [7] supply the conceptual
foundations. KEEN's "entrepreneurial mindset" cards [8] illustrate one
framework operationalised across multiple institutions.

**Learning analytics.** Siemens and Gasevic [9] and the LAK conference
literature explore predictive and descriptive analytics in higher
education, mostly course-centric.

**Co-curricular records.** Kuh's high-impact practices [10] document the
educational value of co-curricular engagement. Co-curricular transcripts
exist at several US institutions [6] but mostly enumerate participation
rather than measuring competencies.

**Engineering-specific assessment tools.** Tools such as the {{tool_X}}
and {{tool_Y}} provide rubric-based assessment but require manual entry
by instructors and are not designed for student-organiser-administrator
multi-actor workflows.

Our work differs by (i) tying co-curricular events to competencies
through a fixed framework, (ii) using a multi-actor approval workflow
that produces auditable records, and (iii) shipping a serverless,
zero-procurement deployment suitable for low-budget contexts.

## III. Competency Framework

The framework was developed by a faculty working group at Chiang Mai
University during academic year 2024 and aligns with TQF 2.0 and the
faculty's graduate attributes. Six domains decompose into three
sub-criteria each (Table I).

**Table I. Six domains and eighteen sub-criteria of the competency framework.**

| Code | Domain (Eng / Thai) | Sub-criteria |
|------|---------------------|--------------|
| D1 | Critical Thinking / การคิดวิเคราะห์ | 1.1 Analytical Reasoning, 1.2 Systematic Problem Solving, 1.3 Systems Thinking |
| D2 | Communication / การสื่อสาร | 2.1 Presentation Skills, 2.2 Listening & Comprehension, 2.3 English Communication |
| D3 | Teamwork / การทำงานเป็นทีม | 3.1 Role Understanding, 3.2 Task Management, 3.3 Collaborative Work |
| D4 | Digital & Learning / ดิจิทัลและการเรียนรู้ | 4.1 Learning Agility, 4.2 Digital Literacy, 4.3 Tool Proficiency |
| D5 | Innovation / นวัตกรรม | 5.1 Human-Centered Design, 5.2 Project Management, 5.3 Business Awareness |
| D6 | Self Development / พัฒนาตนเอง | 6.1 Personal Growth, 6.2 Resilience, 6.3 Empathy |

Each sub-criterion has a four-level rubric (1: aware, 2: practised,
3: proficient, 4: led / innovated). Activities declare the level at which
each touched sub-criterion is exercised; students inherit those levels on
approval.

**Scoring rule.** Per-student level on sub-criterion *c* is
*max over approved activities* of the declared level. Domain score is
*max over sub-criteria*. This MAX rule prevents dilution from many
low-level activities and rewards the highest demonstrated mastery, mirroring
ABET's "at least once" attainment philosophy.

## IV. System Architecture

The system is implemented as a static multi-page application backed by
Cloud Firestore. Figure 1 shows the high-level architecture.

**Front-end.** Twelve HTML pages (student portal, organiser form, admin
dashboard, data management, framework documentation) implemented in
vanilla HTML5 / CSS3 / ES6+. Chart.js renders radar visualisations.
Google's Sarabun web font supports bilingual (Thai / English) UI.

**Authentication.** Firebase Auth with the Google provider; admin access
is controlled by an allow-list collection. The first sign-in when the
allow-list is empty bootstraps a faculty admin; subsequent admins are
added through an admin-only interface.

**Data model.** Five Firestore collections:

- `students` — name, email, studentId, optional metadata
- `activities` — name, description, level, organiser, mapped sub-criteria
  and levels (stored in any of three formats for flexibility, see §IV-C)
- `participation` — studentId, activityId, status (approved / pending /
  rejected), date, approver
- `submissions` — student-initiated self-report records pending review
- `admins` / `organizers` — access control collections

**Skill payload formats.** Three formats are accepted to support
migration from legacy spreadsheets: (a) an array `skills: [{code, level}]`,
(b) flat columns `criteria_1_1: 2`, (c) direct keys `"1.1": 2`. A shared
parser normalises them at read time.

**Scoring engine.** All computations (per-student vectors, domain scores,
filtered views) run client-side after a single Firestore query window.
A five-minute in-memory cache reduces read costs in interactive use.

**Hosting.** GitHub Pages serves the static bundle; Firestore handles
persistence. There is no application server.

> Figure 1. System architecture: clients (students, organisers, admins)
> share a static front-end that reads / writes Firestore directly under
> Firestore security rules.

## V. Pilot Deployment

**Period.** 1 June 2025 – 30 April 2026 (Thai academic year 2568).

**Cohort.** {{Faculty / department description}}, all year levels.

**Workflow.** Activity organisers register activities and pre-map them to
sub-criteria. Students self-report participation or organisers bulk
upload attendance. Faculty admins audit and approve. The student portal
shows the radar score for completed activities.

**Data summary (Table II).**

| Metric | Value |
|--------|-------|
| Students registered | 5,203 |
| Activities | 205 |
| Approved participation records | 7,545 |
| Submissions (self-report) | 247 |
| Participation records matched to 18-skill framework | 3,254 (43.1%) |
| Distinct students with at least one matched record | 1,752 |

**Role distribution of activities.** Of the 205 activities, 182 were
offered as a participant variant, 14 as an organiser variant
("ทีมผู้จัด"), and 9 as a staff variant. Eight base activities exist in
two or more role variants — a small but informative subset for
within-activity role comparison.

**Activity skill coverage (Fig. 3).** A heatmap of the top-15 activities
by total declared coverage shows concentration on Communication 2.3
(English Communication) and Teamwork 3.2 (Task Management). Six of the
eighteen sub-criteria — 1.3 Systems Thinking, 2.2 Listening &
Comprehension, 4.3 Tool Proficiency, 5.1 Human-Centered Design, 5.3
Business Awareness, and 6.2 Resilience — never appear at level 3 or
above in any student record, evidencing concrete coverage gaps in the
current activity portfolio.

**Role-aware competency gains.** Per-role mean levels reveal that
activity organisers gain markedly higher Teamwork (3.2 mean = 3.20,
3.3 mean = 2.38) and Project Management (5.2 mean = 2.16) than
participants (3.2 mean = 0.00, 5.2 mean = 0.01), demonstrating that
*role*, not just *attendance*, drives competency development.

**Compliance with the faculty rule** ("each student must reach level
3 in at least three skills"): only 86 of 1,752 students (4.91%) meet
the rule overall. Stratified by the role that contributes most of the
student's coverage: organisers 49.4% (85/172), staff 4.2% (3/72),
participants 2.6% (41/1,595). The 19× gap between organisers and
participants is the most striking pilot finding.

**Monthly participation (Fig. 6).** Volume peaks in the early-semester
months and dips during examination periods, consistent with academic
calendar effects.

## VI. Discussion

**Design lessons.**

- *Allow-list auth beats role hierarchies for small admin teams.* Migrating
  from plaintext passwords to Google Auth removed an entire credential
  store and recovery workflow with no observable user friction.
- *Three skill payload formats hurt and helped.* Flexibility eased
  migration but increased parser complexity; a forced canonical format
  would now be preferable.
- *Declarative skill tagging at activity-creation time* is essential.
  Asking organisers to tag *after* an event consistently produced empty
  fields; embedding tagging in the activity-creation flow improved
  coverage.

**Limitations.**

- One faculty, one academic year — no cross-institution generalisation.
- The MAX scoring rule may overstate competency when activities self-
  report high levels without external rubric calibration.
- Self-reported participation introduces selection bias toward
  high-engagement students.
- 4,291 participation records (56.9% of approved entries) reference
  external LinkedIn Learning courses tagged against a separate
  Entaneer-track framework and could not be mapped to the 18-skill
  rubric. These records were excluded from competency aggregation but
  are retained in the participation count. A unified mapping is
  required before cross-track conclusions can be drawn.

**Future work.**

- Link sub-criteria to formal course learning outcomes for a unified
  competency view.
- Add longitudinal cohort tracking (year 1 → year 4).
- Calibrate activity-level declarations with periodic external audits.
- Open-source the system as a deployable template for other Thai
  engineering faculties.

## VII. Conclusion

We demonstrated that a lightweight, serverless web system can produce
structured competency evidence from co-curricular engineering activities
without procurement overhead. The pilot at Chiang Mai University in
academic year 2025-2026 yielded 7,545 approved records and revealed
that activity *role* — participant, staff, or organiser — explains the
largest share of variance in competency attainment: organisers meet
the three-skills-at-level-3 rule at 49.4% versus 2.6% for plain
participants. Six of the eighteen sub-criteria are not reached by any
student at level 3, evidencing concrete coverage gaps. The framework,
scoring rule, and architecture are replicable; the main remaining work
is rubric calibration, cross-track mapping, and longitudinal
validation.

## Acknowledgement

We thank the Faculty of Engineering, Chiang Mai University, for
operational support; activity organisers and student volunteers for
the pilot data; and the Faculty's Research Ethics Committee for
review (protocol no. {{IRB#}}).

## References

(See `references.bib`. Numbered citations [1]–[10] match entries
`abet`, `aunqa`, `cdio`, `tqf2`, `co_extracurric`, `ccr`, `spady`,
`keen`, `siemens`, `kuh` respectively.)

---

## Drafting checklist

- [ ] Fill `{{Co-author}}`
- [ ] Fill 6 domain names in Table I (from `js/app.js:DOMAINS` or framework doc)
- [ ] Replace `{{N_students}}` etc from `out/T1_dataset_summary.csv` after pipeline succeeds
- [ ] Replace `{{tool_X/Y}}` with two real assessment tools (Pebble Pad, Watermark Aqua, Course Atlas)
- [ ] Produce Figure 1 (architecture) in draw.io or PowerPoint
- [ ] Produce Figure 2 (framework) — see `js/app.js:DOMAINS` or `competency-framework.html`
- [ ] Insert Fig 3 / Fig 6 from `out/`
- [ ] Add IRB protocol number once received
- [ ] Trim to 6 IEEE 2-column pages
