import { auth, db } from "./firebase.config.js";
import {
onAuthStateChanged,
signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
collection,
getDocs,
addDoc,
updateDoc,
doc,
getDoc,
serverTimestamp,
increment
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* DOM */
const table = document.getElementById("txTable");
const newTxBtn = document.getElementById("newTxBtn");
const modal = new bootstrap.Modal(document.getElementById("txModal"));
const saveBtn = document.getElementById("saveTxBtn");

const txProduct = document.getElementById("txProduct");
const txQty = document.getElementById("txQty");
const partnerSearch = document.getElementById("partnerSearch");

const unitPriceEl = document.getElementById("unitPrice");
const currencyEl = document.getElementById("currency");
const totalPriceEl = document.getElementById("totalPrice");

let currentUser = null;
let productCache = {};

/* AUTH */
onAuthStateChanged(auth, async (user) => {
if (!user) return location.replace("../login.html");

currentUser = user;
loadProducts();
loadTransactions();
});

/* LOAD PRODUCTS */
async function loadProducts() {
txProduct.innerHTML = "";
const snap = await getDocs(collection(db, "inventory"));

snap.forEach(d => {
const p = d.data();
productCache[d.id] = p;
txProduct.innerHTML += `<option value="${d.id}">${p.name}</option>`;
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

const total = price * (Number(txQty.value) || 0);
totalPriceEl.textContent = total + " " + currency;
}

txProduct.onchange = updatePrice;
txQty.oninput = updatePrice;

/* SAVE */
saveBtn.onclick = async () => {

const p = productCache[txProduct.value];
if (!p || !txQty.value) return;

const price = p.pricing?.usd || p.pricing?.cdf || 0;
const currency = p.pricing?.usd ? "USD" : "CDF";
const total = price * Number(txQty.value);

/* AUTO NUMBER */
const year = new Date().getFullYear();
const txNumber = "TX-" + year + "-" + Date.now();
const invoiceNumber = "INV-" + year + "-" + Date.now();

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
createdBy: currentUser.uid,
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
: "bg-amber-100 text-amber-700"
}">
${t.status}
</span>
</td>
<td class="px-4 py-2 text-right space-x-2">

<button class="text-emerald-600"
onclick="validateTx('${d.id}')">
<i class="bi bi-check-circle"></i>
</button>

<button class="text-slate-600">
<i class="bi bi-pencil-square"></i>
</button>

<button class="text-indigo-600"
onclick="printInvoice('${d.id}')">
<i class="bi bi-printer"></i>
</button>

</td>
</tr>
`;
});
}

/* VALIDATION */
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

/* PRINT */
window.printInvoice = async (id) => {
const txSnap = await getDoc(doc(db, "transactions", id));
const tx = txSnap.data();

const win = window.open("", "_blank");
win.document.write(`
<h2>FKM ENERGY</h2>
<p>Facture: ${tx.invoiceNumber}</p>
<p>Client: ${tx.partnerName}</p>
<p>Produit: ${tx.productName}</p>
<p>Quantité: ${tx.quantity}</p>
<p>Total: ${tx.total} ${tx.currency}</p>
`);
win.print();
};

/* OPEN MODAL */
newTxBtn.onclick = () => modal.show();
