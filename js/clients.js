// js/clients.js
import { auth, db } from "./firebase.config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
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
const cComment = document.getElementById("cComment");
const table = document.getElementById("clientsTable");
const addBtn = document.getElementById("addClientBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userNameEl = document.getElementById("userName");
const userRoleEl = document.getElementById("userRole");

const modal = new bootstrap.Modal(document.getElementById("clientModal"));
const saveBtn = document.getElementById("saveClientBtn");

const cName = document.getElementById("cName");
const cPhone = document.getElementById("cPhone");
const clientForm = document.getElementById("clientForm");

let currentUser = null;

/* AUTH */
onAuthStateChanged(auth, async user => {
  if (!user) return location.replace("../login.html");

  const snap = await getDoc(doc(db, "users", user.uid));
  const data = snap.data();

  currentUser = {
    uid: user.uid,
    name: data.name,
    fonction: data.fonction,
    role: data.role
  };

  userNameEl.textContent = currentUser.name;
  userRoleEl.textContent = currentUser.fonction;

  if ([ROLES.OPERATEUR, ROLES.ADMIN, ROLES.DIRECTEUR].includes(currentUser.role)) {
    addBtn.classList.remove("d-none");
  }

  loadClients();
});

/* LOGOUT */
logoutBtn.onclick = async () => {
  await signOut(auth);
  location.replace("../login.html");
};

/* LOAD CLIENTS */
async function loadClients() {
  table.innerHTML = "";
  const snap = await getDocs(collection(db, "clients"));

  if (snap.empty) {
    table.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted">
          Aucun client enregistré
        </td>
      </tr>`;
    return;
  }

  snap.forEach(d => {
    const c = d.data();

    table.innerHTML += `
      <tr>
        <td>${c.name}</td>
        <td>${c.phone || "—"}</td>
        <td>
          <span class="badge bg-${
            c.status === "ACTIVE" ? "success" :
            c.status === "BLOCKED" ? "danger" : "warning"
          }">
            ${c.status}
          </span>
        </td>
        <td>${c.createdBy?.name || "—"}</td>
        <td>${c.createdAt?.toDate().toLocaleString() || "—"}</td>
        <td class="text-end">
          ${
            [ROLES.ADMIN, ROLES.DIRECTEUR].includes(currentUser.role) && c.status === "PENDING"
              ? `<button class="btn btn-sm btn-outline-success me-1" onclick="validateClient('${d.id}')">Valider</button>`
              : ""
          }
          ${
            currentUser.role === ROLES.ADMIN && c.status === "ACTIVE"
              ? `<button class="btn btn-sm btn-outline-warning me-1" onclick="blockClient('${d.id}')">Désactiver</button>`
              : ""
          }
          ${
            currentUser.role === ROLES.DIRECTEUR
              ? `<button class="btn btn-sm btn-outline-danger" onclick="deleteClient('${d.id}')">Supprimer</button>`
              : ""
          }
        </td>
      </tr>
    `;
  });
}

/* CREATE */
saveBtn.onclick = async () => {
  if (![ROLES.OPERATEUR, ROLES.ADMIN, ROLES.DIRECTEUR].includes(currentUser.role)) return;

  await addDoc(collection(db, "clients"), {
  name: cName.value.trim(),
  phone: cPhone.value.trim(),
  comment: cComment.value.trim(),
  status: "PENDING",
  createdBy: {
    uid: currentUser.uid,
    name: currentUser.name,
    role: currentUser.role
  },
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
});
;

  modal.hide();
  clientForm.reset();
  loadClients();
};

/* ADMIN ACTIONS */
window.validateClient = async (id) => {
  if (![ROLES.ADMIN, ROLES.DIRECTEUR].includes(currentUser.role)) return;

  await updateDoc(doc(db, "clients", id), {
    status: "ACTIVE",
    updatedAt: serverTimestamp()
  });

  loadClients();
};

window.blockClient = async (id) => {
  if (currentUser.role !== ROLES.ADMIN) return;

  await updateDoc(doc(db, "clients", id), {
    status: "BLOCKED",
    updatedAt: serverTimestamp()
  });

  loadClients();
};

/* DIRECTEUR */
window.deleteClient = async (id) => {
  if (currentUser.role !== ROLES.DIRECTEUR) return;
  if (!confirm("Supprimer ce client ?")) return;

  await deleteDoc(doc(db, "clients", id));
  loadClients();
};

addBtn.onclick = () => modal.show();
