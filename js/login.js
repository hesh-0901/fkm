import { auth, db } from "./firebase.config.js";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";

const form = document.getElementById("loginForm");
const errorBox = document.getElementById("loginError");
const passwordInput = document.getElementById("password");
const toggleBtn = document.getElementById("togglePassword");
const toggleIcon = toggleBtn.querySelector("i");

/* Toggle password visibility */
toggleBtn.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";

  passwordInput.type = isHidden ? "text" : "password";

  toggleIcon.classList.toggle("bi-eye");
  toggleIcon.classList.toggle("bi-eye-slash");
});

/* Login */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.textContent = "";

  const username = document.getElementById("username").value.trim();
  const password = passwordInput.value;

  try {
    const q = query(
      collection(db, "users"),
      where("username", "==", username)
    );

    const snap = await getDocs(q);
    if (snap.empty) throw new Error("Identifiants incorrects.");

    const user = snap.docs[0].data();
    if (user.status !== "active") throw new Error("Compte désactivé.");

    await signInWithEmailAndPassword(auth, user.email, password);

    window.location.href =
      user.role === "operateur"
        ? "index.html"
        : "admin/dashboard.html";

  } catch (err) {
    errorBox.textContent = err.message;
  }
});
