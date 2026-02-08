import { auth, db } from "./firebase.config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* DOM */
const table = document.getElementById("inventoryTable");
const addBtn = document.getElementById("addProductBtn");
const userNameEl = document.getElementById("userName");
const userRoleEl = document.getElementById("userRole");
const logoutBtn = document.getElementById("logoutBtn");

const modalEl = document.getElementById("productModal");
const saveBtn = document.getElementById("saveProductBtn");

/* Bootstrap modal (global) */
let modal = null;
if (window.bootstrap) {
  modal = new bootstrap.Modal(modalEl);
}

/* Current user */
let currentUser = null;

/* ================= AUTH GUARD ================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../login.html";
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return;

  const data = snap.data();

  currentUser = {
    uid: user.uid,
    username: data.username,
    role: data.role,
    fonction: data.fonction
  };

  userNameEl.textContent = currentUser.username || "—";
  userRoleEl.textContent = currentUser.fonction || currentUser.role;

  if (["admin", "directeur"].includes(currentUser.role)) {
    addBtn.style.display = "inline-flex";
  }

  loadInventory();
});

/* ================= LOGOUT ================= */
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "../login.html";
});

/* ================= LOAD INVENTORY ================= */
async function loadInventory() {
  table.innerHTML = `
    <tr>
      <td colspan="6" class="text-center text-muted">Chargement...</td>
    </tr>
  `;

  const snapshot = await getDocs(collection(db, "inventory"));
  table.innerHTML = "";

  if (snapshot.empty) {
    table.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted">
          Aucun produit enregistré
        </td>
      </tr>
    `;
    return;
  }

  snapshot.forEach(docSnap => {
    const p = docSnap.data();

    table.innerHTML += `
      <tr>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>${p.quantity}</td>
        <td>${p.unitPriceUSD ?? "—"}</td>
        <td>${p.unitPriceCDF ?? "—"}</td>
        <td>
          <button class="btn btn-sm btn-outline-secondary">Détails</button>
        </td>
      </tr>
    `;
  });
}

/* ================= MODAL ================= */
addBtn.addEventListener("click", () => {
  modal?.show();
});

/* ================= SAVE PRODUCT ================= */
saveBtn.addEventListener("click", async () => {
  if (!currentUser) return;

  const name = document.getElementById("pName").value.trim();
  const category = document.getElementById("pCategory").value.trim();
  const qty = Number(document.getElementById("pQty").value);
  const usd = Number(document.getElementById("pUsd").value || 0);
  const cdf = Number(document.getElementById("pCdf").value || 0);

  if (!name || !category || qty < 0) {
    alert("Veuillez remplir correctement les champs obligatoires.");
    return;
  }

  try {
    await addDoc(collection(db, "inventory"), {
      name,
      category,
      quantity: qty,
      unitPriceUSD: usd,
      unitPriceCDF: cdf,
      status: "active",

      createdBy: {
        uid: currentUser.uid,
        username: currentUser.username,
        role: currentUser.role
      },

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    modal.hide();
    document.getElementById("productForm").reset();
    loadInventory();

  } catch (err) {
    console.error(err);
    alert("Erreur lors de l'enregistrement.");
  }
});
