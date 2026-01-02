// js/main.js
import { db } from './config.js';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- ส่วนของหน้า Login (index.html) ---
window.handleLogin = async () => {
    const email = document.getElementById('emailInput').value.trim().toLowerCase();
    const btn = document.getElementById('loginBtn');
    const errorMsg = document.getElementById('errorMsg');

    if (!email) return;

    btn.disabled = true;
    btn.innerText = "กำลังตรวจสอบ...";
    errorMsg.style.display = 'none';

    try {
        // ค้นหา ID จาก Collection 'students' โดยตรง
        const docRef = doc(db, "students", email);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            // พบข้อมูล! บันทึกลง LocalStorage
            localStorage.setItem('userEmail', email);
            localStorage.setItem('userData', JSON.stringify(docSnap.data()));
            window.location.href = 'dashboard.html';
        } else {
            errorMsg.innerText = "ไม่พบอีเมลนี้ในระบบฐานข้อมูล";
            errorMsg.style.display = 'block';
            btn.disabled = false;
            btn.innerText = "เข้าสู่ระบบ";
        }
    } catch (error) {
        console.error("Login Error:", error);
        errorMsg.innerText = "เกิดข้อผิดพลาด: " + error.message;
        btn.disabled = false;
        btn.innerText = "เข้าสู่ระบบ";
    }
};

// --- ส่วนของหน้า Dashboard (dashboard.html) ---
window.initDashboard = async () => {
    const email = localStorage.getItem('userEmail');
    if (!email) {
        window.location.href = 'index.html';
        return;
    }

    const userData = JSON.parse(localStorage.getItem('userData'));
    
    // แสดงข้อมูลนักศึกษา
    document.getElementById('studentName').innerText = userData.name || '-';
    document.getElementById('studentId').innerText = userData.studentId || '-';
    document.getElementById('studentFaculty').innerText = userData.faculty || '-';

    // โหลดประวัติกิจกรรม
    loadActivities(email);
};

async function loadActivities(email) {
    const listContainer = document.getElementById('activityList');
    listContainer.innerHTML = '<p>กำลังโหลดข้อมูล...</p>';

    try {
        const q = query(collection(db, "participations"), where("studentEmail", "==", email));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            listContainer.innerHTML = '<p class="no-data">ยังไม่มีประวัติการเข้าร่วมกิจกรรม</p>';
            return;
        }

        let html = '';
        let totalHours = 0;

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // คำนวณชั่วโมงสะสมคร่าวๆ (ถ้ามี field duration)
            if(data.duration) totalHours += parseInt(data.duration);

            html += `
            <div class="activity-card">
                <div class="card-header">
                    <h3>${data.activityName}</h3>
                    <span class="status ${data.status || 'Pending'}">${data.status || 'รอตรวจสอบ'}</span>
                </div>
                <div class="card-body">
                    <p>📅 วันที่: ${data.activityDate || '-'}</p>
                    <p>⏳ จำนวนชั่วโมง: ${data.duration || 0} ชม.</p>
                </div>
            </div>
            `;
        });

        listContainer.innerHTML = html;
        document.getElementById('totalHours').innerText = totalHours;

    } catch (error) {
        console.error("Error loading activities:", error);
        listContainer.innerHTML = '<p style="color:red">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
    }
}

window.handleLogout = () => {
    localStorage.clear();
    window.location.href = 'index.html';
};

// --- ส่วนส่งงาน (Submission) ---
window.handleSubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.innerText = "กำลังส่ง...";

    const email = localStorage.getItem('userEmail');
    const userData = JSON.parse(localStorage.getItem('userData'));

    const formData = {
        studentEmail: email,
        studentName: userData.name,
        activityName: document.getElementById('activityName').value,
        activityDate: document.getElementById('activityDate').value,
        duration: parseInt(document.getElementById('duration').value),
        description: document.getElementById('description').value,
        evidenceLink: document.getElementById('evidenceLink').value,
        status: 'Pending', // รอตรวจสอบ
        timestamp: serverTimestamp()
    };

    try {
        await addDoc(collection(db, "participations"), formData);
        alert("ส่งข้อมูลเรียบร้อยแล้ว!");
        document.getElementById('submissionForm').reset();
        loadActivities(email); // รีโหลดรายการ
        showTab('history'); // กลับไปหน้าประวัติ
    } catch (error) {
        console.error("Error adding document: ", error);
        alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "บันทึกข้อมูล";
    }
};

// Tab Switching Logic
window.showTab = (tabId) => {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tabId).style.display = 'block';
    
    // หาปุ่มที่กดแล้วใส่ class active
    const buttons = document.querySelectorAll('.tab-btn');
    if(tabId === 'history') buttons[0].classList.add('active');
    if(tabId === 'submit') buttons[1].classList.add('active');
};