js/taux-devises.js
import { auth, db } from "./firebase.config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ============================================================
   DOM
============================================================ */

const logoutBtn = document.getElementById("logoutBtn");
const userNameEl = document.getElementById("userName");
const userRoleEl = document.getElementById("userRole");

const usdCdfRate = document.getElementById("usdCdfRate");
const saveRateBtn = document.getElementById("saveRateBtn");
const lastUpdate = document.getElementById("lastUpdate");

/* ============================================================
   STATE
============================================================ */

let currentUser = null;

/* ============================================================
   AUTH
============================================================ */

onAuthStateChanged(auth, async (user) => {

  if (!user) return location.replace("../login.html");

  const snap = await getDoc(doc(db, "users", user.uid));
  const data = snap.data();

  currentUser = {
    uid: user.uid,
    name: data.name,
    fonction: data.fonction,
    role: data.role
  };

  userNameEl.textContent = currentUser.name;
  userRoleEl.textContent = currentUser.fonction;

  if (!["admin", "directeur"].includes(currentUser.role)) {
    alert("Accès non autorisé.");
    location.replace("../admin/dashboard.html");
    return;
  }

  await loadRate();
});

/* ============================================================
   LOGOUT
============================================================ */

logoutBtn.onclick = async () => {
  await signOut(auth);
  location.replace("../login.html");
};

/* ============================================================
   LOAD RATE
============================================================ */

async function loadRate() {

  const snap = await getDoc(doc(db, "exchange_rates", "current"));

  if (!snap.exists()) return;

  const data = snap.data();

  usdCdfRate.value = data.USD_CDF || "";

  if (data.updatedAt) {
    lastUpdate.textContent =
      data.updatedAt.toDate().toLocaleString();
  }
}

/* ============================================================
   SAVE RATE + AUDIT
============================================================ */

saveRateBtn.onclick = async () => {

  const value = Number(usdCdfRate.value);

  if (!value || value <= 0) {
    alert("Taux invalide.");
    return;
  }

  const rateRef = doc(db, "exchange_rates", "current");
  const beforeSnap = await getDoc(rateRef);
  const beforeData = beforeSnap.exists() ? beforeSnap.data() : null;

  await setDoc(rateRef, {
    USD_CDF: value,
    updatedAt: serverTimestamp()
  });

  /* ================= AUDIT ================= */

  await addDoc(collection(db, "audit_logs"), {
    action: "UPDATE_EXCHANGE_RATE",
    collection: "exchange_rates",
    documentId: "current",

    performedBy: {
      uid: currentUser.uid,
      name: currentUser.name,
      role: currentUser.role,
      fonction: currentUser.fonction
    },

    before: beforeData,
    after: {
      USD_CDF: value
    },

    createdAt: serverTimestamp()
  });

  alert("Taux mis à jour avec succès.");

  await loadRate();
};
