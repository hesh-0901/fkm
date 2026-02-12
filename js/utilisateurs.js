/* ============================================================
   FKM ENERGY - UTILISATEURS MODULE (ENTERPRISE VERSION)
============================================================ */

import { initializeApp, getApps } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import { auth, db } from "./firebase.config.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ============================================================
   SECONDARY AUTH (création utilisateur sans logout directeur)
============================================================ */

const firebaseApp = getApps()[0];
const secondaryApp = initializeApp(firebaseApp.options, "Secondary");
const secondaryAuth = getAuth(secondaryApp);

/* ============================================================
   DOM
============================================================ */

const table = document.getElementById("usersTable");
const addBtn = document.getElementById("addUserBtn");
const logoutBtn = document.getElementById("logoutBtn");
const saveBtn = document.getElementById("saveUserBtn");

const uName = document.getElementById("uName");
const uUsername = document.getElementById("uUsername");
const uFonction = document.getElementById("uFonction");
const uRole = document.getElementById("uRole");
const uPassword = document.getElementById("uPassword");
const uConfirmPassword = document.getElementById("uConfirmPassword");

const modal = new bootstrap.Modal(document.getElementById("userModal"));

const userNameEl = document.getElementById("userName");
const userFonctionEl = document.getElementById("userFonction");
const userRoleBadge = document.getElementById("userRoleBadge");

let currentUser = null;

/* ============================================================
   AUTHENTICATION CHECK
============================================================ */

onAuthStateChanged(auth, async (user) => {

  if (!user) return location.replace("../login.html");

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return;

  currentUser = snap.data();

  /* ===== HEADER INFO ===== */
  userNameEl.textContent = currentUser.name;
  userFonctionEl.textContent = currentUser.fonction;

  userRoleBadge.textContent = currentUser.role;
  userRoleBadge.className =
    "px-2 py-0.5 rounded-full text-[10px] font-medium " +
    (
      currentUser.role === "directeur"
        ? "bg-purple-100 text-purple-700"
        : currentUser.role === "admin"
        ? "bg-primary/10 text-primary"
        : "bg-slate-100 text-slate-600"
    );

  if (currentUser.role === "directeur") {
    addBtn.classList.remove("hidden");
  }

  loadUsers();
});

/* ============================================================
   LOGOUT
============================================================ */

logoutBtn.onclick = async () => {
  await signOut(auth);
  location.replace("../login.html");
};

/* ============================================================
   CREATE USER (AUTH + FIRESTORE)
============================================================ */

saveBtn.onclick = async () => {

  if (currentUser.role !== "directeur") return;

  const name = uName.value.trim();
  const username = uUsername.value.trim().toLowerCase();
  const fonction = uFonction.value.trim();
  const role = uRole.value;
  const password = uPassword.value;
  const confirmPassword = uConfirmPassword.value;

  if (!name || !username || !fonction || !password) {
    alert("Veuillez remplir tous les champs.");
    return;
  }

  if (password !== confirmPassword) {
    alert("Les mots de passe ne correspondent pas.");
    return;
  }

  if (password.length < 6) {
    alert("Le mot de passe doit contenir au moins 6 caractères.");
    return;
  }

  const email = `${username}@fkmenergy.com`;

  try {

    /* Création dans Firebase Auth */
    const cred = await createUserWithEmailAndPassword(
      secondaryAuth,
      email,
      password
    );

    /* Création dans Firestore */
    await setDoc(doc(db, "users", cred.user.uid), {
      name,
      username,
      email,
      fonction,
      role,
      status: "active",
      createdAt: serverTimestamp()
    });

    modal.hide();
    document.getElementById("userForm").reset();
    await loadUsers();

  } catch (err) {
    alert(err.message);
  }
};

/* ============================================================
   LOAD USERS
============================================================ */

async function loadUsers() {

  table.innerHTML = "";

  const snap = await getDocs(collection(db, "users"));

  snap.forEach(d => {

    const u = d.data();

    table.innerHTML += `
      <tr class="hover:bg-slate-50 transition">

        <td class="px-6 py-4 font-medium">${u.name}</td>

        <td class="px-6 py-4 text-muted">${u.username}</td>

        <td class="px-6 py-4">${u.fonction}</td>

        <td class="px-6 py-4">
          <span class="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
            ${u.role}
          </span>
        </td>

        <td class="px-6 py-4">
          <span class="px-2 py-1 text-xs rounded-full ${
            u.status === "active"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-red-100 text-red-600"
          }">
            ${u.status}
          </span>
        </td>

        <td class="px-6 py-4 text-end">
          ${
            currentUser.role === "directeur"
              ? `
                <button 
                  onclick="toggleUserStatus('${d.id}', '${u.status}')"
                  class="px-3 py-1 text-xs rounded-lg ${
                    u.status === "active"
                      ? "bg-red-100 text-red-600 hover:bg-red-200"
                      : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  } transition">
                  ${
                    u.status === "active"
                      ? "Désactiver"
                      : "Réactiver"
                  }
                </button>
              `
              : ""
          }
        </td>

      </tr>
    `;
  });
}

/* ============================================================
   ACTIVER / DESACTIVER UTILISATEUR
============================================================ */

window.toggleUserStatus = async (id, currentStatus) => {

  if (currentUser.role !== "directeur") return;

  const newStatus = currentStatus === "active"
    ? "disabled"
    : "active";

  await setDoc(doc(db, "users", id), {
    status: newStatus
  }, { merge: true });

  await loadUsers();
};

/* ============================================================
   OPEN MODAL
============================================================ */

addBtn.onclick = () => modal.show();
