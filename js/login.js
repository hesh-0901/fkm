// ================= RESET =================
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
  document.getElementById("rememberMe").checked = false;
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
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const rememberMe = document.getElementById("rememberMe");
const errorBox = document.getElementById("loginError");
const togglePassword = document.getElementById("togglePassword");

const DOMAIN = "@fkmenergy.com";

// ================= TOGGLE PASSWORD =================
togglePassword.addEventListener("click", () => {
  passwordInput.type =
    passwordInput.type === "password" ? "text" : "password";
});

// ================= SESSION TIMER =================
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

  const username = usernameInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  if (!username || !password) {
    errorBox.textContent = "Veuillez renseigner tous les champs.";
    return;
  }

  const email = username + DOMAIN;

  try {
    await setPersistence(auth, browserSessionPersistence);
    await signInWithEmailAndPassword(auth, email, password);

    if (rememberMe.checked) {
      localStorage.setItem("rememberedUser", username);
    } else {
      localStorage.removeItem("rememberedUser");
    }

    startSessionTimer();
    window.location.replace("admin/dashboard.html");

  } catch (err) {
    console.error(err);
    errorBox.textContent = "Identifiant ou mot de passe incorrect.";
  }
});
