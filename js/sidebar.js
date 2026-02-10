// js/sidebar.js

const SIDEBAR_STATE_KEY = "fkm_sidebar_collapsed";

document.addEventListener("DOMContentLoaded", async () => {
  const sidebarContainer = document.getElementById("sidebar-container");
  if (!sidebarContainer) return;

  /* 1️⃣ Load sidebar HTML */
  const res = await fetch("../partials/sidebar.html");
  sidebarContainer.innerHTML = await res.text();

  const sidebar = document.getElementById("sidebar");
  const main = document.getElementById("mainContent");

  const toggleTop = document.getElementById("toggleSidebar");
  const toggleInternal = document.getElementById("sidebarToggleInternal");

  /* 2️⃣ Initial state */
  const collapsed = localStorage.getItem(SIDEBAR_STATE_KEY) === "true";
  applySidebarState(collapsed);

  /* 3️⃣ Toggle events */
  toggleTop?.addEventListener("click", toggleSidebar);
  toggleInternal?.addEventListener("click", toggleSidebar);

  function toggleSidebar() {
    const isCollapsed = sidebar.classList.contains("w-20");
    applySidebarState(!isCollapsed);
    localStorage.setItem(SIDEBAR_STATE_KEY, String(!isCollapsed));
  }

  function applySidebarState(collapsed) {
    if (collapsed) {
      // Sidebar
      sidebar.classList.remove("w-72");
      sidebar.classList.add("w-20");

      // Hide labels
      sidebar.querySelectorAll(".label").forEach(el => {
        el.classList.add("hidden");
      });

      // Main spacing
      main?.classList.add("lg:ml-20");
      main?.classList.remove("lg:ml-72");

      // Arrow direction
      if (toggleInternal) toggleInternal.textContent = "❯";
    } else {
      sidebar.classList.remove("w-20");
      sidebar.classList.add("w-72");

      sidebar.querySelectorAll(".label").forEach(el => {
        el.classList.remove("hidden");
      });

      main?.classList.add("lg:ml-72");
      main?.classList.remove("lg:ml-20");

      if (toggleInternal) toggleInternal.textContent = "❮";
    }
  }
});
