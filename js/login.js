import { auth, db } from "./firebase.config.js";
import { signInWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";

const form = document.getElementById("loginForm");
const errorBox = document.getElementById("loginError");
const passwordInput = document.getElementById("password");
const toggleBtn = document.getElementById("togglePassword");

/* Password visibility */
toggleBtn.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
  toggleBtn.innerHTML = isHidden
    ? '<i class="bi bi-eye"></i>'
    : '<i class="bi bi-eye-slash"></i>';
});

/* Login */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.textContent = "";

  const username = document.getElementById("username").value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    errorBox.textContent = "Champs obligatoires.";
    return;
  }

  try {
    // Lookup user by username
    const q = query(
      collection(db, "users"),
      where("username", "==", username)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error("Identifiants incorrects.");
    }

    const user = snapshot.docs[0].data();

    if (user.status !== "active") {
      throw new Error("Compte désactivé.");
    }

    // Auth with internal email
    await signInWithEmailAndPassword(
      auth,
      user.email,
      password
    );

    // Redirect by role
    if (user.role === "operateur") {
      window.location.href = "index.html";
    } else {
      window.location.href = "admin/dashboard.html";
    }

  } catch (err) {
    errorBox.textContent = err.message;
  }
});
