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

/* ==========================================================
   DOM
========================================================== */

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
const userRoleEl = document.getElementById("userRole");

/* ==========================================================
   VARIABLES
========================================================== */

let productsCache = [];
let selectedProduct = null;
let editingId = null;
let currentUserData = null;

/* ==========================================================
   AUTH
========================================================== */

onAuthStateChanged(auth, async (user) => {

  if (!user) return location.replace("../login.html");

  const userSnap = await getDoc(doc(db, "users", user.uid));
  currentUserData = userSnap.data();

  /* HEADER USER */
  userNameEl.textContent = currentUserData.name || "—";
  userRoleEl.textContent = currentUserData.role || "—";

  newTxBtn.classList.remove("d-none");

  await preloadData();
  await loadTransactions();
});

/* LOGOUT */

logoutBtn.onclick = async () => {
  await signOut(auth);
  location.replace("../login.html");
};

/* ==========================================================
   PRELOAD PRODUCTS
========================================================== */

async function preloadData() {

  const pSnap = await getDocs(collection(db, "inventory"));

  productsCache = [];

  pSnap.forEach(d => {
    productsCache.push({ id: d.id, ...d.data() });
  });
}

/* ==========================================================
   PRODUCT SEARCH
========================================================== */

productSearch.oninput = () => {

  const term = productSearch.value.toLowerCase();
  productResults.innerHTML = "";

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

/* ==========================================================
   TOTAL CALCULATION
========================================================== */

function updateTotal() {

  const qty = Number(txQty.value) || 0;
  const [priceRaw, currency] = unitPrice.value.split(" ");

  const total = qty * Number(priceRaw || 0);

  totalPrice.value = `${total} ${currency || ""}`;
}

txQty.oninput = updateTotal;

/* ==========================================================
   SAVE (CREATE / EDIT)
========================================================== */

saveBtn.onclick = async () => {

  if (!selectedProduct) return;

  const quantity = Number(txQty.value);
  const price = selectedProduct.pricing?.usd || selectedProduct.pricing?.cdf || 0;
  const currency = selectedProduct.pricing?.usd ? "USD" : "CDF";
  const total = quantity * price;

  const data = {
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

    await updateDoc(doc(db, "transactions", editingId), data);
    editingId = null;

  } else {

    await addDoc(collection(db, "transactions"), {
      ...data,
      invoiceNumber: "FACTURE-A-PART",
      status: "pending",
      createdAt: serverTimestamp()
    });
  }

  modal.hide();
  document.getElementById("txForm").reset();
  selectedProduct = null;

  loadTransactions();
};

/* ==========================================================
   LOAD TABLE
========================================================== */

async function loadTransactions() {

  table.innerHTML = "";

  const snap = await getDocs(collection(db, "transactions"));

  snap.forEach(d => {

    const t = d.data();

    table.innerHTML += `
      <tr class="text-sm">
        <td class="px-3 py-2 fw-semibold">${t.invoiceNumber}</td>
        <td class="px-3 py-2">${t.createdAt?.toDate().toLocaleDateString() || "-"}</td>
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
          <div class="dropdown">
            <button class="btn btn-sm btn-light"
                    data-bs-toggle="dropdown">
              <i class="bi bi-three-dots-vertical"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li><a class="dropdown-item" onclick="validateTx('${d.id}')">
                <i class="bi bi-check-circle text-success"></i>
              </a></li>
              <li><a class="dropdown-item" onclick="rejectTx('${d.id}')">
                <i class="bi bi-x-circle text-danger"></i>
              </a></li>
              <li><a class="dropdown-item" onclick="editTx('${d.id}')">
                <i class="bi bi-pencil-square text-primary"></i>
              </a></li>
              <li><a class="dropdown-item" onclick="printInvoice('${d.id}')">
                <i class="bi bi-printer text-secondary"></i>
              </a></li>
              <li><a class="dropdown-item text-danger" onclick="deleteTx('${d.id}')">
                <i class="bi bi-trash"></i>
              </a></li>
            </ul>
          </div>
        </td>
      </tr>
    `;
  });
}
