// js/utilisateurs.js
import { auth, db } from "./firebase.config.js";
import { onAuthStateChanged, signOut } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ROLES */
const ROLES = {
  OPERATEUR: "operateur",
  ADMIN: "admin",
  DIRECTEUR: "directeur"
};

/* DOM */
const table = document.getElementById("usersTable");
const addBtn = document.getElementById("addUserBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userNameEl = document.getElementById("userName");
const userRoleEl = document.getElementById("userRole");

const modal = new bootstrap.Modal(document.getElementById("userModal"));
const infoModal = new bootstrap.Modal(document.getElementById("userInfoModal"));
const infoContent = document.getElementById("userInfoContent");

const saveBtn = document.getElementById("saveUserBtn");

const uName = document.getElementById("uName");
const uUsername = document.getElementById("uUsername");
const uFonction = document.getElementById("uFonction");
const uRole = document.getElementById("uRole");
const userForm = document.getElementById("userForm");

let currentUser = null;

/* AUTH */
onAuthStateChanged(auth, async (user) => {
  if (!user) return location.replace("../login.html");

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return;

  currentUser = snap.data();

  userNameEl.textContent = currentUser.name;
  userRoleEl.textContent = currentUser.fonction;

  if (currentUser.role === ROLES.DIRECTEUR) {
    addBtn.classList.remove("d-none");
  }

  loadUsers();
});

/* LOGOUT */
logoutBtn.onclick = async () => {
  await signOut(auth);
  location.replace("../login.html");
};

/* LOAD USERS */
async function loadUsers() {
  table.innerHTML = "";
  const snap = await getDocs(collection(db, "users"));

  snap.forEach(d => {
    const u = d.data();

    table.innerHTML += `
      <tr>
        <td>${u.name}</td>
        <td>${u.username}</td>
        <td>${u.fonction}</td>
        <td><span class="badge bg-primary">${u.role}</span></td>
        <td>
          <span class="badge bg-${u.status === "active" ? "success" : "danger"}">
            ${u.status}
          </span>
        </td>
        <td>${u.createdAt?.toDate().toLocaleString() || "—"}</td>
        <td class="text-end">

          <button class="btn btn-sm btn-outline-primary me-1"
            onclick='showUserInfo(${JSON.stringify(u)})'>
            <i class="bi bi-info-circle"></i>
          </button>

          ${
            currentUser.role === ROLES.DIRECTEUR
              ? `<button class="btn btn-sm btn-outline-danger"
                   onclick="deleteUser('${d.id}')">Supprimer</button>`
              : ""
          }
        </td>
      </tr>
    `;
  });
}

/* INFO USER */
window.showUserInfo = (u) => {
  infoContent.innerHTML = `
    <div class="space-y-2">
      <div><strong>Nom :</strong> ${u.name}</div>
      <div><strong>Identifiant :</strong> ${u.username}</div>
      <div><strong>Email :</strong> ${u.email}</div>
      <div><strong>Fonction :</strong> ${u.fonction}</div>
      <div><strong>Rôle :</strong> ${u.role}</div>
      <div><strong>Statut :</strong> ${u.status}</div>
    </div>
  `;
  infoModal.show();
};

/* CREATE USER (Firestore metadata only) */
saveBtn.onclick = async () => {
  if (currentUser.role !== ROLES.DIRECTEUR) return;

  const username = uUsername.value.trim().toLowerCase();
  const email = `${username}@fkmenergy.com`;

  await addDoc(collection(db, "users"), {
    name: uName.value.trim(),
    username,
    email,
    fonction: uFonction.value.trim(),
    role: uRole.value,
    status: "active",
    createdAt: serverTimestamp()
  });

  modal.hide();
  userForm.reset();
  loadUsers();
};

/* DELETE USER (Firestore only) */
window.deleteUser = async (id) => {
  if (currentUser.role !== ROLES.DIRECTEUR) return;
  if (!confirm("Supprimer cet utilisateur ?")) return;

  await deleteDoc(doc(db, "users", id));
  loadUsers();
};

addBtn.onclick = () => modal.show();
