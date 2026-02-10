//js/inventaire.js
import { auth, db } from "./firebase.config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, getDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ROLES */
const ROLES = {
  OPERATEUR: "operateur",
  ADMIN: "admin",
  DIRECTEUR: "directeur"
};

/* DOM */
const table = document.getElementById("inventoryTable");
const addBtn = document.getElementById("addProductBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userNameEl = document.getElementById("userName");
const userRoleEl = document.getElementById("userRole");

const modal = new bootstrap.Modal(document.getElementById("productModal"));
const saveBtn = document.getElementById("saveProductBtn");

const pName = document.getElementById("pName");
const pCategory = document.getElementById("pCategory");
const pQty = document.getElementById("pQty");
const pMinQty = document.getElementById("pMinQty");
const pCurrency = document.getElementById("pCurrency");
const pUsd = document.getElementById("pUsd");
const pCdf = document.getElementById("pCdf");
const usdBlock = document.getElementById("usdBlock");
const cdfBlock = document.getElementById("cdfBlock");
const productForm = document.getElementById("productForm");

let currentUser = null;

/* AUTH */
onAuthStateChanged(auth, async (user) => {
  if (!user) return location.replace("../login.html");

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return;

  currentUser = { uid: user.uid, ...snap.data() };

  userNameEl.textContent = currentUser.displayName || "—";
  userRoleEl.textContent = currentUser.role;

  if ([ROLES.OPERATEUR, ROLES.ADMIN, ROLES.DIRECTEUR].includes(currentUser.role)) {
    addBtn.classList.remove("d-none");
  }

  loadInventory();
});

/* LOGOUT */
logoutBtn.onclick = async () => {
  await signOut(auth);
  location.replace("../login.html");
};

/* INVENTORY */
async function loadInventory() {
  table.innerHTML = "";
  const snap = await getDocs(collection(db, "inventory"));

  if (snap.empty) {
    table.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Aucun produit</td></tr>`;
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
        <td>${p.pricing?.usd || ""} ${p.pricing?.cdf ? "/ "+p.pricing.cdf+" CDF" : ""}</td>
        <td>
          <span class="badge bg-${p.status === "PENDING" ? "warning" : low ? "danger" : "success"}">
            ${p.status || "OK"}
          </span>
        </td>
        <td class="text-end">
          ${
            currentUser.role === ROLES.ADMIN || currentUser.role === ROLES.DIRECTEUR
              ? `<button class="btn btn-sm btn-outline-success me-1" onclick="approve('${d.id}')">Valider</button>`
              : ""
          }
          ${
            currentUser.role === ROLES.DIRECTEUR
              ? `<button class="btn btn-sm btn-outline-danger" onclick="remove('${d.id}')">Supprimer</button>`
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

  await addDoc(collection(db, "inventory"), {
    name: pName.value.trim(),
    category: pCategory.value.trim(),
    quantity: Number(pQty.value),
    minQuantity: Number(pMinQty.value),
    pricing: {
      mode: pCurrency.value,
      usd: Number(pUsd.value || 0),
      cdf: Number(pCdf.value || 0)
    },
    status: "PENDING",
    createdBy: { uid: currentUser.uid, role: currentUser.role },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  modal.hide();
  productForm.reset();
  loadInventory();
};

/* ADMIN VALIDATION */
window.approve = async (id) => {
  if (![ROLES.ADMIN, ROLES.DIRECTEUR].includes(currentUser.role)) return;
  await updateDoc(doc(db, "inventory", id), {
    status: "VALIDATED",
    updatedAt: serverTimestamp()
  });
  loadInventory();
};

/* DIRECTEUR DELETE */
window.remove = async (id) => {
  if (currentUser.role !== ROLES.DIRECTEUR) return;
  if (!confirm("Supprimer ce produit ?")) return;
  await deleteDoc(doc(db, "inventory", id));
  loadInventory();
};

/* CURRENCY UI */
pCurrency.onchange = () => {
  usdBlock.classList.toggle("d-none", pCurrency.value === "CDF");
  cdfBlock.classList.toggle("d-none", pCurrency.value === "USD");
};

addBtn.onclick = () => modal.show();
