import { auth, db } from "./firebase.config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ==========================================================
   DOM
========================================================== */
const totalProductsEl = document.getElementById("totalProducts");
const lowStockEl = document.getElementById("lowStock");
const pendingTxEl = document.getElementById("pendingTx");
const approvedTxEl = document.getElementById("approvedTx");

const alertsList = document.getElementById("alertsList");

const userNameEl = document.getElementById("userName");
const userRoleEl = document.getElementById("userRole");
const logoutBtn = document.getElementById("logoutBtn");

/* ==========================================================
   AUTH
========================================================== */
onAuthStateChanged(auth, async (user) => {
  if (!user) return location.replace("../login.html");

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return;

  const data = snap.data();

  userNameEl.textContent = data.name || "—";
  userRoleEl.textContent = data.fonction || data.role || "";

  await loadDashboard();
});

/* LOGOUT */
logoutBtn.onclick = async () => {
  await signOut(auth);
  location.replace("../login.html");
};

/* ==========================================================
   LOAD DASHBOARD
========================================================== */
async function loadDashboard() {

  const inventorySnap = await getDocs(collection(db, "inventory"));
  const txSnap = await getDocs(collection(db, "transactions"));

  let totalProducts = 0;
  let lowStock = 0;

  let pending = 0;
  let approved = 0;
  let rejected = 0;

  let topProducts = [];

  /* INVENTAIRE */
  inventorySnap.forEach(d => {
    const p = d.data();
    totalProducts++;

    if (p.quantity <= p.minQuantity) lowStock++;

    topProducts.push({
      name: p.name,
      quantity: p.quantity
    });
  });

  /* TRANSACTIONS */
  txSnap.forEach(d => {
    const t = d.data();

    if (t.status === "pending") pending++;
    if (t.status === "approved") approved++;
    if (t.status === "rejected") rejected++;
  });

  /* UPDATE KPI */
  animateValue(totalProductsEl, totalProducts);
  animateValue(lowStockEl, lowStock);
  animateValue(pendingTxEl, pending);
  animateValue(approvedTxEl, approved);

  /* GRAPHES */
  renderTxChart(pending, approved, rejected);
  renderStockChart(topProducts.sort((a,b)=>b.quantity-a.quantity).slice(0,5));

  /* ALERTES */
  renderAlerts(lowStock, pending, rejected);
}

/* ==========================================================
   ANIMATION KPI
========================================================== */
function animateValue(element, end) {
  let start = 0;
  const duration = 800;
  const stepTime = Math.abs(Math.floor(duration / end || 1));

  const timer = setInterval(() => {
    start += 1;
    element.textContent = start;
    if (start >= end) clearInterval(timer);
  }, stepTime);
}

/* ==========================================================
   CHART STATUT TRANSACTIONS
========================================================== */
function renderTxChart(pending, approved, rejected) {

  const options = {
    series: [approved, pending, rejected],
    chart: {
      type: 'donut',
      height: 300
    },
    labels: ['Approuvées', 'En attente', 'Rejetées'],
    colors: ['#2E7D32', '#D4A017', '#DC2626'],
    legend: {
      position: 'bottom'
    },
    dataLabels: {
      enabled: true
    }
  };

  new ApexCharts(document.querySelector("#txChart"), options).render();
}

/* ==========================================================
   CHART STOCK
========================================================== */
function renderStockChart(products) {

  const options = {
    series: [{
      name: 'Stock',
      data: products.map(p => p.quantity)
    }],
    chart: {
      type: 'bar',
      height: 300
    },
    colors: ['#0B5C6B'],
    xaxis: {
      categories: products.map(p => p.name)
    },
    plotOptions: {
      bar: {
        borderRadius: 6,
        horizontal: false
      }
    }
  };

  new ApexCharts(document.querySelector("#stockChart"), options).render();
}

/* ==========================================================
   ALERTES INTELLIGENTES
========================================================== */
function renderAlerts(lowStock, pending, rejected) {

  alertsList.innerHTML = "";

  if (lowStock > 0) {
    alertsList.innerHTML += `
      <div class="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3">
        <i class="bi bi-exclamation-triangle-fill text-red-600 text-xl"></i>
        <div>
          <p class="font-medium text-red-700">Stock critique détecté</p>
          <p class="text-red-600 text-xs">${lowStock} produit(s) sous le seuil minimum.</p>
        </div>
      </div>
    `;
  }

  if (pending > 0) {
    alertsList.innerHTML += `
      <div class="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
        <i class="bi bi-hourglass-split text-amber-600 text-xl"></i>
        <div>
          <p class="font-medium text-amber-700">Transactions en attente</p>
          <p class="text-amber-600 text-xs">${pending} transaction(s) nécessitent validation.</p>
        </div>
      </div>
    `;
  }

  if (rejected > 0) {
    alertsList.innerHTML += `
      <div class="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3">
        <i class="bi bi-x-circle-fill text-red-600 text-xl"></i>
        <div>
          <p class="font-medium text-red-700">Transactions rejetées</p>
          <p class="text-red-600 text-xs">${rejected} transaction(s) rejetées récemment.</p>
        </div>
      </div>
    `;
  }

  if (lowStock === 0 && pending === 0 && rejected === 0) {
    alertsList.innerHTML = `
      <div class="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
        <i class="bi bi-check-circle-fill text-emerald-600 text-xl"></i>
        <div>
          <p class="font-medium text-emerald-700">Système stable</p>
          <p class="text-emerald-600 text-xs">Aucune alerte pour le moment.</p>
        </div>
      </div>
    `;
  }
}
