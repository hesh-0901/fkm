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
  increment
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   DOM
========================= */
const table = document.getElementById("txTable");
const modal = new bootstrap.Modal(document.getElementById("txModal"));
const saveBtn = document.getElementById("saveTxBtn");
const newTxBtn = document.getElementById("newTxBtn");

const searchInput = document.getElementById("txSearch");
const statusFilter = document.getElementById("statusFilter");

const productSearch = document.getElementById("productSearch");
const productResults = document.getElementById("productResults");

const partnerSearch = document.getElementById("partnerSearch");
const partnerResults = document.getElementById("partnerResults");

const txQty = document.getElementById("txQty");
const unitPrice = document.getElementById("unitPrice");
const totalPrice = document.getElementById("totalPrice");

const logoutBtn = document.getElementById("logoutBtn");
const userNameEl = document.getElementById("userName");
const userFunctionEl = document.getElementById("userFunction");

/* =========================
   VARIABLES
========================= */
let currentUser = null;
let productsCache = [];
let clientsCache = [];
let txCache = [];
let selectedProduct = null;
let selectedClient = null;
let editingId = null;

/* =========================
   AUTH
========================= */
onAuthStateChanged(auth, async (user) => {

  if (!user) return location.replace("../login.html");

  const snap = await getDoc(doc(db, "users", user.uid));
  currentUser = snap.data();

  userNameEl.textContent = currentUser.name;
  userFunctionEl.textContent = currentUser.fonction;

  newTxBtn.classList.remove("d-none");

  await preloadData();
  await loadTransactions();
});

/* =========================
   LOGOUT
========================= */
logoutBtn.onclick = async () => {
  await signOut(auth);
  location.replace("../login.html");
};

/* =========================
   PRELOAD INVENTORY + CLIENTS
========================= */
async function preloadData() {

  productsCache = [];
  clientsCache = [];

  const productSnap = await getDocs(collection(db, "inventory"));
  productSnap.forEach(d => {
    const p = d.data();
    if (p.quantity > 0) {
      productsCache.push({ id: d.id, ...p });
    }
  });

  const clientSnap = await getDocs(collection(db, "clients"));
  clientSnap.forEach(d => {
    const c = d.data();
    if (c.status === "ACTIVE") {
      clientsCache.push({ id: d.id, ...c });
    }
  });
}

/* =========================
   LOAD TRANSACTIONS
========================= */
async function loadTransactions() {

  txCache = [];
  table.innerHTML = "";

  const snap = await getDocs(collection(db, "transactions"));
  snap.forEach(d => {
    txCache.push({ id: d.id, ...d.data() });
  });

  renderTable(txCache);
}

