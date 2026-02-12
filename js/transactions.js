import { auth, db } from "./firebase.config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  increment
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* DOM */
const table = document.getElementById("txTable");
const modal = new bootstrap.Modal(document.getElementById("txModal"));
const saveBtn = document.getElementById("saveTxBtn");
const newTxBtn = document.getElementById("newTxBtn");

const txProduct = document.getElementById("txProduct");
const txQty = document.getElementById("txQty");
const partnerSearch = document.getElementById("partnerSearch");
const unitPrice = document.getElementById("unitPrice");
const totalPrice = document.getElementById("totalPrice");

/* DATA */
let productCache = {};
let currentUser = null;

/* AUTH */
onAuthStateChanged(auth, async (user) => {
  if (!user) return location.replace("../login.html");

  currentUser = user;
  newTxBtn.classList.remove("d-none");

  await loadProducts();
  await loadTransactions();
});

/* LOAD PRODUCTS */
async function loadProducts() {
  txProduct.innerHTML = "";
  productCache = {};

  const snap = await getDocs(collection(db, "inventory"));

  snap.forEach(d => {
    productCache[d.id] = d.data();
    txProduct.innerHTML += `
      <option value="${d.id}">
        ${d.data().name}
      </option>
    `;
  });

  updatePrice();
}

/* AUTO CALCUL */
function updatePrice() {
  const p = productCache[txProduct.value];
  if (!p) return;

  const price = p.pricing?.usd || p.pricing?.cdf || 0;
  const qty = Number(txQty.value) || 0;

  unitPrice.value = price;
  totalPrice.value = price * qty;
}

txProduct.onchange = updatePrice;
txQty.oninput = updatePrice;

/* CREATE TRANSACTION */
saveBtn.onclick = async () => {

  const p = productCache[txProduct.value];
  if (!p || !txQty.value) return;

  const year = new Date().getFullYear();
  const unique = Date.now();

  const txNumber = `TX-${year}-${unique}`;
  const invoiceNumber = `INV-${year}-${unique}`;

  const price = p.pricing?.usd || p.pricing?.cdf || 0;
  const currency = p.pricing?.usd ? "USD" : "CDF";
  const quantity = Number(txQty.value);
  const total = price * quantity;

  await addDoc(collection(db, "transactions"), {
    txNumber,
    invoiceNumber,
    productId: txProduct.value,
    productName: p.name,
    quantity,
    unitPrice: price,
    total,
    currency,
    partnerName: partnerSearch.value || "Client direct",
    status: "pending",
    createdBy: currentUser.uid,
    createdAt: serverTimestamp()
  });

  modal.hide();
  document.getElementById("txForm").reset();
  updatePrice();
  loadTransactions();
};

/* LOAD TABLE */
async function loadTransactions() {
  table.innerHTML = "";

  const snap = await getDocs(collection(db, "transactions"));

  if (snap.empty) {
    table.innerHTML = `
      <tr>
        <td colspan="9" class="text-center text-muted py-3">
          Aucune transaction enregistrée
        </td>
      </tr>
    `;
    return;
  }

  snap.forEach(d => {
    const t = d.data();

    table.innerHTML += `
      <tr>
        <td class="px-4 py-3">${t.txNumber}</td>
        <td class="px-4 py-3">${t.invoiceNumber}</td>
        <td class="px-4 py-3">
          ${t.createdAt?.toDate().toLocaleDateString() || "-"}
        </td>
        <td class="px-4 py-3">${t.partnerName}</td>
        <td class="px-4 py-3">${t.productName}</td>
        <td class="px-4 py-3">${t.quantity}</td>
        <td class="px-4 py-3">
          ${t.total} ${t.currency}
        </td>
        <td class="px-4 py-3">
          <span class="badge bg-${
            t.status === "approved" ? "success" :
            t.status === "rejected" ? "danger" :
            "warning"
          }">
            ${t.status}
          </span>
        </td>
        <td class="px-4 py-3 text-end">

          <i class="bi bi-check-circle text-success me-2 cursor-pointer"
            onclick="validateTx('${d.id}')"></i>

          <i class="bi bi-x-circle text-danger me-2 cursor-pointer"
            onclick="rejectTx('${d.id}')"></i>

          <i class="bi bi-printer text-primary me-2 cursor-pointer"
            onclick="printInvoice('${d.id}')"></i>

          <i class="bi bi-trash text-danger cursor-pointer"
            onclick="deleteTx('${d.id}')"></i>

        </td>
      </tr>
    `;
  });
}

/* VALIDATE */
window.validateTx = async (id) => {

  const txSnap = await getDoc(doc(db, "transactions", id));
  if (!txSnap.exists()) return;

  const tx = txSnap.data();
  if (tx.status !== "pending") return;

  await updateDoc(doc(db, "inventory", tx.productId), {
    quantity: increment(-tx.quantity)
  });

  await updateDoc(doc(db, "transactions", id), {
    status: "approved"
  });

  loadTransactions();
};

/* REJECT */
window.rejectTx = async (id) => {
  await updateDoc(doc(db, "transactions", id), {
    status: "rejected"
  });

  loadTransactions();
};

/* DELETE */
window.deleteTx = async (id) => {
  if (!confirm("Supprimer cette transaction ?")) return;

  await deleteDoc(doc(db, "transactions", id));
  loadTransactions();
};

/* PRINT */
window.printInvoice = async (id) => {

  const txSnap = await getDoc(doc(db, "transactions", id));
  if (!txSnap.exists()) return;

  const t = txSnap.data();

  const win = window.open("", "_blank");
  win.document.write(`
    <h3>FKM ENERGY</h3>
    <hr>
    <p><strong>Facture :</strong> ${t.invoiceNumber}</p>
    <p><strong>Client :</strong> ${t.partnerName}</p>
    <p><strong>Produit :</strong> ${t.productName}</p>
    <p><strong>Quantité :</strong> ${t.quantity}</p>
    <p><strong>Total :</strong> ${t.total} ${t.currency}</p>
  `);
  win.print();
};

newTxBtn.onclick = () => modal.show();
