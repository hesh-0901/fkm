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

    if (!app || !sidebar) {
      console.error("App ou sidebar introuvable");
      return;
    }

    /* ===== ÉTAT INITIAL ===== */
    if (window.innerWidth >= 768) {
      // Desktop : sidebar visible
      sidebar.classList.remove("collapsed");
      app.classList.remove("sidebar-hidden");
    } else {
      // Mobile : sidebar cachée
      sidebar.classList.add("collapsed");
    }

    /* ===== TOGGLE SIDEBAR ===== */
    toggleBtn?.addEventListener("click", () => {
      if (window.innerWidth >= 768) {
        // Desktop : push / retract
        app.classList.toggle("sidebar-hidden");
      } else {
        // Mobile : overlay
        sidebar.classList.toggle("collapsed");
      }
    });

    /* ===== CLOSE SIDEBAR (mobile) ===== */
    closeBtn?.addEventListener("click", () => {
      sidebar.classList.add("collapsed");
    });
  })
  .catch(err => {
    console.error("Erreur sidebar :", err);
  });
