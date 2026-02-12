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

const productSearch = document.getElementById("productSearch");
const productResults = document.getElementById("productResults");
const partnerSearch = document.getElementById("partnerSearch");

const txQty = document.getElementById("txQty");
const unitPrice = document.getElementById("unitPrice");
const totalPrice = document.getElementById("totalPrice");

const logoutBtn = document.getElementById("logoutBtn");
const userNameEl = document.getElementById("userName");
const userFunctionEl = document.getElementById("userFunction");

/* FILTRES */
const searchInput = document.getElementById("txSearch");
const statusFilter = document.getElementById("statusFilter");
const quickDateFilter = document.getElementById("quickDateFilter");
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const resetBtn = document.getElementById("resetFilters");

/* =========================
   VARIABLES
========================= */
let productsCache = [];
let txCache = [];
let selectedProduct = null;
let editingId = null;
let currentUserData = null;

/* =========================
   AUTH
========================= */
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

/* =========================
   LOGOUT
========================= */
logoutBtn.onclick = async () => {
  await signOut(auth);
  location.replace("../login.html");
};

/* =========================
   PRELOAD PRODUCTS
========================= */
async function preloadProducts() {
  const snap = await getDocs(collection(db, "inventory"));
  productsCache = [];
  snap.forEach(d => {
    productsCache.push({ id: d.id, ...d.data() });
  });
}

/* =========================
   LOAD TRANSACTIONS
========================= */
async function loadTransactions() {

  txCache = [];
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
        <td colspan="9" class="text-center py-6 text-muted">
          Aucune transaction trouvée
        </td>
      </tr>`;
    return;
  }

  let index = 1;

  data.forEach(t => {

    const badgeClass =
      t.status === "approved" ? "success" :
      t.status === "rejected" ? "danger" :
      "warning";

    table.innerHTML += `
      <tr class="hover:bg-slate-50 transition">
        <td class="px-6 py-4 font-semibold">${index++}</td>
        <td class="px-6 py-4 font-medium">${t.invoiceNumber || "-"}</td>
        <td class="px-6 py-4">${t.createdAt?.toDate()?.toLocaleDateString() || "-"}</td>
        <td class="px-6 py-4">${t.partnerName}</td>
        <td class="px-6 py-4">${t.productName}</td>
        <td class="px-6 py-4 text-center">${t.quantity}</td>
        <td class="px-6 py-4 font-semibold">${t.total} ${t.currency}</td>
        <td class="px-6 py-4">
          <span class="badge bg-${badgeClass}">
            ${t.status}
          </span>
        </td>
        <td class="px-6 py-4 text-end">
          <div class="dropdown">
            <button class="btn btn-sm btn-light" data-bs-toggle="dropdown">
              <i class="bi bi-three-dots-vertical"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end">

              <li><a class="dropdown-item" onclick="validateTx('${t.id}')">
                <i class="bi bi-check-circle text-success me-2"></i>Valider</a></li>

              <li><a class="dropdown-item" onclick="rejectTx('${t.id}')">
                <i class="bi bi-x-circle text-danger me-2"></i>Rejeter</a></li>

              <li><a class="dropdown-item" onclick="editTx('${t.id}')">
                <i class="bi bi-pencil-square text-primary me-2"></i>Modifier</a></li>

              <li><a class="dropdown-item text-danger" onclick="deleteTx('${t.id}')">
                <i class="bi bi-trash me-2"></i>Supprimer</a></li>

            </ul>
          </div>
        </td>
      </tr>
    `;
  });
}

/* =========================
   RECHERCHE + FILTRES
========================= */
function applyFilters() {

  let filtered = [...txCache];

  const term = searchInput?.value?.toLowerCase() || "";
  const status = statusFilter?.value || "ALL";
  const quick = quickDateFilter?.value || "ALL";
  const start = startDateInput?.value;
  const end = endDateInput?.value;

  /* Recherche */
  if (term) {
    filtered = filtered.filter(t =>
      t.partnerName?.toLowerCase().includes(term) ||
      t.productName?.toLowerCase().includes(term) ||
      t.invoiceNumber?.toLowerCase().includes(term)
    );
  }

  /* Statut */
  if (status !== "ALL") {
    filtered = filtered.filter(t => t.status === status);
  }

  /* Filtres rapides date */
  if (quick !== "ALL") {

    const now = new Date();
    let limitDate = new Date();

    if (quick === "TODAY") {
      limitDate.setHours(0,0,0,0);
    }

    if (quick === "7DAYS") {
      limitDate.setDate(now.getDate() - 7);
    }

    if (quick === "30DAYS") {
      limitDate.setDate(now.getDate() - 30);
    }

    filtered = filtered.filter(t => {
      const d = t.createdAt?.toDate();
      return d && d >= limitDate;
    });
  }

  /* Plage personnalisée */
  if (start) {
    const startD = new Date(start);
    filtered = filtered.filter(t =>
      t.createdAt?.toDate() >= startD
    );
  }

  if (end) {
    const endD = new Date(end);
    endD.setHours(23,59,59,999);
    filtered = filtered.filter(t =>
      t.createdAt?.toDate() <= endD
    );
  }

  renderTable(filtered);
}

/* EVENTS FILTRES */
searchInput?.addEventListener("input", applyFilters);
statusFilter?.addEventListener("change", applyFilters);
quickDateFilter?.addEventListener("change", applyFilters);
startDateInput?.addEventListener("change", applyFilters);
endDateInput?.addEventListener("change", applyFilters);

resetBtn?.addEventListener("click", () => {
  searchInput.value = "";
  statusFilter.value = "ALL";
  quickDateFilter.value = "ALL";
  startDateInput.value = "";
  endDateInput.value = "";
  renderTable(txCache);
});

/* =========================
   VALIDATE
========================= */
window.validateTx = async (id) => {

  const snap = await getDoc(doc(db, "transactions", id));
  const t = snap.data();

  if (t.status !== "pending") return;

  await updateDoc(doc(db, "inventory", t.productId), {
    quantity: increment(-t.quantity)
  });

  await updateDoc(doc(db, "transactions", id), {
    status: "approved"
  });

  await loadTransactions();
};

/* =========================
   REJECT
========================= */
window.rejectTx = async (id) => {
  await updateDoc(doc(db, "transactions", id), {
    status: "rejected"
  });
  await loadTransactions();
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
