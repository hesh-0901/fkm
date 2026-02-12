// ===============================
// FKM ENERGY - TRANSACTIONS JS
// ===============================

const txTable = document.getElementById("txTable");
const txSearch = document.getElementById("txSearch");
const statusFilter = document.getElementById("statusFilter");
const quickDateFilter = document.getElementById("quickDateFilter");
const startDate = document.getElementById("startDate");
const endDate = document.getElementById("endDate");
const resetFilters = document.getElementById("resetFilters");

const newTxBtn = document.getElementById("newTxBtn");
const saveTxBtn = document.getElementById("saveTxBtn");

const productSearch = document.getElementById("productSearch");
const productResults = document.getElementById("productResults");
const partnerSearch = document.getElementById("partnerSearch");
const txQty = document.getElementById("txQty");
const unitPrice = document.getElementById("unitPrice");
const totalPrice = document.getElementById("totalPrice");

const txModal = new bootstrap.Modal(document.getElementById("txModal"));

let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
let products = JSON.parse(localStorage.getItem("products")) || [
  { id: 1, name: "Diesel Premium", price: 750 },
  { id: 2, name: "Essence Super", price: 820 },
  { id: 3, name: "Lubrifiant X", price: 1500 }
];

let selectedProduct = null;

// ===============================
// INIT
// ===============================

document.addEventListener("DOMContentLoaded", () => {
  renderTransactions();
  attachEvents();
});

// ===============================
// EVENTS
// ===============================

function attachEvents() {

  newTxBtn.classList.remove("d-none");

  newTxBtn.addEventListener("click", () => {
    resetForm();
    txModal.show();
  });

  txQty.addEventListener("input", calculateTotal);

  productSearch.addEventListener("input", searchProducts);

  saveTxBtn.addEventListener("click", saveTransaction);

  txSearch.addEventListener("input", renderTransactions);
  statusFilter.addEventListener("change", renderTransactions);
  quickDateFilter.addEventListener("change", renderTransactions);
  startDate.addEventListener("change", renderTransactions);
  endDate.addEventListener("change", renderTransactions);

  resetFilters.addEventListener("click", () => {
    txSearch.value = "";
    statusFilter.value = "ALL";
    quickDateFilter.value = "ALL";
    startDate.value = "";
    endDate.value = "";
    renderTransactions();
  });
}

// ===============================
// RENDER TABLE
// ===============================

function renderTransactions() {

  txTable.innerHTML = "";

  let filtered = filterTransactions();

  if (filtered.length === 0) {
    txTable.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-4 text-muted">
          Aucune transaction trouvée
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach((tx, index) => {

    const row = document.createElement("tr");

    row.innerHTML = `
      <td class="px-6 py-4">${index + 1}</td>
      <td class="px-6 py-4 fw-semibold">${tx.invoice}</td>
      <td class="px-6 py-4">${formatDate(tx.date)}</td>
      <td class="px-6 py-4">${tx.client}</td>
      <td class="px-6 py-4">${tx.product}</td>
      <td class="px-6 py-4 text-center">${tx.qty}</td>
      <td class="px-6 py-4 fw-semibold">${formatCurrency(tx.total)}</td>
      <td class="px-6 py-4">${renderStatus(tx.status)}</td>
      <td class="px-6 py-4 text-end">
        <button class="btn btn-sm btn-danger" onclick="deleteTx('${tx.id}')">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;

    txTable.appendChild(row);
  });
}

// ===============================
// FILTERS
// ===============================

function filterTransactions() {

  let result = [...transactions];

  const search = txSearch.value.toLowerCase();

  if (search) {
    result = result.filter(tx =>
      tx.invoice.toLowerCase().includes(search) ||
      tx.client.toLowerCase().includes(search) ||
      tx.product.toLowerCase().includes(search)
    );
  }

  if (statusFilter.value !== "ALL") {
    result = result.filter(tx => tx.status === statusFilter.value);
  }

  if (quickDateFilter.value !== "ALL") {
    const now = new Date();

    if (quickDateFilter.value === "TODAY") {
      result = result.filter(tx =>
        new Date(tx.date).toDateString() === now.toDateString()
      );
    }

    if (quickDateFilter.value === "7DAYS") {
      const past = new Date();
      past.setDate(now.getDate() - 7);
      result = result.filter(tx => new Date(tx.date) >= past);
    }

    if (quickDateFilter.value === "30DAYS") {
      const past = new Date();
      past.setDate(now.getDate() - 30);
      result = result.filter(tx => new Date(tx.date) >= past);
    }
  }

  if (startDate.value && endDate.value) {
    result = result.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= new Date(startDate.value) &&
             txDate <= new Date(endDate.value);
    });
  }

  return result;
}

// ===============================
// SAVE TRANSACTION
// ===============================

function saveTransaction() {

  if (!selectedProduct || !partnerSearch.value || !txQty.value) {
    alert("Veuillez remplir tous les champs");
    return;
  }

  const newTx = {
    id: crypto.randomUUID(),
    invoice: "FAC-" + Date.now(),
    date: new Date().toISOString(),
    client: partnerSearch.value,
    product: selectedProduct.name,
    qty: parseInt(txQty.value),
    total: parseInt(totalPrice.value),
    status: "PENDING"
  };

  transactions.push(newTx);
  localStorage.setItem("transactions", JSON.stringify(transactions));

  txModal.hide();
  renderTransactions();
}

// ===============================
// DELETE
// ===============================

window.deleteTx = function(id) {
  if (!confirm("Supprimer cette transaction ?")) return;

  transactions = transactions.filter(tx => tx.id !== id);
  localStorage.setItem("transactions", JSON.stringify(transactions));
  renderTransactions();
};

// ===============================
// PRODUCTS
// ===============================

function searchProducts() {

  const query = productSearch.value.toLowerCase();
  productResults.innerHTML = "";

  if (!query) return;

  const results = products.filter(p =>
    p.name.toLowerCase().includes(query)
  );

  results.forEach(p => {
    const item = document.createElement("a");
    item.className = "list-group-item list-group-item-action";
    item.textContent = `${p.name} - ${formatCurrency(p.price)}`;

    item.onclick = () => {
      selectedProduct = p;
      productSearch.value = p.name;
      unitPrice.value = p.price;
      productResults.innerHTML = "";
      calculateTotal();
    };

    productResults.appendChild(item);
  });
}

// ===============================
// UTILS
// ===============================

function calculateTotal() {
  if (!selectedProduct || !txQty.value) return;
  totalPrice.value = selectedProduct.price * txQty.value;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("fr-FR").format(value) + " FCFA";
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("fr-FR");
}

function renderStatus(status) {

  const map = {
    PENDING: "badge bg-warning text-dark",
    APPROVED: "badge bg-success",
    REJECTED: "badge bg-danger"
  };

  return `<span class="${map[status]}">${status}</span>`;
}

function resetForm() {
  selectedProduct = null;
  productSearch.value = "";
  partnerSearch.value = "";
  txQty.value = "";
  unitPrice.value = "";
  totalPrice.value = "";
}
