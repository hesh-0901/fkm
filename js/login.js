// === RESET STRICT DES CHAMPS AU CHARGEMENT ===
window.addEventListener("DOMContentLoaded", () => {
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const rememberMe = document.getElementById("rememberMe");

  if (usernameInput) usernameInput.value = "";
  if (passwordInput) passwordInput.value = "";
  if (rememberMe) rememberMe.checked = false;
});

import { auth, db } from "./firebase.config.js";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* DOM */
const form = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const rememberMe = document.getElementById("rememberMe");
const errorBox = document.getElementById("loginError");
const togglePassword = document.getElementById("togglePassword");

/* Initial state : champs vides */
usernameInput.value = "";
passwordInput.value = "";

/* Remember me (username only) */
const savedUser = localStorage.getItem("rememberedUsername");
if (savedUser) {
  usernameInput.value = savedUser;
  rememberMe.checked = true;
}

/* Toggle password */
togglePassword.addEventListener("click", () => {
  passwordInput.type =
    passwordInput.type === "password" ? "text" : "password";
});

/* Session limitée à 30 minutes */
function startSessionTimer() {
  setTimeout(() => {
    auth.signOut();
    window.location.href = "login.html";
  }, 30 * 60 * 1000);
}

/* Submit */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.textContent = "";

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    errorBox.textContent = "Veuillez renseigner tous les champs.";
    return;
  }

  try {
    /* Session-only persistence */
    await setPersistence(auth, browserSessionPersistence);

    /* Get email from username */
    const q = query(
      collection(db, "users"),
      where("username", "==", username),
      where("status", "==", "active")
    );

    const snap = await getDocs(q);
    if (snap.empty) {
      errorBox.textContent = "Identifiant ou mot de passe incorrect.";
      return;
    }

    const email = snap.docs[0].data().email;

    /* Firebase Auth */
    await signInWithEmailAndPassword(auth, email, password);

    /* Remember me */
    if (rememberMe.checked) {
      localStorage.setItem("rememberedUsername", username);
    } else {
      localStorage.removeItem("rememberedUsername");
    }

    startSessionTimer();
    window.location.href = "admin/dashboard.html";

  } catch (err) {
    console.error(err);
    errorBox.textContent = "Connexion impossible.";
  }
});
