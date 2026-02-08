import { auth, db } from "./firebase.config.js";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const form = document.getElementById("loginForm");
const errorBox = document.getElementById("loginError");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.textContent = "";

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    // Authentification
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;

    // Récupération rôle depuis Firestore
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error("Utilisateur non autorisé.");
    }

    const userData = userSnap.data();

    if (userData.status === "suspended") {
      throw new Error("Compte suspendu.");
    }

    // Redirection selon rôle
    switch (userData.role) {
      case "operateur":
        window.location.href = "index.html";
        break;

      case "admin":
        window.location.href = "admin/dashboard.html";
        break;

      case "directeur":
        window.location.href = "admin/dashboard.html";
        break;

      default:
        throw new Error("Rôle invalide.");
    }

  } catch (err) {
    errorBox.textContent = err.message;
  }
});
