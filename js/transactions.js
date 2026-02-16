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

/* ---------- ERP FORM ---------- */
const productSearch = document.getElementById("productSearch");
const productResults = document.getElementById("productResults");
const partnerSearch = document.getElementById("partnerSearch");
const partnerPhone = document.getElementById("partnerPhone");
const txQty = document.getElementById("txQty");

const marketerSearch = document.getElementById("marketerSearch");
const marketerResults = document.getElementById("marketerResults");

const discountPercent = document.getElementById("discountPercent");
const stockInfo = document.getElementById("stockInfo");
const addItemBtn = document.getElementById("addItemBtn");
const itemsTable = document.getElementById("itemsTable");

const subtotalUSD = document.getElementById("subtotalUSD");
const discountAmountUSD = document.getElementById("discountAmountUSD");
const grandTotalUSD = document.getElementById("grandTotalUSD");

/* 🔥 NOUVEAU : Devise facture */
const invoiceCurrency = document.getElementById("invoiceCurrency");

/* ---------- AUTH / USER ---------- */
const logoutBtn = document.getElementById("logoutBtn");
const userNameEl = document.getElementById("userName");
const userFunctionEl = document.getElementById("userFunction");

/* ---------- FILTERS ---------- */
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

let cartItems = [];
let selectedMarketer = null;


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

    // 🔹 Gestion ERP multi-items
    const productsHTML = t.items && t.items.length
      ? t.items.map(item =>
          `<div class="text-xs">${item.productName} (${item.quantity})</div>`
        ).join("")
      : t.productName;

    const totalQuantity = t.items && t.items.length
      ? t.items.reduce((sum, i) => sum + i.quantity, 0)
      : t.quantity;

    const totalAmount = t.grandTotalUSD
      ? t.grandTotalUSD.toFixed(2)
      : t.total;

    return `
      <tr class="text-sm">
        <td class="px-6 py-4">${index + 1}</td>
        <td class="px-6 py-4 font-semibold">${t.invoiceNumber}</td>
        <td class="px-6 py-4">${created}</td>
         <td class="px-6 py-4">${t.partnerName}</td>
         <td class="px-6 py-4">
           ${t.partnerPhone || "-"}
         </td>
         <td class="px-6 py-4">
           ${productsHTML}
         </td>
        </td>

        <td class="px-6 py-4 text-center">
          ${totalQuantity}
        </td>

         <td class="px-6 py-4 font-semibold">
           ${totalAmount} ${t.invoiceCurrency || "USD"}
         </td>

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
   CALCUL
============================================================ */
async function calculateTotals() {

  const subtotal = cartItems.reduce((sum, i) => sum + i.totalUSD, 0);
  const discount = (subtotal * Number(discountPercent.value || 0)) / 100;
  const grandTotal = subtotal - discount;

  const rateSnap = await getDoc(doc(db, "exchange_rates", "current"));
  const rate = rateSnap.data()?.USD_CDF || 1;

  const currency = invoiceCurrency.value;

  const convert = (amount) => {
    if (currency === "CDF") return (amount * rate).toFixed(2);
    return amount.toFixed(2);
  };

  subtotalUSD.textContent = convert(subtotal) + " " + currency;
  discountAmountUSD.textContent = convert(discount) + " " + currency;
  grandTotalUSD.textContent = convert(grandTotal) + " " + currency;
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

        <li>
          <a class="dropdown-item" onclick="previewInvoice('${id}')">
            Prévisualiser
          </a>
        </li>

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

  if (!t || t.status !== "pending") return;

  // 🔥 Mise à jour stock pour chaque article
  if (t.items && t.items.length) {

    for (const item of t.items) {
      await updateDoc(doc(db, "inventory", item.productId), {
        quantity: increment(-item.quantity)
      });
    }

  } else {
    // fallback ancien système (sécurité)
    await updateDoc(doc(db, "inventory", t.productId), {
      quantity: increment(-t.quantity)
    });
  }

  await updateDoc(doc(db, "transactions", id), {
    status: "approved",
    updatedAt: serverTimestamp()
  });

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
    after: { status: "approved" },
    createdAt: serverTimestamp()
  });

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
  if (!t) return alert("Transaction introuvable.");

  const invoiceWindow = window.open("../partials/facture.html", "_blank");

  invoiceWindow.onload = async () => {

    const docInv = invoiceWindow.document;

    // 🔥 Récupération taux
    const rateSnap = await getDoc(doc(db, "exchange_rates", "current"));
    const rate = rateSnap.data()?.USD_CDF || 1;

    const currency = t.invoiceCurrency || "USD";

    const convert = (amount) => {
      if (currency === "CDF") return (amount * rate).toFixed(2);
      return amount.toFixed(2);
    };

    /* ==============================
       INFOS GÉNÉRALES
    ============================== */

    docInv.getElementById("invoiceNumber").textContent =
      t.invoiceNumber || "-";

    docInv.getElementById("invoiceDate").textContent =
      t.createdAt?.toDate().toLocaleDateString() || "-";

    docInv.getElementById("clientName").textContent =
      t.partnerName || "-";

    // 🔥 Assistant de vente
    const assistantEl = docInv.getElementById("assistantName");
    if (assistantEl) {
      assistantEl.textContent = t.marketer?.name || "-";
    }

    /* ==============================
       PRODUITS
    ============================== */

    const itemsBody = docInv.getElementById("itemsBody");
    itemsBody.innerHTML = "";

    if (t.items && Array.isArray(t.items) && t.items.length > 0) {

      t.items.forEach((item, index) => {

        itemsBody.innerHTML += `
          <tr>
            <td>${index + 1}</td>
            <td>${item.productName || "-"}</td>
            <td>${item.quantity || 0}</td>
            <td>${convert(item.unitPriceUSD)} ${currency}</td>
            <td>${convert(item.totalUSD)} ${currency}</td>
          </tr>
        `;
      });

    } else {

      const unit = Number(t.unitPrice || 0);
      const total = Number(t.total || 0);

      itemsBody.innerHTML = `
        <tr>
          <td>1</td>
          <td>${t.productName || "-"}</td>
          <td>${t.quantity || 0}</td>
          <td>${convert(unit)} ${currency}</td>
          <td>${convert(total)} ${currency}</td>
        </tr>
      `;
    }

    /* ==============================
       CALCULS
    ============================== */

    const subtotal = Number(t.subtotalUSD || t.total || 0);
    const discountPercentValue = Number(t.discountPercent || 0);
    const discountAmount = Number(t.discountAmountUSD || 0);

    const afterDiscount = subtotal - discountAmount;
    const TVA_RATE = 0.16;
    const tvaAmount = afterDiscount * TVA_RATE;
    const grandTotal =
      Number(t.grandTotalUSD) || (afterDiscount + tvaAmount);

    /* ==============================
       INJECTION TOTALS
    ============================== */

    docInv.getElementById("subtotalAmount").textContent =
      convert(subtotal) + " " + currency;

    docInv.getElementById("discountPercentDisplay").textContent =
      discountPercentValue;

    docInv.getElementById("discountAmount").textContent =
      convert(discountAmount) + " " + currency;

    docInv.getElementById("tvaAmount").textContent =
      convert(tvaAmount) + " " + currency;

    docInv.getElementById("grandTotal").textContent =
      convert(grandTotal) + " " + currency;
  };
};

/*ajout*/

/*2*/
productSearch.oninput = () => {

  const term = productSearch.value.toLowerCase();
  productResults.innerHTML = "";

  if (!term) return;

  productsCache
    .filter(p => p.name.toLowerCase().includes(term))
    .forEach(p => {

      const btn = document.createElement("button");
      btn.className = "list-group-item list-group-item-action";
      btn.textContent = p.name;

      btn.onclick = () => {

        selectedProduct = p;
        productSearch.value = p.name;
        productResults.innerHTML = "";

        stockInfo.value = p.quantity + " disponible";
      };

      productResults.appendChild(btn);
    });
};
/*AJOUT PRODUIT AU PANIER*/
addItemBtn.onclick = async () => {

  if (!selectedProduct) return alert("Choisir un produit.");
  if (!txQty.value) return alert("Entrer quantité.");

  const quantity = Number(txQty.value);

  if (quantity > selectedProduct.quantity)
    return alert("Stock insuffisant.");

  let unitPriceUSD = 0;

  if (selectedProduct.pricing?.usd) {
    unitPriceUSD = selectedProduct.pricing.usd;
  } else if (selectedProduct.pricing?.cdf) {

    const rateSnap = await getDoc(doc(db, "exchange_rates", "current"));
    const rate = rateSnap.data()?.USD_CDF;

    if (!rate) return alert("Taux USD introuvable.");

    unitPriceUSD = selectedProduct.pricing.cdf / rate;
  }

  const totalUSD = quantity * unitPriceUSD;

  cartItems.push({
    productId: selectedProduct.id,
    productName: selectedProduct.name,
    quantity,
    unitPriceUSD,
    totalUSD
  });

  renderCart();
  resetProductFields();
};

/*RENDER PANIER*/
function renderCart() {

  itemsTable.innerHTML = "";

  cartItems.forEach((item, index) => {

    itemsTable.innerHTML += `
      <tr>
        <td>${item.productName}</td>
        <td>${item.quantity}</td>
        <td>${item.unitPriceUSD.toFixed(2)}</td>
        <td>${item.totalUSD.toFixed(2)}</td>
        <td>
          <button class="btn btn-sm btn-danger"
                  onclick="removeItem(${index})">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `;
  });

  calculateTotals();
}
/*SUPPRIMER ITEM*/
window.removeItem = (index) => {
  cartItems.splice(index, 1);
  renderCart();
};
/*CALCUL TOTALS */

/* MARKETEURS AUTOCOMPLETE*/
marketerSearch.oninput = async () => {

  const term = marketerSearch.value.toLowerCase();
  marketerResults.innerHTML = "";

  if (!term) return;

  const snap = await getDocs(collection(db, "users"));

  snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(u => u.role === "operateur"
      && u.name.toLowerCase().includes(term))
    .forEach(u => {

      const btn = document.createElement("button");
      btn.className = "list-group-item list-group-item-action";
      btn.textContent = u.name;

      btn.onclick = () => {
        selectedMarketer = {
          uid: u.id,
          name: u.name
        };
        marketerSearch.value = u.name;
        marketerResults.innerHTML = "";
      };

      marketerResults.appendChild(btn);
    });
};
/*saveBtn ERP*/
saveBtn.onclick = async () => {

  if (!partnerSearch.value) return alert("Client requis.");
  if (!cartItems.length) return alert("Ajouter au moins un produit.");

  const subtotal = cartItems.reduce((sum, i) => sum + i.totalUSD, 0);
  const discount = (subtotal * Number(discountPercent.value || 0)) / 100;
  const grandTotal = subtotal - discount;

   const txData = {
  invoiceNumber: await generateInvoiceNumber(),
  partnerName: partnerSearch.value,
  partnerPhone: partnerPhone.value || "",
  marketer: selectedMarketer || null,
  invoiceCurrency: invoiceCurrency.value,
    items: cartItems,
    subtotalUSD: subtotal,
    discountPercent: Number(discountPercent.value || 0),
    discountAmountUSD: discount,
    grandTotalUSD: grandTotal,
    productName: cartItems[0].productName,
    quantity: cartItems.reduce((s,i)=>s+i.quantity,0),
    total: grandTotal,
    currency: "USD",
    status: "pending",
    createdAt: serverTimestamp()
  };

  await addDoc(collection(db, "transactions"), txData);

  modal.hide();
  resetModal();
  await loadTransactions();
};


/* RESET MODAL*/
function resetProductFields() {
  productSearch.value = "";
  txQty.value = "";
  stockInfo.value = "";
  selectedProduct = null;
}

function resetModal() {
  cartItems = [];
  selectedMarketer = null;
   partnerSearch.value = "";
   partnerPhone.value = "";
   marketerSearch.value = "";
  discountPercent.value = 0;
  itemsTable.innerHTML = "";
  calculateTotals();
}
window.previewInvoice = async (id) => {

  const snap = await getDoc(doc(db, "transactions", id));
  const t = snap.data();
  if (!t) return alert("Transaction introuvable.");

  const previewWindow = window.open("", "_blank");

  const rateSnap = await getDoc(doc(db, "exchange_rates", "current"));
  const rate = rateSnap.data()?.USD_CDF || 1;

  const currency = t.invoiceCurrency || "USD";

  const convert = (amount) => {
    if (currency === "CDF") return (amount * rate).toFixed(2);
    return amount.toFixed(2);
  };

  previewWindow.document.write(`
    <html>
    <head>
      <title>Prévisualisation Facture</title>
      <style>
        body{font-family:Arial;padding:30px}
        table{width:100%;border-collapse:collapse;margin-top:20px}
        th,td{border:1px solid #ddd;padding:8px;text-align:left}
        th{background:#f4f4f4}
      </style>
    </head>
    <body>

      <h2>Facture ${t.invoiceNumber}</h2>
      <p><strong>Date :</strong> ${t.createdAt?.toDate().toLocaleDateString()}</p>
      <p><strong>Client :</strong> ${t.partnerName}</p>
      <p><strong>Assistant de vente :</strong> ${t.marketer?.name || "-"}</p>
      <p><strong>Devise :</strong> ${currency}</p>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Produit</th>
            <th>Qté</th>
            <th>PU</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${
            t.items.map((item, index)=>`
              <tr>
                <td>${index+1}</td>
                <td>${item.productName}</td>
                <td>${item.quantity}</td>
                <td>${convert(item.unitPriceUSD)} ${currency}</td>
                <td>${convert(item.totalUSD)} ${currency}</td>
              </tr>
            `).join("")
          }
        </tbody>
      </table>

      <h3 style="margin-top:20px">
        Total : ${convert(t.grandTotalUSD)} ${currency}
      </h3>

    </body>
    </html>
  `);

  previewWindow.document.close();
};


