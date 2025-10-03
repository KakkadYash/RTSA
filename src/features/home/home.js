/**
 * Page Loader Module
 * Handles navigation, dynamic resource loading, and tab switching.
 */

document.addEventListener("DOMContentLoaded", () => {
  const PAGE_ROOT = "../../../src/features/";
  const contentArea = document.getElementById("content-area");
  const tabs = document.querySelectorAll(".nav-link");
  console.log(`Heres the button you clicked ${PAGE_ROOT}`)

  const pageFunctionMap = {
    dashboard: "loadDashboard",
    profile: "loadProfile",
    analytics: "loadAnalytics",
    history: "loadHistory",
    drillCatalog: "loadDrillCatalog",
    // Add more if needed
  };
 
  /**
   * Load HTML content into content area.
   */
  async function loadHTML(page) {
    const response = await fetch(`${PAGE_ROOT}${page}/${page}.html`);
    if (!response.ok) {
      throw new Error(`Failed to load ${page}.html`);
    }
    contentArea.innerHTML = await response.text();
  }

  /**
   * Dynamically load CSS file.
   */
  function loadCSS(page, cssFile) {
    removeElementById("dynamic-page-style");

    if (!cssFile) return;
    const cssEl = document.createElement("link");
    cssEl.id = "dynamic-page-style";
    cssEl.rel = "stylesheet";
    cssEl.href = `${PAGE_ROOT}${page}/${cssFile}`;
    console.log(`${PAGE_ROOT}${page}/${cssFile}`)
    document.head.appendChild(cssEl);
  }

  /**
   * Dynamically load JS file and execute page init function if defined.
   */
  function loadJS(page, jsFile) {
    removeElementById("dynamic-page-script");

    if (!jsFile) return;
    const jsEl = document.createElement("script");
    jsEl.id = "dynamic-page-script";
    jsEl.src = `${PAGE_ROOT}${page}/${jsFile}`;
    jsEl.onload = () => {
      const funcName = pageFunctionMap[page];
      if (funcName && typeof window[funcName] === "function") {
        window[funcName](); // Call page-specific init function
      }
    };
    jsEl.onerror = () => console.error(`Failed to load JS for ${page}`);
    document.body.appendChild(jsEl);
  }

  /**
   * Remove an existing element by ID (if present).
   */
  function removeElementById(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  /**
   * Handle tab click: load resources and toggle active state.
   */
  async function handleTabClick(link) {
    const page = link.dataset.page;
    const cssFile = link.dataset.css;
    const jsFile = link.dataset.js;

    if (!page) return;

    try {
      await loadHTML(page);
      loadCSS(page, cssFile);
      loadJS(page, jsFile);
      updateActiveTab(link);
    } catch (error) {
      console.error("Tab load error:", error);
      contentArea.innerHTML = `<p class="error">Failed to load page. Please try again later.</p>`;
    }
  }

  /**
   * Update active tab styling.
   */
  function updateActiveTab(activeLink) {
    tabs.forEach(tab => tab.classList.remove("active"));
    activeLink.classList.add("active");
  }

  // Attach event listeners to tabs
  tabs.forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      handleTabClick(link);
    });
  });
});

/**
 * Logout handler.
 */
function logout() {
  alert("Logging out...");
  window.location.href = "../../index.html";
}
