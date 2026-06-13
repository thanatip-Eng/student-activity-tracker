# IEEE TALE — Abstract draft (English, ≤250 words)

**Working title:**
Design and Pilot of a Competency-Tracking Web System for Engineering Co-curricular Activities

**Authors:** Thanatip Chankong¹, [Co-author]¹
¹ Faculty of Engineering, Chiang Mai University, Thailand

---

## Abstract (v0.1, 232 words)

Outcome-based engineering education increasingly emphasises competencies that
extend beyond formal courses, yet co-curricular activities — clubs,
competitions, service learning — rarely produce structured competency
evidence that programs can aggregate. Existing learning management systems
track course performance, while extra-curricular records are typically
narrative and unindexed against program outcomes.

This paper presents the design and pilot of a lightweight,
serverless web system that records student participation in co-curricular
activities and maps each activity to a six-domain, eighteen-sub-criterion
competency framework derived from Chiang Mai University's Faculty of
Engineering attributes. The system is implemented as a static front-end
backed by Cloud Firestore, with role-specific interfaces for students,
activity organisers, and administrators, and Google-based authentication
gated by an admin allow-list. Per-student competency is computed as the
maximum demonstrated level across approved activities and visualised as a
radar chart against the six domains.

We describe the data model, scoring rules, and approval workflow, then
report a pilot deployment covering academic year 2025-2026 at the
Faculty of Engineering. Initial data show how activities distribute across
the eighteen skills and reveal coverage gaps that inform future curriculum
planning. We discuss design lessons — including the cost of plaintext
credentials and the value of declarative skill payloads — and outline a
roadmap toward integration with formal course outcomes and longitudinal
tracking across cohorts.

**Keywords:** competency-based education; co-curricular activities;
learning analytics; outcome-based education; engineering education;
web system; Firestore.

---

## Notes for revision

- Replace "[Co-author]" once authorship list is fixed.
- Final N (students/activities/participation) from `out/T1_dataset_summary.csv` — slot into paragraph 3.
- If F3 heatmap reveals 2-3 specific under-covered skills, name them in paragraph 3.
- Tighten to ≤200 words if TALE WIP track requires shorter abstract.
- Mention "open architecture" only if repo is made public at submission time.
