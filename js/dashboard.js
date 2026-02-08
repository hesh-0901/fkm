import { auth, db } from "./firebase.config.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const sidebar = document.getElementById("sidebar");
const openSidebarBtn = document.getElementById("openSidebar");
const closeSidebarBtn = document.getElementById("closeSidebar");

const userNameEl = document.getElementById("userName");
const userRoleEl = document.getElementById("userRole");
const logoutBtn = document.getElementById("logoutBtn");

/* Sidebar toggle */
openSidebarBtn?.addEventListener("click", () => {
  sidebar.classList.remove("collapsed");
});

closeSidebarBtn?.addEventListener("click", () => {
  sidebar.classList.add("collapsed");
});

/* Auth guard */
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

/* Logout */
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.replace("../login.html");
});
