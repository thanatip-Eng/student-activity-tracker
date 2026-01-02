// js/config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyANurmMx-jye_Jqf6x63Y6oAO1903D7yy4",
  authDomain: "student-activity-tracker-13eb5.firebaseapp.com",
  projectId: "student-activity-tracker-13eb5",
  storageBucket: "student-activity-tracker-13eb5.firebasestorage.app",
  messagingSenderId: "142207116884",
  appId: "1:142207116884:web:7bf08528f01674c61aefc1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };