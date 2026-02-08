import { auth, db } from "./firebase.config.js";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";

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
    const q = query(
      collection(db, "users"),
      where("username", "==", username)
    );

    const snap = await getDocs(q);
    if (snap.empty) throw new Error("Identifiants invalides.");

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
