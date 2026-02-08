import { auth, db } from "./firebase.config.js";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const form = document.getElementById("loginForm");
const errorBox = document.getElementById("loginError");

const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");

// Toggle password visibility
togglePassword.addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";
  togglePassword.classList.toggle("bi-eye");
  togglePassword.classList.toggle("bi-eye-slash");
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.textContent = "";

  try {
    const email = document.getElementById("email").value;
    const password = passwordInput.value;

    const cred = await signInWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;

    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) throw new Error("Accès non autorisé.");

    const user = snap.data();

    if (user.status === "suspended") {
      throw new Error("Compte suspendu.");
    }

    if (user.role === "operateur") {
      window.location.href = "index.html";
    } else {
      window.location.href = "admin/dashboard.html";
    }

  } catch (err) {
    errorBox.textContent = err.message;
  }
});
