# CLAUDE.md

## Project Overview

Student Activity and Competency Tracking System for Chiang Mai University's Faculty of Engineering. Tracks student learning activities and competency development across 6 domains with 18 sub-criteria. Displays progress via radar charts. Bilingual (Thai/English) interface with Thai as primary language.

## Tech Stack

- **Frontend:** Static HTML5, CSS3, vanilla JavaScript (ES6+)
- **Database:** Firebase Firestore (SDK 10.7.1, compat mode)
- **Charts:** Chart.js (radar charts)
- **Fonts:** Google Fonts - Sarabun
- **Hosting:** GitHub Pages / Firebase Hosting
- **No build tools, no bundler, no package.json** — pure static site with CDN dependencies

## Project Structure

```
├── index.html                  # Home / portal
├── student-portal.html         # Student dashboard (main)
├── student-form.html           # Activity submission form
├── organizer-form.html         # Event organizer interface
├── admin-dashboard.html        # Admin panel
├── data-management.html        # Data import/export
├── competency-framework.html   # Competency definitions
├── skills-mapping.html         # Skills mapping docs
├── research-analytics.html     # Analytics page
├── user-guide.html             # User documentation
├── migrate-tool.html           # Migration utilities
├── setup.html                  # Setup guide
├── css/
│   ├── style.css               # Main dashboard styles
│   ├── admin-style.css         # Admin panel styles
│   └── form-style.css          # Form styles
├── js/
│   ├── app.js                  # Core application logic
│   └── firebase-config.js      # Firebase config
└── images/
```

## Running Locally

```bash
# Any static file server works
python -m http.server 8000
# or
npx http-server
# or
npx serve
```

No build step required. No tests configured.

## Architecture

- **Multi-page application** (12 HTML files, not SPA)
- **Serverless** — all data via Firebase Firestore, no backend
- **Client-side processing** — scoring, charts, filtering all in JS
- **Session storage** for state persistence between pages
- **In-memory cache** with 5-minute TTL for Firebase reads
- **No authentication** — email-based lookup only; admin uses browser-stored password

## Key Domain Logic

### Competency Framework
- 6 domains × 3 sub-criteria = 18 skills
- Skill levels: 1–4
- Scoring: MAX level per skill across approved activities (not average)
- Domain score: MAX of sub-skill levels
- Only "Approved" activities count toward competency scores

### Firebase Collections
- `students` — name, email, studentId
- `activities` — name, description, level, skills[], criteria fields
- `participation` — studentId, activityName, status, date
- `submissions` — studentEmail, activityName, status, skills[]

### Skill Data Formats (multiple supported)
- Array: `skills: [{code: "1.1", level: 2}]`
- Field: `criteria_1_1: 2`
- Direct: `"1.1": 2`

## Coding Conventions

### JavaScript
- `camelCase` for variables and functions
- UPPERCASE for constants (`CRITERIA_LIST`, `DOMAINS`)
- `async/await` for all Firebase operations
- Try-catch with user-friendly error messages
- Section comments with `// ============================================`
- Global state variables: `currentStudent`, `studentActivities`, `competencyChart`, `currentFilter`

### CSS
- BEM-like naming (`.stat-card`, `.stat-icon`, `.stat-content`)
- CSS Grid + Flexbox for layout
- Linear gradients for backgrounds
- Hardcoded color palette:
  - Primary: `#667eea`
  - Success: `#27ae60`
  - Warning: `#f39c12`
  - Danger: `#e74c3c`
  - Dark: `#1a1a2e`
- Domain colors: `#667eea`, `#27ae60`, `#f39c12`, `#e74c3c`, `#9b59b6`, `#1abc9c`
- Responsive: `auto-fit` / `minmax` grids, `flex-wrap`

### HTML
- Semantic HTML5
- `lang="th"` — Thai primary language
- SVG emoji favicons

## Key Functions (js/app.js)

- `searchStudent()` — email-based student lookup
- `loadStudentActivities()` — fetch and process activities
- `calculateCompetencyScores()` — compute skill levels from approved activities
- `renderCompetencyChart()` — Chart.js radar visualization
- `renderActivitiesList()` — display activity history
- `filterActivities()` — filter by approval status
