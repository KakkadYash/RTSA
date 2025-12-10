// sidebar.js
document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("freeTrialStepUpdated", () => {
    const isPaid = localStorage.getItem("isPaidUser") === "true";
    const hasCalibrated = localStorage.getItem("hasCalibrated") === "true";

    if (isPaid && hasCalibrated) {
      console.log("🔓 PAID USER CALIBRATED → UNLOCKING ONLY ANALYTICS");

      navLinks.forEach(link => {
        const page = link.dataset.page;

        if (page === "analytics") {
          // ✅ ONLY analytics unlocked
          link.classList.remove("locked");
          link.classList.remove("shake");
        } else if (page !== "profile") {
          // 🔒 Everything else remains locked (except profile)
          link.classList.add("locked");
        }
      });

      return; // ✅ Skip free-trial logic completely
    }

    // Re-run sidebar lock logic automatically
    console.log("🔄 Sidebar should update lock/unlock icons now");
    location.reload();
  });
  const hideAllIcons = () => {
    document.querySelectorAll(".lock").forEach(i => i.style.display = "none");
    document.querySelectorAll(".unlock").forEach(i => i.style.display = "none");
  };
  const subscription = localStorage.getItem("subscriptionPlanType");
  const step = Number(localStorage.getItem("freeTrialStep") || 0);
  const isPaidUser = localStorage.getItem("isPaidUser") === "true";
  const paidCalibrationLocked = localStorage.getItem("paidCalibrationLocked") === "true";

  const navLinks = document.querySelectorAll(".nav-link");

  const lockAll = () => {
    navLinks.forEach(link => link.classList.add("locked"));
  };

  const unlock = (sectionName) => {
    navLinks.forEach(link => {
      if (link.dataset.section === sectionName) {
        link.classList.remove("locked");
      }
    });
  };

  const unlockMultiple = (list) => {
    list.forEach(s => unlock(s));
  };

  const unlockAll = () => {
    navLinks.forEach(link => link.classList.remove("locked"));
  };


  // 🔥 PAID USERS: All unlocked
  if (isPaidUser) {
    if (paidCalibrationLocked) {
      lockAll();
      unlock("profile");   // ✅ ONLY profile unlocked
      return;
    }

    unlockAll();           // ✅ After calibration → FULL ACCESS
    hideAllIcons();
    return;
  }
  else {

    // 🔥 FREE TRIAL FLOW
    if (step === 0) {
      lockAll();
    }

    if (step === 1) {
      lockAll();
      unlock("profile");
    }

    if (step === 2) {
      lockAll();
      unlockMultiple(["profile", "analytics"]);
    }

    if (step === 3) {
      unlockAll();
      hideAllIcons();
    }
  }

  // ✅ UNIVERSAL LOCKED TAB BEHAVIOR (FREE TRIAL + PAID)
  navLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault(); // ✅ CRITICAL — prevents page reload

      if (link.classList.contains("locked")) {
        console.log("🔒 Locked tab clicked → shake + block");

        link.classList.add("shake");
        setTimeout(() => link.classList.remove("shake"), 450);

        if (
          localStorage.getItem("isPaidUser") === "true" &&
          localStorage.getItem("hasCalibrated") !== "true"
        ) {
          alert("🔒 Please complete profile calibration to unlock this section.");
        }

        return false;
      }

      // ✅ If NOT locked → allow SPA navigation only
    });
  });


});
