// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyANurmMx-jye_Jqf6x63Y6oAO1903D7yy4",
    authDomain: "student-activity-tracker-13eb5.firebaseapp.com",
    projectId: "student-activity-tracker-13eb5",
    storageBucket: "student-activity-tracker-13eb5.firebasestorage.app",
    messagingSenderId: "142207116884",
    appId: "1:142207116884:web:7bf08528f01674c61aefc1"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore with settings to fix WebChannel errors
const db = firebase.firestore();

// Use long polling instead of WebChannel to avoid connection errors
db.settings({
    experimentalForceLongPolling: true,
    merge: true
});

// Collections reference
const studentsCollection = db.collection('students');
const activitiesCollection = db.collection('activities');
const participationCollection = db.collection('participation');
