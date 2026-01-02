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
// GLOBAL VARIABLES
// ============================================
let currentStudent = null;
let studentActivities = [];
let competencyChart = null;
let currentFilter = 'all';

// ============================================
// SEARCH FUNCTION
// ============================================
async function searchStudent() {
    const email = document.getElementById('email-input').value.trim().toLowerCase();
    const password = document.getElementById('password-input').value.trim();
    const errorEl = document.getElementById('search-error');
    
    if (!email) {
        errorEl.textContent = '⚠️ กรุณากรอก Email';
        return;
    }
    
    if (!email.includes('@')) {
        errorEl.textContent = '⚠️ รูปแบบ Email ไม่ถูกต้อง';
        return;
    }
    
    if (!password) {
        errorEl.textContent = '⚠️ กรุณากรอกรหัสผ่าน';
        return;
    }
    
    if (password.length < 4) {
        errorEl.textContent = '⚠️ รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร';
        return;
    }
    
    errorEl.textContent = '';
    showLoading(true);
    
    try {
        const studentQuery = await studentsCollection.where('email', '==', email).limit(1).get();
        
        if (studentQuery.empty) {
            errorEl.textContent = '❌ ไม่พบข้อมูลนักศึกษาในระบบ กรุณาตรวจสอบ Email อีกครั้ง';
            showLoading(false);
            return;
        }
        
        const studentDoc = studentQuery.docs[0];
        const studentData = studentDoc.data();
        
        // Check if password exists
        if (!studentData.password) {
            await studentsCollection.doc(studentDoc.id).update({ password: password });
            studentData.password = password;
        } else {
            if (password !== studentData.password) {
                errorEl.textContent = '❌ รหัสผ่านไม่ถูกต้อง';
                showLoading(false);
                return;
            }
        }
        
        currentStudent = {
            id: studentDoc.id,
            ...studentData
        };
        
        // Save to sessionStorage for sharing between pages
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
        errorEl.textContent = '❌ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
    }
    
    showLoading(false);
}

