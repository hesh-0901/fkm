fetch("../partials/sidebar.html")
  .then(res => {
    if (!res.ok) throw new Error("Sidebar introuvable");
    return res.text();
  })
  .then(html => {
    document.getElementById("sidebar-container").innerHTML = html;

    const sidebar = document.getElementById("sidebar");
    const toggleBtn = document.getElementById("toggleSidebar");
    const closeBtn = document.getElementById("closeSidebar");
    const body = document.body;

    if (!sidebar) return;

    const isDesktop = () => window.innerWidth >= 768;

    /* =============================
       ÉTAT INITIAL
       ============================= */
    if (isDesktop()) {
      body.classList.remove("sidebar-hidden");
      sidebar.classList.remove("show");
    } else {
      body.classList.add("sidebar-hidden");
    }

    /* =============================
       TOGGLE SIDEBAR
       ============================= */
    toggleBtn?.addEventListener("click", () => {
      if (isDesktop()) {
        body.classList.toggle("sidebar-hidden");
      } else {
        sidebar.classList.toggle("show");
      }
    });

    /* =============================
       CLOSE (MOBILE)
       ============================= */
    closeBtn?.addEventListener("click", () => {
      sidebar.classList.remove("show");
    });

    /* =============================
       AUTO ACTIVE MENU
       ============================= */
    const currentPath = window.location.pathname;

    document.querySelectorAll("#sidebar a").forEach(link => {
      const href = link.getAttribute("href");
      if (!href) return;

      const linkPath = new URL(href, window.location.origin).pathname;

      if (currentPath.endsWith(linkPath)) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });

    /* =============================
       RESIZE HANDLER
       ============================= */
    window.addEventListener("resize", () => {
      if (isDesktop()) {
        sidebar.classList.remove("show");
      } else {
        body.classList.add("sidebar-hidden");
      }
    });
  })
  .catch(err => {
    console.error("Erreur sidebar :", err);
  });
