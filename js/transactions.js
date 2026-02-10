// js/transactions.js
import { auth, db } from "./firebase.config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ROLES */
const ROLES = {
  OPERATEUR: "operateur",
  DIRECTEUR: "directeur"
};

/* DOM */
const table = document.getElementById("txTable");
const newTxBtn = document.getElementById("newTxBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userNameEl = document.getElementById("userName");
const userRoleEl = document.getElementById("userRole");

const modal = new bootstrap.Modal(document.getElementById("txModal"));
const saveBtn = document.getElementById("saveTxBtn");

const txProduct = document.getElementById("txProduct");
const txType = document.getElementById("txType");
const txQty = document.getElementById("txQty");

const partnerSearch = document.getElementById("partnerSearch");
const partnerList = document.getElementById("partnerList");
const partnerId = document.getElementById("partnerId");
const partnerName = document.getElementById("partnerName");

let currentUser = null;
let partnersCache = [];

/* AUTH */
onAuthStateChanged(auth, async (user) => {
  if (!user) return location.replace("../login.html");

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return;

  const data = snap.data();

  currentUser = {
    uid: user.uid,
    name: data.name,
    fonction: data.fonction,
    role: data.role
  };

  userNameEl.textContent = currentUser.name;
  userRoleEl.textContent = currentUser.fonction;

  if ([ROLES.OPERATEUR, ROLES.DIRECTEUR].includes(currentUser.role)) {
    newTxBtn.classList.remove("d-none");
  }

  loadTransactions();
});

/* LOGOUT */
logoutBtn.onclick = async () => {
  await signOut(auth);
  location.replace("../login.html");
};

/* LOAD TRANSACTIONS */
async function loadTransactions() {
  table.innerHTML = "";
  const snap = await getDocs(collection(db, "transactions"));

  snap.forEach(d => {
    const t = d.data();
    table.innerHTML += `
      <tr>
        <td>${t.createdAt?.toDate().toLocaleString() || "—"}</td>
        <td>${t.productName}</td>
        <td>${t.type === "out" ? "Sortie" : "Entrée"}</td>
        <td>${t.quantity}</td>
        <td>${t.partner?.name || "—"}</td>
        <td>
          <span class="badge bg-${t.status === "pending" ? "warning" : "success"}">
            ${t.status}
          </span>
        </td>
        <td>${t.createdBy?.name || "—"}</td>
      </tr>
    `;
  });
}

/* OPEN MODAL */
newTxBtn.onclick = async () => {
  txProduct.innerHTML = "";
  partnerList.innerHTML = "";
  partnerSearch.value = "";
  partnerId.value = "";
  partnerName.value = "";

  const products = await getDocs(collection(db, "inventory"));
  products.forEach(d => {
    txProduct.innerHTML += `<option value="${d.id}">${d.data().name}</option>`;
  });

  await loadPartners();
  modal.show();
};

/* LOAD PARTNERS */
async function loadPartners() {
  partnersCache = [];
  partnerList.innerHTML = "";

  const type = txType.value === "out" ? "clients" : "fournisseurs";
  const snap = await getDocs(collection(db, type));

  snap.forEach(d => {
    if (d.data().status !== "ACTIVE") return;
    partnersCache.push({ id: d.id, name: d.data().name });
  });

  renderPartners("");
}

/* FILTER */
partnerSearch.oninput = () => {
  renderPartners(partnerSearch.value.toLowerCase());
};

function renderPartners(filter) {
  partnerList.innerHTML = "";

  partnersCache
    .filter(p => p.name.toLowerCase().includes(filter))
    .forEach(p => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "list-group-item list-group-item-action";
      btn.textContent = p.name;
      btn.onclick = () => {
        partnerId.value = p.id;
        partnerName.value = p.name;
        partnerSearch.value = p.name;
        partnerList.innerHTML = "";
      };
      partnerList.appendChild(btn);
    });
}

/* TYPE SWITCH */
txType.onchange = loadPartners;

/* SAVE */
saveBtn.onclick = async () => {
  if (!partnerId.value || txQty.value <= 0) return;

  const productSnap = await getDoc(doc(db, "inventory", txProduct.value));
  if (!productSnap.exists()) return;

  await addDoc(collection(db, "transactions"), {
    productId: txProduct.value,
    productName: productSnap.data().name,
    quantity: Number(txQty.value),
    type: txType.value,
    partner: {
      id: partnerId.value,
      name: partnerName.value,
      type: txType.value === "out" ? "client" : "fournisseur"
    },
    status: "pending",
    createdBy: {
      uid: currentUser.uid,
      name: currentUser.name,
      role: currentUser.role
    },
    createdAt: serverTimestamp()
  });

  modal.hide();
  loadTransactions();
};
