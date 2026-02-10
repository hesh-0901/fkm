fetch("../partials/sidebar.html")
  .then(res => {
    if (!res.ok) throw new Error("Sidebar introuvable");
    return res.text();
  })
  .then(html => {
    document.getElementById("sidebar-container").innerHTML = html;

    const toggleBtn = document.getElementById("sidebarToggleInternal");

    if (!toggleBtn) {
      console.error("Bouton sidebar introuvable");
      return;
    }

    toggleBtn.addEventListener("click", () => {
      if (window.innerWidth >= 768) {
        document.body.classList.toggle("sidebar-mini");
      } else {
        document.body.classList.toggle("sidebar-open");
      }
    });

    /* ACTIVE MENU AUTO */
    const currentPath = window.location.pathname;
    document.querySelectorAll(".sidebar .nav-link").forEach(link => {
      const linkPath = new URL(link.href, window.location.origin).pathname;
      if (currentPath.endsWith(linkPath)) {
        link.classList.add("active");
      }
    });

    /* RESET MOBILE ON RESIZE */
    window.addEventListener("resize", () => {
      if (window.innerWidth >= 768) {
        document.body.classList.remove("sidebar-open");
      }
    });
  })
  .catch(err => console.error("Erreur sidebar :", err));
