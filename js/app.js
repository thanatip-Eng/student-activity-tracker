// ============================================
// CRITERIA DEFINITIONS
// ============================================
const CRITERIA_LIST = [
    { code: "1.1", nameTh: "การใช้เหตุผลเชิงวิเคราะห์", nameEn: "Analytical Reasoning", domain: "Critical Thinking" },
    { code: "1.2", nameTh: "การแก้ปัญหาอย่างเป็นระบบ", nameEn: "Systematic Problem Solving", domain: "Critical Thinking" },
    { code: "1.3", nameTh: "การคิดเชิงระบบและบริบททางสังคม", nameEn: "Systems Thinking", domain: "Critical Thinking" },
    { code: "2.1", nameTh: "ทักษะการนำเสนอ", nameEn: "Presentation Skills", domain: "Communication" },
    { code: "2.2", nameTh: "การฟังและความเข้าใจ", nameEn: "Listening & Comprehension", domain: "Communication" },
    { code: "2.3", nameTh: "การสื่อสารภาษาอังกฤษ", nameEn: "English Communication", domain: "Communication" },
    { code: "3.1", nameTh: "ความเข้าใจในบทบาท", nameEn: "Role Understanding", domain: "Teamwork" },
    { code: "3.2", nameTh: "การจัดการงาน", nameEn: "Task Management", domain: "Teamwork" },
    { code: "3.3", nameTh: "การทำงานร่วมกัน", nameEn: "Collaborative Work", domain: "Teamwork" },
    { code: "4.1", nameTh: "ความคล่องตัวในการเรียนรู้", nameEn: "Learning Agility", domain: "Digital & Learning" },
    { code: "4.2", nameTh: "ความรู้ด้านดิจิทัล", nameEn: "Digital Literacy", domain: "Digital & Learning" },
    { code: "4.3", nameTh: "ความเชี่ยวชาญเครื่องมือ", nameEn: "Tool Proficiency", domain: "Digital & Learning" },
    { code: "5.1", nameTh: "การออกแบบที่ยึดมนุษย์เป็นศูนย์กลาง", nameEn: "Human-Centered Design", domain: "Innovation" },
    { code: "5.2", nameTh: "การบริหารโครงการ", nameEn: "Project Management", domain: "Innovation" },
    { code: "5.3", nameTh: "ความตระหนักทางธุรกิจ", nameEn: "Business Awareness", domain: "Innovation" },
    { code: "6.1", nameTh: "การเติบโตส่วนบุคคล", nameEn: "Personal Growth", domain: "Self Development" },
    { code: "6.2", nameTh: "ความยืดหยุ่นและการปรับตัว", nameEn: "Resilience", domain: "Self Development" },
    { code: "6.3", nameTh: "ความเห็นอกเห็นใจ", nameEn: "Empathy", domain: "Self Development" }
];

const DOMAINS = [
    { id: 1, name: "Critical Thinking", nameTh: "การคิดวิเคราะห์", color: "#667eea" },
    { id: 2, name: "Communication", nameTh: "การสื่อสาร", color: "#27ae60" },
    { id: 3, name: "Teamwork", nameTh: "การทำงานเป็นทีม", color: "#f39c12" },
    { id: 4, name: "Digital & Learning", nameTh: "ดิจิทัลและการเรียนรู้", color: "#e74c3c" },
    { id: 5, name: "Innovation", nameTh: "นวัตกรรม", color: "#9b59b6" },
    { id: 6, name: "Self Development", nameTh: "พัฒนาตนเอง", color: "#1abc9c" }
];

// ============================================
// LOOKUP MAPS (Fix #3 - O(1) lookups)
// ============================================
const CRITERIA_BY_CODE = new Map();
CRITERIA_LIST.forEach(c => CRITERIA_BY_CODE.set(c.code, c));

const DOMAIN_BY_NAME = new Map();
DOMAINS.forEach(d => DOMAIN_BY_NAME.set(d.name, d));

const CRITERIA_BY_DOMAIN = new Map();
DOMAINS.forEach(d => {
    CRITERIA_BY_DOMAIN.set(d.name, CRITERIA_LIST.filter(c => c.domain === d.name));
});

// ============================================
// GLOBAL VARIABLES
// ============================================
let currentStudent = null;
let studentActivities = [];
let competencyChart = null;
let currentFilter = 'all';
let filterButtonsInitialized = false; // Fix #6

