// js/sidebar.js
const SIDEBAR_STATE_KEY = "fkm_sidebar_collapsed";

document.addEventListener("DOMContentLoaded", async () => {
  const sidebarContainer = document.getElementById("sidebar-container");
  if (!sidebarContainer) return;

  /* Load sidebar */
  const res = await fetch("../partials/sidebar.html");
  sidebarContainer.innerHTML = await res.text();

  const sidebar = document.getElementById("sidebar");
  const main = document.getElementById("mainContent");
  const overlay = document.getElementById("sidebarOverlay");

  const toggleTop = document.getElementById("toggleSidebar");
  const toggleInternal = document.getElementById("sidebarToggleInternal");

  const isDesktop = () => window.innerWidth >= 1024;

  /* INIT DESKTOP STATE */
  if (isDesktop()) {
    const collapsed =
      localStorage.getItem(SIDEBAR_STATE_KEY) === "true";
    applyDesktopState(collapsed);
  }

  /* EVENTS */
  toggleTop?.addEventListener("click", () => {
    if (isDesktop()) {
      toggleDesktop();
    } else {
      openMobile();
    }
  });

  toggleInternal?.addEventListener("click", () => {
    if (isDesktop()) toggleDesktop();
  });

  overlay?.addEventListener("click", closeMobile);

  window.addEventListener("resize", () => {
    if (isDesktop()) {
      closeMobile();
      const collapsed =
        localStorage.getItem(SIDEBAR_STATE_KEY) === "true";
      applyDesktopState(collapsed);
    }
  });

  /* DESKTOP */
  function toggleDesktop() {
    const collapsed = sidebar.classList.contains("w-20");
    applyDesktopState(!collapsed);
    localStorage.setItem(SIDEBAR_STATE_KEY, String(!collapsed));
  }

  function applyDesktopState(collapsed) {
    sidebar.classList.remove("-translate-x-full");

    if (collapsed) {
      sidebar.classList.remove("w-72");
      sidebar.classList.add("w-20");

      sidebar.querySelectorAll(".label").forEach(el =>
        el.classList.add("hidden")
      );

      main?.classList.add("lg:ml-20");
      main?.classList.remove("lg:ml-72");

      if (toggleInternal) toggleInternal.textContent = "❯";
    } else {
      sidebar.classList.remove("w-20");
      sidebar.classList.add("w-72");

      sidebar.querySelectorAll(".label").forEach(el =>
        el.classList.remove("hidden")
      );

      main?.classList.add("lg:ml-72");
      main?.classList.remove("lg:ml-20");

      if (toggleInternal) toggleInternal.textContent = "❮";
    }
  }

  /* MOBILE */
  function openMobile() {
    sidebar.classList.remove("-translate-x-full");
    overlay?.classList.remove("hidden");
  }

  function closeMobile() {
    sidebar.classList.add("-translate-x-full");
    overlay?.classList.add("hidden");
  }
});

