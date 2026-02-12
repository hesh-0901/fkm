import { auth, db } from "./firebase.config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* DOM */
const userNameEl = document.getElementById("userName");
const userRoleEl = document.getElementById("userRole");
const logoutBtn = document.getElementById("logoutBtn");

const kpiContainer = document.getElementById("kpiContainer");
const financeContainer = document.getElementById("financeContainer");

let transactions = [];
let inventory = [];
let currentRange = "all";

/* AUTH */
onAuthStateChanged(auth, async (user) => {
  if (!user) return location.replace("../login.html");

  const snap = await getDoc(doc(db, "users", user.uid));
  const data = snap.data();

  userNameEl.textContent = data.name;
  userRoleEl.textContent = data.fonction;

  await loadData();
  renderDashboard();
});

/* LOGOUT */
logoutBtn.onclick = async () => {
  await signOut(auth);
  location.replace("../login.html");
};

/* LOAD DATA */
async function loadData() {
  const txSnap = await getDocs(collection(db, "transactions"));
  transactions = txSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const invSnap = await getDocs(collection(db, "inventory"));
  inventory = invSnap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/* FILTER */
document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.onclick = () => {
    currentRange = btn.dataset.range;
    renderDashboard();
  };
});

/* FILTER LOGIC */
function filterTransactions() {
  if (currentRange === "all") return transactions;

  const now = new Date();
  return transactions.filter(t => {
    const date = t.createdAt?.toDate();
    if (!date) return false;

    if (currentRange === "today")
      return date.toDateString() === now.toDateString();

    const days = parseInt(currentRange);
    const diff = (now - date) / (1000 * 60 * 60 * 24);
    return diff <= days;
  });
}

/* RENDER */
function renderDashboard() {

  const data = filterTransactions();

  const total = data.length;
  const approved = data.filter(t => t.status === "approved");
  const pending = data.filter(t => t.status === "pending");
  const rejected = data.filter(t => t.status === "rejected");

  const sum = arr => arr.reduce((acc, t) => acc + (t.total || 0), 0);

  renderKPIs(total, approved.length, pending.length, rejected.length);
  renderFinance(sum(approved), sum(pending), sum(rejected));
  renderCharts(approved.length, pending.length, rejected.length);
}

/* KPI */
function renderKPIs(total, approved, pending, rejected) {
  kpiContainer.innerHTML = `
    ${card("Total", total, "primary")}
    ${card("Approved", approved, "emerald")}
    ${card("Pending", pending, "amber")}
    ${card("Rejected", rejected, "red")}
  `;
}

function renderFinance(a, p, r) {
  financeContainer.innerHTML = `
    ${card("CA Validé", a + " USD", "emerald")}
    ${card("En attente", p + " USD", "amber")}
    ${card("Refusé", r + " USD", "red")}
    ${card("Stock critique", inventory.filter(i => i.quantity <= i.minQuantity).length, "danger")}
  `;
}

function card(title, value, color) {
  return `
    <div class="bg-white p-4 rounded-xl shadow-sm">
      <div class="text-xs text-muted">${title}</div>
      <div class="text-2xl font-bold text-${color}-600">${value}</div>
    </div>
  `;
}

/* CHARTS */
function renderCharts(a, p, r) {

  new ApexCharts(document.querySelector("#areaChart"), {
    chart: { type: 'area', height: 300 },
    series: [
      { name: 'Approved', data: [a] },
      { name: 'Pending', data: [p] },
      { name: 'Rejected', data: [r] }
    ],
    xaxis: { categories: ['Transactions'] }
  }).render();

  new ApexCharts(document.querySelector("#donutChart"), {
    chart: { type: 'donut', height: 300 },
    series: [a, p, r],
    labels: ['Approved', 'Pending', 'Rejected']
  }).render();
}
