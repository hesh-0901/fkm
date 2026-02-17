/* ============================================================
   FKM ENERGY - RAPPORTS FINANCIERS
   Version Temps Réel - Directeur / Admin uniquement
   Multi Devise USD + CDF
============================================================ */

import { auth, db } from "./firebase.config.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  collection,
  doc,
  getDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ============================================================
   VARIABLES GLOBALES
============================================================ */

let transactions = [];
let inventory = [];
let exchangeRate = 1;

let salesChart;
let productsChart;
let sellersChart;

/* ============================================================
   AUTH + ROLE PROTECTION
============================================================ */

onAuthStateChanged(auth, async (user) => {

  if (!user) {
    window.location.href = "../index.html";
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));

  if (!snap.exists()) {
    window.location.href = "../index.html";
    return;
  }

  const data = snap.data();

  // 🔐 Autorisé uniquement Directeur & Admin
  if (!["directeur", "admin"].includes(data.role)) {
    window.location.href = "../admin/dashboard.html";
    return;
  }

  // Affichage utilisateur
  document.getElementById("userName").textContent = data.name;
  document.getElementById("userRole").textContent = data.fonction;

  initRealtimeListeners();
});

/* ============================================================
   SIDEBAR LOGIQUE (Optionnel si centralisé ailleurs)
============================================================ */
// Si tu veux cacher le lien rapport pour non-directeur,
// fais-le dans sidebar.js via le role.

/* ============================================================
   REALTIME LISTENERS
============================================================ */

function initRealtimeListeners() {

  // 🔁 Transactions
  onSnapshot(collection(db, "transactions"), (snap) => {
    transactions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    computeDashboard();
  });

  // 🔁 Inventory
  onSnapshot(collection(db, "inventory"), (snap) => {
    inventory = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    computeDashboard();
  });

  // 🔁 Exchange Rate
  onSnapshot(doc(db, "exchange_rates", "current"), (snap) => {
    exchangeRate = snap.data()?.USD_CDF || 1;
    computeDashboard();
  });
}

/* ============================================================
   MOTEUR PRINCIPAL
============================================================ */

function computeDashboard() {

  if (!transactions.length || !inventory.length) return;

  /* ======================
     CHIFFRE D'AFFAIRE
  ====================== */

  const approved = transactions.filter(t => t.status === "approved");

  const totalUSD = approved.reduce(
    (sum, t) => sum + Number(t.grandTotalUSD || 0),
    0
  );

  const totalCDF = totalUSD * exchangeRate;

  document.getElementById("caUSD").textContent =
    formatMoney(totalUSD) + " USD";

  document.getElementById("caCDF").textContent =
    formatMoney(totalCDF) + " CDF";

  /* ======================
     VALEUR STOCK
  ====================== */

  let stockUSD = 0;

  inventory.forEach(p => {

    if (!p.quantity) return;

    if (p.pricing?.usd) {
      stockUSD += p.quantity * p.pricing.usd;

    } else if (p.pricing?.cdf) {
      stockUSD += (p.quantity * p.pricing.cdf) / exchangeRate;
    }
  });

  const stockCDF = stockUSD * exchangeRate;

  document.getElementById("stockUSD").textContent =
    formatMoney(stockUSD) + " USD";

  document.getElementById("stockCDF").textContent =
    formatMoney(stockCDF) + " CDF";

  /* ======================
     GRAPHIQUE VENTES 30J
  ====================== */

  renderSalesChart(approved);

  /* ======================
     TOP PRODUITS
  ====================== */

  renderTopProducts(approved);

  /* ======================
     TOP VENDEURS
  ====================== */

  renderTopSellers(approved);
}

/* ============================================================
   SALES CHART
============================================================ */

function renderSalesChart(data) {

  const last30Days = {};
  const today = new Date();

  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split("T")[0];
    last30Days[key] = 0;
  }

  data.forEach(t => {
    if (!t.createdAt) return;
    const date = t.createdAt.toDate().toISOString().split("T")[0];
    if (last30Days[date] !== undefined) {
      last30Days[date] += Number(t.grandTotalUSD || 0);
    }
  });

  const categories = Object.keys(last30Days).reverse();
  const values = Object.values(last30Days).reverse();

  if (salesChart) salesChart.destroy();

  salesChart = new ApexCharts(document.querySelector("#salesChart"), {
    series: [{ name: "Ventes USD", data: values }],
    chart: { type: "area", height: 300 },
    stroke: { curve: "smooth", width: 3 },
    colors: ["#0B5C6B"],
    xaxis: { categories }
  });

  salesChart.render();
}

/* ============================================================
   TOP PRODUITS
============================================================ */

function renderTopProducts(data) {

  const productMap = {};

  data.forEach(t => {
    t.items?.forEach(item => {
      if (!productMap[item.productName])
        productMap[item.productName] = 0;

      productMap[item.productName] += item.quantity;
    });
  });

  const sorted = Object.entries(productMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (productsChart) productsChart.destroy();

  productsChart = new ApexCharts(document.querySelector("#productsChart"), {
    series: [{ data: sorted.map(p => p[1]) }],
    chart: { type: "bar", height: 300 },
    xaxis: { categories: sorted.map(p => p[0]) },
    colors: ["#10B981"]
  });

  productsChart.render();
}

/* ============================================================
   TOP VENDEURS
============================================================ */

function renderTopSellers(data) {

  const sellerMap = {};

  data.forEach(t => {
    if (!t.marketer?.name) return;

    if (!sellerMap[t.marketer.name])
      sellerMap[t.marketer.name] = 0;

    sellerMap[t.marketer.name] += Number(t.grandTotalUSD || 0);
  });

  const sorted = Object.entries(sellerMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (sellersChart) sellersChart.destroy();

  sellersChart = new ApexCharts(document.querySelector("#sellersChart"), {
    series: [{ data: sorted.map(s => s[1]) }],
    chart: { type: "bar", height: 300 },
    xaxis: { categories: sorted.map(s => s[0]) },
    colors: ["#F59E0B"]
  });

  sellersChart.render();
}

/* ============================================================
   UTILS
============================================================ */

function formatMoney(value) {
  return Number(value).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
