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
    { id: 1, name: "Critical Thinking", color: "#667eea" },
    { id: 2, name: "Communication", color: "#27ae60" },
    { id: 3, name: "Teamwork", color: "#f39c12" },
    { id: 4, name: "Digital & Learning", color: "#e74c3c" },
    { id: 5, name: "Innovation", color: "#9b59b6" },
    { id: 6, name: "Self Development", color: "#1abc9c" }
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
    
    // Validate email
    if (!email) {
        errorEl.textContent = '⚠️ กรุณากรอก Email';
        return;
    }
    
    if (!email.includes('@')) {
        errorEl.textContent = '⚠️ รูปแบบ Email ไม่ถูกต้อง';
        return;
    }
    
    // Validate password
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
        // Search student by email
        const studentQuery = await studentsCollection.where('email', '==', email).limit(1).get();
        
        if (studentQuery.empty) {
            errorEl.textContent = '❌ ไม่พบข้อมูลนักศึกษาในระบบ กรุณาตรวจสอบ Email อีกครั้ง';
            showLoading(false);
            return;
        }
        
        // Get student data
        const studentDoc = studentQuery.docs[0];
        const studentData = studentDoc.data();
        
        // Check if password exists
        if (!studentData.password) {
            // First time login - save new password
            await studentsCollection.doc(studentDoc.id).update({
                password: password
            });
            studentData.password = password;
        } else {
            // Validate password
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
        
        // Load student activities
        await loadStudentActivities();
        
        // Show dashboard
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
        // Get participation records for this student
        const participationQuery = await participationCollection
            .where('studentId', '==', currentStudent.studentId)
            .get();
        
        for (const doc of participationQuery.docs) {
            const participation = doc.data();
            
            // Get activity details
            const activityQuery = await activitiesCollection
                .where('name', '==', participation.activityName)
                .limit(1)
                .get();
            
            let activityData = {
                id: doc.id,
                name: participation.activityName,
                status: participation.status || 'Approved',
                date: participation.date || '',
                skills: []
            };
            
            if (!activityQuery.empty) {
                const activity = activityQuery.docs[0].data();
                activityData.skills = extractSkills(activity);
                activityData.level = activity.level || 1;
                activityData.description = activity.description || '';
            }
            
            studentActivities.push(activityData);
        }
        
        // Also check Activity Submissions if exists
        const submissionsQuery = await db.collection('submissions')
            .where('studentEmail', '==', currentStudent.email)
            .get();
        
        for (const doc of submissionsQuery.docs) {
            const submission = doc.data();
            
            // Check if not already in activities
            const exists = studentActivities.find(a => 
                a.name.toLowerCase() === submission.activityName?.toLowerCase()
            );
            
            if (!exists) {
                studentActivities.push({
                    id: doc.id,
                    name: submission.activityName || 'Unnamed Activity',
                    status: submission.status || 'Pending',
                    date: submission.startDate || '',
                    skills: extractSkillsFromSubmission(submission),
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
// EXTRACT SKILLS FROM DATA
// ============================================
function extractSkills(activity) {
    const skills = [];
    const codes = ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3', '3.1', '3.2', '3.3', 
                   '4.1', '4.2', '4.3', '5.1', '5.2', '5.3', '6.1', '6.2', '6.3'];
    
    codes.forEach(code => {
        const fieldName = `criteria_${code.replace('.', '_')}`;
        const altFieldName = code;
        
        const level = activity[fieldName] || activity[altFieldName] || 0;
        if (level > 0) {
            skills.push({ code, level: parseInt(level) });
        }
    });
    
    return skills;
}

function extractSkillsFromSubmission(submission) {
    const skills = [];
    const codes = ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3', '3.1', '3.2', '3.3', 
                   '4.1', '4.2', '4.3', '5.1', '5.2', '5.3', '6.1', '6.2', '6.3'];
    
    codes.forEach(code => {
        const fieldName = `criteria_${code.replace('.', '_')}`;
        const level = submission[fieldName] || submission[code] || 0;
        if (level > 0) {
            skills.push({ code, level: parseInt(level) });
        }
    });
    
    return skills;
}

// ============================================
// CALCULATE COMPETENCY SCORES
// ============================================
function calculateCompetencyScores() {
    const scores = {};
    
    // Initialize all criteria with 0
    CRITERIA_LIST.forEach(c => {
        scores[c.code] = 0;
    });
    
    // Get max score per criteria from approved activities
    studentActivities.forEach(activity => {
        if (activity.status?.toLowerCase().includes('approved')) {
            activity.skills?.forEach(skill => {
                if (skill.level > scores[skill.code]) {
                    scores[skill.code] = skill.level;
                }
            });
        }
    });
    
    return scores;
}

function calculateDomainScores(scores) {
    const domainScores = {};
    
    DOMAINS.forEach(domain => {
        const domainCriteria = CRITERIA_LIST.filter(c => c.domain === domain.name);
        const totalScore = domainCriteria.reduce((sum, c) => sum + (scores[c.code] || 0), 0);
        const maxScore = domainCriteria.length * 4; // Max level is 4
        domainScores[domain.name] = {
            score: totalScore,
            max: maxScore,
            percentage: Math.round((totalScore / maxScore) * 100)
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
    
    // Update student info
    document.getElementById('avatar-initial').textContent = 
        currentStudent.name ? currentStudent.name.charAt(0).toUpperCase() : 'S';
    document.getElementById('student-name').textContent = currentStudent.name || 'นักศึกษา';
    document.getElementById('student-email').textContent = currentStudent.email || '-';
    document.getElementById('student-id').textContent = `รหัสนักศึกษา: ${currentStudent.studentId || '-'}`;
    
    // Calculate stats
    const approvedCount = studentActivities.filter(a => 
        a.status?.toLowerCase().includes('approved')).length;
    const pendingCount = studentActivities.filter(a => 
        a.status?.toLowerCase().includes('pending')).length;
    
    const scores = calculateCompetencyScores();
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    
    // Calculate skills achieved (domains with score > 0)
    const domainScores = calculateDomainScores(scores);
    const skillsAchieved = DOMAINS.filter(d => domainScores[d.name].total > 0).length;
    
    document.getElementById('total-activities').textContent = studentActivities.length;
    document.getElementById('approved-activities').textContent = approvedCount;
    document.getElementById('pending-activities').textContent = pendingCount;
    document.getElementById('skill-achieved').textContent = skillsAchieved;
    document.getElementById('competency-score').textContent = totalScore;
    
    // Render components
    renderCompetencyChart(scores);
    renderCompetencyTable(scores);
    renderActivitiesList();
    
    // Setup filter buttons
    setupFilterButtons();
}

// ============================================
// RENDER RADAR CHART
// ============================================
function renderCompetencyChart(scores) {
    const ctx = document.getElementById('competencyChart').getContext('2d');
    
    // Destroy existing chart
    if (competencyChart) {
        competencyChart.destroy();
    }
    
    // Calculate domain averages for radar chart
    const domainScores = calculateDomainScores(scores);
    const labels = DOMAINS.map(d => d.name);
    const data = DOMAINS.map(d => domainScores[d.name].percentage);
    
    competencyChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Competency Level',
                data: data,
                backgroundColor: 'rgba(102, 126, 234, 0.2)',
                borderColor: '#667eea',
                borderWidth: 2,
                pointBackgroundColor: '#667eea',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#667eea'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 25,
                        display: false
                    },
                    pointLabels: {
                        font: {
                            size: 11
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// ============================================
// RENDER COMPETENCY TABLE
// ============================================
function renderCompetencyTable(scores) {
    const tbody = document.getElementById('competency-tbody');
    tbody.innerHTML = '';
    
    CRITERIA_LIST.forEach(criteria => {
        const level = scores[criteria.code] || 0;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${criteria.domain}</strong></td>
            <td>
                <span class="criteria-code">${criteria.code}</span>
                ${criteria.nameTh}
            </td>
            <td>
                <span class="level-badge level-${level}">Level ${level}</span>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// ============================================
// RENDER ACTIVITIES LIST
// ============================================
function renderActivitiesList() {
    const container = document.getElementById('activities-list');
    
    // Filter activities
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
        
        const skillTags = activity.skills?.map(s => {
            const criteria = CRITERIA_LIST.find(c => c.code === s.code);
            return `<span class="skill-tag">${s.code} Lv.${s.level}</span>`;
        }).join('') || '';
        
        return `
            <div class="activity-item status-${statusClass}">
                <div class="activity-title">${activity.name}</div>
                <div class="activity-meta">
                    <span>📅 ${activity.date || 'ไม่ระบุวันที่'}</span>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                ${skillTags ? `<div class="activity-skills">${skillTags}</div>` : ''}
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
    if (!status) return 'รอดำเนินการ';
    const s = status.toLowerCase();
    if (s.includes('approved')) return '✅ อนุมัติแล้ว';
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
// LOGOUT
// ============================================
function logout() {
    currentStudent = null;
    studentActivities = [];
    currentFilter = 'all';
    
    document.getElementById('email-input').value = '';
    document.getElementById('password-input').value = '';
    document.getElementById('search-error').textContent = '';
    document.getElementById('dashboard-section').style.display = 'none';
    document.getElementById('search-section').style.display = 'flex';
}

// ============================================
// LOADING
// ============================================
function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
        overlay.classList.add('show');
    } else {
        overlay.classList.remove('show');
    }
}

// ============================================
// ENTER KEY HANDLER
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.getElementById('email-input');
    const passwordInput = document.getElementById('password-input');
    
    emailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            passwordInput.focus();
        }
    });
    
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchStudent();
        }
    });
});
