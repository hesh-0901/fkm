/* ============================================================
   FKM ENERGY - TRANSACTIONS MODULE
   Version optimisée & commentée
============================================================ */

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

/* ============================================================
   DOM REFERENCES
============================================================ */

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

/* ============================================================
   STATE VARIABLES
============================================================ */

let productsCache = [];
let transactionsCache = [];
let selectedProduct = null;
let editingId = null;
let currentUserData = null;

/* ============================================================
   AUTHENTICATION HANDLING
============================================================ */

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

/* ============================================================
   LOGOUT
============================================================ */

logoutBtn.onclick = async () => {
  await signOut(auth);
  location.replace("../login.html");
};

/* ============================================================
   LOAD INVENTORY PRODUCTS (CACHED)
============================================================ */

async function preloadProducts() {
  const snap = await getDocs(collection(db, "inventory"));
  productsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/* ============================================================
   PRODUCT SEARCH AUTOCOMPLETE
============================================================ */

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

/* ============================================================
   TOTAL CALCULATION
============================================================ */

function updateTotal() {
  const qty = Number(txQty.value) || 0;
  const [price, currency] = unitPrice.value.split(" ");
  totalPrice.value = `${qty * Number(price || 0)} ${currency || ""}`;
}

txQty.oninput = updateTotal;

/* ============================================================
   GENERATE UNIQUE INVOICE NUMBER
============================================================ */

async function generateInvoiceNumber() {

  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();

  const startOfMonth = new Date(year, now.getMonth(), 1);
  const endOfMonth = new Date(year, now.getMonth() + 1, 1);

  const q = query(
    collection(db, "transactions"),
    orderBy("createdAt", "asc")
  );

  const snap = await getDocs(q);

  const monthlyInvoices = snap.docs.filter(d => {
    const data = d.data();
    if (!data.createdAt) return false;
    const date = data.createdAt.toDate();
    return date >= startOfMonth && date < endOfMonth;
  });

  const sequence = String(monthlyInvoices.length + 1).padStart(2, "0");

  return `IN-FKM-${day}${month}${sequence}`;
}


/* ============================================================
   SAVE / UPDATE TRANSACTION
============================================================ */
saveBtn.onclick = async () => {

  if (!selectedProduct || !txQty.value || !partnerSearch.value) {
    alert("Veuillez remplir tous les champs.");
    return;
  }

  // 🔒 Sécurisation stock
  if (selectedProduct.quantity === 0) {
    alert("Stock épuisé.");
    return;
  }

  const quantity = Number(txQty.value);

  if (quantity > selectedProduct.quantity) {
    alert("Stock insuffisant.");
    return;
  }

  let unitPriceUSD = 0;

  // 💵 Si prix déjà en USD
  if (selectedProduct.pricing?.usd) {
    unitPriceUSD = selectedProduct.pricing.usd;
  }

  // 💱 Si prix en CDF → conversion USD
  else if (selectedProduct.pricing?.cdf) {

    const rateSnap = await getDoc(doc(db, "exchange_rates", "current"));
    const rate = rateSnap.data()?.USD_CDF;

    if (!rate) {
      alert("Taux USD_CDF introuvable.");
      return;
    }

    unitPriceUSD = selectedProduct.pricing.cdf / rate;
  }

  const grandTotalUSD = quantity * unitPriceUSD;

  const data = {
    productId: selectedProduct.id,
    productName: selectedProduct.name,
    quantity,
    unitPrice: unitPriceUSD,
    total: grandTotalUSD,
    currency: "USD",
    partnerName: partnerSearch.value,
    updatedAt: serverTimestamp()
  };

  if (editingId) {

    await updateDoc(doc(db, "transactions", editingId), data);
    editingId = null;

  } else {

    await addDoc(collection(db, "transactions"), {
      ...data,
      invoiceNumber: await generateInvoiceNumber(),
      status: "pending",
      createdAt: serverTimestamp()
    });
  }

  modal.hide();
  document.getElementById("txForm").reset();
  selectedProduct = null;

  await loadTransactions();
};

/* ============================================================
   LOAD TRANSACTIONS (CACHED)
============================================================ */

async function loadTransactions() {

  const q = query(
    collection(db, "transactions"),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);

  transactionsCache = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  applyFilters();
}

/* ============================================================
   FILTER ENGINE
============================================================ */

function applyFilters() {

  let filtered = [...transactionsCache];

  const search = txSearch.value.toLowerCase();
  const status = statusFilter.value;
  const quick = quickDateFilter.value;
  const start = startDate.value;
  const end = endDate.value;

  /* ---------- Search ---------- */
  if (search) {
    filtered = filtered.filter(t =>
      t.invoiceNumber?.toLowerCase().includes(search) ||
      t.partnerName?.toLowerCase().includes(search) ||
      t.productName?.toLowerCase().includes(search)
    );
  }

  /* ---------- Status ---------- */
  if (status !== "ALL") {
    filtered = filtered.filter(t =>
      t.status?.toUpperCase() === status
    );
  }

  /* ---------- Quick Date Filters ---------- */
  if (quick !== "ALL") {

    const now = new Date();

    filtered = filtered.filter(t => {

      if (!t.createdAt) return false;
      const date = t.createdAt.toDate();

      if (quick === "TODAY")
        return date.toDateString() === now.toDateString();

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

  /* ---------- Custom Range ---------- */
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

/* ============================================================
   TABLE RENDERING (Optimized)
============================================================ */

function renderTable(data) {

  if (!data.length) {
    table.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-6 text-muted">
          Aucune transaction trouvée
        </td>
      </tr>
    `;
    return;
  }

  table.innerHTML = data.map((t, index) => {

    const created = t.createdAt?.toDate().toLocaleDateString() || "-";

    return `
      <tr class="text-sm">
        <td class="px-6 py-4">${index + 1}</td>
        <td class="px-6 py-4 font-semibold">${t.invoiceNumber}</td>
        <td class="px-6 py-4">${created}</td>
        <td class="px-6 py-4">${t.partnerName}</td>
        <td class="px-6 py-4">${t.productName}</td>
        <td class="px-6 py-4 text-center">${t.quantity}</td>
        <td class="px-6 py-4 font-semibold">${t.total} ${t.currency}</td>
        <td class="px-6 py-4">
          <span class="badge bg-${
            t.status === "approved" ? "success" :
            t.status === "rejected" ? "danger" :
            "warning"
          }">${t.status}</span>
        </td>
        <td class="px-6 py-4 text-end">
          <div class="flex items-center justify-end gap-2">

            ${t.status === "approved" ? `
              <button 
                onclick="printInvoice('${t.id}')"
                title="Imprimer la facture"
                class="group inline-flex items-center justify-center
                       w-10 h-10 rounded-xl
                       bg-primary/5 border border-primary/20
                       text-primary
                       hover:bg-primary hover:text-white
                       transition-all duration-300
                       shadow-sm hover:shadow-md active:scale-95">
                <i class="bi bi-receipt text-base transition-transform duration-300 group-hover:scale-110"></i>
              </button>
            ` : ""}

            ${renderActions(t.id, t)}

          </div>
        </td>
      </tr>
    `;
  }).join("");
}

/* ============================================================
   ACTION DROPDOWN
============================================================ */

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
          Approuver
        </a></li>` : ""}

        ${canValidate && t.status === "pending" ? `
        <li><a class="dropdown-item" onclick="rejectTx('${id}')">
          Rejeter
        </a></li>` : ""}

        ${t.status !== "approved" ? `
        <li><a class="dropdown-item" onclick="editTx('${id}')">
          Modifier
        </a></li>` : ""}

        <li><a class="dropdown-item text-danger" onclick="deleteTx('${id}')">
          Supprimer
        </a></li>

      </ul>
    </div>
  `;
}

/* ============================================================
   VALIDATE / REJECT / EDIT / DELETE
============================================================ */

window.validateTx = async (id) => {

  if (!["admin","directeur"].includes(currentUserData.role)) return;

  const snap = await getDoc(doc(db, "transactions", id));
  const t = snap.data();

  if (t.status !== "pending") return;

  // Décrément stock
  await updateDoc(doc(db, "inventory", t.productId), {
    quantity: increment(-t.quantity)
  });

  await updateDoc(doc(db, "transactions", id), {
    status: "approved",
    updatedAt: serverTimestamp()
  });

  // AUDIT
  window.validateTx = async (id) => {

  if (!["admin","directeur"].includes(currentUserData.role)) return;

  const snap = await getDoc(doc(db, "transactions", id));
  const t = snap.data();

  if (t.status !== "pending") return;

  // 🔽 Décrément stock
  await updateDoc(doc(db, "inventory", t.productId), {
    quantity: increment(-t.quantity)
  });

  // 🔽 Mise à jour statut
  await updateDoc(doc(db, "transactions", id), {
    status: "approved",
    updatedAt: serverTimestamp()
  });

  // 🔽 AUDIT LOG
  await addDoc(collection(db, "audit_logs"), {
    action: "APPROVE_TRANSACTION",
    collection: "transactions",
    documentId: id,
    performedBy: {
      uid: auth.currentUser.uid,
      name: currentUserData.name,
      role: currentUserData.role,
      fonction: currentUserData.fonction
    },
    after: {
      status: "approved"
    },
    createdAt: serverTimestamp()
  });

  await loadTransactions();
};


  await loadTransactions();
};

window.rejectTx = async (id) => {

  if (!["admin","directeur"].includes(currentUserData.role)) return;

  await updateDoc(doc(db, "transactions", id), {
    status: "rejected",
    updatedAt: serverTimestamp()
  });

  await addDoc(collection(db, "audit_logs"), {
    action: "REJECT_TRANSACTION",
    collection: "transactions",
    documentId: id,
    performedBy: {
      uid: auth.currentUser.uid,
      name: currentUserData.name,
      role: currentUserData.role,
      fonction: currentUserData.fonction
    },
    after: { status: "rejected" },
    createdAt: serverTimestamp()
  });

  await loadTransactions();
};

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

window.deleteTx = async (id) => {

  if (!confirm("Supprimer cette transaction ?")) return;

  const snap = await getDoc(doc(db, "transactions", id));
  const beforeData = snap.data();

  await deleteDoc(doc(db, "transactions", id));

  await addDoc(collection(db, "audit_logs"), {
    action: "DELETE_TRANSACTION",
    collection: "transactions",
    documentId: id,
    performedBy: {
      uid: auth.currentUser.uid,
      name: currentUserData.name,
      role: currentUserData.role,
      fonction: currentUserData.fonction
    },
    before: beforeData,
    createdAt: serverTimestamp()
  });

  await loadTransactions();
};

/* ============================================================
   FILTER EVENTS
============================================================ */

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
/* ============================================================
  PRINT INVOICE
============================================================ */
window.printInvoice = async (id) => {

  const snap = await getDoc(doc(db, "transactions", id));
  const t = snap.data();
  if (!t) return;

  const invoiceWindow = window.open("../partials/facture.html", "_blank");

  const interval = setInterval(() => {

    if (invoiceWindow.document.readyState === "complete") {

      clearInterval(interval);

      invoiceWindow.document.getElementById("invoiceNumber").textContent = t.invoiceNumber;
      invoiceWindow.document.getElementById("invoiceDate").textContent =
        t.createdAt?.toDate().toLocaleDateString() || "-";

      invoiceWindow.document.getElementById("clientName").textContent = t.partnerName;
      invoiceWindow.document.getElementById("productName").textContent = t.productName;
      invoiceWindow.document.getElementById("quantity").textContent = t.quantity;
      invoiceWindow.document.getElementById("unitPrice").textContent =
        t.unitPrice + " " + t.currency;

      invoiceWindow.document.getElementById("totalAmount").textContent =
        t.total + " " + t.currency;

      invoiceWindow.document.getElementById("grandTotal").textContent =
        t.total + " " + t.currency;
    }

  }, 50);
};
