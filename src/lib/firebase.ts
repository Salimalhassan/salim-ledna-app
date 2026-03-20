import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAIgL4VHVFJm8h8P31FoA_cV526Pu8kphw",
  authDomain: "ledna-commodities-platform.firebaseapp.com",
  projectId: "ledna-commodities-platform",
  storageBucket: "ledna-commodities-platform.firebasestorage.app",
  messagingSenderId: "739150565886",
  appId: "1:739150565886:web:f5a495fb23514d1d7170af",
  measurementId: "G-EQHWRG2SR6"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage }; 
