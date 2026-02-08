fetch("../partials/sidebar.html")
  .then(res => {
    if (!res.ok) throw new Error("Sidebar introuvable");
    return res.text();
  })
  .then(html => {
    const container = document.getElementById("sidebar-container");
    container.innerHTML = html;

    const sidebar = document.getElementById("sidebar");
    const openBtn = document.getElementById("openSidebar");
    const closeBtn = document.getElementById("closeSidebar");

    // Mobile toggle
    openBtn?.addEventListener("click", () => {
      sidebar.classList.remove("collapsed");
    });

    closeBtn?.addEventListener("click", () => {
      sidebar.classList.add("collapsed");
    });

    // Desktop safety: sidebar visible by default
    if (window.innerWidth >= 768) {
      sidebar.classList.remove("collapsed");
    }
  })
  .catch(err => {
    console.error("Erreur sidebar :", err);
  });
