/**
 * Page Loader Module
 * Handles navigation, dynamic resource loading, and tab switching.
 */

document.addEventListener("DOMContentLoaded", () => {
  const PAGE_ROOT = "../../../src/features/";
  const contentArea = document.getElementById("content-area");
  const tabs = document.querySelectorAll(".nav-link");
  // 🔹 Background parallax for elements with .parallax-bg
  function initParallax() {
    const SPEED = 0.15; // lower = more subtle

    window.addEventListener(
      "scroll",
      () => {
        const scrollY = window.scrollY || window.pageYOffset || 0;
        document.querySelectorAll(".parallax-bg").forEach(el => {
          el.style.transform = `translateY(${scrollY * SPEED * -1}px)`;
        });
      },
      { passive: true }
    );
  }

  initParallax();

  // 🔹 Create sliding underline inside the sidebar nav
  const nav = document.querySelector("aside nav");
  let navIndicator = null;
  if (nav) {
    navIndicator = document.createElement("div");
    navIndicator.id = "nav-indicator";
    nav.appendChild(navIndicator);
  }

  function moveIndicator(activeLink) {
    if (!navIndicator || !activeLink) return;

    // Height of each tab
    const tabHeight = activeLink.offsetHeight;

    // Position the bottom of the dashed underline
    navIndicator.style.top = `${activeLink.offsetTop + tabHeight - 3}px`;

    navIndicator.style.opacity = "1";
  }



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
    jsEl.type = "module";
    jsEl.src = `${PAGE_ROOT}${page}/${jsFile}`;
    jsEl.onload = () => {
      const funcName = pageFunctionMap[page];
      if (funcName && typeof window[funcName] === "function") {
        // Defer execution to next browser paint to ensure injected DOM exists
        requestAnimationFrame(() => {
          window[funcName]();
        });
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
    if (el) {
      // 🧹 Dispatch cleanup event before removing analytics
      if (id === "dynamic-page-script") {
        window.dispatchEvent(new Event("beforeunloadAnalytics"));
      }
      el.remove();
    }
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
      // 1️⃣Darkening background starts
      document.getElementById("transition-overlay").style.background = "rgba(0,0,0,0.6)";
      contentArea.classList.add("page-exit");

      // ⏱ Wait for exit animation to fully finish (1.5s)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 2️⃣ Load new page content
      await loadHTML(page);
      loadCSS(page, cssFile);
      loadJS(page, jsFile);
      updateActiveTab(link);
      // Add stagger animation to all children after HTML is loaded
      const children = [...contentArea.querySelectorAll("*")].filter(el => el.tagName !== "SCRIPT");

      children.forEach((el, index) => {
        el.classList.add("stagger-child");
        setTimeout(() => {
          el.classList.add("visible");
        }, index * 10);  // 60ms delay per element (adjust to taste)
      });

      // 3️⃣ Set new page into initial hidden state
      contentArea.classList.add("page-enter");

      // 4️⃣ Animate it into view
      requestAnimationFrame(() => {
        contentArea.classList.add("page-enter-active");
        contentArea.classList.remove("page-exit");

        // Remove dark background when new page starts appearing
        document.getElementById("transition-overlay").style.background = "rgba(0,0,0,0)";
      });


      // 5️⃣ Cleanup classes after animation ends (1.5s)
      setTimeout(() => {
        contentArea.classList.remove("page-enter", "page-enter-active");
      }, 500);

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
    moveIndicator(activeLink); // 🔥 animate underline to this tab
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
  window.location.href = "../../../index.html";
}
