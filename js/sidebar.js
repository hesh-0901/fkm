fetch("/partials/sidebar.html")
  .then(res => res.text())
  .then(html => {
    document.getElementById("sidebar-container").innerHTML = html;

    const sidebar = document.getElementById("sidebar");
    const openBtn = document.getElementById("openSidebar");
    const closeBtn = document.getElementById("closeSidebar");

    openBtn?.addEventListener("click", () => {
      sidebar.classList.remove("collapsed");
    });

    closeBtn?.addEventListener("click", () => {
      sidebar.classList.add("collapsed");
    });
  });
