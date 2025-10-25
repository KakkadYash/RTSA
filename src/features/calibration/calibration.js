document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("popupProfileForm");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault(); // ⛔ stop default page reload
      console.log("[CALIBRATION] Form submitted");

      const overlay = document.getElementById("calibrationOverlay");
      const overlayMessage = document.getElementById("overlayMessage");

      overlay.classList.remove("hidden");
      overlayMessage.textContent = "Calibrating height... please wait ⏳";

      const formData = new FormData(form);
      const userId = localStorage.getItem("userId");
      formData.append("userId", userId);

      try {
        const res = await fetch(`${API_BASE}/calibration`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        console.log("[CALIBRATION] Success:", data);

        overlayMessage.textContent = "✅ Calibration successful!";
      } catch (err) {
        console.error("[CALIBRATION] Error:", err);
        overlayMessage.textContent = "❌ Calibration failed. Please retry.";
      } finally {
        setTimeout(() => {
          overlay.classList.add("hidden");
        }, 1500);
      }
    });
  }
});

function initCalibrationModalEvents() {
  const modal = document.getElementById("popupModal");
  const closeBtn = document.getElementById("closeBtn");
  const container = document.getElementById("calibrationModalContainer");

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
    document.body.style.overflow = "";
  });

  // Close by clicking outside modal
  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.add("hidden");
      container.classList.add("hidden");
      document.body.style.overflow = "";
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

    const overlay = document.getElementById("calibrationOverlay");
    const overlayMessage = document.getElementById("overlayMessage");

    overlay.classList.remove("hidden");
    overlayMessage.textContent = "Calibrating height... please wait ⏳";

    const formData = new FormData(form);
    const userId = localStorage.getItem("userId");
    formData.append("userId", userId);

    try {
      // 🌐 Always use deployed Cloud Run API
      const API_BASE = "https://fastapi-app-843332298202.us-central1.run.app";


      console.log("[CALIBRATION] Sending request to:", `${API_BASE}/calibration`);

      const res = await fetch(`${API_BASE}/calibration`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      console.log("[CALIBRATION] Success:", data);

      overlayMessage.textContent = "✅ Calibration successful!";
    } catch (err) {
      console.error("[CALIBRATION] Error:", err);
      overlayMessage.textContent = "❌ Calibration failed. Please retry.";
    } finally {
      setTimeout(() => overlay.classList.add("hidden"), 1500);
    }
  });
}
