function loadProfile() {
  const API_BASE = "https://rtsa-backend-gpu-843332298202.us-central1.run.app/";
  const userId = localStorage.getItem("userId");
  if (!userId) {
    alert("User ID not found. Redirecting to login.");
    window.location.href = "../login/login.html";
    return;
  }

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
          // Optional: cache for other pages
          localStorage.setItem("profilePicUrl", data.profilePicUrl);
        } else {
          // Fallback to default
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
    } catch (err) {
      console.error("Error loading profile:", err);
    }
  })();

  const fileInput = document.getElementById("file-input");
  const imagePreview = document.getElementById("img-preview");
  const form = document.getElementById("userProfileForm");
  const openModalBtn = document.getElementById("openModalBtn");
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

        // Prefer backend URL; fallback to local preview
        if (data.profilePicUrl) {
          imagePreview.src = data.profilePicUrl;
          localStorage.setItem("profilePicUrl", data.profilePicUrl);
        } else {
          const objectUrl = URL.createObjectURL(file);
          imagePreview.src = objectUrl;
        }

        alert("Profile picture updated successfully!");
      } catch (err) {
        console.error("Error uploading profile picture:", err);
        alert("Could not upload profile picture. Please try again.");
      }
    });

    // Click on image opens file picker
    imagePreview.addEventListener("click", () => fileInput.click());
  }

  // ====== Helper: Load Calibration Modal HTML, CSS, JS ======
  async function loadCalibrationModal() {
    const res = await fetch("../../../src/features/calibration/calibration.html");
    const html = await res.text();

    const container = document.getElementById("calibrationModalContainer");
    container.innerHTML = html;
    container.classList.remove("hidden");

    // Load CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "../../../src/features/calibration/calibration.css";
    document.head.appendChild(link);

    // Load JS and wait until ready
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "../../../src/features/calibration/calibration.js";
      script.onload = () => {
        // ✅ Once calibration.js is loaded, initialize modal + form events
        if (typeof initCalibrationModalEvents === "function") initCalibrationModalEvents();
        if (typeof initCalibrationFormHandler === "function") initCalibrationFormHandler();

        // ✅ Initialize image preview AFTER modal HTML has been injected
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


  // ====== Helper: Open Modal After It’s Loaded ======
  // ====== Helper: Open Modal After It’s Loaded ======
  async function handleOpenModal() {
    console.log("Clicked Upload Photo Button on Profile page");

    // 1️⃣ Load modal HTML, CSS, and JS
    await loadCalibrationModal();

    // 2️⃣ Verify modal loaded
    const modal = document.getElementById("popupModal");
    if (!modal) {
      console.error("❌ Modal not found after loading calibration.html");
      return;
    }

    // 3️⃣ Extract existing profile data
    const fullName = document.getElementById("name").value || "";
    const nameParts = fullName.split(" ");

    const first_name = nameParts[0] || "";
    const last_name = nameParts.slice(1).join(" ") || "";
    const age = document.getElementById("age").value || "";

    // Handle dropdown or text-based sport field
    const sportsField = document.getElementById("sports");
    let sportValue = "";
    if (sportsField) {
      // For custom dropdown with hidden input
      if (sportsField.tagName === "INPUT") {
        sportValue = sportsField.value || "";
      } else if (sportsField.multiple) {
        sportValue = Array.from(sportsField.selectedOptions).map(opt => opt.value).join(", ");
      } else {
        sportValue = sportsField.value || "";
      }
    }

    // 4️⃣ Fill the calibration modal fields
    // Match backend field names (snake_case)
    const modalFirst = document.getElementById("first_name") || document.getElementById("firstName");
    const modalLast = document.getElementById("last_name") || document.getElementById("lastName");
    const modalAge = document.getElementById("popupAge");
    const modalHeight = document.getElementById("height_cm") || document.getElementById("height");
    const modalSport = document.getElementById("sport") || document.getElementById("popupSports");

    if (modalFirst) modalFirst.value = first_name;
    if (modalLast) modalLast.value = last_name;
    if (modalAge) modalAge.value = age;
    if (modalSport) modalSport.value = sportValue;

    // Optional: prefill height if already known (from calibration cache)
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    if (modalHeight && userData.calibrated_height_m) {
      modalHeight.value = (userData.calibrated_height_m * 100).toFixed(1);
    }

    // 5️⃣ Show modal and freeze background scroll
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");

    // 6️⃣ Initialize modal & form behavior (once HTML is ready)
    if (typeof initCalibrationModalEvents === "function") initCalibrationModalEvents();
    if (typeof initCalibrationFormHandler === "function") initCalibrationFormHandler();
  }


  // ====== Register Click Event (AFTER defining functions) ======
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

  // Toggle dropdown open/close
  dropdown.addEventListener("click", (e) => {
    e.stopPropagation();

    const isActive = dropdown.classList.toggle("active");
    optionsContainer.classList.toggle("hidden");

    // When open
    if (isActive) {
      dropdown.style.backgroundColor = "#e62a2a"; // RT red
      selected.style.color = "black";
    } else {
      // When closed
      dropdown.style.backgroundColor = "#111";
      selected.style.color = "white";
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove("active");
      optionsContainer.classList.add("hidden");

      dropdown.style.backgroundColor = "#111"; // reset background
      selected.style.color = "white"; // reset text color
    }
  });

  // Handle selections
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

      // Build payload with only provided fields
      const payload = { userId };

      if (name) payload.name = name;
      if (email) payload.email = email;
      if (age) payload.age = age;
      if (state) payload.state = state;
      if (sports.length) payload.sports = sports;

      if (Object.keys(payload).length === 1) { // only userId present
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

        // Update top info panel instantly (optional but nice UX)
        if (payload.name) {
          const nameInfo = document.getElementById("nameInfo");
          if (nameInfo) nameInfo.textContent = payload.name;
        }
        if (payload.sports) {
          const sportInfo = document.getElementById("sportInfo");
          if (sportInfo) sportInfo.textContent = payload.sports.join(", ");
        }

        // Navigate to home page after update
        window.location.href = "../home/home.html";
      } catch (err) {
        console.error("Error updating profile:", err);
        alert("Something went wrong while updating your profile.");
      }
    });
  }


}
window.loadProfile = loadProfile;