import { auth, db } from "./firebase.config.js";
import { onAuthStateChanged, signOut } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* DOM */
const table = document.getElementById("inventoryTable");
const addBtn = document.getElementById("addProductBtn");
const userNameEl = document.getElementById("userName");
const userRoleEl = document.getElementById("userRole");
const logoutBtn = document.getElementById("logoutBtn");

/* Auth guard */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../login.html";
    return;
  }

  // Charger profil utilisateur
  const userSnap = await getDoc(doc(db, "users", user.uid));
  if (!userSnap.exists()) return;

  const profile = userSnap.data();
  userNameEl.textContent = profile.username || "—";
  userRoleEl.textContent = profile.fonction || profile.role;

  // Rôles autorisés à ajouter
  if (profile.role === "admin" || profile.role === "directeur") {
    addBtn.classList.remove("d-none");
  }

  loadInventory();
});

/* Logout */
logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "../login.html";
});

/* Load inventory */
async function loadInventory() {
  table.innerHTML = `
    <tr>
      <td colspan="6" class="text-center text-muted">
        Chargement...
      </td>
    </tr>
  `;

  const snapshot = await getDocs(collection(db, "inventory"));
  table.innerHTML = "";

  if (snapshot.empty) {
    table.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted">
          Aucun produit enregistré
        </td>
      </tr>
    `;
    return;
  }

  snapshot.forEach(docSnap => {
    const p = docSnap.data();

    table.innerHTML += `
      <tr>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>${p.quantity}</td>
        <td>${p.unitPriceUSD ?? "—"}</td>
        <td>${p.unitPriceCDF ?? "—"}</td>
        <td>
          <button class="btn btn-sm btn-outline-secondary">
            Détails
          </button>
        </td>
      </tr>
    `;
  });
}
