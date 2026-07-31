// services/authservice.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAYeENabox-ljGxXZh0Z-u6q-Uj5mc6Bno",
  authDomain: "printz-payment.firebaseapp.com",
  projectId: "printz-payment",
  storageBucket: "printz-payment.appspot.com",
  messagingSenderId: "345293749081",
  appId: "1:345293749081:web:fad5e7d5eda6c98f176a48",
  measurementId: "G-PYCYVYSN0W"
};

// Initialize all Firebase services from a single app instance
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app); // Initialize Functions here as well

// Export the initialized services directly
export { app, auth, db, storage, functions };