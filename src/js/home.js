document.addEventListener("DOMContentLoaded", function () {
  const tabs = document.querySelectorAll(".nav-link");
  const userId = localStorage.getItem("user_id");

  const PAGE_ROOT = "../../src/pages/";
  const CSS_ROOT = "../../src/css/";
  const JS_ROOT = "../../src/js/";

  // Optional: dynamic page → function mapping override
  const pageFunctionMap = {
    dashboard: "loadDashboard",
    profile: "loadProfile",
    analytics: "loadAnalytics",
    history: "loadHistory",
    drillCatalog: "loadDrillCatalog"
    // Add more if needed
  };


  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", async (e) => {
      e.preventDefault();
      const page = link.getAttribute("data-page");
      const cssFile = link.getAttribute("data-css");
      const jsFile = link.getAttribute("data-js");


      if (!page) return;

      try {
        // Load HTML content
        const htmlRes = await fetch(`${PAGE_ROOT}${page}/${page}.html`);
        if (!htmlRes.ok) throw new Error(`Failed to load ${page}.html`);
        const html = await htmlRes.text();
        document.getElementById("content-area").innerHTML = html;

        // Load CSS (if specified)
        const oldStyle = document.getElementById("dynamic-page-style");
        if (oldStyle) oldStyle.remove();

        if (cssFile) {
          const cssEl = document.createElement("link");
          cssEl.id = "dynamic-page-style";
          cssEl.rel = "stylesheet";
          cssEl.href = `${CSS_ROOT}${cssFile}`;
          document.head.appendChild(cssEl);
        }

        // Load JS (if specified)
        const oldScript = document.getElementById("dynamic-page-script");
        if (oldScript) oldScript.remove();

        if (jsFile) {
          const jsEl = document.createElement("script");
          jsEl.id = "dynamic-page-script";
          jsEl.src = `${JS_ROOT}${jsFile}`;
          jsEl.onload = () => {
            const funcName = pageFunctionMap[page];
            if (funcName && typeof window[funcName] === "function") {
              window[funcName](); // Call page init function
            }
          };
          jsEl.onerror = () => console.error(`Failed to load JS for ${page}`);
          document.body.appendChild(jsEl);
        }

        // Toggle active tab style
        tabs.forEach(tab => tab.classList.remove("active"));
        link.classList.add("active");

      } catch (err) {
        console.error("Tab load error:", err);
      }
    });
  });
});
// Logout
function logout() {
alert("Logging out...");
window.location.href = "../../index.html";
} 
