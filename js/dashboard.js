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
const stockList = document.getElementById("stockPremiumList");
const marketerPerformanceList = document.getElementById("marketerPerformanceList");
const auditSummaryList = document.getElementById("auditSummaryList");

const userNameEl = document.getElementById("userName");
const userRoleEl = document.getElementById("userRole");
const logoutBtn = document.getElementById("logoutBtn");
const periodFilter = document.getElementById("periodFilter");

/* ==========================================================
   STATE
========================================================== */
let selectedPeriod = "ALL";
let activities = [];

let inventoryData = [];
let transactionsData = [];
let auditData = [];

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
})

logoutBtn.onclick = async () => {
  await signOut(auth);
  location.replace("../index.html");
};
periodFilter.addEventListener("change", () => {
  selectedPeriod = periodFilter.value;
  activities = [];
  renderTransactions();
  renderAudit();
});

/* ==========================================================
   INIT SNAPSHOTS (1 seule fois)
========================================================== */
function initRealtimeDashboard() {

  /* INVENTORY */
  onSnapshot(collection(db, "inventory"), (snap) => {
    inventoryData = [];
    snap.forEach(doc => {
      inventoryData.push({ id: doc.id, ...doc.data() });
    });
    renderInventory();
  });

  /* TRANSACTIONS */
  onSnapshot(collection(db, "transactions"), (snap) => {
    transactionsData = [];
    snap.forEach(doc => {
      transactionsData.push({ id: doc.id, ...doc.data() });
    });
    renderTransactions();
  });

  /* AUDIT */
  onSnapshot(collection(db, "audit_logs"), (snap) => {
    auditData = [];
    snap.forEach(doc => {
      auditData.push({ id: doc.id, ...doc.data() });
    });
    renderAudit();
  });
}

/* ==========================================================
   INVENTORY RENDER
========================================================== */
function renderInventory() {

  let totalProducts = 0;
  let lowStock = 0;
  let stockData = [];

  inventoryData.forEach(p => {

    totalProducts++;

    if (p.quantity <= p.minQuantity) lowStock++;

    stockData.push({
      name: p.name,
      quantity: p.quantity
    });

    pushActivity("Produit", p.name, p.updatedAt || p.createdAt);
  });

  totalProductsEl.textContent = totalProducts;
  lowStockEl.textContent = lowStock;

  renderStockList(
    stockData.sort((a,b)=>b.quantity-a.quantity).slice(0,5)
  );
}

/* ==========================================================
   TRANSACTIONS RENDER (filtré)
========================================================== */
function renderTransactions() {

  let pending = 0;
  let approved = 0;
  let rejected = 0;
  let marketerStats = {};

  transactionsData.forEach(t => {

    if (!filterByPeriod(t.createdAt)) return;

    if (t.status === "pending") pending++;
    if (t.status === "approved") approved++;
    if (t.status === "rejected") rejected++;

    if (t.marketer?.name && t.status === "approved") {
      if (!marketerStats[t.marketer.name]) {
        marketerStats[t.marketer.name] = 0;
      }
      marketerStats[t.marketer.name] += 1;
    }

    pushActivity("Transaction", t.invoiceNumber, t.updatedAt || t.createdAt);
  });

  pendingTxEl.textContent = pending;
  approvedTxEl.textContent = approved;

  renderMarketerPerformance(marketerStats);
  renderAlerts(Number(lowStockEl.textContent), pending, rejected);
}

/* ==========================================================
   AUDIT RENDER
========================================================== */
function renderAudit() {

  let approveCount = 0;
  let rejectCount = 0;
  let deleteCount = 0;

  auditData.forEach(log => {

    if (!filterByPeriod(log.createdAt)) return;

    if (log.action === "APPROVE_TRANSACTION") approveCount++;
    if (log.action === "REJECT_TRANSACTION") rejectCount++;
    if (log.action === "DELETE_TRANSACTION") deleteCount++;
  });

  renderAuditSummary(approveCount, rejectCount, deleteCount);
}

/* ==========================================================
   FILTRE PÉRIODE
========================================================== */
function filterByPeriod(timestamp) {

  if (!timestamp) return false;
  if (selectedPeriod === "ALL") return true;

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();

  const diffMs = now - date;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (selectedPeriod === "TODAY")
    return date.toDateString() === now.toDateString();

  if (selectedPeriod === "7DAYS")
    return diffDays <= 7;

  if (selectedPeriod === "30DAYS")
    return diffDays <= 30;

  return true;
}

