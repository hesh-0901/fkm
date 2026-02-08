// Firebase core
import { initializeApp } from "firebase/app";

// Firebase services
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCbq46M1-H2Kwdu0m7ICA-LNhLAh8f5n_I",
  authDomain: "fkmenergy-e3a8d.firebaseapp.com",
  projectId: "fkmenergy-e3a8d",
  storageBucket: "fkmenergy-e3a8d.firebasestorage.app",
  messagingSenderId: "675632578749",
  appId: "1:675632578749:web:8c18eca8e000ea9d37b7d4",
  measurementId: "G-2ZWZ834H10"
};

// Initialisation Firebase
const app = initializeApp(firebaseConfig);

// Services exportés
const auth = getAuth(app);
const db = getFirestore(app);

// Analytics (uniquement si supporté par le navigateur)
let analytics = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

// Exports
export {
  app,
  auth,
  db,
  analytics
};
