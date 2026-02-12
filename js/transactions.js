import { auth, db } from "./firebase.config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  increment,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ================================
   DOM
================================ */
const table = document.getElementById("txTable");
const modal = new bootstrap.Modal(document.getElementById("txModal"));
const saveBtn = document.getElementById("saveTxBtn");
const newTxBtn = document.getElementById("newTxBtn");

const productSearch = document.getElementById("productSearch");
const productResults = document.getElementById("productResults");
const partnerSearch = document.getElementById("partnerSearch");

const txQty = document.getElementById("txQty");
const unitPrice = document.getElementById("unitPrice");
const totalPrice = document.getElementById("totalPrice");

const logoutBtn = document.getElementById("logoutBtn");
const userNameEl = document.getElementById("userName");
const userFunctionEl = document.getElementById("userFunction");

/* ================================
   VARIABLES
================================ */
let productsCache = [];
let selectedProduct = null;
let editingId = null;
let currentUserData = null;

/* ================================
   AUTH
================================ */
onAuthStateChanged(auth, async (user) => {

  if (!user) return location.replace("../login.html");

  const snap = await getDoc(doc(db, "users", user.uid));
  currentUserData = snap.data();

  userNameEl.textContent = currentUserData.name;
  userFunctionEl.textContent = currentUserData.fonction;

  newTxBtn.classList.remove("d-none");

  await preloadProducts();
  await loadTransactions();
});

/* ================================
   LOGOUT
================================ */
logoutBtn.onclick = async () => {
  await signOut(auth);
  location.replace("../login.html");
};

