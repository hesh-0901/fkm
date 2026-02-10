// js/transactions.js
import { auth, db } from "./firebase.config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection,
  getDocs,
  addDoc,
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
const table = document.getElementById("txTable");
const newTxBtn = document.getElementById("newTxBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userNameEl = document.getElementById("userName");
const userRoleEl = document.getElementById("userRole");

const modal = new bootstrap.Modal(document.getElementById("txModal"));
const saveBtn = document.getElementById("saveTxBtn");

let currentUser = null;

/* AUTH */
onAuthStateChanged(auth, async (user) => {
  if (!user) return location.replace("../login.html");

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return;

  const data = snap.data();

  currentUser = {
    uid: user.uid,
    name: data.name || data.username || "—",
    fonction: data.fonction || "",
    role: data.role
  };

  // ✅ AFFICHAGE IDENTITÉ (CORRIGÉ)
  userNameEl.textContent = currentUser.name;
  userRoleEl.textContent = currentUser.fonction;

  // ✅ SEUL L’OPÉRATEUR CRÉE DES TRANSACTIONS
  if (currentUser.role === ROLES.OPERATEUR) {
    newTxBtn.classList.remove("d-none");
  }

  loadTransactions();
});

/* LOGOUT */
logoutBtn.onclick = async () => {
  await signOut(auth);
  location.replace("../login.html");
};

/* LOAD TRANSACTIONS */
async function loadTransactions() {
  table.innerHTML = "";

  const snap = await getDocs(collection(db, "transactions"));

  if (snap.empty) {
    table.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted">
          Aucune transaction enregistrée
        </td>
      </tr>
    `;
    return;
  }

  snap.forEach(d => {
    const t = d.data();

    table.innerHTML += `
      <tr>
        <td>${t.createdAt?.toDate().toLocaleString() || "—"}</td>
        <td>${t.productName}</td>
        <td>${t.type === "out" ? "Sortie" : "Entrée"}</td>
        <td>${t.quantity}</td>
        <td>
          <span class="badge bg-${
            t.status === "pending" ? "warning" :
            t.status === "approved" ? "success" : "secondary"
          }">
            ${t.status}
          </span>
        </td>
        <td>${t.createdBy?.name || "—"}</td>
        <td></td>
      </tr>
    `;
  });
}

/* OPEN MODAL */
newTxBtn.addEventListener("click", async () => {
  const select = document.getElementById("txProduct");
  select.innerHTML = "";

  const snap = await getDocs(collection(db, "inventory"));
  snap.forEach(d => {
    const p = d.data();
    select.innerHTML += `<option value="${d.id}">${p.name}</option>`;
  });

  modal.show();
});

/* SAVE TRANSACTION */
saveBtn.onclick = async () => {
  if (!currentUser || currentUser.role !== ROLES.OPERATEUR) {
    alert("Accès refusé");
    return;
  }

  const productId = document.getElementById("txProduct").value;
  const qty = Number(document.getElementById("txQty").value);
  const type = document.getElementById("txType").value;

  if (!productId || qty <= 0) return;

  const productSnap = await getDoc(doc(db, "inventory", productId));
  if (!productSnap.exists()) return;

  const product = productSnap.data();

  await addDoc(collection(db, "transactions"), {
    productId,
    productName: product.name,
    quantity: qty,
    type,
    status: "pending",

    createdBy: {
      uid: currentUser.uid,
      name: currentUser.name,
      role: currentUser.role
    },

    createdAt: serverTimestamp(),
    validatedAt: null
  });

  modal.hide();
  loadTransactions();
};
