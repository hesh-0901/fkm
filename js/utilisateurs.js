import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { auth, db } from "./firebase.config.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* SECONDARY AUTH INSTANCE */
import firebaseConfig from "./firebase.config.js";

const secondaryApp = initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = getAuth(secondaryApp);

/* DOM */
const table = document.getElementById("usersTable");
const addBtn = document.getElementById("addUserBtn");
const logoutBtn = document.getElementById("logoutBtn");
const saveBtn = document.getElementById("saveUserBtn");

const uName = document.getElementById("uName");
const uUsername = document.getElementById("uUsername");
const uFonction = document.getElementById("uFonction");
const uRole = document.getElementById("uRole");
const uPassword = document.getElementById("uPassword");
const uConfirmPassword = document.getElementById("uConfirmPassword");

const modal = new bootstrap.Modal(document.getElementById("userModal"));

let currentUser = null;

/* AUTH */
onAuthStateChanged(auth, async (user) => {

  if (!user) return location.replace("../login.html");

  const snap = await getDoc(doc(db, "users", user.uid));
  currentUser = snap.data();

  if (currentUser.role === "directeur") {
    addBtn.classList.remove("hidden");
  }

  loadUsers();
});

/* CREATE USER */
saveBtn.onclick = async () => {

  if (currentUser.role !== "directeur") return;

  if (uPassword.value !== uConfirmPassword.value) {
    alert("Les mots de passe ne correspondent pas.");
    return;
  }

  if (uPassword.value.length < 6) {
    alert("Le mot de passe doit contenir au moins 6 caractères.");
    return;
  }

  const username = uUsername.value.trim().toLowerCase();
  const email = `${username}@fkmenergy.com`;

  try {

    const cred = await createUserWithEmailAndPassword(
      secondaryAuth,
      email,
      uPassword.value
    );

    await setDoc(doc(db, "users", cred.user.uid), {
      name: uName.value.trim(),
      username,
      fonction: uFonction.value.trim(),
      role: uRole.value,
      status: "active",
      createdAt: serverTimestamp()
    });

    modal.hide();
    loadUsers();

  } catch (err) {
    alert(err.message);
  }
};

/* LOAD USERS */
async function loadUsers() {

  table.innerHTML = "";

  const snap = await getDocs(collection(db, "users"));

  snap.forEach(d => {
    const u = d.data();

    table.innerHTML += `
      <tr>
        <td class="px-6 py-4">${u.name}</td>
        <td class="px-6 py-4">${u.username}</td>
        <td class="px-6 py-4">${u.fonction}</td>
        <td class="px-6 py-4">${u.role}</td>
        <td class="px-6 py-4">${u.status}</td>
        <td class="px-6 py-4 text-end">
          <button onclick="deleteUser('${d.id}')" class="text-danger text-sm">
            Supprimer
          </button>
        </td>
      </tr>
    `;
  });
}

/* DELETE */
window.deleteUser = async (id) => {
  if (currentUser.role !== "directeur") return;
  await deleteDoc(doc(db, "users", id));
  loadUsers();
};

addBtn.onclick = () => modal.show();
