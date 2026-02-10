fetch("../partials/sidebar.html")
  .then(res => res.text())
  .then(html => {
    document.getElementById("sidebar-container").innerHTML = html;

    const toggleBtn = document.getElementById("sidebarToggleInternal");

    toggleBtn.addEventListener("click", () => {
      document.body.classList.toggle("sidebar-collapsed");
    });

    /* ACTIVE LINK */
    const path = window.location.pathname;
    document.querySelectorAll(".sidebar-link").forEach(link => {
      if (path.endsWith(link.getAttribute("href"))) {
        link.classList.add("active");
      }
    });
  });
