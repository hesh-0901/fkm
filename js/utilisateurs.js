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

/* SECONDARY AUTH */
const firebaseApp = getApps()[0];
const secondaryApp = initializeApp(firebaseApp.options, "Secondary");
const secondaryAuth = getAuth(secondaryApp);

/* DOM */
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

const userNameEl = document.getElementById("userName");
const userRoleEl = document.getElementById("userRole");

const modal = new bootstrap.Modal(document.getElementById("userModal"));

let currentUser = null;

/* AUTH */
onAuthStateChanged(auth, async (user) => {

  if (!user) return location.replace("../login.html");

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) {
    await signOut(auth);
    return location.replace("../login.html");
  }

  const data = snap.data();

  /* 🔒 BLOQUAGE SI DISABLED */
  if (data.status === "disabled") {
    alert("Compte désactivé.");
    await signOut(auth);
    return location.replace("../login.html");
  }

  currentUser = {
    uid: user.uid,
    name: data.name,
    fonction: data.fonction,
    role: data.role
  };

  userNameEl.textContent = currentUser.name;
  userRoleEl.textContent = currentUser.fonction;

  if (currentUser.role === "directeur") {
    addBtn.classList.remove("hidden");
  }

  loadUsers();
});

/* LOGOUT */
logoutBtn.onclick = async () => {
  await signOut(auth);
  location.replace("../login.html");
};

/* CREATE USER */
saveBtn.onclick = async () => {

  if (currentUser.role !== "directeur") return;

  const name = uName.value.trim();
  const username = uUsername.value.trim().toLowerCase();
  const fonction = uFonction.value.trim();
  const role = uRole.value;
  const password = uPassword.value;
  const confirmPassword = uConfirmPassword.value;

  if (!name || !username || !fonction || !password) {
    alert("Champs obligatoires.");
    return;
  }

  if (password !== confirmPassword) {
    alert("Les mots de passe ne correspondent pas.");
    return;
  }

  if (password.length < 6) {
    alert("Mot de passe minimum 6 caractères.");
    return;
  }

  const email = `${username}@fkmenergy.com`;

  try {

    const cred = await createUserWithEmailAndPassword(
      secondaryAuth,
      email,
      password
    );

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
    loadUsers();

  } catch (err) {
    alert(err.message);
  }
};

/* LOAD USERS */
async function loadUsers() {

  table.innerHTML = "";

  const snap = await getDocs(collection(db, "users"));

  snap.forEach(d => {

    const u = d.data();

    table.innerHTML += `
      <tr class="hover:bg-slate-50">

        <td class="px-6 py-4 font-medium">${u.name}</td>
        <td class="px-6 py-4">${u.username}</td>
        <td class="px-6 py-4">${u.fonction}</td>

        <td class="px-6 py-4">
          <span class="px-2 py-1 text-xs rounded-full bg-slate-200">
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

        <td class="px-6 py-4 text-right">
          ${
            currentUser.role === "directeur"
              ? `
                <button 
                  onclick="toggleUserStatus('${d.id}', '${u.status}')"
                  class="text-sm ${
                    u.status === "active"
                      ? "text-red-600"
                      : "text-emerald-600"
                  }">
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

/* TOGGLE STATUS */
window.toggleUserStatus = async (id, status) => {

  if (currentUser.role !== "directeur") return;

  if (id === currentUser.uid) {
    alert("Impossible de se désactiver soi-même.");
    return;
  }

  const newStatus = status === "active"
    ? "disabled"
    : "active";

  await setDoc(doc(db, "users", id), {
    status: newStatus
  }, { merge: true });

  loadUsers();
};

addBtn.onclick = () => modal.show();
