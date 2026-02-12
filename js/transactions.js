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

const txSearch = document.getElementById("txSearch");
const statusFilter = document.getElementById("statusFilter");
const quickDateFilter = document.getElementById("quickDateFilter");
const startDate = document.getElementById("startDate");
const endDate = document.getElementById("endDate");
const resetFilters = document.getElementById("resetFilters");

/* ================================
   VARIABLES
================================ */
let productsCache = [];
let transactionsCache = [];
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
    invoiceNumber: editingId ? undefined : generateInvoiceNumber(),
    productId: selectedProduct.id,
    productName: selectedProduct.name,
    quantity,
    unitPrice: price,
    total,
    currency,
    partnerName: partnerSearch.value,
    updatedAt: serverTimestamp()
  };

  if (editingId) {
    delete data.invoiceNumber;
    await updateDoc(doc(db, "transactions", editingId), data);
    editingId = null;
  } else {
    await addDoc(collection(db, "transactions"), {
      ...data,
      status: "pending",
      createdAt: serverTimestamp()
    });
  }

  modal.hide();
  document.getElementById("txForm").reset();
  selectedProduct = null;
  loadTransactions();
};

/* ================================
   LOAD TRANSACTIONS
================================ */
async function loadTransactions() {

  const q = query(collection(db, "transactions"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  transactionsCache = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  applyFilters();
}

/* ================================
   APPLY FILTERS
================================ */
function applyFilters() {

  let filtered = [...transactionsCache];

  const search = txSearch.value.toLowerCase();
  const status = statusFilter.value;
  const quick = quickDateFilter.value;
  const start = startDate.value;
  const end = endDate.value;

  if (search) {
    filtered = filtered.filter(t =>
      t.invoiceNumber?.toLowerCase().includes(search) ||
      t.partnerName?.toLowerCase().includes(search) ||
      t.productName?.toLowerCase().includes(search)
    );
  }

  if (status !== "ALL") {
    filtered = filtered.filter(t =>
      t.status?.toUpperCase() === status
    );
  }

  if (quick !== "ALL") {

    const now = new Date();

    filtered = filtered.filter(t => {

      if (!t.createdAt) return false;

      const date = t.createdAt.toDate();

      if (quick === "TODAY") {
        return date.toDateString() === now.toDateString();
      }

      if (quick === "7DAYS") {
        const past = new Date();
        past.setDate(now.getDate() - 7);
        return date >= past;
      }

      if (quick === "30DAYS") {
        const past = new Date();
        past.setDate(now.getDate() - 30);
        return date >= past;
      }

      return true;
    });
  }

  if (start && end) {

    const startObj = new Date(start);
    const endObj = new Date(end);
    endObj.setHours(23,59,59,999);

    filtered = filtered.filter(t => {
      if (!t.createdAt) return false;
      const date = t.createdAt.toDate();
      return date >= startObj && date <= endObj;
    });
  }

  renderTable(filtered);
}

/* ================================
   RENDER TABLE
================================ */
function renderTable(data) {

  table.innerHTML = "";

  if (data.length === 0) {
    table.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-4 text-muted">
          Aucune transaction trouvée
        </td>
      </tr>
    `;
    return;
  }

  data.forEach((t, index) => {

    const created = t.createdAt?.toDate().toLocaleDateString() || "-";

    table.innerHTML += `
      <tr class="text-sm">
        <td class="px-3 py-2">${index + 1}</td>
        <td class="px-3 py-2 fw-semibold">${t.invoiceNumber}</td>
        <td class="px-3 py-2">${created}</td>
        <td class="px-3 py-2">${t.partnerName}</td>
        <td class="px-3 py-2">${t.productName}</td>
        <td class="px-3 py-2 text-center">${t.quantity}</td>
        <td class="px-3 py-2 fw-semibold">${t.total} ${t.currency}</td>
        <td class="px-3 py-2">
          <span class="badge bg-${
            t.status === "approved" ? "success" :
            t.status === "rejected" ? "danger" :
            "warning"
          }">${t.status}</span>
        </td>
        <td class="px-3 py-2 text-end">
          ${renderActions(t.id, t)}
        </td>
      </tr>
    `;
  });
}

/* ================================
   ACTIONS
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

/* ================================
   FILTER EVENTS
================================ */
txSearch.addEventListener("input", applyFilters);
statusFilter.addEventListener("change", applyFilters);
quickDateFilter.addEventListener("change", applyFilters);
startDate.addEventListener("change", applyFilters);
endDate.addEventListener("change", applyFilters);

resetFilters.addEventListener("click", () => {

  txSearch.value = "";
  statusFilter.value = "ALL";
  quickDateFilter.value = "ALL";
  startDate.value = "";
  endDate.value = "";

  applyFilters();
});

newTxBtn.onclick = () => modal.show();
