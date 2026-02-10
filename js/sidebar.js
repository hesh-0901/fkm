fetch("../partials/sidebar.html")
  .then(res => res.text())
  .then(html => {
    document.getElementById("sidebar-container").innerHTML = html;

    const toggleInternal = document.getElementById("sidebarToggleInternal");
    const toggleExternal = document.getElementById("toggleSidebar");

    const isDesktop = () => window.innerWidth >= 768;

    // ===== TOGGLE INTERNAL =====
    toggleInternal?.addEventListener("click", () => {
      document.body.classList.toggle("sidebar-collapsed");
    });

    // ===== TOGGLE TOPBAR (MOBILE) =====
    toggleExternal?.addEventListener("click", () => {
      document.body.classList.toggle("sidebar-open");
    });

    // ===== ACTIVE MENU =====
    const currentPath = window.location.pathname;
    document.querySelectorAll(".sidebar .nav-link").forEach(link => {
      const linkPath = new URL(link.href).pathname;
      if (currentPath.endsWith(linkPath)) {
        link.classList.add("active");
      }
    });

    // ===== RESET ON RESIZE =====
    window.addEventListener("resize", () => {
      if (isDesktop()) {
        document.body.classList.remove("sidebar-open");
      }
    });
  });
