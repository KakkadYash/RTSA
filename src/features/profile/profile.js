// profile.js
const API_BASE = "https://rtsa-backend-gpu-843332298202.us-central1.run.app/";
function loadProfile() {
  const userId = localStorage.getItem("userId");
  if (!userId) {
    alert("User ID not found. Redirecting to login.");
    window.location.href = "../login/login.html";
    return;
  }

  // --- Common DOM refs used in multiple sections ---
  const fileInput = document.getElementById("file-input");
  const imagePreview = document.getElementById("img-preview");
  const form = document.getElementById("userProfileForm");
  const openModalBtn = document.getElementById("openModalBtn");
  const cancelBtn = document.getElementById("cancelSubscriptionBtn");

  // ====== Fetch existing profile to populate UI ======
  (async () => {
    try {
      const res = await fetch(`${API_BASE}profile?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error("Failed to load profile");
      const data = await res.json();

      // ✅ Set profile picture if backend returns one
      if (imagePreview) {
        if (data.profilePicUrl) {
          imagePreview.src = data.profilePicUrl;
          localStorage.setItem("profilePicUrl", data.profilePicUrl);
        } else {
          imagePreview.src = "../../../public/assets/images/profilepic.png";
        }
      }

      // Fill top info boxes
      const nameInfo = document.getElementById("nameInfo");
      const sportInfo = document.getElementById("sportInfo");
      if (nameInfo) nameInfo.textContent = data.name || "—";
      if (sportInfo) {
        sportInfo.textContent =
          Array.isArray(data.sports) && data.sports.length
            ? data.sports.join(", ")
            : "—";
      }

      // Fill form inputs
      document.getElementById("name").value = data.name || "";
      document.getElementById("email").value = data.email || "";
      document.getElementById("age").value = data.age || "";
      document.getElementById("state").value = data.state || "";
      document.getElementById("sports").value = Array.isArray(data.sports)
        ? data.sports.join(", ")
        : "";

      // Reflect checkbox states in dropdown
      const checkboxes = document.querySelectorAll("#sportsDropdown input[type='checkbox']");
      checkboxes.forEach(cb => {
        cb.checked = Array.isArray(data.sports) && data.sports.includes(cb.value);
      });

      // ====== Subscription Section Fill ======
      const subPlan = document.getElementById("sub_plan");
      const subStatus = document.getElementById("sub_status");
      const subNextBilling = document.getElementById("sub_next_billing");

      if (subPlan) subPlan.textContent = data.subscription_plan_type || "None";
      if (subStatus) subStatus.textContent = data.subscription_status || "inactive";

      if (subNextBilling) {
        if (data.subscription_next_billing) {
          const dt = new Date(data.subscription_next_billing);
          subNextBilling.textContent = dt.toDateString();
        } else {
          subNextBilling.textContent = "—";
        }
      }
    } catch (err) {
      console.error("Error loading profile:", err);
    }
  })();

  // === Click avatar to choose new profile photo ===
  if (imagePreview && fileInput) {
    imagePreview.addEventListener("click", () => {
      fileInput.click();
    });
  }

  // === Upload selected profile picture to backend ===
  if (fileInput && imagePreview) {
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;

      const userId = localStorage.getItem("userId");
      if (!userId) {
        alert("User ID missing. Please login again.");
        window.location.href = "../login/login.html";
        return;
      }

      const formData = new FormData();
      formData.append("userId", userId);
      formData.append("profilePic", file);

      try {
        const res = await fetch(`${API_BASE}profile-pic`, {
          method: "POST",
          body: formData,
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.detail || "Failed to upload profile picture");
        }

        const objectUrl = URL.createObjectURL(file);
        imagePreview.src = objectUrl;

        alert("Profile picture updated successfully!");
        // 🔥 FREE TRIAL STEP ADVANCE → Move to Step 1
        const isPaid = localStorage.getItem("isPaidUser") === "true";
        if (!isPaid) {
          localStorage.setItem("freeTrialStep", "1");
          document.dispatchEvent(new Event("freeTrialStepUpdated"));
        }
      } catch (err) {
        console.error("Error uploading profile picture:", err);
        alert("Could not upload profile picture. Please try again.");
      }
    });
  }

  // ====== Helper: Load Calibration Modal HTML, CSS, JS ======
  async function loadCalibrationModal() {
    const res = await fetch("../../../src/features/calibration/calibration.html");
    const html = await res.text();

    const container = document.getElementById("calibrationModalContainer");
    container.innerHTML = html;
    container.classList.remove("hidden");

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "../../../src/features/calibration/calibration.css";
    document.head.appendChild(link);

    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "../../../src/features/calibration/calibration.js";
      script.onload = () => {
        if (typeof initCalibrationModalEvents === "function") initCalibrationModalEvents();
        if (typeof initCalibrationFormHandler === "function") initCalibrationFormHandler();
        if (typeof initImagePreview === "function") {
          console.log("🖼️ Initializing image preview after modal load");
          initImagePreview();
        } else {
          console.warn("⚠️ initImagePreview not found yet");
        }
        resolve();
      };
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  async function handleOpenModal() {
    console.log("Clicked Upload Photo Button on Profile page");

    await loadCalibrationModal();

    const modal = document.getElementById("popupModal");
    if (!modal) {
      console.error("❌ Modal not found after loading calibration.html");
      return;
    }

    const fullName = document.getElementById("name").value || "";
    const nameParts = fullName.split(" ");
    const first_name = nameParts[0] || "";
    const last_name = nameParts.slice(1).join(" ") || "";
    const age = document.getElementById("age").value || "";

    const sportsField = document.getElementById("sports");
    let sportValue = "";
    if (sportsField) {
      if (sportsField.tagName === "INPUT") {
        sportValue = sportsField.value || "";
      } else if (sportsField.multiple) {
        sportValue = Array.from(sportsField.selectedOptions).map(opt => opt.value).join(", ");
      } else {
        sportValue = sportsField.value || "";
      }
    }

    const modalFirst = document.getElementById("first_name") || document.getElementById("firstName");
    const modalLast = document.getElementById("last_name") || document.getElementById("lastName");
    const modalAge = document.getElementById("popupAge");
    const modalHeight = document.getElementById("height_cm") || document.getElementById("height");
    const modalSport = document.getElementById("sport") || document.getElementById("popupSports");

    if (modalFirst) modalFirst.value = first_name;
    if (modalLast) modalLast.value = last_name;
    if (modalAge) modalAge.value = age;
    if (modalSport) modalSport.value = sportValue;

    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    if (modalHeight && userData.calibrated_height_m) {
      modalHeight.value = (userData.calibrated_height_m * 100).toFixed(1);
    }

    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");

    if (typeof initCalibrationModalEvents === "function") initCalibrationModalEvents();
    if (typeof initCalibrationFormHandler === "function") initCalibrationFormHandler();
  }

  if (openModalBtn) {
    openModalBtn.addEventListener("click", handleOpenModal);
  } else {
    console.warn("⚠️ openModalBtn not found in DOM yet");
  }

  // === Custom Dropdown with Checkboxes ===
  const dropdown = document.getElementById("sportsDropdown");
  const selected = dropdown.querySelector(".dropdown-selected");
  const optionsContainer = dropdown.querySelector(".dropdown-options");
  const checkboxes = optionsContainer.querySelectorAll("input[type='checkbox']");
  const hiddenInput = document.getElementById("sports");

  dropdown.addEventListener("click", (e) => {
    e.stopPropagation();

    const isActive = dropdown.classList.toggle("active");
    optionsContainer.classList.toggle("hidden");

    if (isActive) {
      dropdown.style.backgroundColor = "#e62a2a";
      selected.style.color = "black";
    } else {
      dropdown.style.backgroundColor = "#111";
      selected.style.color = "white";
    }
  });

  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove("active");
      optionsContainer.classList.add("hidden");
      dropdown.style.backgroundColor = "#111";
      selected.style.color = "white";
    }
  });

  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const selectedValues = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

      selected.textContent = selectedValues.length
        ? selectedValues.join(", ")
        : "Select Sport";

      hiddenInput.value = selectedValues.join(", ");
    });
  });

  // ====== Cancel Subscription Button ======
  if (cancelBtn) {
    cancelBtn.addEventListener("click", async () => {
      if (!confirm("Are you sure you want to cancel your subscription?")) return;

      const userId = localStorage.getItem("userId");
      if (!userId) {
        alert("User ID missing. Please login again.");
        window.location.href = "../login/login.html";
        return;
      }

      const formData = new FormData();
      formData.append("userId", userId);

      try {
        const res = await fetch(`${API_BASE}cancel-subscription`, {
          method: "POST",
          body: formData
        });

        const out = await res.json().catch(() => ({}));

        if (!res.ok) {
          console.error("Cancel error:", out);
          alert(out.detail || "Failed to cancel subscription.");
          return;
        }

        alert("Your subscription has been cancelled.");

        // Clear login session
        localStorage.removeItem("userId");
        localStorage.removeItem("profilePicUrl");
        localStorage.removeItem("userData");

        // Redirect to login page
        window.location.href = "../login/login.html";

      } catch (err) {
        console.error("Cancel subscription error:", err);
        alert("Something went wrong while canceling subscription.");
      }
    });
  }

  // ====== Save Button Handler ======
  const saveButton = document.getElementById("saveButton");
  if (saveButton) {
    saveButton.addEventListener("click", async (e) => {
      e.preventDefault();

      const userId = localStorage.getItem("userId");
      if (!userId) {
        alert("User ID missing. Please login again.");
        window.location.href = "../login/login.html";
        return;
      }

      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const age = document.getElementById("age").value.trim();
      const state = document.getElementById("state").value.trim();
      const sportsInput = document.getElementById("sports").value;
      const sports = sportsInput
        ? sportsInput.split(",").map(s => s.trim()).filter(Boolean)
        : [];

      const payload = { userId };

      if (name) payload.name = name;
      if (email) payload.email = email;
      if (age) payload.age = age;
      if (state) payload.state = state;
      if (sports.length) payload.sports = sports;

      if (Object.keys(payload).length === 1) {
        alert("No changes to update.");
        return;
      }

      try {
        const response = await fetch(`${API_BASE}updateProfile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.detail || "Failed to update profile");
        }

        const result = await response.json();
        console.log(result.message, "Updated fields:", result.updated_fields);
        alert("Profile updated successfully!");

        if (payload.name) {
          const nameInfo = document.getElementById("nameInfo");
          if (nameInfo) nameInfo.textContent = payload.name;
        }
        if (payload.sports) {
          const sportInfo = document.getElementById("sportInfo");
          if (sportInfo) sportInfo.textContent = payload.sports.join(", ");
        }

        window.location.href = "../home/home.html";
      } catch (err) {
        console.error("Error updating profile:", err);
        alert("Something went wrong while updating your profile.");
      }
    });
  }
  // === Tutorial Hook: Notify tutorial engine that Profile page is ready ===
  setTimeout(() => {
    console.log("[PROFILE] Dispatching profile-loaded event for tutorial");
    document.dispatchEvent(new Event("profile-loaded"));
  }, 250);
  // ======================================================
  // CALIBRATION COMPLETE → UNLOCK LOGIC (FREE TRIAL + PAID)
  // ======================================================
  document.addEventListener("calibrationComplete", () => {
    console.log("🔥 Calibration complete → evaluating unlock rules");

    const isPaidUser = localStorage.getItem("isPaidUser") === "true";

    // ✅ FREE TRIAL BEHAVIOR (UNCHANGED)
    if (!isPaidUser) {
      console.log("🧪 Free Trial user → moving to Step 2");

      localStorage.setItem("hasCalibrated", "true");   // 🔥 MISSING LINE
      localStorage.setItem("freeTrialStep", "2");
      document.dispatchEvent(new Event("freeTrialStepUpdated"));
      return;
    }

    // ✅ PAID USER BEHAVIOR (NEW)
    console.log("💳 Paid user → unlocking ALL tabs permanently");

    // Remove paid calibration lock
    localStorage.removeItem("paidCalibrationLocked");

    // Mark calibrated permanently
    localStorage.setItem("hasCalibrated", "true");

    // Force sidebar to re-evaluate
    document.dispatchEvent(new Event("freeTrialStepUpdated"));
    // ✅ RESUME TUTORIAL AFTER CALIBRATION (HARD VISUAL RESTORE)
    if (window.__RT_TUTORIAL_PAUSED__) {
      console.log("[PROFILE] ▶️ Resuming tutorial after calibration");

      window.__RT_TUTORIAL_PAUSED__ = false;

      // ✅ MARK PAID USER AS CALIBRATED
      localStorage.setItem("hasCalibrated", "true");
      localStorage.removeItem("paidCalibrationLocked");

      // ✅ FORCE SIDEBAR TO UNLOCK EVERYTHING
      document.dispatchEvent(new Event("freeTrialStepUpdated"));

      // ✅ RE-ENABLE TUTORIAL LOCK MODE
      document.body.classList.add("rt-disable-all");

      setTimeout(() => {
        // ✅ RESTORE BACKDROP
        const backdrop = document.querySelector(".rt-tour-backdrop");
        if (backdrop) {
          backdrop.style.display = "flex";
          backdrop.style.opacity = "1";
          backdrop.style.pointerEvents = "auto";
        }

        // ✅ RESTORE RING
        const ring = document.querySelector(".rt-tour-highlight");
        if (ring) {
          ring.style.display = "block";
          ring.style.opacity = "1";
        }

        // ✅ RESTORE TOOLTIP
        const tip = document.querySelector(".rt-tour-tooltip");
        if (tip) {
          tip.style.display = "block";
          tip.style.opacity = "1";
        }

        // ✅ FORCE TUTORIAL TO ADVANCE VISUALLY (CRITICAL)
        if (typeof window.__RT_TUTORIAL_FORCE_NEXT__ === "function") {
          console.log("[TUTORIAL] ▶️ Forcing next step after resume");
          window.__RT_TUTORIAL_FORCE_NEXT__();
        }

      }, 400);
    }





  });


}

window.loadProfile = loadProfile;
