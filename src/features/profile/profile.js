function loadProfile() {
  const userId = localStorage.getItem("userId");
  if (!userId) {
    alert("User ID not found. Redirecting to login.");
    window.location.href = "../login/login.html";
    return;
  }

  const fileInput = document.getElementById("file-input");
  const imagePreview = document.getElementById("img-preview");
  const form = document.getElementById("userProfileForm");
  const openModalBtn = document.getElementById("openModalBtn");

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
        if (typeof initCalibrationModalEvents === "function") {
          initCalibrationModalEvents();
        } else {
          console.warn("⚠️ initCalibrationModalEvents not found yet");
        }

        if (typeof initCalibrationFormHandler === "function") {
          initCalibrationFormHandler();
        } else {
          console.warn("⚠️ initCalibrationFormHandler not found yet");
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
  document.body.style.overflow = "hidden";

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


}
window.loadProfile = loadProfile;