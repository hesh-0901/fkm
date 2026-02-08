import { initializeApp } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import { getAuth } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { getFirestore } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* Firebase config */
const firebaseConfig = {
  apiKey: "AIzaSyCbq46M1-H2Kwdu0m7ICA-LNhLAh8f5n_I",
  authDomain: "fkmenergy-e3a8d.firebaseapp.com",
  projectId: "fkmenergy-e3a8d",
  storageBucket: "fkmenergy-e3a8d.firebasestorage.app",
  messagingSenderId: "675632578749",
  appId: "1:675632578749:web:8c18eca8e000ea9d37b7d4",
  measurementId: "G-2ZWZ834H10"
};

/* Init Firebase */
const app = initializeApp(firebaseConfig);

/* EXPORTS */
export const auth = getAuth(app);
export const db = getFirestore(app);
