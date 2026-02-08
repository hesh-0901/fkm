/* ======================================================
   Firebase configuration – CDN (Browser compatible)
   Compatible GitHub Pages / Static Hosting
   ====================================================== */

// Firebase core
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

// Firebase services
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyCbq46M1-H2Kwdu0m7ICA-LNhLAh8f5n_I",
  authDomain: "fkmenergy-e3a8d.firebaseapp.com",
  projectId: "fkmenergy-e3a8d",
  storageBucket: "fkmenergy-e3a8d.appspot.com",
  messagingSenderId: "675632578749",
  appId: "1:675632578749:web:8c18eca8e000ea9d37b7d4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);

// Export services
export { auth, db };