// ============================================
// LOAD STUDENT ACTIVITIES
// ============================================
async function loadStudentActivities() {
    studentActivities = [];
    
    try {
        const participationQuery = await participationCollection
            .where('studentId', '==', currentStudent.studentId)
            .get();
        
        for (const doc of participationQuery.docs) {
            const participation = doc.data();
            
            const activityQuery = await activitiesCollection
                .where('name', '==', participation.activityName)
                .limit(1)
                .get();
            
            let activityData = {
                id: doc.id,
                name: participation.activityName,
                status: participation.status || 'Approved',
                date: participation.date || '',
                skills: [],
                level: 1
            };
            
            if (!activityQuery.empty) {
                const activity = activityQuery.docs[0].data();
                activityData.skills = extractSkills(activity);
                activityData.level = activity.level || 1;
                activityData.description = activity.description || '';
            }
            
            studentActivities.push(activityData);
        }
        
        // Also check submissions
        const submissionsQuery = await db.collection('submissions')
            .where('studentEmail', '==', currentStudent.email)
            .get();
        
        for (const doc of submissionsQuery.docs) {
            const submission = doc.data();
            
            const exists = studentActivities.find(a => 
                a.name.toLowerCase() === submission.activityName?.toLowerCase()
            );
            
            if (!exists) {
                studentActivities.push({
                    id: doc.id,
                    name: submission.activityName || 'ไม่ระบุชื่อ',
                    status: submission.status || 'Pending',
                    date: submission.activityDate || '',
                    skills: submission.skills || [],
                    level: submission.activityLevel || 1,
                    description: submission.description || ''
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
    const skills = [];
    
    // Check for skills array
    if (activity.skills && Array.isArray(activity.skills)) {
        return activity.skills;
    }
    
    // Check for individual criteria fields
    CRITERIA_LIST.forEach(criteria => {
        const fieldName = `criteria_${criteria.code.replace('.', '_')}`;
        if (activity[fieldName] && activity[fieldName] > 0) {
            skills.push({
                code: criteria.code,
                level: activity[fieldName]
            });
        }
    });
    
    return skills;
}

// ============================================
// CALCULATE COMPETENCY SCORES
// ============================================
function calculateCompetencyScores() {
    const scores = {};
    
    CRITERIA_LIST.forEach(criteria => {
        scores[criteria.code] = 0;
    });
    
    // Only count approved activities
    const approvedActivities = studentActivities.filter(a => 
        a.status?.toLowerCase().includes('approved')
    );
    
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
// CALCULATE DOMAIN SCORES
// ============================================
function calculateDomainScores(scores) {
    const domainScores = {};
    
    DOMAINS.forEach(domain => {
        const domainCriteria = CRITERIA_LIST.filter(c => c.domain === domain.name);
        const domainLevels = domainCriteria.map(c => scores[c.code] || 0);
        
        const total = domainLevels.reduce((a, b) => a + b, 0);
        const max = domainCriteria.length * 4;
        const avg = domainLevels.length > 0 ? total / domainLevels.length : 0;
        const percentage = max > 0 ? (total / max) * 100 : 0;
        
        // Count how many sub-skills have level 2+
        const passCount = domainLevels.filter(l => l >= 2).length;
        
        domainScores[domain.name] = {
            total,
            max,
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
// ============================================
function showDashboard() {
    document.getElementById('search-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    
    document.getElementById('avatar-initial').textContent = 
        currentStudent.name ? currentStudent.name.charAt(0).toUpperCase() : 'S';
    document.getElementById('student-name').textContent = currentStudent.name || 'นักศึกษา';
    document.getElementById('student-email').textContent = currentStudent.email || '-';
    document.getElementById('student-id').textContent = `รหัสนักศึกษา: ${currentStudent.studentId || '-'}`;
    
    const approvedCount = studentActivities.filter(a => 
        a.status?.toLowerCase().includes('approved')).length;
    
    const scores = calculateCompetencyScores();
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    const domainScores = calculateDomainScores(scores);
    
    // Count domains that have avg level >= 2
    const skillsPassedCount = DOMAINS.filter(d => domainScores[d.name].avg >= 2).length;
    
    document.getElementById('total-activities').textContent = studentActivities.length;
    document.getElementById('approved-activities').textContent = approvedCount;
    document.getElementById('skill-achieved').textContent = skillsPassedCount;
    document.getElementById('competency-score').textContent = totalScore;
    
    renderCompetencyChart(scores);
    renderCompetencySummary(scores, domainScores);
    renderActivitiesList();
    setupFilterButtons();
}

// ============================================
// RENDER RADAR CHART WITH TARGETS
// ============================================
function renderCompetencyChart(scores) {
    const ctx = document.getElementById('competencyChart').getContext('2d');
    
    if (competencyChart) {
        competencyChart.destroy();
    }
    
    const domainScores = calculateDomainScores(scores);
    const labels = DOMAINS.map(d => d.name);
    const data = DOMAINS.map(d => domainScores[d.name].avg);
    
    // Min target (Level 2) and Ideal target (Level 3)
    const minTarget = [2, 2, 2, 2, 2, 2];
    const idealTarget = [3, 3, 3, 3, 3, 3];
    
    competencyChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'ระดับปัจจุบัน',
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
                    label: 'ขั้นต่ำ (Lv.2)',
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
// RENDER COMPETENCY SUMMARY
// ============================================
function renderCompetencySummary(scores, domainScores) {
    const container = document.getElementById('competency-summary');
    
    container.innerHTML = DOMAINS.map((domain, idx) => {
        const ds = domainScores[domain.name];
        const domainCriteria = CRITERIA_LIST.filter(c => c.domain === domain.name);
        
        // Determine status
        let statusClass = 'low';
        let statusText = '⚠️ ต้องพัฒนา';
        if (ds.avg >= 3) {
            statusClass = 'excellent';
            statusText = '⭐ ยอดเยี่ยม';
        } else if (ds.avg >= 2) {
            statusClass = 'good';
            statusText = '✅ ผ่านเกณฑ์';
        }
        
        const subSkillsHtml = domainCriteria.map(c => {
            const level = scores[c.code] || 0;
            const levelClass = level >= 3 ? 'excellent' : level >= 2 ? 'good' : level >= 1 ? 'developing' : 'none';
            return `
                <div class="sub-skill-row">
                    <span class="sub-skill-code">${c.code}</span>
                    <span class="sub-skill-name">${c.nameTh}</span>
                    <span class="sub-skill-level level-${levelClass}">Lv.${level}</span>
                </div>
            `;
        }).join('');
        
        return `
            <div class="domain-summary">
                <div class="domain-summary-header" style="border-left-color: ${domain.color}">
                    <div class="domain-summary-title">
                        <span class="domain-num">${idx + 1}</span>
                        <span>${domain.name}</span>
                    </div>
                    <div class="domain-summary-level">
                        <span class="avg-level">Lv.${ds.avg}</span>
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
        
        // Calculate total score from skills
        const totalScore = activity.skills?.reduce((sum, s) => sum + (s.level || 0), 0) || 0;
        
        // Group skills by domain
        const skillsByDomain = {};
        activity.skills?.forEach(s => {
            const criteria = CRITERIA_LIST.find(c => c.code === s.code);
            if (criteria) {
                if (!skillsByDomain[criteria.domain]) {
                    skillsByDomain[criteria.domain] = [];
                }
                skillsByDomain[criteria.domain].push(s);
            }
        });
        
        const skillsHtml = Object.entries(skillsByDomain).map(([domain, skills]) => {
            const domainInfo = DOMAINS.find(d => d.name === domain);
            return `
                <div class="activity-skill-group" style="border-left-color: ${domainInfo?.color || '#666'}">
                    <span class="skill-domain-name">${domain}</span>
                    <div class="skill-tags">
                        ${skills.map(s => `<span class="skill-tag-new">${s.code} <strong>+${s.level}</strong></span>`).join('')}
                    </div>
                </div>
            `;
        }).join('');
        
        return `
            <div class="activity-item-new status-${statusClass}">
                <div class="activity-main">
                    <div class="activity-info">
                        <div class="activity-title-row">
                            <span class="activity-title">${activity.name}</span>
                            <span class="status-badge ${statusClass}">${statusText}</span>
                        </div>
                        <div class="activity-meta">
                            <span>📅 ${activity.date || 'ไม่ระบุวันที่'}</span>
                            <span>📊 ระดับกิจกรรม: ${activity.level || 1}</span>
                        </div>
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
// ============================================
function setupFilterButtons() {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderActivitiesList();
        });
    });
}

// ============================================
// NAVIGATE TO ACTIVITY FORM (WITH SESSION)
// ============================================
function goToActivityForm() {
    if (currentStudent) {
        // Already logged in, save session and go
        sessionStorage.setItem('studentSession', JSON.stringify({
            id: currentStudent.id,
            email: currentStudent.email,
            name: currentStudent.name,
            studentId: currentStudent.studentId
        }));
    }
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
    document.getElementById('password-input').value = '';
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
    const passwordInput = document.getElementById('password-input');
    
    if (emailInput) {
        emailInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                passwordInput.focus();
            }
        });
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchStudent();
            }
        });
    }
    
    // Check for existing session
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
