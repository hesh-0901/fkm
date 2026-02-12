import { auth, db } from "./firebase.config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   ROLES
========================= */
const ROLES = {
  OPERATEUR: "operateur",
  ADMIN: "admin",
  DIRECTEUR: "directeur"
};

/* =========================
   DOM
========================= */
const table = document.getElementById("inventoryTable");
const addBtn = document.getElementById("addProductBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userNameEl = document.getElementById("userName");
const userRoleEl = document.getElementById("userRole");

const searchInput = document.getElementById("inventorySearch");
const filterCategory = document.getElementById("filterCategory");
const filterStock = document.getElementById("filterStock");
const resetFilters = document.getElementById("resetFilters");

const modal = new bootstrap.Modal(document.getElementById("productModal"));
const saveBtn = document.getElementById("saveProductBtn");

const pName = document.getElementById("pName");
const pCategory = document.getElementById("pCategory");
const pQty = document.getElementById("pQty");
const pMinQty = document.getElementById("pMinQty");
const pCurrency = document.getElementById("pCurrency");
const pUsd = document.getElementById("pUsd");
const pCdf = document.getElementById("pCdf");
const usdBlock = document.getElementById("usdBlock");
const cdfBlock = document.getElementById("cdfBlock");
const productForm = document.getElementById("productForm");

/* =========================
   VARIABLES
========================= */
let currentUser = null;
let editingId = null;
let inventoryCache = [];

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

  if ([ROLES.OPERATEUR, ROLES.ADMIN, ROLES.DIRECTEUR].includes(currentUser.role)) {
    addBtn.classList.remove("d-none");
  }

  await loadInventory();
});

/* =========================
   LOGOUT
========================= */
logoutBtn.onclick = async () => {
  await signOut(auth);
  location.replace("../login.html");
};

/* =========================
   LOAD INVENTORY
========================= */
async function loadInventory() {
  inventoryCache = [];
  const snap = await getDocs(collection(db, "inventory"));

  snap.forEach(d => {
    inventoryCache.push({ id: d.id, ...d.data() });
  });

  populateCategoryFilter();
  applyFilters();
}

/* =========================
   REMPLIR FILTRE CATÉGORIE
========================= */
function populateCategoryFilter() {
  const categories = [...new Set(inventoryCache.map(p => p.category))];

  filterCategory.innerHTML = `<option value="">Toutes catégories</option>`;

  categories.forEach(cat => {
    filterCategory.innerHTML += `<option value="${cat}">${cat}</option>`;
  });
}

/* =========================
   FILTRAGE GLOBAL (EXCEL STYLE)
========================= */
function applyFilters() {
  const term = searchInput.value.toLowerCase();
  const selectedCategory = filterCategory.value;
  const stockFilter = filterStock.value;

  const filtered = inventoryCache.filter(p => {

    const matchSearch =
      p.name.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term);

    const matchCategory =
      selectedCategory === "" || p.category === selectedCategory;

    const isLow = p.quantity <= p.minQuantity;

    const matchStock =
      stockFilter === "" ||
      (stockFilter === "low" && isLow) ||
      (stockFilter === "ok" && !isLow);

    return matchSearch && matchCategory && matchStock;
  });

  renderTable(filtered);
}

/* =========================
   RENDER TABLE
========================= */
function renderTable(data) {
  table.innerHTML = "";

  if (data.length === 0) {
    table.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-6 text-muted">
          Aucun produit trouvé
        </td>
      </tr>`;
    return;
  }

  let index = 1;

  data.forEach(p => {
    const low = p.quantity <= p.minQuantity;

    table.innerHTML += `
      <tr class="hover:bg-slate-50 transition">
        <td class="px-6 py-4 font-semibold">${index++}</td>
        <td class="px-6 py-4 font-medium">${p.name}</td>
        <td class="px-6 py-4">${p.category}</td>
        <td class="px-6 py-4 text-center">${p.quantity}</td>
        <td class="px-6 py-4 text-center">${p.minQuantity}</td>
        <td class="px-6 py-4">
          ${p.pricing?.usd ? p.pricing.usd + " USD" : ""}
          ${p.pricing?.cdf ? " / " + p.pricing.cdf + " CDF" : ""}
        </td>
        <td class="px-6 py-4">
          <span class="badge bg-${low ? "danger" : "success"}">
            ${low ? "Stock faible" : "OK"}
          </span>
        </td>
        <td class="px-6 py-4 text-end">
          ${
            currentUser.role === ROLES.DIRECTEUR
              ? `
              <div class="dropdown">
                <button class="btn btn-sm btn-light" data-bs-toggle="dropdown">
                  <i class="bi bi-three-dots-vertical"></i>
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                  <li>
                    <a class="dropdown-item"
                       onclick="editItem('${p.id}')">
                       <i class="bi bi-pencil-square me-2 text-primary"></i>
                       Modifier
                    </a>
                  </li>
                  <li>
                    <a class="dropdown-item text-danger"
                       onclick="removeItem('${p.id}')">
                       <i class="bi bi-trash me-2"></i>
                       Supprimer
                    </a>
                  </li>
                </ul>
              </div>`
              : "-"
          }
        </td>
      </tr>
    `;
  });
}

/* =========================
   EVENTS FILTRE
========================= */
searchInput.addEventListener("input", applyFilters);
filterCategory.addEventListener("change", applyFilters);
filterStock.addEventListener("change", applyFilters);

resetFilters.addEventListener("click", () => {
  searchInput.value = "";
  filterCategory.value = "";
  filterStock.value = "";
  applyFilters();
});

/* =========================
   CREATE / UPDATE
========================= */
saveBtn.onclick = async () => {
  if (!currentUser) return;

  const data = {
    name: pName.value.trim(),
    category: pCategory.value.trim(),
    quantity: Number(pQty.value),
    minQuantity: Number(pMinQty.value),
    pricing: {
      mode: pCurrency.value,
      usd: Number(pUsd.value || 0),
      cdf: Number(pCdf.value || 0)
    },
    updatedAt: serverTimestamp()
  };

  if (editingId) {
    await updateDoc(doc(db, "inventory", editingId), data);
    editingId = null;
  } else {
    await addDoc(collection(db, "inventory"), {
      ...data,
      createdBy: {
        uid: currentUser.uid,
        name: currentUser.name,
        role: currentUser.role
      },
      createdAt: serverTimestamp()
    });
  }

  modal.hide();
  productForm.reset();
  await loadInventory();
};

/* =========================
   EDIT
========================= */
window.editItem = async (id) => {
  if (currentUser.role !== ROLES.DIRECTEUR) return;

  const snap = await getDoc(doc(db, "inventory", id));
  const p = snap.data();

  editingId = id;

  pName.value = p.name;
  pCategory.value = p.category;
  pQty.value = p.quantity;
  pMinQty.value = p.minQuantity;
  pUsd.value = p.pricing?.usd || "";
  pCdf.value = p.pricing?.cdf || "";

  modal.show();
};

/* =========================
   DELETE
========================= */
window.removeItem = async (id) => {
  if (currentUser.role !== ROLES.DIRECTEUR) return;
  if (!confirm("Supprimer ce produit ?")) return;

  await deleteDoc(doc(db, "inventory", id));
  await loadInventory();
};

/* =========================
   CURRENCY SWITCH
========================= */
pCurrency.onchange = () => {
  usdBlock.classList.toggle("d-none", pCurrency.value === "CDF");
  cdfBlock.classList.toggle("d-none", pCurrency.value === "USD");
};

addBtn.onclick = () => modal.show();
