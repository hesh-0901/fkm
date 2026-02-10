import { auth, db } from "./firebase.config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection, getDocs, doc, getDoc
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

let chart;

/* AUTH */
onAuthStateChanged(auth, async user => {
  if (!user) return location.replace("../login.html");

  const snap = await getDoc(doc(db, "users", user.uid));
  const me = snap.data();

  userNameEl.textContent = me.name;
  userRoleEl.textContent = me.fonction;

  loadKPIs();
  loadChart();
  loadAlerts();
  loadActivity();
  loadUsers();
});

/* LOGOUT */
logoutBtn.onclick = async () => {
  await signOut(auth);
  location.replace("../login.html");
};

/* KPIs */
async function loadKPIs() {
  const inv = await getDocs(collection(db, "inventory"));
  let low = 0;
  inv.forEach(d => { if (d.data().quantity <= d.data().minQuantity) low++; });
  kpiProducts.textContent = inv.size;
  kpiLowStock.textContent = low;

  const tx = await getDocs(collection(db, "transactions"));
  let p = 0, a = 0;
  tx.forEach(d => {
    if (d.data().status === "pending") p++;
    if (d.data().status === "approved") a++;
  });
  kpiPending.textContent = p;
  kpiApproved.textContent = a;
}

/* CHART ✅ FIX LÉGENDE */
async function loadChart() {
  const tx = await getDocs(collection(db, "transactions"));
  let inQty = 0;
  let outQty = 0;

  tx.forEach(d => {
    const t = d.data();
    if (t.status !== "approved") return;
    if (t.type === "in") inQty += t.quantity;
    if (t.type === "out") outQty += t.quantity;
  });

  const ctx = document.getElementById("txChart");

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Volume"],
      datasets: [
        {
          label: "Entrées",
          data: [inQty],
          backgroundColor: "#2E7D32"
        },
        {
          label: "Sorties",
          data: [outQty],
          backgroundColor: "#B71C1C"
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom"
        }
      }
    }
  });
}

/* ALERTS */
async function loadAlerts() {
  alertsList.innerHTML = "";
  const inv = await getDocs(collection(db, "inventory"));
  inv.forEach(d => {
    const p = d.data();
    if (p.quantity <= p.minQuantity) {
      alertsList.innerHTML += `<li class="list-group-item text-danger">${p.name} : stock critique</li>`;
    }
  });
}

/* ACTIVITY */
async function loadActivity() {
  activityList.innerHTML = "";
  const tx = await getDocs(collection(db, "transactions"));
  tx.docs.slice(-5).reverse().forEach(d => {
    const t = d.data();
    activityList.innerHTML += `
      <li class="list-group-item">
        ${t.createdBy?.name} • ${t.productName} • ${t.type} • ${t.quantity}
      </li>`;
  });
}

/* USERS */
async function loadUsers() {
  usersList.innerHTML = "";
  const users = await getDocs(collection(db, "users"));
  users.forEach(d => {
    const u = d.data();
    usersList.innerHTML += `
      <li class="list-group-item">
        ${u.name} <small class="text-muted">(${u.role})</small>
      </li>`;
  });
}