/* ==========================================================
   STOCK PREMIUM
========================================================== */
function renderStockList(products) {

  if (!products.length) {
    stockList.innerHTML = `<p class="text-sm text-muted">Aucune donnée.</p>`;
    return;
  }

  const maxStock = Math.max(...products.map(p => p.quantity));

  stockList.innerHTML = products.map(p => {

    const percent = Math.round((p.quantity / maxStock) * 100);

    return `
      <div class="space-y-2">
        <div class="flex justify-between text-sm font-medium">
          <span>${p.name}</span>
          <span>${p.quantity}</span>
        </div>
        <div class="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div class="h-3 rounded-full bg-gradient-to-r from-primary to-primaryDark"
               style="width:${percent}%">
          </div>
        </div>
      </div>
    `;
  }).join("");
}

/* ==========================================================
   MARKETEUR %
========================================================== */
function renderMarketerPerformance(stats) {

  const entries = Object.entries(stats);

  if (!entries.length) {
    marketerPerformanceList.innerHTML =
      `<p class="text-sm text-muted">Aucune vente enregistrée.</p>`;
    return;
  }

  const max = Math.max(...entries.map(e => e[1]));

  marketerPerformanceList.innerHTML = entries.map(([name, total]) => {

    const percent = Math.round((total / max) * 100);

    return `
      <div class="space-y-2">
        <div class="flex justify-between text-sm font-semibold">
          <span>${name}</span>
          <span>${percent}%</span>
        </div>
        <div class="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
          <div class="h-4 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-700"
               style="width:${percent}%">
          </div>
        </div>
      </div>
    `;
  }).join("");
}

/* ==========================================================
   AUDIT SUMMARY
========================================================== */
function renderAuditSummary(approve, reject, del) {

  auditSummaryList.innerHTML = `
    <div class="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-center">
      <i class="bi bi-check-circle-fill text-emerald-600 text-3xl"></i>
      <p class="mt-2 text-sm font-medium">Approbations</p>
      <p class="text-2xl font-bold">${approve}</p>
    </div>

    <div class="bg-amber-50 border border-amber-200 p-6 rounded-2xl text-center">
      <i class="bi bi-x-circle-fill text-amber-600 text-3xl"></i>
      <p class="mt-2 text-sm font-medium">Rejets</p>
      <p class="text-2xl font-bold">${reject}</p>
    </div>

    <div class="bg-red-50 border border-red-200 p-6 rounded-2xl text-center">
      <i class="bi bi-trash-fill text-red-600 text-3xl"></i>
      <p class="mt-2 text-sm font-medium">Suppressions</p>
      <p class="text-2xl font-bold">${del}</p>
    </div>
  `;
}

/* ==========================================================
   ACTIVITÉS
========================================================== */
function pushActivity(type, label, timestamp) {

  if (!timestamp) return;

  const date = timestamp.toDate ? timestamp.toDate() : new Date();
  activities.push({ type, label, date });

  activities.sort((a,b)=>b.date - a.date);
  renderActivities();
}

function renderActivities() {

  activitiesContainer.innerHTML = activities.slice(0,15).map(a => `
    <div class="relative pl-10">
      <span class="absolute left-0 top-2 w-6 h-6 rounded-full bg-primary
                   flex items-center justify-center text-white text-xs shadow">
        <i class="bi bi-activity"></i>
      </span>
      <div class="bg-slate-50 rounded-lg p-3 border border-slate-100">
        <p class="text-sm font-medium">${a.type}</p>
        <p class="text-xs text-muted">${a.label}</p>
        <p class="text-[11px] text-slate-400">${formatTimeAgo(a.date)}</p>
      </div>
    </div>
  `).join("");
}

/* ==========================================================
   ALERTES
========================================================== */
function renderAlerts(lowStock, pending, rejected) {

  alertsList.innerHTML = "";

  if (lowStock > 0)
    alertsList.innerHTML += `<div class="bg-red-50 border border-red-200 p-3 rounded-lg text-sm">
      ${lowStock} produit(s) en stock critique.
    </div>`;

  if (pending > 0)
    alertsList.innerHTML += `<div class="bg-amber-50 border border-amber-200 p-3 rounded-lg text-sm">
      ${pending} transaction(s) en attente.
    </div>`;

  if (rejected > 0)
    alertsList.innerHTML += `<div class="bg-red-50 border border-red-200 p-3 rounded-lg text-sm">
      ${rejected} transaction(s) rejetées.
    </div>`;

  if (lowStock == 0 && pending == 0 && rejected == 0)
    alertsList.innerHTML = `<div class="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-sm">
      Système stable. Aucune alerte.
    </div>`;
}

/* ==========================================================
   TIME AGO
========================================================== */
function formatTimeAgo(date) {

  const seconds = Math.floor((new Date() - date) / 1000);

  const intervals = [
    { label: "jour", seconds: 86400 },
    { label: "heure", seconds: 3600 },
    { label: "minute", seconds: 60 }
  ];

  for (const i of intervals) {
    const count = Math.floor(seconds / i.seconds);
    if (count >= 1)
      return `Il y a ${count} ${i.label}${count > 1 ? "s" : ""}`;
  }

  return "À l'instant";
}
