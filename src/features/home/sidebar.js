// sidebar.js
document.addEventListener("DOMContentLoaded", () => {
  // document.addEventListener("freeTrialStepUpdated", () => {
  //   const isPaid = localStorage.getItem("isPaidUser") === "true";
  //   const hasCalibrated = localStorage.getItem("hasCalibrated") === "true";

  //   // Re-run sidebar lock logic automatically
  //   console.log("🔄 Sidebar should update lock/unlock icons now");
  //   location.reload();
  // });
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

  // 🔥 PAID USERS: FULL ACCESS AFTER CALIBRATION (SOURCE OF TRUTH = hasCalibrated)
  if (isPaidUser) {
    const hasCalibrated = localStorage.getItem("hasCalibrated") === "true";

    if (!hasCalibrated) {
      console.log("🔒 PAID USER NOT CALIBRATED → ONLY PROFILE UNLOCKED");

      lockAll();
      unlock("profile");   // ✅ ONLY profile unlocked
      return;
    }

    console.log("✅ PAID USER CALIBRATED → ALL TABS UNLOCKED");

    unlockAll();           // ✅ After calibration → FULL ACCESS
    hideAllIcons();
    return;
  }
  else {

    // 🔥 FREE TRIAL FLOW (UNCHANGED)
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

  // ======================================================
  // 🔄 React to freeTrialStepUpdated WITHOUT reloading page
  // ======================================================
  document.addEventListener("freeTrialStepUpdated", () => {
    const isPaidUserNow = localStorage.getItem("isPaidUser") === "true";
    const hasCalibratedNow = localStorage.getItem("hasCalibrated") === "true";
    const stepNow = Number(localStorage.getItem("freeTrialStep") || 0);

    console.log("🔄 Sidebar updating lock/unlock (no reload)");

    if (isPaidUserNow) {
      if (!hasCalibratedNow) {
        lockAll();
        unlock("profile");
        return;
      }

      unlockAll();
      hideAllIcons();
      return;
    }

    lockAll();

    if (stepNow >= 1) {
      unlock("profile");
    }

    if (stepNow >= 2) {
      unlock("analytics");
    }

    if (stepNow >= 3) {
      unlockAll();
      hideAllIcons();
    }
  });

});

