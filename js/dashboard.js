import { auth, db } from "./firebase.config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection,
  onSnapshot,
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

const txChartContainer = document.getElementById("txChart");

let activities = [];
let txChartInstance = null;

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

  initRealtimeDashboard();
});

/* LOGOUT */
logoutBtn.onclick = async () => {
  await signOut(auth);
  location.replace("../login.html");
};

/* ==========================================================
   REALTIME DASHBOARD
========================================================== */
function initRealtimeDashboard() {

  /* INVENTORY */
  onSnapshot(collection(db, "inventory"), (snap) => {

    let totalProducts = 0;
    let lowStock = 0;
    let stockData = [];

    snap.forEach(doc => {
      const p = doc.data();
      totalProducts++;

      if (p.quantity <= p.minQuantity) lowStock++;

      stockData.push({
        name: p.name,
        quantity: p.quantity
      });

      pushActivity("Produit mis à jour", p.name, p.updatedAt || p.createdAt);
    });

    totalProductsEl.textContent = totalProducts;
    lowStockEl.textContent = lowStock;

    renderStockChart(
      stockData.sort((a,b)=>b.quantity-a.quantity).slice(0,5)
    );
  });

  /* TRANSACTIONS */
  onSnapshot(collection(db, "transactions"), (snap) => {

    let pending = 0;
    let approved = 0;
    let rejected = 0;

    snap.forEach(doc => {
      const t = doc.data();

      if (t.status === "pending") pending++;
      if (t.status === "approved") approved++;
      if (t.status === "rejected") rejected++;

      pushActivity(
        `Transaction ${t.status}`,
        t.invoiceNumber,
        t.updatedAt || t.createdAt
      );
    });

    pendingTxEl.textContent = pending;
    approvedTxEl.textContent = approved;

    renderAlerts(lowStockEl.textContent, pending, rejected);
  });

  /* USERS */
  onSnapshot(collection(db, "users"), (snap) => {
    snap.forEach(doc => {
      const u = doc.data();
      pushActivity(
        "Utilisateur modifié",
        u.name,
        u.updatedAt || u.createdAt
      );
    });
  });

  /* CLIENTS */
  onSnapshot(collection(db, "clients"), (snap) => {
    snap.forEach(doc => {
      const c = doc.data();
      pushActivity(
        "Client modifié",
        c.name,
        c.updatedAt || c.createdAt
      );
    });
  });

  /* FOURNISSEURS */
  onSnapshot(collection(db, "fournisseurs"), (snap) => {
    snap.forEach(doc => {
      const f = doc.data();
      pushActivity(
        "Fournisseur modifié",
        f.name,
        f.updatedAt || f.createdAt
      );
    });
  });
}

/* ==========================================================
   ACTIVITY ENGINE
========================================================== */
function pushActivity(type, label, timestamp) {

  if (!timestamp) return;

  const date = timestamp.toDate ? timestamp.toDate() : new Date();

  activities.push({
    type,
    label,
    date
  });

  activities.sort((a,b)=>b.date - a.date);

  renderActivities();
}

function renderActivities() {

  if (!txChartContainer) return;

  txChartContainer.innerHTML = `
    <div class="space-y-3 max-h-80 overflow-y-auto">
      ${activities.slice(0,15).map(a => `
        <div class="flex items-start gap-3 border-b pb-2">
          <i class="bi bi-activity text-primary text-lg"></i>
          <div>
            <p class="font-medium text-sm">${a.type}</p>
            <p class="text-xs text-muted">${a.label}</p>
            <p class="text-[11px] text-slate-400">
              ${a.date.toLocaleString()}
            </p>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

/* ==========================================================
   STOCK CHART
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
    }
  };

  new ApexCharts(document.querySelector("#stockChart"), options).render();
}

/* ==========================================================
   ALERTS
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

  if (lowStock == 0 && pending == 0 && rejected == 0) {
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
