// js/dashboard.js
import { auth, db } from "./firebase.config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* DOM */
const logoutBtn = document.getElementById("logoutBtn");
const userNameEl = document.getElementById("userName");
const userRoleEl = document.getElementById("userRole");

const kpiProducts = document.getElementById("kpiProducts");
const kpiLowStock = document.getElementById("kpiLowStock");
const kpiPendingTx = document.getElementById("kpiPendingTx");
const kpiApprovedTx = document.getElementById("kpiApprovedTx");

/* AUTH */
onAuthStateChanged(auth, async (user) => {
  if (!user) return location.replace("../login.html");

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return;

  const data = snap.data();

  userNameEl.textContent = data.name || "—";
  userRoleEl.textContent = data.fonction || "";

  loadKPIs();
});

/* LOGOUT */
logoutBtn.onclick = async () => {
  await signOut(auth);
  location.replace("../login.html");
};

/* LOAD KPI */
async function loadKPIs() {
  /* INVENTORY */
  const invSnap = await getDocs(collection(db, "inventory"));
  let lowStock = 0;

  invSnap.forEach(d => {
    const p = d.data();
    if (p.quantity <= p.minQuantity) lowStock++;
  });

  kpiProducts.textContent = invSnap.size;
  kpiLowStock.textContent = lowStock;

  /* TRANSACTIONS */
  const txSnap = await getDocs(collection(db, "transactions"));
  let pending = 0;
  let approved = 0;

  txSnap.forEach(d => {
    const t = d.data();
    if (t.status === "pending") pending++;
    if (t.status === "approved") approved++;
  });

  kpiPendingTx.textContent = pending;
  kpiApprovedTx.textContent = approved;
}
