import { auth, db } from "./firebase.config.js";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

const form = document.getElementById("loginForm");
const errorBox = document.getElementById("loginError");

const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");

/* Toggle password visibility */
togglePassword.addEventListener("click", () => {
  const visible = passwordInput.type === "text";
  passwordInput.type = visible ? "password" : "text";
  togglePassword.classList.toggle("bi-eye");
  togglePassword.classList.toggle("bi-eye-slash");
});

/* Login */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.textContent = "";

  const username = document.getElementById("username").value.trim();
  const password = passwordInput.value;

  try {
    // 1. Get user by username
    const q = query(
      collection(db, "users"),
      where("username", "==", username)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      throw new Error("Identifiant incorrect.");
    }

    const userDoc = snap.docs[0];
    const userData = userDoc.data();

    if (userData.status === "suspended") {
      throw new Error("Compte suspendu.");
    }

    // 2. Firebase Auth login (email interne)
    const cred = await signInWithEmailAndPassword(
      auth,
      userData.email,
      password
    );

    // 3. Redirect by role
    switch (userData.role) {
      case "operateur":
        window.location.href = "index.html";
        break;
      case "admin":
      case "directeur":
        window.location.href = "admin/dashboard.html";
        break;
      default:
        throw new Error("Rôle non valide.");
    }

  } catch (err) {
    errorBox.textContent = err.message;
  }
});
