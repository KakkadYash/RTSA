// sidebar.js
document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("freeTrialStepUpdated", () => {
    // Re-run sidebar lock logic automatically
    location.reload();
  });

  const subscription = localStorage.getItem("subscriptionPlanType");
  const step = Number(localStorage.getItem("freeTrialStep") || 0);
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
  if (subscription !== "free_trial") {
    unlockAll();
    return;
  } else {

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
    }
  }

  // Shake on locked click
  navLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      if (link.classList.contains("locked")) {
        e.preventDefault();
        link.classList.add("shake");
        setTimeout(() => link.classList.remove("shake"), 350);
      }
    });
  });

});