// ============================================
// HTML ESCAPING (Fix #7 - XSS prevention)
// ============================================
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================
// CACHE SYSTEM
// ============================================
const CACHE_DURATION = 5 * 60 * 1000;
let activitiesCache = null;
let activitiesCacheTime = 0;

async function getActivitiesCache() {
    const now = Date.now();

    if (activitiesCache && (now - activitiesCacheTime) < CACHE_DURATION) {
        return activitiesCache;
    }

    // Fix #5 - removed excessive console logs
    const snapshot = await activitiesCollection.get();

    activitiesCache = {};
    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.name) {
            activitiesCache[data.name.toLowerCase()] = {
                id: doc.id,
                ...data
            };
        }
    });

    activitiesCacheTime = now;
    return activitiesCache;
}

function getActivityFromCache(activityName) {
    if (!activitiesCache || !activityName) return null;
    return activitiesCache[activityName.toLowerCase()] || null;
}

// ============================================
// SEARCH FUNCTION (NO PASSWORD)
// ============================================
async function searchStudent() {
    const email = document.getElementById('email-input').value.trim().toLowerCase();
    const errorEl = document.getElementById('search-error');

    if (!email) {
        errorEl.textContent = '⚠️ กรุณากรอก Email | Please enter Email';
        return;
    }

    if (!email.includes('@')) {
        errorEl.textContent = '⚠️ รูปแบบ Email ไม่ถูกต้อง | Invalid Email format';
        return;
    }

    errorEl.textContent = '';
    showLoading(true);

    try {
        const studentQuery = await studentsCollection.where('email', '==', email).limit(1).get();

        if (studentQuery.empty) {
            errorEl.textContent = '❌ ไม่พบข้อมูลในระบบ กรุณาตรวจสอบ Email | Student not found. Please check your Email';
            showLoading(false);
            return;
        }

        const studentDoc = studentQuery.docs[0];
        const studentData = studentDoc.data();

        currentStudent = {
            id: studentDoc.id,
            ...studentData
        };

        sessionStorage.setItem('studentSession', JSON.stringify({
            id: currentStudent.id,
            email: currentStudent.email,
            name: currentStudent.name,
            studentId: currentStudent.studentId
        }));

        await loadStudentActivities();
        showDashboard();

    } catch (error) {
        console.error('Search error:', error);
        errorEl.textContent = '❌ เกิดข้อผิดพลาด กรุณาลองใหม่ | Error occurred. Please try again';
    }

    showLoading(false);
}


// ============================================
// LOAD STUDENT ACTIVITIES (OPTIMIZED)
// ============================================
async function loadStudentActivities() {
    studentActivities = [];

    try {
        // Fix #9 - Run cache load, participation query, and submission query in parallel
        const [_, participationQuery, submissionsQuery] = await Promise.all([
            getActivitiesCache(),
            participationCollection
                .where('studentId', '==', currentStudent.studentId)
                .get(),
            db.collection('submissions')
                .where('studentEmail', '==', currentStudent.email)
                .get()
        ]);

        // Process participations
        for (const doc of participationQuery.docs) {
            const participation = doc.data();
            const activity = getActivityFromCache(participation.activityName);

            let activityData = {
                id: doc.id,
                name: participation.activityName,
                status: participation.status || 'Approved',
                date: participation.date || '',
                skills: [],
                level: 1
            };

            if (activity) {
                activityData.skills = extractSkills(activity);
                activityData.level = activity.level || 1;
                activityData.description = activity.description || '';
            }

            studentActivities.push(activityData);
        }

        // Fix #4 - Build Set for O(1) duplicate check
        const existingNames = new Set(
            studentActivities.map(a => a.name.toLowerCase())
        );

        // Process submissions
        for (const doc of submissionsQuery.docs) {
            const submission = doc.data();
            const submissionName = submission.activityName?.toLowerCase();

            if (submissionName && !existingNames.has(submissionName)) {
                existingNames.add(submissionName);
                studentActivities.push({
                    id: doc.id,
                    name: submission.activityName || 'ไม่ระบุชื่อ',
                    status: submission.status || 'Pending',
                    date: submission.activityDate || '',
                    skills: submission.skills || submission.approvedSkills || [],
                    level: submission.activityLevel || 1,
                    description: submission.description || '',
                    rejectReason: submission.rejectReason || ''
                });
            }
        }

    } catch (error) {
        console.error('Error loading activities:', error);
    }
}


