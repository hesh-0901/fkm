import { auth, db } from "./firebase.config.js";

import {
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const form = document.getElementById("loginForm");
const errorBox = document.getElementById("loginError");
const passwordInput = document.getElementById("password");
const toggleBtn = document.getElementById("togglePassword");
const icon = toggleBtn.querySelector("i");

/* Show / hide password */
toggleBtn.addEventListener("click", () => {
  const hidden = passwordInput.type === "password";
  passwordInput.type = hidden ? "text" : "password";
  icon.className = hidden ? "bi bi-eye-slash" : "bi bi-eye";
});

/* Login */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.textContent = "";

  const username = document.getElementById("username").value.trim();
  const password = passwordInput.value;

  try {
    // Lookup user by username (Firestore)
    const q = query(
      collection(db, "users"),
      where("username", "==", username)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      throw new Error("Identifiants invalides.");
    }

    const userData = snap.docs[0].data();

    // Firebase Auth login
    await signInWithEmailAndPassword(
      auth,
      userData.email,
      password
    );

    window.location.href = "admin/dashboard.html";

  } catch (err) {
    errorBox.textContent = err.message;
  }
});
