/* ==========================================================
   IMPORTS FIREBASE
========================================================== */
import { auth, db } from "./firebase.config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


/* ==========================================================
   DOM
========================================================== */
const userNameEl = document.getElementById("userName");
const userRoleEl = document.getElementById("userRole");
const logoutBtn = document.getElementById("logoutBtn");

const kpiProducts = document.getElementById("kpiProducts");
const kpiLowStock = document.getElementById("kpiLowStock");
const kpiPending = document.getElementById("kpiPending");
const kpiApproved = document.getElementById("kpiApproved");

const alertsList = document.getElementById("alertsList");

let currentUser = null;


/* ==========================================================
   AUTH
========================================================== */
onAuthStateChanged(auth, async (user) => {

  if (!user) {
    location.replace("../login.html");
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return;

  currentUser = snap.data();

  userNameEl.textContent = currentUser.name || "—";
  userRoleEl.textContent = currentUser.fonction || currentUser.role;

  loadDashboard();
});


/* ==========================================================
   LOGOUT
========================================================== */
logoutBtn.onclick = async () => {
  await signOut(auth);
  location.replace("../login.html");
};


/* ==========================================================
   LOAD DASHBOARD DATA
========================================================== */
async function loadDashboard() {

  const inventorySnap = await getDocs(collection(db, "inventory"));
  const txSnap = await getDocs(collection(db, "transactions"));

  let totalProducts = 0;
  let lowStock = 0;

  let pending = 0;
  let approved = 0;
  let rejected = 0;

  let stockData = [];
  let alerts = [];

  /* ===== INVENTORY ===== */
  inventorySnap.forEach(d => {
    const p = d.data();
    totalProducts++;

    stockData.push({
      name: p.name,
      qty: p.quantity
    });

    if (p.quantity <= p.minQuantity) {
      lowStock++;
      alerts.push(`⚠️ Stock faible : ${p.name}`);
    }
  });

  /* ===== TRANSACTIONS ===== */
  txSnap.forEach(d => {
    const t = d.data();

    if (t.status === "pending") pending++;
    if (t.status === "approved") approved++;
    if (t.status === "rejected") rejected++;

    if (t.status === "pending") {
      alerts.push(`🕒 Transaction en attente : ${t.invoiceNumber}`);
    }
  });

  /* ===== KPI UPDATE ===== */
  kpiProducts.textContent = totalProducts;
  kpiLowStock.textContent = lowStock;
  kpiPending.textContent = pending;
  kpiApproved.textContent = approved;

  /* ===== ALERTS RENDER ===== */
  renderAlerts(alerts);

  /* ===== CHARTS ===== */
  renderStatusChart(pending, approved, rejected);
  renderStockChart(stockData.slice(0, 5));
}


/* ==========================================================
   ALERTS
========================================================== */
function renderAlerts(alerts) {

  alertsList.innerHTML = "";

  if (alerts.length === 0) {
    alertsList.innerHTML = `
      <li class="text-muted">
        <i class="bi bi-check-circle text-success me-2"></i>
        Aucun problème détecté
      </li>`;
    return;
  }

  alerts.forEach(a => {
    alertsList.innerHTML += `
      <li class="flex items-center gap-2">
        ${a}
      </li>
    `;
  });
}


/* ==========================================================
   CHART 1 - STATUS DONUT
========================================================== */
function renderStatusChart(pending, approved, rejected) {

  const options = {
    chart: {
      type: 'donut',
      height: 300
    },
    series: [pending, approved, rejected],
    labels: ["Pending", "Approved", "Rejected"],
    colors: ["#D4A017", "#2E7D32", "#DC2626"],
    legend: {
      position: "bottom"
    }
  };

  const chart = new ApexCharts(
    document.querySelector("#chartStatus"),
    options
  );

  chart.render();
}


/* ==========================================================
   CHART 2 - STOCK BAR
========================================================== */
function renderStockChart(stockData) {

  const options = {
    chart: {
      type: 'bar',
      height: 300
    },
    series: [{
      name: "Stock",
      data: stockData.map(s => s.qty)
    }],
    xaxis: {
      categories: stockData.map(s => s.name)
    },
    colors: ["#0B5C6B"]
  };

  const chart = new ApexCharts(
    document.querySelector("#chartStock"),
    options
  );

  chart.render();
}