// ============================================
// EXTRACT SKILLS FROM ACTIVITY
// ============================================
function extractSkills(activity) {
    let skills = [];

    if (activity.skills && Array.isArray(activity.skills)) {
        skills = [...activity.skills];
    } else {
        CRITERIA_LIST.forEach(criteria => {
            const fieldName = `criteria_${criteria.code.replace('.', '_')}`;
            if (activity[fieldName] && activity[fieldName] > 0) {
                skills.push({
                    code: criteria.code,
                    level: parseInt(activity[fieldName])
                });
            }
        });

        if (skills.length === 0) {
            CRITERIA_LIST.forEach(criteria => {
                const value = activity[criteria.code] || activity[criteria.code.replace('.', '_')];
                if (value && value > 0) {
                    skills.push({
                        code: criteria.code,
                        level: parseInt(value)
                    });
                }
            });
        }
    }

    if (skills.length > 3) {
        skills.sort((a, b) => b.level - a.level);
        skills = skills.slice(0, 3);
    }

    return skills;
}

// ============================================
// CALCULATE COMPETENCY SCORES
// Fix #2 - accepts pre-filtered approved list
// ============================================
function calculateCompetencyScores(approvedActivities) {
    const scores = {};

    CRITERIA_LIST.forEach(criteria => {
        scores[criteria.code] = 0;
    });

    approvedActivities.forEach(activity => {
        if (activity.skills && Array.isArray(activity.skills)) {
            activity.skills.forEach(skill => {
                if (skill.code && skill.level) {
                    scores[skill.code] = Math.max(scores[skill.code], skill.level);
                }
            });
        }
    });

    return scores;
}

// ============================================
// CALCULATE DOMAIN SCORES - USE MAX NOT AVG
// Fix #3 - uses pre-built CRITERIA_BY_DOMAIN map
// ============================================
function calculateDomainScores(scores) {
    const domainScores = {};

    DOMAINS.forEach(domain => {
        const domainCriteria = CRITERIA_BY_DOMAIN.get(domain.name);
        const domainLevels = domainCriteria.map(c => scores[c.code] || 0);

        const total = domainLevels.reduce((a, b) => a + b, 0);
        const max = domainCriteria.length * 4;

        const maxLevel = Math.max(...domainLevels, 0);
        const avg = domainLevels.length > 0 ? total / domainLevels.length : 0;
        const percentage = max > 0 ? (total / max) * 100 : 0;

        const passCount = domainLevels.filter(l => l >= 2).length;

        domainScores[domain.name] = {
            total,
            max,
            maxLevel,
            avg: Math.round(avg * 10) / 10,
            percentage: Math.round(percentage),
            levels: domainLevels,
            passCount,
            subCount: domainCriteria.length
        };
    });

    return domainScores;
}

