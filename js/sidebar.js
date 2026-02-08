// IMPORTANT : chemin RELATIF pour GitHub Pages
fetch("../partials/sidebar.html")
  .then(response => {
    if (!response.ok) {
      throw new Error("Sidebar introuvable");
    }
    return response.text();
  })
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
  })
  .catch(err => {
    console.error("Erreur chargement sidebar :", err);
  });
