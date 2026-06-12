# Analysis pipeline

Data extraction + analysis for two conference papers:
- **TALE** (IEEE, English) — system design + pilot data
- **วิศวศึกษา** (Thai national) — case study + competency outcomes

Data window: 1 Jun 2025 – 30 Apr 2026 (academic year 2568).

## Setup

```bash
cd analysis
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Get Firebase credentials

1. Firebase Console → ⚙ Project Settings → **Service accounts** tab
2. Click **Generate new private key** → Save JSON
3. Rename to `serviceAccount.json` and place in this folder
4. File is gitignored — never commit it

## Run

```bash
python export_firestore.py     # Firestore -> data/*.csv (anonymized)
python 01_descriptives.py      # data/*.csv -> out/*.csv + *.png
```

## Outputs (out/)

| File | Purpose |
|------|---------|
| `T1_dataset_summary.csv` | Counts table |
| `T2_activity_skill_matrix.csv` | Activity × 18-skill levels |
| `T3_student_skill_matrix.csv` | Student × 18-skill MAX levels |
| `T4_domain_summary.csv` | Mean/SD per domain |
| `T5_skill_correlation.csv` | 18×18 corr |
| `F3_activity_skill_heatmap.png` | Top-15 activities × skills |
| `F4_skill_level_distribution.png` | Per-skill box plot |
| `F5_domain_radar.png` | Mean domain radar ±SD |
| `F6_participation_timeseries.png` | Monthly volume |
| `F7_skill_correlation.png` | Skill correlation heatmap |

## Privacy notes

- `studentId` and `email` hashed (SHA-256, salted) → `sid_hash`
- Raw identifiers dropped at export
- Rotate salt by setting `HASH_SALT` env var
- Suppress cells with N<5 in any reported breakdown
- Apply for IRB exemption from CMU Faculty of Engineering before publishing
- Store `data/` and `out/` outside repo if shared with co-authors

## Paper data shopping list

### TALE (innovation paper)
- T1 summary (sample size)
- F3 activity coverage (justify framework breadth)
- System architecture diagram (write in draw.io / mermaid)
- Optional F6 to show adoption curve

### วิศวศึกษา (case study)
- T1 summary
- T4 domain summary table
- F5 radar (main visual)
- F4 distribution (gap argument)
- Optional F7 if interesting clustering
