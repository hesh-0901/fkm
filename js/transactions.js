/* ============================================================
   FKM ENERGY - TRANSACTIONS MODULE
   VERSION ERP FUSION (STABLE + AUDIT + USD)
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
   AUTH
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
   PRELOAD PRODUCTS
============================================================ */

async function preloadProducts() {
  const snap = await getDocs(collection(db, "inventory"));
  productsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/* ============================================================
   PRODUCT AUTOCOMPLETE
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

        if (p.quantity === 0) {
          alert("Stock épuisé.");
          return;
        }

        selectedProduct = p;
        productSearch.value = p.name;
        productResults.innerHTML = "";

        let price = p.pricing?.usd || p.pricing?.cdf || 0;
        let currency = p.pricing?.usd ? "USD" : "CDF";

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
   GENERATE ERP INVOICE NUMBER
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
   SAVE / UPDATE TRANSACTION (ERP SAFE)
============================================================ */

saveBtn.onclick = async () => {

  if (!selectedProduct || !txQty.value || !partnerSearch.value) {
    alert("Veuillez remplir tous les champs.");
    return;
  }

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

  if (selectedProduct.pricing?.usd) {
    unitPriceUSD = selectedProduct.pricing.usd;
  } else if (selectedProduct.pricing?.cdf) {

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
    unitPriceUSD,
    grandTotalUSD,
    currency: "USD",
    partnerName: partnerSearch.value,
    updatedAt: serverTimestamp()
  };

  if (editingId) {

    const beforeSnap = await getDoc(doc(db, "transactions", editingId));
    const beforeData = beforeSnap.data();

    await updateDoc(doc(db, "transactions", editingId), data);

    await addDoc(collection(db, "audit_logs"), {
      action: "UPDATE_TRANSACTION",
      collection: "transactions",
      documentId: editingId,
      performedBy: currentUserData,
      before: beforeData,
      after: data,
      createdAt: serverTimestamp()
    });

    editingId = null;

  } else {

    const invoiceNumber = await generateInvoiceNumber();

    const docRef = await addDoc(collection(db, "transactions"), {
      ...data,
      invoiceNumber,
      status: "pending",
      createdAt: serverTimestamp()
    });

    await addDoc(collection(db, "audit_logs"), {
      action: "CREATE_TRANSACTION",
      collection: "transactions",
      documentId: docRef.id,
      performedBy: currentUserData,
      after: data,
      createdAt: serverTimestamp()
    });
  }

  modal.hide();
  document.getElementById("txForm").reset();
  selectedProduct = null;

  await loadTransactions();
};

/* ============================================================
   LOAD TRANSACTIONS (UNCHANGED ENGINE)
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
