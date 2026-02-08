/* ======================================================
   Login logic – ERP / Banque style
   Auth = Firebase Auth
   Autorisation = Firestore (users collection)
   ====================================================== */

import { auth, db } from "./firebase.config.js";

// Firebase Auth
import {
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Firestore
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// DOM elements
const form = document.getElementById("loginForm");
const errorBox = document.getElementById("loginError");
const passwordInput = document.getElementById("password");
const toggleBtn = document.getElementById("togglePassword");
const toggleIcon = toggleBtn.querySelector("i");

/* ======================================================
   Password visibility toggle (eye icon)
   ====================================================== */
toggleBtn.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";

  toggleIcon.className = isHidden
    ? "bi bi-eye-slash"
    : "bi bi-eye";
});

/* ======================================================
   Login process
   ====================================================== */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.textContent = "";

  const username = document.getElementById("username").value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    errorBox.textContent = "Identifiant et mot de passe requis.";
    return;
  }

  try {
    // 1. Lookup user by username (Firestore)
    const q = query(
      collection(db, "users"),
      where("username", "==", username)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error("Identifiants incorrects.");
    }

    const userData = snapshot.docs[0].data();

    if (userData.status !== "active") {
      throw new Error("Compte désactivé.");
    }

    // 2. Firebase Auth (email interne)
    await signInWithEmailAndPassword(
      auth,
      userData.email,
      password
    );

    // 3. Redirect based on role
    if (userData.role === "operateur") {
      window.location.href = "index.html";
    } else {
      window.location.href = "admin/dashboard.html";
    }

  } catch (err) {
    errorBox.textContent = err.message;
  }
});
