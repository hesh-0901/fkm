import { auth, db } from "./firebase.config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* DOM */
const table = document.getElementById("inventoryTable");
const addBtn = document.getElementById("addProductBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userNameEl = document.getElementById("userName");
const userRoleEl = document.getElementById("userRole");

const modal = new bootstrap.Modal(document.getElementById("productModal"));
const saveBtn = document.getElementById("saveProductBtn");

const currencySelect = document.getElementById("pCurrency");
const usdBlock = document.getElementById("usdBlock");
const cdfBlock = document.getElementById("cdfBlock");

let currentUser = null;

/* AUTH */
onAuthStateChanged(auth, async (user) => {
  if (!user) return location.replace("../login.html");

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return;

  const data = snap.data();

  currentUser = {
    uid: user.uid,
    displayName: data.displayName || data.name || data.username || "",
    role: data.role,
    fonction: data.fonction || ""
  };

  userNameEl.textContent = currentUser.displayName || "—";
  userRoleEl.textContent = currentUser.fonction || currentUser.role;

  if (["admin", "directeur"].includes(currentUser.role)) {
    addBtn.classList.remove("d-none");
  }

  loadInventory();
});

/* LOGOUT */
logoutBtn.onclick = async () => {
  await signOut(auth);
  location.replace("../login.html");
};

/* LOAD INVENTORY */
async function loadInventory() {
  table.innerHTML = "";

  const snap = await getDocs(collection(db, "inventory"));

  if (snap.empty) {
    table.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted">
          Aucun produit enregistré
        </td>
      </tr>
    `;
    return;
  }

  snap.forEach(d => {
    const p = d.data();
    const low = p.quantity <= p.minQuantity;

    table.innerHTML += `
      <tr>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>${p.quantity}</td>
        <td>${p.minQuantity}</td>
        <td>
          ${
            p.pricing?.mode === "USD" ? p.pricing.usd + " $" :
            p.pricing?.mode === "CDF" ? p.pricing.cdf + " CDF" :
            p.pricing?.usd + " $ / " + p.pricing?.cdf + " CDF"
          }
        </td>
        <td>
          <span class="badge bg-${low ? "danger" : "success"}">
            ${low ? "Stock faible" : "OK"}
          </span>
        </td>
      </tr>
    `;
  });
}

/* CURRENCY UI */
currencySelect.onchange = () => {
  const v = currencySelect.value;
  usdBlock.classList.toggle("d-none", v === "CDF");
  cdfBlock.classList.toggle("d-none", v === "USD");
};

/* OPEN MODAL */
addBtn.onclick = () => modal.show();

/* SAVE PRODUCT */
saveBtn.onclick = async () => {
  if (!["admin", "directeur"].includes(currentUser.role)) return;

  const name = pName.value.trim();
  const category = pCategory.value.trim();
  const qty = Number(pQty.value);
  const minQty = Number(pMinQty.value || 0);
  const mode = pCurrency.value;

  const usd = mode !== "CDF" ? Number(pUsd.value || 0) : null;
  const cdf = mode !== "USD" ? Number(pCdf.value || 0) : null;

  if (!name || !category || qty < 0) return;

  await addDoc(collection(db, "inventory"), {
    name,
    category,
    quantity: qty,
    minQuantity: minQty,

    pricing: {
      mode,
      usd,
      cdf
    },

    createdBy: {
      uid: currentUser.uid,
      displayName: currentUser.displayName,
      role: currentUser.role
    },

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  modal.hide();
  document.getElementById("productForm").reset();
  loadInventory();
};
