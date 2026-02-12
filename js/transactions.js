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

const table = document.getElementById("txTable");
const modal = new bootstrap.Modal(document.getElementById("txModal"));
const saveBtn = document.getElementById("saveTxBtn");
const newTxBtn = document.getElementById("newTxBtn");

const txProduct = document.getElementById("txProduct");
const txQty = document.getElementById("txQty");
const partnerSearch = document.getElementById("partnerSearch");

const unitPriceEl = document.getElementById("unitPrice");
const currencyEl = document.getElementById("currency");
const totalPriceEl = document.getElementById("totalPrice");

let productCache = {};
let currentUser = null;

/* AUTH */
onAuthStateChanged(auth, async (user) => {
if (!user) return location.replace("../login.html");
currentUser = user;
loadProducts();
loadTransactions();
});

/* LOAD PRODUCTS */
async function loadProducts() {
const snap = await getDocs(collection(db, "inventory"));
snap.forEach(d => {
productCache[d.id] = d.data();
txProduct.innerHTML += `<option value="${d.id}">${d.data().name}</option>`;
});
updatePrice();
}

/* UPDATE PRICE */
function updatePrice() {
const p = productCache[txProduct.value];
if (!p) return;

const price = p.pricing?.usd || p.pricing?.cdf || 0;
const currency = p.pricing?.usd ? "USD" : "CDF";

unitPriceEl.textContent = price;
currencyEl.textContent = currency;
totalPriceEl.textContent = (price * (txQty.value || 0)) + " " + currency;
}

txProduct.onchange = updatePrice;
txQty.oninput = updatePrice;

/* CREATE */
saveBtn.onclick = async () => {

const p = productCache[txProduct.value];
if (!p || !txQty.value) return;

const year = new Date().getFullYear();
const unique = Date.now();

const txNumber = `TX-${year}-${unique}`;
const invoiceNumber = `INV-${year}-${unique}`;

const price = p.pricing?.usd || p.pricing?.cdf || 0;
const currency = p.pricing?.usd ? "USD" : "CDF";
const total = price * Number(txQty.value);

await addDoc(collection(db, "transactions"), {
txNumber,
invoiceNumber,
productId: txProduct.value,
productName: p.name,
quantity: Number(txQty.value),
unitPrice: price,
total,
currency,
partnerName: partnerSearch.value,
status: "pending",
createdAt: serverTimestamp()
});

modal.hide();
loadTransactions();
};

/* LOAD TABLE */
async function loadTransactions() {
table.innerHTML = "";
const snap = await getDocs(collection(db, "transactions"));

snap.forEach(d => {
const t = d.data();

table.innerHTML += `
<tr class="hover:bg-slate-50">
<td class="px-4 py-2 font-medium">${t.txNumber}</td>
<td class="px-4 py-2">${t.createdAt?.toDate().toLocaleDateString() || "-"}</td>
<td class="px-4 py-2">${t.partnerName}</td>
<td class="px-4 py-2">${t.productName}</td>
<td class="px-4 py-2 text-right">${t.quantity}</td>
<td class="px-4 py-2 text-right font-semibold">${t.total} ${t.currency}</td>
<td class="px-4 py-2">
<span class="px-2 py-1 rounded-full text-xs ${
t.status === "approved"
? "bg-emerald-100 text-emerald-700"
: t.status === "rejected"
? "bg-red-100 text-red-700"
: "bg-amber-100 text-amber-700"
}">
${t.status}
</span>
</td>
<td class="px-4 py-2 text-right space-x-3">

<i class="bi bi-check-circle text-emerald-600 cursor-pointer"
onclick="validateTx('${d.id}')"></i>

<i class="bi bi-x-circle text-red-600 cursor-pointer"
onclick="rejectTx('${d.id}')"></i>

<i class="bi bi-pencil-square text-slate-600 cursor-pointer"></i>

<i class="bi bi-printer text-indigo-600 cursor-pointer"
onclick="printInvoice('${d.id}')"></i>

<i class="bi bi-trash text-red-500 cursor-pointer"
onclick="deleteTx('${d.id}')"></i>

</td>
</tr>
`;
});
}

/* VALIDATE */
window.validateTx = async (id) => {
const txSnap = await getDoc(doc(db, "transactions", id));
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
const t = txSnap.data();

const win = window.open("", "_blank");
win.document.write(`
<h2>FKM ENERGY</h2>
<p>Facture : ${t.invoiceNumber}</p>
<p>Client : ${t.partnerName}</p>
<p>Produit : ${t.productName}</p>
<p>Quantité : ${t.quantity}</p>
<p>Total : ${t.total} ${t.currency}</p>
`);
win.print();
};

newTxBtn.onclick = () => modal.show();