/* =========================
   RENDER TABLE
========================= */
function renderTable(data) {

  table.innerHTML = "";

  if (data.length === 0) {
    table.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-6 text-muted">
          Aucune transaction trouvée
        </td>
      </tr>`;
    return;
  }

  data.forEach(t => {

    table.innerHTML += `
      <tr class="hover:bg-slate-50 transition">
        <td class="px-4 py-3 fw-semibold">${t.invoiceNumber || "-"}</td>
        <td class="px-4 py-3">${t.createdAt?.toDate()?.toLocaleDateString() || "-"}</td>
        <td class="px-4 py-3">${t.clientName}</td>
        <td class="px-4 py-3">${t.productName}</td>
        <td class="px-4 py-3 text-center">${t.quantity}</td>
        <td class="px-4 py-3 fw-semibold">${t.total} ${t.currency}</td>
        <td class="px-4 py-3">
          <span class="badge bg-${
            t.status === "approved" ? "success" :
            t.status === "rejected" ? "danger" :
            "warning"
          }">
            ${t.status}
          </span>
        </td>
        <td class="px-4 py-3 text-end">
          <div class="dropdown">
            <button class="btn btn-sm btn-light" data-bs-toggle="dropdown">
              <i class="bi bi-three-dots-vertical"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end">

              <li>
                <a class="dropdown-item"
                   onclick="editTx('${t.id}')">
                   <i class="bi bi-pencil-square me-2 text-primary"></i>
                   Modifier
                </a>
              </li>

              <li>
                <a class="dropdown-item text-danger"
                   onclick="deleteTx('${t.id}')">
                   <i class="bi bi-trash me-2"></i>
                   Supprimer
                </a>
              </li>

            </ul>
          </div>
        </td>
      </tr>
    `;
  });
}

/* =========================
   RECHERCHE + FILTRE
========================= */
function applyFilters() {

  const term = searchInput?.value.toLowerCase() || "";
  const status = statusFilter?.value || "";

  let filtered = txCache.filter(t => {

    const matchSearch =
      t.productName?.toLowerCase().includes(term) ||
      t.clientName?.toLowerCase().includes(term) ||
      t.invoiceNumber?.toLowerCase().includes(term);

    const matchStatus =
      status === "" || t.status === status;

    return matchSearch && matchStatus;
  });

  renderTable(filtered);
}

searchInput?.addEventListener("input", applyFilters);
statusFilter?.addEventListener("change", applyFilters);

/* =========================
   PRODUCT SEARCH
========================= */
productSearch.oninput = () => {

  const term = productSearch.value.toLowerCase();
  productResults.innerHTML = "";

  productsCache
    .filter(p => p.name.toLowerCase().includes(term))
    .forEach(p => {

      const btn = document.createElement("button");
      btn.className = "list-group-item list-group-item-action";
      btn.textContent = `${p.name} (Stock: ${p.quantity})`;

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

/* =========================
   CLIENT SEARCH
========================= */
partnerSearch.oninput = () => {

  const term = partnerSearch.value.toLowerCase();
  partnerResults.innerHTML = "";

  clientsCache
    .filter(c => c.name.toLowerCase().includes(term))
    .forEach(c => {

      const btn = document.createElement("button");
      btn.className = "list-group-item list-group-item-action";
      btn.textContent = c.name;

      btn.onclick = () => {
        selectedClient = c;
        partnerSearch.value = c.name;
        partnerResults.innerHTML = "";
      };

      partnerResults.appendChild(btn);
    });
};

/* =========================
   TOTAL
========================= */
function updateTotal() {
  const qty = Number(txQty.value) || 0;
  const [price, currency] = unitPrice.value.split(" ");
  totalPrice.value = `${qty * Number(price || 0)} ${currency || ""}`;
}
txQty.oninput = updateTotal;

/* =========================
   SAVE
========================= */
saveBtn.onclick = async () => {

  if (!selectedProduct || !selectedClient) {
    alert("Sélectionnez produit et client.");
    return;
  }

  const quantity = Number(txQty.value);

  if (quantity > selectedProduct.quantity) {
    alert("Stock insuffisant !");
    return;
  }

  const price = selectedProduct.pricing?.usd || selectedProduct.pricing?.cdf || 0;
  const currency = selectedProduct.pricing?.usd ? "USD" : "CDF";

  const data = {
    productId: selectedProduct.id,
    productName: selectedProduct.name,
    clientId: selectedClient.id,
    clientName: selectedClient.name,
    quantity,
    unitPrice: price,
    total: quantity * price,
    currency,
    status: "pending",
    updatedAt: serverTimestamp()
  };

  if (editingId) {
    await updateDoc(doc(db, "transactions", editingId), data);
    editingId = null;
  } else {
    await addDoc(collection(db, "transactions"), {
      ...data,
      invoiceNumber: "TX-" + Date.now(),
      createdAt: serverTimestamp()
    });
  }

  modal.hide();
  document.getElementById("txForm").reset();
  await loadTransactions();
};

/* =========================
   EDIT
========================= */
window.editTx = async (id) => {

  const snap = await getDoc(doc(db, "transactions", id));
  const t = snap.data();

  editingId = id;
  selectedProduct = productsCache.find(p => p.id === t.productId);
  selectedClient = clientsCache.find(c => c.id === t.clientId);

  productSearch.value = t.productName;
  partnerSearch.value = t.clientName;
  txQty.value = t.quantity;
  unitPrice.value = `${t.unitPrice} ${t.currency}`;
  updateTotal();

  modal.show();
};

/* =========================
   DELETE
========================= */
window.deleteTx = async (id) => {
  if (!confirm("Supprimer cette transaction ?")) return;
  await deleteDoc(doc(db, "transactions", id));
  await loadTransactions();
};

newTxBtn.onclick = () => modal.show();
