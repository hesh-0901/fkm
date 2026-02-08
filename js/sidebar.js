fetch("../partials/sidebar.html")
  .then(res => {
    if (!res.ok) throw new Error("Sidebar introuvable");
    return res.text();
  })
  .then(html => {
    document.getElementById("sidebar-container").innerHTML = html;

    const app = document.querySelector(".app");
    const sidebar = document.getElementById("sidebar");
    const toggleBtn = document.getElementById("toggleSidebar");
    const closeBtn = document.getElementById("closeSidebar");

    /* Toggle sidebar (desktop & mobile) */
    toggleBtn?.addEventListener("click", () => {
      if (window.innerWidth >= 768) {
        // Desktop: push layout
        app.classList.toggle("sidebar-hidden");
      } else {
        // Mobile: overlay
        sidebar.classList.remove("collapsed");
      }
    });

    // === Etat initial selon la taille d'écran ===
const app = document.querySelector(".app");
const sidebar = document.getElementById("sidebar");

if (window.innerWidth >= 768) {
  // Desktop : sidebar visible
  sidebar.classList.remove("collapsed");
  app.classList.remove("sidebar-hidden");
} else {
  // Mobile : sidebar cachée
  sidebar.classList.add("collapsed");
}


    /* Close sidebar (mobile) */
    closeBtn?.addEventListener("click", () => {
      sidebar.classList.add("collapsed");
    });

    /* Initial state */
    if (window.innerWidth < 768) {
      sidebar.classList.add("collapsed");
    } else {
      app.classList.remove("sidebar-hidden");
    }
  })
  .catch(err => {
    console.error("Erreur sidebar :", err);
  });
