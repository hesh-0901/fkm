// js/fournisseurs.js
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
const table = document.getElementById("suppliersTable");
const addBtn = document.getElementById("addSupplierBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userNameEl = document.getElementById("userName");
const userRoleEl = document.getElementById("userRole");

const modal = new bootstrap.Modal(document.getElementById("supplierModal"));
const saveBtn = document.getElementById("saveSupplierBtn");

const sName = document.getElementById("sName");
const sPhone = document.getElementById("sPhone");
const sComment = document.getElementById("sComment");
const supplierForm = document.getElementById("supplierForm");

let currentUser = null;

/* AUTH */
onAuthStateChanged(auth, async (user) => {
  if (!user) return location.replace("../login.html");

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return;

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

  loadSuppliers();
});

/* LOGOUT */
logoutBtn.onclick = async () => {
  await signOut(auth);
  location.replace("../login.html");
};

/* LOAD SUPPLIERS */
async function loadSuppliers() {
  table.innerHTML = "";
  const snap = await getDocs(collection(db, "fournisseurs"));

  if (snap.empty) {
    table.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted">
          Aucun fournisseur enregistré
        </td>
      </tr>`;
    return;
  }

  snap.forEach(d => {
    const s = d.data();

    table.innerHTML += `
      <tr>
        <td>${s.name}</td>
        <td>${s.phone || "—"}</td>
        <td>
          <span class="badge bg-${
            s.status === "ACTIVE" ? "success" :
            s.status === "BLOCKED" ? "danger" : "warning"
          }">
            ${s.status}
          </span>
        </td>
        <td>${s.createdBy?.name || "—"}</td>
        <td>${s.createdAt?.toDate().toLocaleString() || "—"}</td>
        <td class="text-end">
          ${
            [ROLES.ADMIN, ROLES.DIRECTEUR].includes(currentUser.role) && s.status === "PENDING"
              ? `<button class="btn btn-sm btn-outline-success me-1" onclick="validateSupplier('${d.id}')">Valider</button>`
              : ""
          }
          ${
            currentUser.role === ROLES.ADMIN && s.status === "ACTIVE"
              ? `<button class="btn btn-sm btn-outline-warning me-1" onclick="blockSupplier('${d.id}')">Bloquer</button>`
              : ""
          }
          ${
            currentUser.role === ROLES.DIRECTEUR
              ? `<button class="btn btn-sm btn-outline-danger" onclick="deleteSupplier('${d.id}')">Supprimer</button>`
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

  await addDoc(collection(db, "fournisseurs"), {
    name: sName.value.trim(),
    phone: sPhone.value.trim(),
    comment: sComment.value.trim(),
    status: "PENDING",
    createdBy: {
      uid: currentUser.uid,
      name: currentUser.name,
      role: currentUser.role
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  modal.hide();
  supplierForm.reset();
  loadSuppliers();
};

/* ADMIN ACTIONS */
window.validateSupplier = async (id) => {
  if (![ROLES.ADMIN, ROLES.DIRECTEUR].includes(currentUser.role)) return;

  await updateDoc(doc(db, "fournisseurs", id), {
    status: "ACTIVE",
    updatedAt: serverTimestamp()
  });

  loadSuppliers();
};

window.blockSupplier = async (id) => {
  if (currentUser.role !== ROLES.ADMIN) return;

  await updateDoc(doc(db, "fournisseurs", id), {
    status: "BLOCKED",
    updatedAt: serverTimestamp()
  });

  loadSuppliers();
};

/* DIRECTEUR */
window.deleteSupplier = async (id) => {
  if (currentUser.role !== ROLES.DIRECTEUR) return;
  if (!confirm("Supprimer ce fournisseur ?")) return;

  await deleteDoc(doc(db, "fournisseurs", id));
  loadSuppliers();
};

addBtn.onclick = () => modal.show();
