import { auth, db } from "./firebase.config.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const userNameEl = document.getElementById("userName");
const userRoleEl = document.getElementById("userRole");
const logoutBtn = document.getElementById("logoutBtn");

/* ================= AUTH GUARD ================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("../login.html");
    return;
  }

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await signOut(auth);
    window.location.replace("../login.html");
    return;
  }

  const data = snap.data();

  if (data.status !== "active") {
    await signOut(auth);
    window.location.replace("../login.html");
    return;
  }

  userNameEl.textContent = data.name || data.username;
  userRoleEl.textContent = data.fonction || data.role;
});

/* ================= LOGOUT ================= */
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.replace("../login.html");
});
