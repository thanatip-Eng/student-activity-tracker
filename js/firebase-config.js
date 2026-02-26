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

// Initialize Firestore with long polling to fix WebChannel 404 transport errors
const db = firebase.firestore();
db.settings({
    experimentalForceLongPolling: true,
    useFetchStreams: false
});

// Collections reference
const studentsCollection = db.collection('students');
const activitiesCollection = db.collection('activities');
const participationCollection = db.collection('participation');
