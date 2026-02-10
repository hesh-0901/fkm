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

    if (!app || !sidebar) return;

    /* ===== ÉTAT INITIAL ===== */
    const isDesktop = () => window.innerWidth >= 768;

    if (isDesktop()) {
      sidebar.classList.remove("collapsed");
      app.classList.remove("sidebar-hidden");
    } else {
      sidebar.classList.add("collapsed");
    }

    /* ===== TOGGLE ===== */
    toggleBtn?.addEventListener("click", () => {
      if (isDesktop()) {
        app.classList.toggle("sidebar-hidden");
      } else {
        sidebar.classList.toggle("collapsed");
      }
    });

    /* ===== CLOSE (MOBILE) ===== */
    closeBtn?.addEventListener("click", () => {
      sidebar.classList.add("collapsed");
    });

    /* ===== ACTIVE MENU AUTO ===== */
    const currentPath = window.location.pathname;

    document.querySelectorAll(".sidebar .nav-link").forEach(link => {
      const href = link.getAttribute("href");
      if (!href) return;

      const linkPath = new URL(href, window.location.origin).pathname;

      if (currentPath.endsWith(linkPath)) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });

    /* ===== RESIZE HANDLER ===== */
    window.addEventListener("resize", () => {
      if (isDesktop()) {
        sidebar.classList.remove("collapsed");
      } else {
        sidebar.classList.add("collapsed");
        app.classList.remove("sidebar-hidden");
      }
    });
  })
  .catch(err => console.error("Erreur sidebar :", err));
