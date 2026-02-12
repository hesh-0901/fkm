import { auth, db } from "./firebase.config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const userNameEl = document.getElementById("userName");
const userRoleEl = document.getElementById("userRole");
const logoutBtn = document.getElementById("logoutBtn");

const kpiProducts = document.getElementById("kpiProducts");
const kpiLowStock = document.getElementById("kpiLowStock");
const kpiPending = document.getElementById("kpiPending");
const kpiApproved = document.getElementById("kpiApproved");
const alertsList = document.getElementById("alertsList");

onAuthStateChanged(auth, async (user) => {

  if (!user) return location.replace("../login.html");

  const snap = await getDoc(doc(db, "users", user.uid));
  const userData = snap.data();

  userNameEl.textContent = userData.name;
  userRoleEl.textContent = userData.fonction;

  loadDashboard();
});

logoutBtn.onclick = async () => {
  await signOut(auth);
  location.replace("../login.html");
};

async function loadDashboard() {

  const inventorySnap = await getDocs(collection(db, "inventory"));
  const txSnap = await getDocs(collection(db, "transactions"));

  let lowStock = 0;
  let pending = 0;
  let approved = 0;
  let rejected = 0;

  let stockData = [];
  let alerts = [];

  inventorySnap.forEach(d => {
    const p = d.data();

    stockData.push({
      name: p.name,
      qty: p.quantity
    });

    if (p.quantity <= p.minQuantity) {
      lowStock++;
      alerts.push(`Stock faible : ${p.name}`);
    }
  });

  txSnap.forEach(d => {
    const t = d.data();
    if (t.status === "pending") pending++;
    if (t.status === "approved") approved++;
    if (t.status === "rejected") rejected++;
  });

  kpiProducts.textContent = inventorySnap.size;
  kpiLowStock.textContent = lowStock;
  kpiPending.textContent = pending;
  kpiApproved.textContent = approved;

  renderStatusChart(pending, approved, rejected);
  renderStockChart(stockData.slice(0, 5));
  renderAlerts(alerts);
}

function renderStatusChart(pending, approved, rejected) {

  const options = {
    chart: { type: 'donut', height: 320 },
    series: [pending, approved, rejected],
    labels: ["En attente", "Validées", "Rejetées"],
    colors: ["#F59E0B", "#10B981", "#EF4444"],
    legend: { position: "bottom" }
  };

  new ApexCharts(document.querySelector("#chartStatus"), options).render();
}

function renderStockChart(stockData) {

  const options = {
    chart: { type: 'bar', height: 320 },
    series: [{
      name: "Stock",
      data: stockData.map(s => s.qty)
    }],
    xaxis: {
      categories: stockData.map(s => s.name)
    },
    colors: ["#0B5C6B"],
    plotOptions: {
      bar: { borderRadius: 8 }
    },
    dataLabels: { enabled: true }
  };

  new ApexCharts(document.querySelector("#chartStock"), options).render();
}

function renderAlerts(alerts) {

  alertsList.innerHTML = "";

  if (alerts.length === 0) {
    alertsList.innerHTML = `
      <li class="flex items-center gap-3 bg-green-50 text-green-700 p-3 rounded-lg">
        <i class="bi bi-check-circle-fill text-xl"></i>
        Aucun problème détecté
      </li>`;
    return;
  }

  alerts.forEach(a => {
    alertsList.innerHTML += `
      <li class="flex items-center gap-3 bg-red-50 text-red-700 p-3 rounded-lg shadow-sm">
        <i class="bi bi-exclamation-triangle-fill text-xl"></i>
        ${a}
      </li>
    `;
  });
}
