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

import { Modal } from
  "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.esm.min.js";

/* DOM */
const table = document.getElementById("inventoryTable");
const addBtn = document.getElementById("addProductBtn");
const userNameEl = document.getElementById("userName");
const userRoleEl = document.getElementById("userRole");
const logoutBtn = document.getElementById("logoutBtn");

const modalEl = document.getElementById("productModal");
const modal = new Modal(modalEl);
const saveBtn = document.getElementById("saveProductBtn");

/* Current user profile (GLOBAL) */
let currentUser = null;

/* ================= AUTH GUARD ================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../login.html";
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return;

  currentUser = {
    uid: user.uid,
    username: snap.data().username,
    role: snap.data().role,
    fonction: snap.data().fonction
  };

  userNameEl.textContent = currentUser.username || "—";
  userRoleEl.textContent = currentUser.fonction || currentUser.role;

  if (currentUser.role === "admin" || currentUser.role === "directeur") {
    addBtn.classList.remove("d-none");
  }

  loadInventory();
});

/* ================= LOGOUT ================= */
logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "../login.html";
});

/* ================= LOAD INVENTORY ================= */
async function loadInventory() {
  table.innerHTML = `
    <tr>
      <td colspan="6" class="text-center text-muted">
        Chargement...
      </td>
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
          <button class="btn btn-sm btn-outline-secondary">
            Détails
          </button>
        </td>
      </tr>
    `;
  });
}

/* ================= MODAL ================= */
addBtn?.addEventListener("click", () => {
  modal.show();
});

/* ================= SAVE PRODUCT ================= */
saveBtn?.addEventListener("click", async () => {
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
