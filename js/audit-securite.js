import { auth, db } from "./firebase.config.js";
import { 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ==========================================================
   DOM
========================================================== */
const pinScreen = document.getElementById("pinScreen");
const auditContent = document.getElementById("auditContent");
const pinInput = document.getElementById("pinInput");
const validatePinBtn = document.getElementById("validatePin");
const pinError = document.getElementById("pinError");

const auditTable = document.getElementById("auditTable");
const totalLogsEl = document.getElementById("totalLogs");
const approveCountEl = document.getElementById("approveCount");
const rejectCountEl = document.getElementById("rejectCount");
const deleteCountEl = document.getElementById("deleteCount");

const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const searchInput = document.getElementById("searchAudit");
const resetFiltersBtn = document.getElementById("resetFilters");

const logoutBtn = document.getElementById("logoutBtn");
const userNameEl = document.getElementById("userName");
const userRoleEl = document.getElementById("userRole");

/* ==========================================================
   VARIABLES
========================================================== */
let currentUser = null;
let auditCache = [];
let unlocked = false;

/* ==========================================================
   AUTH CHECK
========================================================== */
onAuthStateChanged(auth, async (user) => {

  if (!user) return location.replace("../login.html");

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return location.replace("../dashboard.html");

  const data = snap.data();

  userNameEl.textContent = data.name || "-";
  userRoleEl.textContent = data.role || "-";

  if (data.role !== "directeur") {
    alert("Accès réservé au Directeur.");
    return location.replace("../dashboard.html");
  }

  currentUser = data;
});

/* ==========================================================
   LOGOUT
========================================================== */
logoutBtn.onclick = async () => {
  await signOut(auth);
  location.replace("../login.html");
};

/* ==========================================================
   PIN VALIDATION
========================================================== */
validatePinBtn.addEventListener("click", async () => {

  const enteredPin = pinInput.value.trim();
  if (!enteredPin) return;

  const pinSnap = await getDoc(doc(db, "security", "director_pin"));

  if (!pinSnap.exists()) {
    pinError.textContent = "PIN non configuré.";
    pinError.classList.remove("hidden");
    return;
  }

  const correctPin = pinSnap.data().pin;

  if (enteredPin === correctPin) {

    unlocked = true;
    pinScreen.classList.add("hidden");
    auditContent.classList.remove("hidden");

    await loadAuditLogs();

  } else {
    pinError.textContent = "Code PIN incorrect.";
    pinError.classList.remove("hidden");
  }
});

/* ==========================================================
   LOAD AUDIT LOGS
========================================================== */
async function loadAuditLogs() {

  auditCache = [];

  const snap = await getDocs(collection(db, "audit_logs"));

  snap.forEach(d => {
    auditCache.push({ id: d.id, ...d.data() });
  });

  applyFilters();
}

/* ==========================================================
   FILTRAGE GLOBAL
========================================================== */
function applyFilters() {

  const startDate = startDateInput.value ? new Date(startDateInput.value) : null;
  const endDate = endDateInput.value ? new Date(endDateInput.value) : null;
  const searchTerm = searchInput.value.toLowerCase();

  const filtered = auditCache.filter(log => {

    const logDate = log.createdAt?.toDate
      ? log.createdAt.toDate()
      : null;

    if (!logDate) return false;

    if (startDate && logDate < startDate) return false;

    if (endDate) {
      const endDay = new Date(endDate);
      endDay.setHours(23,59,59,999);
      if (logDate > endDay) return false;
    }

    const matchSearch =
      log.action?.toLowerCase().includes(searchTerm) ||
      log.user?.name?.toLowerCase().includes(searchTerm) ||
      log.collection?.toLowerCase().includes(searchTerm);

    return matchSearch;
  });

  renderAuditTable(filtered);
  renderStats(filtered);
}

/* ==========================================================
   RENDER TABLE
========================================================== */
function renderAuditTable(data) {

  auditTable.innerHTML = "";

  if (data.length === 0) {
    auditTable.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-6 text-slate-400">
          Aucun log trouvé
        </td>
      </tr>`;
    return;
  }

  // tri décroissant
  data.sort((a,b) => {
    const d1 = a.createdAt?.toDate ? a.createdAt.toDate() : 0;
    const d2 = b.createdAt?.toDate ? b.createdAt.toDate() : 0;
    return d2 - d1;
  });

  data.forEach(log => {

    const date = log.createdAt?.toDate
      ? log.createdAt.toDate().toLocaleString()
      : "-";

    auditTable.innerHTML += `
      <tr class="hover:bg-slate-50 transition text-xs">

        <td class="px-4 py-2">${date}</td>

        <td class="px-4 py-2 font-semibold text-primary">
          ${log.action || "-"}
        </td>

        <td class="px-4 py-2">
          ${log.collection || "-"}
        </td>

        <td class="px-4 py-2">
          ${log.user?.name || "-"}
        </td>

        <td class="px-4 py-2 text-muted">
          ${log.user?.role || "-"}
        </td>

        <td class="px-4 py-2 text-muted">
          ${log.documentId || "-"}
        </td>

      </tr>
    `;
  });
}

/* ==========================================================
   RENDER STATS
========================================================== */
function renderStats(data) {

  totalLogsEl.textContent = data.length;

  let approve = 0;
  let reject = 0;
  let deleteCount = 0;

  data.forEach(log => {
    if (log.action === "APPROVE_TRANSACTION") approve++;
    if (log.action === "REJECT_TRANSACTION") reject++;
    if (log.action === "DELETE_TRANSACTION") deleteCount++;
  });

  approveCountEl.textContent = approve;
  rejectCountEl.textContent = reject;
  deleteCountEl.textContent = deleteCount;
}

/* ==========================================================
   EVENTS
========================================================== */
startDateInput.addEventListener("change", applyFilters);
endDateInput.addEventListener("change", applyFilters);
searchInput.addEventListener("input", applyFilters);

resetFiltersBtn.addEventListener("click", () => {
  startDateInput.value = "";
  endDateInput.value = "";
  searchInput.value = "";
  applyFilters();
});
