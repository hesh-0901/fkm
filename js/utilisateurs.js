import { auth, db } from "./firebase.config.js";
import {
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
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ======================
   DOM
====================== */
const table = document.getElementById("usersTable");
const addBtn = document.getElementById("addUserBtn");
const logoutBtn = document.getElementById("logoutBtn");

const userNameEl = document.getElementById("userName");
const userRoleEl = document.getElementById("userRole");

const modal = new bootstrap.Modal(document.getElementById("userModal"));
const saveBtn = document.getElementById("saveUserBtn");

const uName = document.getElementById("uName");
const uUsername = document.getElementById("uUsername");
const uFonction = document.getElementById("uFonction");
const uRole = document.getElementById("uRole");

let currentUser = null;

/* ======================
   AUTH
====================== */
onAuthStateChanged(auth, async (user) => {

  if (!user) return location.replace("../login.html");

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return;

  currentUser = snap.data();

  userNameEl.textContent = currentUser.name;
  userRoleEl.textContent = currentUser.role;

  if (currentUser.role === "directeur") {
    addBtn.classList.remove("hidden");
  }

  loadUsers();
});

/* ======================
   LOGOUT
====================== */
logoutBtn.onclick = async () => {
  await signOut(auth);
  location.replace("../login.html");
};

/* ======================
   LOAD USERS
====================== */
async function loadUsers() {

  table.innerHTML = "";

  const snap = await getDocs(collection(db, "users"));

  snap.forEach(d => {

    const u = d.data();

    table.innerHTML += `
      <tr class="hover:bg-slate-50 transition">
        <td class="px-6 py-4 font-medium">${u.name}</td>
        <td class="px-6 py-4">${u.username}</td>
        <td class="px-6 py-4">${u.fonction}</td>
        <td class="px-6 py-4">
          <span class="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
            ${u.role}
          </span>
        </td>
        <td class="px-6 py-4">
          <span class="px-2 py-1 text-xs rounded-full
            ${u.status === "active"
              ? "bg-emerald-100 text-emerald-600"
              : "bg-red-100 text-red-600"}">
            ${u.status}
          </span>
        </td>
        <td class="px-6 py-4 text-xs text-slate-500">
          ${u.createdAt?.toDate().toLocaleString() || "—"}
        </td>
        <td class="px-6 py-4 text-end">
          <button onclick="deleteUser('${d.id}')"
            class="text-danger hover:underline text-sm">
            Supprimer
          </button>
        </td>
      </tr>
    `;
  });
}

/* ======================
   PASSWORD GENERATOR
====================== */
function generatePassword() {
  return Math.random().toString(36).slice(-8) + "A1!";
}

/* ======================
   CREATE USER
====================== */
saveBtn.onclick = async () => {

  if (currentUser.role !== "directeur") return;

  const username = uUsername.value.trim().toLowerCase();
  const email = `${username}@fkmenergy.com`;
  const password = generatePassword();

  try {

    const cred =
      await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", cred.user.uid), {
      name: uName.value.trim(),
      username,
      fonction: uFonction.value.trim(),
      role: uRole.value,
      status: "active",
      createdAt: serverTimestamp()
    });

    alert("Utilisateur créé avec succès.");

    modal.hide();
    loadUsers();

  } catch (err) {
    alert(err.message);
  }
};

/* ======================
   DELETE USER
====================== */
window.deleteUser = async (id) => {

  if (currentUser.role !== "directeur") return;

  if (!confirm("Supprimer cet utilisateur ?")) return;

  await deleteDoc(doc(db, "users", id));
  loadUsers();
};

addBtn.onclick = () => modal.show();
