/*js/audit-securite.js*/
import { auth, db } from "./firebase.config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  doc,
  getDoc,
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ===============================
   DOM
================================ */
const pinScreen = document.getElementById("pinScreen");
const auditContent = document.getElementById("auditContent");
const pinInput = document.getElementById("pinInput");
const validateBtn = document.getElementById("validatePin");
const pinError = document.getElementById("pinError");

const totalLogsEl = document.getElementById("totalLogs");
const approveCountEl = document.getElementById("approveCount");
const rejectCountEl = document.getElementById("rejectCount");
const deleteCountEl = document.getElementById("deleteCount");
const auditTable = document.getElementById("auditTable");

/* ===============================
   VARIABLES
================================ */
let currentUser = null;
let attempts = 0;
let lockUntil = null;
let auditUnsubscribe = null;

/* ===============================
   AUTH
================================ */
onAuthStateChanged(auth, async (user) => {

  if (!user) return location.replace("../login.html");

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return location.replace("../login.html");

  const data = snap.data();

  if (data.role !== "directeur") {
    alert("Accès réservé aux directeurs.");
    return location.replace("../dashboard.html");
  }

  currentUser = {
    uid: user.uid,
    name: data.name,
    role: data.role
  };
});

/* ===============================
   PIN VALIDATION
================================ */
validateBtn.onclick = async () => {

  if (lockUntil && Date.now() < lockUntil) {
    const remaining = Math.ceil((lockUntil - Date.now()) / 1000);
    showError(`Trop de tentatives. Réessayez dans ${remaining}s.`);
    return;
  }

  const enteredPin = pinInput.value.trim();
  if (!enteredPin) return;

  const snap = await getDoc(doc(db, "settings", "security"));
  if (!snap.exists()) return showError("PIN non configuré.");

  const realPin = snap.data().auditPin;

  if (enteredPin === realPin.toString()) {

    await logPinAttempt(true);

    pinScreen.classList.add("hidden");
    auditContent.classList.remove("hidden");

    loadAuditLogs();

  } else {

    attempts++;
    await logPinAttempt(false);

    if (attempts >= 3) {
      lockUntil = Date.now() + 2 * 60 * 1000; // 2 minutes
      attempts = 0;
      showError("Trop de tentatives. Blocage temporaire 2 minutes.");
    } else {
      showError(`PIN incorrect. Tentative ${attempts}/3`);
    }
  }

  pinInput.value = "";
};

/* ===============================
   LOG PIN ATTEMPTS
================================ */
async function logPinAttempt(success) {

  await addDoc(collection(db, "audit_logs"), {
    action: success ? "PIN_SUCCESS" : "PIN_FAILED",
    collection: "security",
    performedBy: {
      uid: currentUser.uid,
      name: currentUser.name,
      role: currentUser.role
    },
    createdAt: serverTimestamp()
  });
}

/* ===============================
   LOAD AUDIT LOGS
================================ */
function loadAuditLogs() {

  if (auditUnsubscribe) auditUnsubscribe();

  auditUnsubscribe = onSnapshot(collection(db, "audit_logs"), (snap) => {

    let total = 0;
    let approve = 0;
    let reject = 0;
    let deleteCount = 0;

    auditTable.innerHTML = "";

    snap.forEach(doc => {

      const log = doc.data();
      total++;

      if (log.action === "APPROVE_TRANSACTION") approve++;
      if (log.action === "REJECT_TRANSACTION") reject++;
      if (log.action === "DELETE_TRANSACTION") deleteCount++;

      const date = log.createdAt?.toDate().toLocaleString() || "-";

      auditTable.innerHTML += `
        <tr class="hover:bg-slate-50">
          <td class="px-6 py-4">${date}</td>
          <td class="px-6 py-4 font-medium">${log.action}</td>
          <td class="px-6 py-4">${log.collection || "-"}</td>
          <td class="px-6 py-4">${log.performedBy?.name || "-"}</td>
          <td class="px-6 py-4">${log.performedBy?.role || "-"}</td>
        </tr>
      `;
    });

    totalLogsEl.textContent = total;
    approveCountEl.textContent = approve;
    rejectCountEl.textContent = reject;
    deleteCountEl.textContent = deleteCount;

  });
}

/* ===============================
   ERROR DISPLAY
================================ */
function showError(message) {
  pinError.textContent = message;
  pinError.classList.remove("hidden");
}
