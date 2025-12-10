// home.js
/**
 * Page Loader Module
 * Handles navigation, dynamic resource loading, and tab switching.
 */
// home.js

document.addEventListener("DOMContentLoaded", () => {
  // ===============================
  // AUTO-FILL USER ID FOR FEEDBACK
  // ===============================
  const userCacheFB = JSON.parse(localStorage.getItem("userCache") || "{}");
  const userIdFB = userCacheFB.userId;
  const userField = document.getElementById("feedbackUserId");

  if (userField && userIdFB) {
    userField.value = userIdFB;
  }

  // ✅ AUTO SCROLL TO FEEDBACK SECTION ON HOME LOAD
  setTimeout(() => {
    const feedbackSection = document.getElementById("feedback");
    if (feedbackSection) {
      feedbackSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }, 300);

  // =====================================================
  //  FREE TRIAL STATE SETUP
  // =====================================================
  const userCache = JSON.parse(localStorage.getItem("userCache") || "{}");

  // 🔹 Single source of truth for subscription type
  const subscription =
    localStorage.getItem("subscriptionPlanType") ||
    userCache.subscriptionPlanType ||
    "free_trial";
  const isPaidUser = localStorage.getItem("isPaidUser") === "true";

  let freeTrialStep = Number(localStorage.getItem("freeTrialStep") || 0);

  // ======================================================
  // FREE TRIAL STEP 2 → 3 (Unlock everything after 10 uploads)
  // Backend must give: userCache.uploadCount
  // ======================================================
  if (subscription === "free_trial") {
    if (userCache.uploadCount >= 10 && freeTrialStep < 3) {
      console.log("🔥 User has 10 uploads → unlocking ALL sections");
      freeTrialStep = 3;
      localStorage.setItem("freeTrialStep", 3);
      document.dispatchEvent(new Event("freeTrialStepUpdated"));
    }
  }

  // 0 = Intro locked
  // 1 = Profile unlocked
  // 2 = Profile + Analytics unlocked
  // 3 = All unlocked

  function saveStep(step) {
    freeTrialStep = step;
    localStorage.setItem("freeTrialStep", step);
    document.dispatchEvent(new Event("freeTrialStepUpdated")); // sidebar.js listens
  }

  // ======================================================
  // Sidebar listens to this event to refresh lock states
  // ======================================================
  document.addEventListener("freeTrialStepUpdated", () => {
    console.log("🔄 Sidebar should update lock/unlock icons now");
  });

  // =====================================================
  // Only show Free Trial intro ONCE:
  // Condition: free trial plan + step = 0
  // =====================================================
  // ✅ FREE TRIAL INTRO
  if (subscription === "free_trial" && freeTrialStep === 0) {
    showFreeTrialIntro();
  }

  // ✅ PAID USER LOCK — PROFILE ONLY until calibration
  if (isPaidUser && !localStorage.getItem("calibratedHeightM")) {
    localStorage.setItem("paidCalibrationLocked", "true");
    document.dispatchEvent(new Event("freeTrialStepUpdated"));
  }



  function showFreeTrialIntro() {
    // Replace alert() with your modal later
    alert("👋 Welcome to RTSA! Let's get you started.");
    alert("First step → Update your profile photo to unlock Analytics.");

    saveStep(1);
  }

  // --------------------------------------------
  // 🎯 TUTORIAL LAUNCHER (Conditional + Safe)
  // --------------------------------------------
  (async () => {
    const subscription = localStorage.getItem("subscriptionPlanType");
    const step = Number(localStorage.getItem("freeTrialStep") || 0);
    const done = localStorage.getItem("tutorialCompleted");

    // ❌ HARD BLOCK tutorial for ALL free-trial users (any step)
    if (subscription === "free_trial") {
      console.log("[TUTORIAL] Skipped — free trial users are not allowed tutorial");
      return;
    }

    // ❌ If already done, never run again
    if (done === "true") {
      console.log("[TUTORIAL] Skipped — already completed");
      return;
    }

    // ✅ Conditions satisfied → load tutorial
    const mod = await import("../tutorial/tutorial.js");
    mod.startTutorial();
  })();

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
        requestAnimationFrame(() => {
          window[funcName]();

          // ✅ NEW: Signal that profile page is fully loaded
          if (page === "profile") {
            setTimeout(() => {
              console.log("[HOME] ✅ profile-loaded dispatched");
              document.dispatchEvent(new Event("profile-loaded"));
            }, 100); // small delay ensures #openModalBtn exists
          }
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

  // ===============================
  // GLOBAL HELPER: Auto-open Profile Calibration
  // ===============================
  window.rtAutoOpenProfileCalibration = function () {
    let attempts = 0;
    const maxAttempts = 20; // ~4 seconds

    console.log("[RT] 🎯 Waiting for openModalBtn to appear...");

    const waitForModalBtn = setInterval(() => {
      const openBtn = document.getElementById("openModalBtn");

      if (openBtn) {
        clearInterval(waitForModalBtn);
        console.log("[RT] ✅ openModalBtn found → Auto-clicking now");
        openBtn.click();
      }

      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(waitForModalBtn);
        console.warn("[RT] ❌ openModalBtn never appeared in DOM");
      }
    }, 200);
  };

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
    link.addEventListener("click", async (e) => {

      const isLocked = link.classList.contains("locked");
      const isPaid = localStorage.getItem("isPaidUser") === "true";
      const hasCalibrated = localStorage.getItem("hasCalibrated") === "true";

      // ✅ UNIVERSAL LOCK GUARD (FREE + PAID)
      if (isLocked) {
        e.preventDefault();

        console.log("🔒 Locked tab blocked:", link.dataset.page);

        link.classList.add("shake");
        setTimeout(() => link.classList.remove("shake"), 450);

        return; // ⛔ STOP navigation here always
      }

      // ✅ Normal navigation
      e.preventDefault();
      await handleTabClick(link);


      const step = Number(localStorage.getItem("freeTrialStep") || 0);

      // ✅ AUTO-OPEN CALIBRATION MODAL ON STEP 1 PROFILE CLICK (USING SHARED HELPER)
      if (
        subscription === "free_trial" &&
        step === 1 &&
        link.dataset.page === "profile"
      ) {
        console.log("🎯 Free Trial Step 1 → Waiting for Profile DOM to load...");
        if (typeof window.rtAutoOpenProfileCalibration === "function") {
          window.rtAutoOpenProfileCalibration();
        } else {
          console.warn("[HOME] rtAutoOpenProfileCalibration is not defined");
        }
      }

    });
  });

  // ===============================
  // CONTACT FORM SUBMISSION LOGIC
  // ===============================
  const contactForm = document.getElementById("contactForm");

  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const userId = document.getElementById("feedbackUserId").value;
      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const note = document.getElementById("note").value.trim();

      if (!userId) {
        alert("User not logged in. Please log in again.");
        return;
      }

      const formData = new FormData();
      formData.append("userId", userId);
      formData.append("name", name);
      formData.append("email", email);
      formData.append("message", note);
      try {
        const res = await fetch(
          "https://rtsa-backend-gpu-843332298202.us-central1.run.app/submit-feedback",
          {
            method: "POST",
            body: formData
          }
        );

        const data = await res.json();

        if (data.success) {
          alert("Thank you! Your message has been submitted.");
          contactForm.reset();
        } else {
          alert("Failed to submit. Please try again later.");
        }
      } catch (err) {
        console.error(err);
        alert("Error sending feedback.");
      }
    });
  }

});

/**
 * Logout handler.
 */
function logout() {
  alert("Logging out...");
  window.location.href = "../../../index.html";
}
