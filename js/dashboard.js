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
const activitiesContainer = document.getElementById("recentActivities");

const userNameEl = document.getElementById("userName");
const userRoleEl = document.getElementById("userRole");
const logoutBtn = document.getElementById("logoutBtn");

let activities = [];

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

      pushActivity("inventory", p.name, p.updatedAt || p.createdAt);
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

      pushActivity("transaction", t.invoiceNumber, t.updatedAt || t.createdAt, t.status);
    });

    pendingTxEl.textContent = pending;
    approvedTxEl.textContent = approved;

    renderAlerts(lowStockEl.textContent, pending, rejected);
  });
}

/* ==========================================================
   ACTIVITY ENGINE
========================================================== */
function pushActivity(type, label, timestamp, status = null) {

  if (!timestamp) return;

  const date = timestamp.toDate ? timestamp.toDate() : new Date();

  activities.push({
    type,
    label,
    status,
    date
  });

  activities.sort((a,b)=>b.date - a.date);

  renderActivities();
}

function renderActivities() {

  if (!activitiesContainer) return;

  activitiesContainer.innerHTML = activities.slice(0,15).map(a => {

    let icon = "bi-activity";
    let color = "bg-primary";

    if (a.type === "transaction") {
      if (a.status === "approved") {
        icon = "bi-check-circle";
        color = "bg-success";
      } else if (a.status === "pending") {
        icon = "bi-hourglass-split";
        color = "bg-warning";
      } else if (a.status === "rejected") {
        icon = "bi-x-circle";
        color = "bg-danger";
      }
    }

    return `
      <div class="relative pl-10 group">

        <span class="absolute left-0 top-1.5 w-6 h-6 rounded-full ${color}
                     flex items-center justify-center text-white text-xs shadow">
          <i class="bi ${icon}"></i>
        </span>

        <div class="bg-slate-50 rounded-lg p-3 border border-slate-100
                    group-hover:shadow-md transition">
          <p class="text-sm font-medium capitalize">
            ${a.type === "transaction" ? "Transaction" : "Produit"}
          </p>
          <p class="text-xs text-muted">${a.label}</p>
          <p class="text-[11px] text-slate-400">
            ${formatTimeAgo(a.date)}
          </p>
        </div>

      </div>
    `;
  }).join("");
}

/* ==========================================================
   FORMAT TIME AGO
========================================================== */
function formatTimeAgo(date) {

  const seconds = Math.floor((new Date() - date) / 1000);

  const intervals = [
    { label: "an", seconds: 31536000 },
    { label: "mois", seconds: 2592000 },
    { label: "jour", seconds: 86400 },
    { label: "heure", seconds: 3600 },
    { label: "minute", seconds: 60 }
  ];

  for (const i of intervals) {
    const count = Math.floor(seconds / i.seconds);
    if (count >= 1) {
      return `Il y a ${count} ${i.label}${count > 1 ? "s" : ""}`;
    }
  }

  return "À l'instant";
}

/* ==========================================================
   STOCK CHART
========================================================== */
function renderStockChart(products) {

  const container = document.getElementById("stockPremiumList");
  if (!container) return;

  if (!products.length) {
    container.innerHTML = `
      <p class="text-sm text-muted">Aucune donnée disponible.</p>
    `;
    return;
  }

  const maxStock = Math.max(...products.map(p => p.quantity));

  container.innerHTML = products.map(p => {

    const percentage = Math.round((p.quantity / maxStock) * 100);

    return `
      <div class="space-y-2 group">

        <div class="flex justify-between items-center">
          <p class="text-sm font-medium group-hover:text-primary transition">
            ${p.name}
          </p>
          <span class="text-xs font-semibold text-slate-500">
            ${p.quantity}
          </span>
        </div>

        <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div class="h-2 rounded-full bg-gradient-to-r from-primary to-primaryDark
                      transition-all duration-700 ease-out"
               style="width:${percentage}%">
          </div>
        </div>

      </div>
    `;
  }).join("");
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