/* ================================
   LOAD PRODUCTS
================================ */
async function preloadProducts() {
  const snap = await getDocs(collection(db, "inventory"));
  productsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/* ================================
   PRODUCT SEARCH
================================ */
productSearch.oninput = () => {

  const term = productSearch.value.toLowerCase();
  productResults.innerHTML = "";

  if (!term) return;

  productsCache
    .filter(p => p.name.toLowerCase().includes(term))
    .forEach(p => {

      const btn = document.createElement("button");
      btn.className = "list-group-item list-group-item-action text-sm";
      btn.textContent = p.name;

      btn.onclick = () => {

        selectedProduct = p;
        productSearch.value = p.name;
        productResults.innerHTML = "";

        const price = p.pricing?.usd || p.pricing?.cdf || 0;
        const currency = p.pricing?.usd ? "USD" : "CDF";

        unitPrice.value = `${price} ${currency}`;
        updateTotal();
      };

      productResults.appendChild(btn);
    });
};

/* ================================
   TOTAL CALC
================================ */
function updateTotal() {
  const qty = Number(txQty.value) || 0;
  const [price, currency] = unitPrice.value.split(" ");
  totalPrice.value = `${qty * Number(price || 0)} ${currency || ""}`;
}
txQty.oninput = updateTotal;

/* ================================
   GENERATE INVOICE
================================ */
function generateInvoiceNumber() {
  const now = new Date();
  return `FKM-IN-${now.getFullYear()}${(now.getMonth()+1)
    .toString().padStart(2,"0")}${now.getDate()
    .toString().padStart(2,"0")}${Date.now().toString().slice(-3)}`;
}

/* ================================
   SAVE
================================ */
saveBtn.onclick = async () => {

  if (!selectedProduct || !txQty.value || !partnerSearch.value) {
    alert("Veuillez remplir tous les champs.");
    return;
  }

  const quantity = Number(txQty.value);
  const price = selectedProduct.pricing?.usd || selectedProduct.pricing?.cdf || 0;
  const currency = selectedProduct.pricing?.usd ? "USD" : "CDF";
  const total = quantity * price;

  const data = {
    invoiceNumber: generateInvoiceNumber(),
    productId: selectedProduct.id,
    productName: selectedProduct.name,
    quantity,
    unitPrice: price,
    total,
    currency,
    partnerName: partnerSearch.value,
    status: "pending",
    updatedAt: serverTimestamp()
  };

  if (editingId) {
    await updateDoc(doc(db, "transactions", editingId), data);
    editingId = null;
  } else {
    await addDoc(collection(db, "transactions"), {
      ...data,
      createdAt: serverTimestamp()
    });
  }

  modal.hide();
  document.getElementById("txForm").reset();
  selectedProduct = null;
  loadTransactions();
};

/* ================================
   LOAD TABLE
================================ */
async function loadTransactions() {

  table.innerHTML = "";

  const q = query(collection(db, "transactions"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  snap.forEach(d => {

    const t = d.data();
    const created = t.createdAt?.toDate().toLocaleDateString() || "-";

    table.innerHTML += `
      <tr class="text-sm">
        <td class="px-3 py-2 fw-semibold">${t.invoiceNumber}</td>
        <td class="px-3 py-2">${created}</td>
        <td class="px-3 py-2">${t.partnerName}</td>
        <td class="px-3 py-2">${t.productName}</td>
        <td class="px-3 py-2">${t.quantity}</td>
        <td class="px-3 py-2 fw-semibold">${t.total} ${t.currency}</td>
        <td class="px-3 py-2">
          <span class="badge bg-${
            t.status === "approved" ? "success" :
            t.status === "rejected" ? "danger" :
            "warning"
          }">${t.status}</span>
        </td>
        <td class="px-3 py-2 text-end">
          ${renderActions(d.id, t)}
        </td>
      </tr>
    `;
  });
}

/* ================================
   ACTION BUTTONS
================================ */
function renderActions(id, t) {

  const canValidate =
    ["admin", "directeur"].includes(currentUserData.role);

  return `
    <div class="dropdown">
      <button class="btn btn-sm btn-light"
              data-bs-toggle="dropdown">
        <i class="bi bi-three-dots-vertical"></i>
      </button>

      <ul class="dropdown-menu dropdown-menu-end">

        ${canValidate && t.status === "pending" ? `
        <li><a class="dropdown-item" onclick="validateTx('${id}')">
          <i class="bi bi-check-circle text-success"></i> Approuver
        </a></li>` : ""}

        ${canValidate && t.status === "pending" ? `
        <li><a class="dropdown-item" onclick="rejectTx('${id}')">
          <i class="bi bi-x-circle text-danger"></i> Rejeter
        </a></li>` : ""}

        ${t.status !== "approved" ? `
        <li><a class="dropdown-item" onclick="editTx('${id}')">
          <i class="bi bi-pencil-square text-primary"></i> Modifier
        </a></li>` : ""}

        <li><a class="dropdown-item text-danger" onclick="deleteTx('${id}')">
          <i class="bi bi-trash"></i> Supprimer
        </a></li>

      </ul>
    </div>
  `;
}

/* ================================
   VALIDATE
================================ */
window.validateTx = async (id) => {

  if (!["admin","directeur"].includes(currentUserData.role)) return;

  const snap = await getDoc(doc(db, "transactions", id));
  const t = snap.data();

  if (t.status !== "pending") return;

  await updateDoc(doc(db, "inventory", t.productId), {
    quantity: increment(-t.quantity)
  });

  await updateDoc(doc(db, "transactions", id), {
    status: "approved",
    updatedAt: serverTimestamp()
  });

  loadTransactions();
};

/* ================================
   REJECT
================================ */
window.rejectTx = async (id) => {

  if (!["admin","directeur"].includes(currentUserData.role)) return;

  await updateDoc(doc(db, "transactions", id), {
    status: "rejected",
    updatedAt: serverTimestamp()
  });

  loadTransactions();
};

/* ================================
   EDIT
================================ */
window.editTx = async (id) => {

  const snap = await getDoc(doc(db, "transactions", id));
  const t = snap.data();

  if (t.status === "approved") return;

  editingId = id;
  selectedProduct = productsCache.find(p => p.id === t.productId);

  productSearch.value = t.productName;
  partnerSearch.value = t.partnerName;
  txQty.value = t.quantity;
  unitPrice.value = `${t.unitPrice} ${t.currency}`;
  updateTotal();

  modal.show();
};

/* ================================
   DELETE
================================ */
window.deleteTx = async (id) => {

  if (!confirm("Supprimer cette transaction ?")) return;

  await deleteDoc(doc(db, "transactions", id));
  loadTransactions();
};

newTxBtn.onclick = () => modal.show();