// ============================================
// SHOW DASHBOARD
// Fix #1 - single calculateDomainScores call
// Fix #2 - single approved filter
// ============================================
function showDashboard() {
    document.getElementById('search-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';

    document.getElementById('avatar-initial').textContent =
        currentStudent.name ? currentStudent.name.charAt(0).toUpperCase() : 'S';
    document.getElementById('student-name').textContent = currentStudent.name || 'นักศึกษา';
    document.getElementById('student-email').textContent = currentStudent.email || '-';
    document.getElementById('student-id').textContent = `รหัสนักศึกษา: ${currentStudent.studentId || '-'}`;

    // Fix #2 - filter approved activities once, pass everywhere
    const approvedActivities = studentActivities.filter(a =>
        a.status?.toLowerCase().includes('approved'));

    // Fix #1 & #2 - calculate scores once, pass domainScores to chart
    const scores = calculateCompetencyScores(approvedActivities);
    const domainScores = calculateDomainScores(scores);

    const domainsPassedCount = DOMAINS.filter(d => domainScores[d.name].maxLevel >= 2).length;

    let totalScore = 0;
    approvedActivities.forEach(activity => {
        if (activity.skills && Array.isArray(activity.skills)) {
            activity.skills.forEach(skill => {
                totalScore += (skill.level || 0);
            });
        }
    });

    document.getElementById('total-activities').textContent = studentActivities.length;
    document.getElementById('approved-activities').textContent = approvedActivities.length;
    document.getElementById('skill-achieved').textContent = domainsPassedCount;
    document.getElementById('competency-score').textContent = totalScore;

    // Fix #1 - pass domainScores to avoid recalculation
    renderCompetencyChart(domainScores);
    renderCompetencySummary(scores, domainScores);
    renderActivitiesList();
    setupFilterButtons();
}

// ============================================
// RENDER RADAR CHART WITH TARGETS - USE MAX
// Fix #1 - accepts domainScores directly
// ============================================
function renderCompetencyChart(domainScores) {
    const ctx = document.getElementById('competencyChart').getContext('2d');

    if (competencyChart) {
        competencyChart.destroy();
    }

    const labels = DOMAINS.map(d => d.name);
    const data = DOMAINS.map(d => domainScores[d.name].maxLevel);

    const minTarget = [2, 2, 2, 2, 2, 2];
    const idealTarget = [3, 3, 3, 3, 3, 3];

    competencyChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'ระดับปัจจุบัน | Current',
                    data: data,
                    backgroundColor: 'rgba(102, 126, 234, 0.3)',
                    borderColor: '#667eea',
                    borderWidth: 3,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                },
                {
                    label: 'ขั้นต่ำ | Min (Lv.2)',
                    data: minTarget,
                    backgroundColor: 'rgba(241, 196, 15, 0.1)',
                    borderColor: '#f1c40f',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0
                },
                {
                    label: 'เป้าหมาย (Lv.3)',
                    data: idealTarget,
                    backgroundColor: 'rgba(39, 174, 96, 0.1)',
                    borderColor: '#27ae60',
                    borderWidth: 2,
                    borderDash: [10, 5],
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    beginAtZero: true,
                    min: 0,
                    max: 4,
                    ticks: {
                        stepSize: 1,
                        display: true,
                        backdropColor: 'transparent',
                        font: { size: 10 },
                        callback: function(value) {
                            return 'Lv.' + value;
                        }
                    },
                    pointLabels: {
                        font: { size: 11, weight: '600' },
                        color: '#333'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    angleLines: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const domain = DOMAINS[context.dataIndex];
                            if (context.datasetIndex === 0) {
                                return `${domain.nameTh}: Lv.${context.raw.toFixed(1)}`;
                            }
                            return context.dataset.label;
                        }
                    }
                }
            }
        }
    });
}

