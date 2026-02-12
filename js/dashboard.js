import { auth, db } from "./firebase.config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ==============================
   DOM
============================== */
const userNameEl = document.getElementById("userName");
const userFunctionEl = document.getElementById("userFunction");
const logoutBtn = document.getElementById("logoutBtn");

const totalRevenueEl = document.getElementById("totalRevenue");
const pendingCountEl = document.getElementById("pendingCount");
const lowStockCountEl = document.getElementById("lowStockCount");
const totalProductsEl = document.getElementById("totalProducts");

const alertsList = document.getElementById("alertsList");

/* ==============================
   AUTH
============================== */
onAuthStateChanged(auth, async (user) => {

  if (!user) {
    location.replace("../login.html");
    return;
  }

  const userSnap = await getDoc(doc(db, "users", user.uid));
  const userData = userSnap.data();

  userNameEl.textContent = userData.name || "—";
  userFunctionEl.textContent = userData.fonction || "—";

  await loadDashboard();
});

/* ==============================
   LOGOUT
============================== */
logoutBtn.onclick = async () => {
  await signOut(auth);
  location.replace("../login.html");
};

/* ==============================
   LOAD DASHBOARD DATA
============================== */
async function loadDashboard() {

  const [txSnap, invSnap] = await Promise.all([
    getDocs(collection(db, "transactions")),
    getDocs(collection(db, "inventory"))
  ]);

  /* ==============================
     VARIABLES AGREGATION
  ============================== */
  let totalRevenue = 0;
  let pendingCount = 0;
  let approvedCount = 0;
  let rejectedCount = 0;

  let monthlyRevenue = {};
  let lowStockCount = 0;
  let totalProducts = invSnap.size;

  /* ==============================
     TRANSACTIONS LOOP
  ============================== */
  txSnap.forEach(doc => {
    const t = doc.data();

    if (t.status === "pending") pendingCount++;
    if (t.status === "approved") {
      approvedCount++;
      totalRevenue += t.total || 0;

      const date = t.createdAt?.toDate();
      if (date) {
        const month = date.getMonth() + 1;
        monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (t.total || 0);
      }
    }
    if (t.status === "rejected") rejectedCount++;
  });

  /* ==============================
     INVENTORY LOOP
  ============================== */
  invSnap.forEach(doc => {
    const p = doc.data();
    if (p.quantity <= p.minQuantity) lowStockCount++;
  });

  /* ==============================
     UPDATE KPI UI
  ============================== */
  totalRevenueEl.textContent = totalRevenue.toLocaleString() + " USD";
  pendingCountEl.textContent = pendingCount;
  lowStockCountEl.textContent = lowStockCount;
  totalProductsEl.textContent = totalProducts;

  /* ==============================
     ALERTES INTELLIGENTES
  ============================== */
  alertsList.innerHTML = "";

  if (pendingCount > 0) {
    alertsList.innerHTML += `
      <li class="text-warning">
        <i class="bi bi-exclamation-circle me-2"></i>
        ${pendingCount} transaction(s) en attente de validation
      </li>`;
  }

  if (lowStockCount > 0) {
    alertsList.innerHTML += `
      <li class="text-danger">
        <i class="bi bi-box-seam me-2"></i>
        ${lowStockCount} produit(s) en stock critique
      </li>`;
  }

  if (pendingCount === 0 && lowStockCount === 0) {
    alertsList.innerHTML += `
      <li class="text-success">
        <i class="bi bi-check-circle me-2"></i>
        Système stable – aucune alerte critique
      </li>`;
  }

  /* ==============================
     APEX CHART - SALES
  ============================== */
  const salesOptions = {
    chart: {
      type: 'area',
      height: 300,
      toolbar: { show: false }
    },
    series: [{
      name: "Ventes",
      data: Array.from({ length: 12 }, (_, i) => monthlyRevenue[i+1] || 0)
    }],
    xaxis: {
      categories: ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Aoû","Sep","Oct","Nov","Déc"]
    },
    colors: ['#0B5C6B'],
    stroke: { curve: 'smooth' },
    dataLabels: { enabled: false }
  };

  new ApexCharts(document.querySelector("#salesChart"), salesOptions).render();

  /* ==============================
     APEX CHART - STATUS
  ============================== */
  const statusOptions = {
    chart: {
      type: 'donut',
      height: 300
    },
    series: [approvedCount, pendingCount, rejectedCount],
    labels: ["Approuvées", "En attente", "Rejetées"],
    colors: ["#2E7D32", "#D4A017", "#DC2626"],
    legend: { position: 'bottom' }
  };

  new ApexCharts(document.querySelector("#statusChart"), statusOptions).render();
}
