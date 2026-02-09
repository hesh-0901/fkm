// ================= RESET STRICT =================
window.addEventListener("DOMContentLoaded", () => {
  const emailInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const rememberMe = document.getElementById("rememberMe");

  if (emailInput) emailInput.value = "";
  if (passwordInput) passwordInput.value = "";
  if (rememberMe) rememberMe.checked = false;
});

// ================= IMPORTS =================
import { auth } from "./firebase.config.js";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ================= DOM =================
const form = document.getElementById("loginForm");
const emailInput = document.getElementById("username"); // email
const passwordInput = document.getElementById("password");
const rememberMe = document.getElementById("rememberMe");
const errorBox = document.getElementById("loginError");
const togglePassword = document.getElementById("togglePassword");

// ================= REMEMBER ME =================
const savedEmail = localStorage.getItem("rememberedEmail");
if (savedEmail) {
  emailInput.value = savedEmail;
  rememberMe.checked = true;
}

// ================= TOGGLE PASSWORD =================
togglePassword.addEventListener("click", () => {
  passwordInput.type =
    passwordInput.type === "password" ? "text" : "password";
});

// ================= SESSION 30 MIN =================
function startSessionTimer() {
  setTimeout(async () => {
    await auth.signOut();
    window.location.replace("login.html");
  }, 30 * 60 * 1000);
}

// ================= SUBMIT =================
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.textContent = "";

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    errorBox.textContent = "Veuillez renseigner tous les champs.";
    return;
  }

  try {
    await setPersistence(auth, browserSessionPersistence);

    await signInWithEmailAndPassword(auth, email, password);

    if (rememberMe.checked) {
      localStorage.setItem("rememberedEmail", email);
    } else {
      localStorage.removeItem("rememberedEmail");
    }

    startSessionTimer();
    window.location.replace("admin/dashboard.html");

  } catch (err) {
    console.error(err);
    errorBox.textContent = "Identifiants incorrects.";
  }
});
