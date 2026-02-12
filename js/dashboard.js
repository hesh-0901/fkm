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
const userNameEl = document.getElementById("userName");
const userRoleEl = document.getElementById("userRole");
const logoutBtn = document.getElementById("logoutBtn");

const kpiMonth = document.getElementById("kpiMonth");
const kpiTotal = document.getElementById("kpiTotal");
const kpiCritical = document.getElementById("kpiCritical");
const kpiPending = document.getElementById("kpiPending");

const alertsContainer = document.getElementById("alertsContainer");

/* ==========================================================
   AUTH
========================================================== */
onAuthStateChanged(auth, async (user) => {
  if (!user) return location.replace("../login.html");

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return;

  const me = snap.data();

  userNameEl.textContent = me.name || "—";
  userRoleEl.textContent = me.fonction || "—";

  await loadDashboard();
});

/* ==========================================================
   LOGOUT
========================================================== */
logoutBtn.onclick = async () => {
  await signOut(auth);
  location.replace("../login.html");
};

/* ==========================================================
   MAIN DASHBOARD LOADER
========================================================== */
async function loadDashboard() {

  const txSnap = await getDocs(collection(db, "transactions"));
  const invSnap = await getDocs(collection(db, "inventory"));

  let totalRevenue = 0;
  let monthRevenue = 0;
  let pendingCount = 0;

  let statusCount = {
    approved: 0,
    pending: 0,
    rejected: 0
  };

  let revenueLast7Days = {};
  let productSales = {};

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  /* =========================
     TRANSACTIONS ANALYSIS
  ========================= */
  txSnap.forEach(d => {
    const t = d.data();
    if (!t.createdAt) return;

    const date = t.createdAt.toDate();
    const dayKey = date.toISOString().slice(0, 10);

    statusCount[t.status]++;

    if (t.status === "approved") {

      totalRevenue += t.total || 0;

      if (date.getMonth() === currentMonth &&
          date.getFullYear() === currentYear) {
        monthRevenue += t.total || 0;
      }

      // 7 derniers jours
      const diffDays = (now - date) / (1000 * 60 * 60 * 24);
      if (diffDays <= 7) {
        revenueLast7Days[dayKey] =
          (revenueLast7Days[dayKey] || 0) + (t.total || 0);
      }

      // Top produits
      productSales[t.productName] =
        (productSales[t.productName] || 0) + t.quantity;
    }

    if (t.status === "pending") pendingCount++;
  });

  /* =========================
     INVENTORY ANALYSIS
  ========================= */
  let criticalCount = 0;
  let outOfStock = 0;

  invSnap.forEach(d => {
    const p = d.data();
    if (p.quantity <= p.minQuantity) criticalCount++;
    if (p.quantity === 0) outOfStock++;
  });

  /* =========================
     KPI UPDATE
  ========================= */
  kpiTotal.textContent = totalRevenue.toLocaleString();
  kpiMonth.textContent = monthRevenue.toLocaleString();
  kpiCritical.textContent = criticalCount;
  kpiPending.textContent = pendingCount;

  /* =========================
     ALERTES INTELLIGENTES
  ========================= */
  alertsContainer.innerHTML = "";

  if (criticalCount > 0) {
    alertsContainer.innerHTML += alertBox(
      "danger",
      `⚠️ ${criticalCount} produit(s) en stock critique`
    );
  }

  if (outOfStock > 0) {
    alertsContainer.innerHTML += alertBox(
      "danger",
      `🚨 ${outOfStock} produit(s) en rupture totale`
    );
  }

  if (pendingCount > 5) {
    alertsContainer.innerHTML += alertBox(
      "warning",
      `⏳ Trop de transactions en attente (${pendingCount})`
    );
  }

  /* =========================
     CHART 1 - CA 7 JOURS
  ========================= */
  const sortedDays = Object.keys(revenueLast7Days).sort();
  const revenueData = sortedDays.map(d => revenueLast7Days[d]);

  new ApexCharts(document.querySelector("#chartRevenue"), {
    chart: { type: "area", height: 300 },
    series: [{ name: "CA", data: revenueData }],
    xaxis: { categories: sortedDays },
    colors: ["#0B5C6B"],
    dataLabels: { enabled: false },
    stroke: { curve: "smooth" }
  }).render();

  /* =========================
     CHART 2 - DONUT STATUS
  ========================= */
  new ApexCharts(document.querySelector("#chartStatus"), {
    chart: { type: "donut", height: 300 },
    series: [
      statusCount.approved,
      statusCount.pending,
      statusCount.rejected
    ],
    labels: ["Approuvées", "En attente", "Rejetées"],
    colors: ["#2E7D32", "#D4A017", "#DC2626"]
  }).render();

  /* =========================
     CHART 3 - TOP PRODUITS
  ========================= */
  const topProducts = Object.entries(productSales)
    .sort((a,b) => b[1] - a[1])
    .slice(0,5);

  new ApexCharts(document.querySelector("#chartProducts"), {
    chart: { type: "bar", height: 300 },
    series: [{
      name: "Quantité vendue",
      data: topProducts.map(p => p[1])
    }],
    xaxis: {
      categories: topProducts.map(p => p[0])
    },
    colors: ["#0B5C6B"]
  }).render();
}

/* ==========================================================
   ALERT COMPONENT
========================================================== */
function alertBox(type, message) {
  return `
    <div class="p-4 rounded-lg border-l-4
      ${type === "danger"
        ? "bg-red-50 border-red-500 text-red-700"
        : "bg-yellow-50 border-yellow-500 text-yellow-700"}">
      ${message}
    </div>
  `;
}
