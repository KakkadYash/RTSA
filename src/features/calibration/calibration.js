const API_BASE = "https://rtsa-backend-gpu-843332298202.us-central1.run.app/";
const modal = document.getElementById("popupModal");
const container = document.getElementById("calibrationModalContainer");

function initCalibrationModalEvents() {
  const closeBtn = document.getElementById("closeBtn");

  // Retry logic in case DOM isn't ready yet
  if (!modal || !closeBtn) {
    console.warn("⏳ Modal not yet in DOM, retrying initialization...");
    setTimeout(initCalibrationModalEvents, 100);
    return;
  }

  console.log("✅ Calibration modal events initialized");

  // Close via X button
  closeBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
    container.classList.add("hidden");
  });

  // Close by clicking outside modal
  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.add("hidden");
      container.classList.add("hidden");
    }
  });
}

function initCalibrationFormHandler() {
  const form = document.getElementById("popupProfileForm");

  if (!form) {
    console.warn("⚠️ popupProfileForm not yet in DOM, retrying...");
    setTimeout(initCalibrationFormHandler, 100);
    return;
  }

  console.log("✅ Calibration form handler initialized");

  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // ⛔ stop redirect
    e.stopPropagation(); // stop other listeners
    console.log("[CALIBRATION] Form submitted");

    const previewContainer = document.querySelector(".scan-preview");
    const previewImage = document.getElementById("fullBodyPreview");
    const scanStatus = document.getElementById("scanStatus");

    // Show preview + scanning animation when Submit is clicked
    if (previewContainer && previewImage) {
      previewContainer.classList.remove("hidden");
      previewImage.classList.remove("hidden");
      previewContainer.classList.add("scanning");
    }
    if (scanStatus) {
      scanStatus.textContent = "🔍 Scanning image...";
      scanStatus.classList.remove("hidden");
    }

    // --- Height conversion (ft+in -> cm) BEFORE creating FormData ---
    const ftEl = document.getElementById("height_ft");
    const inEl = document.getElementById("height_in");
    const cmHidden = document.getElementById("height_cm");

    // Validate dropdowns
    if (!ftEl || !inEl || !cmHidden) {
      console.error("[CALIBRATION] Height elements missing");
    } else {
      if (!ftEl.value || !inEl.value) {
        alert("Please select your height in feet and inches.");
        return; // stop submit
      }
      const feet = parseInt(ftEl.value, 10);
      const inches = parseInt(inEl.value, 10);

      // extra safety
      if (feet < 4 || feet > 7 || inches < 0 || inches > 11) {
        alert("Please enter a valid height (4–7 ft, 0–11 in).");
        return;
      }

      const totalInches = feet * 12 + inches;
      const cm = (totalInches * 2.54).toFixed(1);
      cmHidden.value = cm; // this keeps your backend field name: height_cm
    }
    // --- end height conversion ---

    const formData = new FormData(form);
    const userId = localStorage.getItem("userId");
    formData.append("userId", userId);

    try {
      // 🌐 Always use deployed Cloud Run API

      console.log("[CALIBRATION] Sending request to:", `${API_BASE}/calibration`);

      const res = await fetch(`${API_BASE}/calibration`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      console.log("[CALIBRATION] Success:", data);
      if (res.status === 200) {
        // ✅ Stop scanning animation
        if (previewContainer) {
          previewContainer.classList.remove("scanning");
          previewContainer.classList.add("success"); // 🟢 new glow effect
        }

        if (scanStatus) {
          scanStatus.textContent = "✅ Calibration successful!";
          scanStatus.style.color = "#00ff88"; // optional: make text green
        }

        // ✅ After 2s, hide preview + modal
        setTimeout(() => {
          if (scanStatus) {
            scanStatus.classList.add("hidden");
            scanStatus.style.color = ""; // reset color
          }
          if (previewContainer) {
            previewContainer.classList.remove("success"); // remove green pulse
            previewContainer.classList.add("hidden");
          }
          if (previewImage) previewImage.src = "";

          modal.classList.add("hidden");
          container.classList.add("hidden");
          document.body.style.overflow = ""; // restore scroll
        }, 2000);
      }


    } catch (err) {
      if (previewContainer) previewContainer.classList.remove("scanning");
      if (scanStatus) {
        scanStatus.textContent = "❌ Calibration failed. Please retry.";
        setTimeout(() => scanStatus.classList.add("hidden"), 2000);
      }

      console.error("[CALIBRATION] Error:", err);
    } finally {
      // ✅ Clean up scanning state if still active
      if (previewContainer) previewContainer.classList.remove("scanning");
    }
  });
}

function initImagePreview() {
  setTimeout(() => {
    const fileInput = document.getElementById("fullBodyPic");
    const previewContainer = document.querySelector(".scan-preview");
    const previewImage = document.getElementById("fullBodyPreview");

    if (!fileInput || !previewContainer || !previewImage) return;

    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        previewImage.src = event.target.result;
        console.log("[PREVIEW] Image ready but hidden until submit");
      };
      reader.readAsDataURL(file);
    });
  }, 200);
}