// ============================================
// RENDER COMPETENCY SUMMARY - USE MAX
// Fix #3 - uses CRITERIA_BY_DOMAIN map
// ============================================
function renderCompetencySummary(scores, domainScores) {
    const container = document.getElementById('competency-summary');

    container.innerHTML = DOMAINS.map((domain, idx) => {
        const ds = domainScores[domain.name];
        const domainCriteria = CRITERIA_BY_DOMAIN.get(domain.name);

        let statusClass = 'low';
        let statusText = '⚠️ ต้องพัฒนา';
        if (ds.maxLevel >= 3) {
            statusClass = 'excellent';
            statusText = '⭐ ยอดเยี่ยม';
        } else if (ds.maxLevel >= 2) {
            statusClass = 'good';
            statusText = '✅ ผ่านเกณฑ์';
        }

        const subSkillsHtml = domainCriteria.map(c => {
            const level = scores[c.code] || 0;
            const levelClass = level >= 3 ? 'excellent' : level >= 2 ? 'good' : level >= 1 ? 'developing' : 'none';
            return `
                <div class="sub-skill-row">
                    <span class="sub-skill-code">${escapeHtml(c.code)}</span>
                    <span class="sub-skill-name">${escapeHtml(c.nameTh)}</span>
                    <span class="sub-skill-level level-${levelClass}">Lv.${level}</span>
                </div>
            `;
        }).join('');

        return `
            <div class="domain-summary">
                <div class="domain-summary-header" style="border-left-color: ${domain.color}">
                    <div class="domain-summary-title">
                        <span class="domain-num">${idx + 1}</span>
                        <span>${escapeHtml(domain.name)}</span>
                    </div>
                    <div class="domain-summary-level">
                        <span class="avg-level">Lv.${ds.maxLevel}</span>
                        <span class="status-text ${statusClass}">${statusText}</span>
                    </div>
                </div>
                <div class="domain-summary-body">
                    ${subSkillsHtml}
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// RENDER ACTIVITIES LIST
// Fix #3 - uses CRITERIA_BY_CODE and DOMAIN_BY_NAME maps
// Fix #7 - escapes user-provided strings
// ============================================
function renderActivitiesList() {
    const container = document.getElementById('activities-list');

    let filtered = studentActivities;
    if (currentFilter !== 'all') {
        filtered = studentActivities.filter(a =>
            a.status?.toLowerCase().includes(currentFilter.toLowerCase())
        );
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">📭</div>
                <p>ไม่พบกิจกรรม</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(activity => {
        const statusClass = getStatusClass(activity.status);
        const statusText = getStatusText(activity.status);

        const totalScore = activity.skills?.reduce((sum, s) => sum + (s.level || 0), 0) || 0;

        // Fix #3 - use Map lookups instead of .find()
        const skillsByDomain = {};
        activity.skills?.forEach(s => {
            const criteria = CRITERIA_BY_CODE.get(s.code);
            if (criteria) {
                if (!skillsByDomain[criteria.domain]) {
                    skillsByDomain[criteria.domain] = [];
                }
                skillsByDomain[criteria.domain].push(s);
            }
        });

        const skillsHtml = Object.entries(skillsByDomain).map(([domain, skills]) => {
            const domainInfo = DOMAIN_BY_NAME.get(domain);
            return `
                <div class="activity-skill-group" style="border-left-color: ${domainInfo?.color || '#666'}">
                    <span class="skill-domain-name">${escapeHtml(domain)}</span>
                    <div class="skill-tags">
                        ${skills.map(s => `<span class="skill-tag-new">${escapeHtml(s.code)} <strong>+${s.level}</strong></span>`).join('')}
                    </div>
                </div>
            `;
        }).join('');

        // Fix #7 - escape user-provided content
        const rejectReasonHtml = (statusClass === 'rejected' && activity.rejectReason) ? `
            <div class="reject-reason-box">
                <span class="reject-reason-label">💬 เหตุผล:</span>
                <span class="reject-reason-text">${escapeHtml(activity.rejectReason)}</span>
            </div>
        ` : '';

        return `
            <div class="activity-item-new status-${statusClass}">
                <div class="activity-main">
                    <div class="activity-info">
                        <div class="activity-title-row">
                            <span class="activity-title">${escapeHtml(activity.name)}</span>
                            <span class="status-badge ${statusClass}">${statusText}</span>
                        </div>
                        <div class="activity-meta">
                            <span>📅 ${escapeHtml(activity.date) || 'ไม่ระบุวันที่'}</span>
                            <span>📊 ระดับกิจกรรม: ${activity.level || 1}</span>
                        </div>
                        ${rejectReasonHtml}
                    </div>
                    <div class="activity-score">
                        <span class="score-number">+${totalScore}</span>
                        <span class="score-label">คะแนน</span>
                    </div>
                </div>
                ${skillsHtml ? `<div class="activity-skills-detail">${skillsHtml}</div>` : ''}
            </div>
        `;
    }).join('');
}

function getStatusClass(status) {
    if (!status) return 'pending';
    const s = status.toLowerCase();
    if (s.includes('approved')) return 'approved';
    if (s.includes('rejected')) return 'rejected';
    return 'pending';
}

function getStatusText(status) {
    if (!status) return '⏳ รอดำเนินการ';
    const s = status.toLowerCase();
    if (s.includes('approved')) return '✅ อนุมัติ';
    if (s.includes('rejected')) return '❌ ไม่อนุมัติ';
    return '⏳ รอดำเนินการ';
}

// ============================================
// FILTER BUTTONS
// Fix #6 - use event delegation, set up once
// ============================================
function setupFilterButtons() {
    if (filterButtonsInitialized) return;
    filterButtonsInitialized = true;

    const filterContainer = document.querySelector('.activities-filter');
    if (!filterContainer) return;

    filterContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;

        filterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderActivitiesList();
    });
}

// ============================================
// NAVIGATE TO ACTIVITY FORM
// Fix #11 - removed redundant sessionStorage save
// ============================================
function goToActivityForm() {
    window.location.href = 'student-form.html';
}

// ============================================
// LOGOUT
// ============================================
function logout() {
    currentStudent = null;
    studentActivities = [];
    sessionStorage.removeItem('studentSession');

    document.getElementById('email-input').value = '';
    document.getElementById('search-error').textContent = '';

    document.getElementById('dashboard-section').style.display = 'none';
    document.getElementById('search-section').style.display = 'flex';

    if (competencyChart) {
        competencyChart.destroy();
        competencyChart = null;
    }
}

// ============================================
// LOADING
// ============================================
function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = show ? 'flex' : 'none';
}

// ============================================
// ENTER KEY HANDLERS
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.getElementById('email-input');

    if (emailInput) {
        emailInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchStudent();
            }
        });
    }

    const session = sessionStorage.getItem('studentSession');
    if (session) {
        try {
            const data = JSON.parse(session);
            if (data.email) {
                document.getElementById('email-input').value = data.email;
            }
        } catch (e) {}
    }
});
