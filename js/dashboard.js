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

const kpiProducts = document.getElementById("kpiProducts");
const kpiLowStock = document.getElementById("kpiLowStock");
const kpiPending = document.getElementById("kpiPending");
const kpiApproved = document.getElementById("kpiApproved");

const alertsList = document.getElementById("alertsList");
const activityList = document.getElementById("activityList");
const usersList = document.getElementById("usersList");

let lineChart;

/* AUTH */
onAuthStateChanged(auth, async user => {
  if (!user) return location.replace("../login.html");

  const snap = await getDoc(doc(db, "users", user.uid));
  const me = snap.data();

  userNameEl.textContent = me.name;
  userRoleEl.textContent = me.fonction || me.role;

  await Promise.all([
    loadKPIs(),
    loadAlerts(),
    loadActivity(),
    loadUsers(),
    loadLineChart()
  ]);
});

/* LOGOUT */
logoutBtn.onclick = async () => {
  await signOut(auth);
  location.replace("../login.html");
};

/* KPIs */
async function loadKPIs() {
  const invSnap = await getDocs(collection(db, "inventory"));
  let low = 0;

  invSnap.forEach(d => {
    const p = d.data();
    if (p.quantity <= p.minQuantity) low++;
  });

  kpiProducts.textContent = invSnap.size;
  kpiLowStock.textContent = low;

  const txSnap = await getDocs(collection(db, "transactions"));
  let pending = 0, approved = 0;

  txSnap.forEach(d => {
    const t = d.data();
    if (t.status === "pending") pending++;
    if (t.status === "approved") approved++;
  });

  kpiPending.textContent = pending;
  kpiApproved.textContent = approved;
}

/* LINE CHART – flux dans le temps */
async function loadLineChart() {
  const txSnap = await getDocs(collection(db, "transactions"));
  const map = {};

  txSnap.forEach(d => {
    const t = d.data();
    if (t.status !== "approved" || !t.createdAt) return;

    const date = t.createdAt.toDate().toISOString().slice(0, 10);
    if (!map[date]) map[date] = { in: 0, out: 0 };

    map[date][t.type] += t.quantity;
  });

  const labels = Object.keys(map).sort();
  const inData = labels.map(d => map[d].in);
  const outData = labels.map(d => map[d].out);

  const ctx = document.getElementById("txLineChart");

  if (lineChart) lineChart.destroy();

  lineChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Entrées",
          data: inData,
          borderColor: "#2E7D32",
          backgroundColor: "rgba(46,125,50,0.15)",
          tension: 0.3,
          fill: true
        },
        {
          label: "Sorties",
          data: outData,
          borderColor: "#DC2626",
          backgroundColor: "rgba(220,38,38,0.15)",
          tension: 0.3,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom" }
      }
    }
  });
}

/* ALERTS */
async function loadAlerts() {
  alertsList.innerHTML = "";
  const invSnap = await getDocs(collection(db, "inventory"));

  invSnap.forEach(d => {
    const p = d.data();
    if (p.quantity <= p.minQuantity) {
      alertsList.innerHTML += `
        <li class="text-danger flex items-center gap-2">
          <i class="bi bi-exclamation-circle"></i>
          ${p.name} : stock critique
        </li>`;
    }
  });
}

/* ACTIVITY */
async function loadActivity() {
  activityList.innerHTML = "";
  const txSnap = await getDocs(collection(db, "transactions"));

  txSnap.docs.slice(-10).reverse().forEach(d => {
    const t = d.data();
    activityList.innerHTML += `
      <li class="flex items-center gap-2">
        <i class="bi bi-arrow-repeat"></i>
        ${t.createdBy?.name} • ${t.productName} • ${t.type} • ${t.quantity}
      </li>`;
  });
}

/* USERS */
async function loadUsers() {
  usersList.innerHTML = "";
  const usersSnap = await getDocs(collection(db, "users"));

  usersSnap.forEach(d => {
    const u = d.data();
    usersList.innerHTML += `
      <li class="flex items-center gap-2">
        <i class="bi bi-person"></i>
        ${u.name} <span class="text-muted text-xs">(${u.role})</span>
      </li>`;
  });
}
