fetch("../partials/sidebar.html")
  .then(r => r.text())
  .then(html => {
    document.getElementById("sidebar-container").innerHTML = html;

    const toggle = document.getElementById("sidebarToggleInternal");

    toggle.addEventListener("click", () => {
      document.body.classList.toggle("sidebar-open");
    });

    // Active menu auto
    const currentPath = location.pathname;
    document.querySelectorAll(".sidebar .nav-link").forEach(link => {
      if (currentPath.endsWith(link.getAttribute("href"))) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });
  });
