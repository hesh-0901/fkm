/*js/taux-devises.js*/
import { auth, db } from "./firebase.config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   DOM
========================= */

const logoutBtn = document.getElementById("logoutBtn");
const userNameEl = document.getElementById("userName");
const userRoleEl = document.getElementById("userRole");

const usdCdfRate = document.getElementById("usdCdfRate");
const saveRateBtn = document.getElementById("saveRateBtn");
const openRateModalBtn = document.getElementById("openRateModalBtn");
const ratesTable = document.getElementById("ratesTable");

const modal = new bootstrap.Modal(document.getElementById("rateModal"));

/* =========================
   STATE
========================= */

let currentUser = null;

/* =========================
   AUTH
========================= */

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

  if (currentUser.role !== "directeur") {
    alert("Accès réservé au directeur.");
    location.replace("../admin/dashboard.html");
    return;
  }

  await loadRatesHistory();
});

/* =========================
   LOGOUT
========================= */

logoutBtn.onclick = async () => {
  await signOut(auth);
  location.replace("../login.html");
};

/* =========================
   LOAD HISTORY
========================= */

async function loadRatesHistory() {

  const q = query(
    collection(db, "audit_logs"),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);

  const logs = snap.docs
    .map(d => d.data())
    .filter(l => l.action === "UPDATE_EXCHANGE_RATE");

  renderTable(logs);
}

/* =========================
   RENDER TABLE
========================= */

function renderTable(data) {

  if (!data.length) {
    ratesTable.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-6 text-muted">
          Aucun historique trouvé
        </td>
      </tr>
    `;
    return;
  }

  ratesTable.innerHTML = data.map((l, index) => `
      <tr class="text-sm">
        <td class="px-6 py-4">${index + 1}</td>
        <td class="px-6 py-4 font-semibold">${l.after?.USD_CDF}</td>
        <td class="px-6 py-4">${l.performedBy?.name}</td>
        <td class="px-6 py-4">${l.performedBy?.role}</td>
        <td class="px-6 py-4">
          ${l.createdAt?.toDate().toLocaleString() || "-"}
        </td>
      </tr>
  `).join("");
}

/* =========================
   SAVE RATE + AUDIT
========================= */

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

  modal.hide();
  usdCdfRate.value = "";

  await loadRatesHistory();
};

/* =========================
   OPEN MODAL
========================= */

openRateModalBtn.onclick = () => modal.show();
