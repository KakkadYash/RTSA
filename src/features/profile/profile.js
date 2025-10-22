function loadProfile() {
  const calibrationBtn = document.getElementById('calibration')
  const userId = localStorage.getItem("userId");

  if (!userId) {
    alert("User ID not found. Redirecting to login.");
    window.location.href = "../login/login.html";
    return;
  }

  const fileInput = document.getElementById("file-input");
  const imagePreview = document.getElementById("img-preview");
  const form = document.getElementById("userProfileForm");

  // Ensure required DOM elements exist
  if (!form || !imagePreview || !fileInput) {
    console.warn("Some Profile page elements not found.");
    return;
  }

  // Restore saved profile image
  const savedImage = localStorage.getItem("profilePic");
  if (savedImage) {
    imagePreview.src = savedImage;
  }

  // Fetch and populate profile data
  async function fetchProfileData() {
    try {
      const response = await fetch(`https://fastapi-app-843332298202.us-central1.run.app/profile?userId=${userId}`);
      const data = await response.json();

      if (data.error) {
        console.error(data.error);
        return;
      }

      document.getElementById("name").innerHTML = data.name || '';
      document.getElementById("sportInfo").innerHTML = data.sports || '';
      document.getElementById("name").value = data.name || '';
      document.getElementById("email").value = data.email || '';
      document.getElementById("age").value = data.age || '';
      document.getElementById("state").value = data.state || '';

      let sports = [];

      // Handle both string or array types gracefully
      if (Array.isArray(data.sports)) {
        sports = data.sports;
      } else if (typeof data.sports === "string" && data.sports.trim() !== "") {
        sports = data.sports.split(/,\s*/); // split comma-separated string safely
      }

      const sportsDropdown = document.getElementById("sports");
      for (let option of sportsDropdown.options) {
        option.selected = sports.includes(option.value);
      }

    } catch (error) {
      console.error("Error fetching profile data:", error);
    }
  }

  // Submit profile form
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const profileData = {
      userId: userId,
      age: document.getElementById("age").value,
      state: document.getElementById("state").value,
      sports: Array.from(document.getElementById("sports").selectedOptions).map(option => option.value),
    };

    try {
      const response = await fetch("https://fastapi-app-843332298202.us-central1.run.app/updateProfile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });

      const result = await response.json();
      if (result.success) {
        alert("Profile updated successfully!");
        await fetchProfileData();
      } else {
        alert(`Error updating profile: ${result.error}`);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("An error occurred while updating the profile.");
    }
  });

  // Handle image upload
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = function (event) {
        const base64Image = event.target.result;
        imagePreview.src = base64Image;
        localStorage.setItem("profilePic", base64Image);
      };
      reader.readAsDataURL(file);
    }
  });

  // Initial fetch
  fetchProfileData();
  // --- Handle Calibration (Update Profile Popup) ---
  const popupForm = document.getElementById("popupProfileForm");



  //Upload Photo Button: Height Calibration popup-modal  

  const openModalBtn = document.getElementById('openModalBtn');
  const modal = document.getElementById("popupModal");

  openModalBtn.addEventListener('click', () => {
    openModal();
  })

  let focusableElements, firstFocusableElement, lastFocusableElement;
  // Focus trap setup
  const focusableSelectors = [
    'a[href]', 'area[href]', 'input:not([disabled])', 'select:not([disabled])',
    'textarea:not([disabled])', 'button:not([disabled])', '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  function trapFocus(element) {
    focusableElements = element.querySelectorAll(focusableSelectors);
    if (focusableElements.length === 0) return;

    firstFocusableElement = focusableElements[0];
    lastFocusableElement = focusableElements[focusableElements.length - 1];
  }

  const modalContent = modal.querySelector('.modal-content');

  function openModal() {
    console.log("openModal button clicked");

    // Sync modal inputs with existing profile data before showing
    const fullName = document.getElementById('name').value || '';
    const nameParts = fullName.split(' ');
    document.getElementById('firstName').value = nameParts[0] || '';
    document.getElementById('lastName').value = nameParts.slice(1).join(' ') || '';

    document.getElementById('popupAge').value = document.getElementById('age').value || '';

    const sportsSelect = document.getElementById('sports');
    if (sportsSelect.multiple) {
      const selectedSports = Array.from(sportsSelect.selectedOptions).map(opt => opt.value);
      document.getElementById('popupSports').value = selectedSports.join(', ');
    } else {
      document.getElementById('popupSports').value = sportsSelect.value || '';
    }

    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');

    trapFocus(modalContent);

    modalContent.focus();

    document.body.style.overflow = 'hidden';
  }




  function closeModal() {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    openModalBtn.focus();
    document.body.style.overflow = '';
  }
  const closeBtn = document.getElementById('closeBtn');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      // Call your closeModal function
      closeModal();
    });
  }


  // --- Handle Calibration (Update Profile Popup) ---
  const fullBodyPicInput = document.getElementById("fullBodyPic");
  const fullBodyPreview = document.getElementById("fullBodyPreview");
  const scanPreview = document.querySelector(".scan-preview");
  const scanOverlay = document.querySelector(".scan-overlay");
  const calibrationOverlay = document.getElementById("calibrationOverlay");
  const overlayMessage = document.getElementById("overlayMessage");

  scanPreview.classList.add("hidden"); // hide preview by default

  popupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const userId = localStorage.getItem("userId");
    if (!userId) {
      alert("User not found. Please log in again.");
      return;
    }

    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const age = document.getElementById("popupAge").value.trim();
    const height = document.getElementById("height").value.trim();
    const sports = document.getElementById("popupSports").value.trim();
    const fullBodyPic = fullBodyPicInput.files[0];

    // Debug logs
    console.log("🧩 Calibration Input →", {
      userId,
      firstName,
      lastName,
      age,
      height,
      sports,
      hasPhoto: !!fullBodyPic,
    });

    if (!firstName || !lastName || !age || !height || !sports) {
      alert("Please fill out all required fields.");
      return;
    }

    // ---- Show preview + scanning when submitting ----
    if (fullBodyPic) {
      const reader = new FileReader();
      reader.onload = (event) => {
        fullBodyPreview.src = event.target.result;
        scanPreview.classList.remove("hidden");
        scanOverlay.classList.add("scanning");
      };
      reader.readAsDataURL(fullBodyPic);
    }

    const update_data = new FormData();
    update_data.append("userId", userId);
    update_data.append("first_name", firstName);
    update_data.append("last_name", lastName);
    update_data.append("age", age);
    update_data.append("height_cm", height);
    update_data.append("sport", sports);
    if (fullBodyPic) update_data.append("fullBodyPic", fullBodyPic);

    try {
      calibrationBtn.disabled = true;
      calibrationBtn.textContent = "Submitting...";

      const response = await fetch(
        "https://fastapi-app-843332298202.us-central1.run.app/calibration",
        {
          method: "POST",
          body: update_data,
        }
      );

      // ✅ Debug logging right after the response is received
      const result = await response.json();
      console.log("📦 Calibration API response:", response.status, result);
      scanOverlay.classList.remove("scanning"); // stop animation

      if (response.ok) {
        overlayMessage.textContent =
          "Personalizing your profile to deliver optimized performance insights...";
        calibrationOverlay.classList.remove("hidden");

        setTimeout(() => {
          overlayMessage.textContent = "Profile calibration completed successfully!";
          calibrationOverlay.classList.remove("hidden");

          // Keep success overlay visible for 8 seconds total
          setTimeout(() => {
            calibrationOverlay.classList.add("hidden");
            scanPreview.classList.add("hidden");
          }, 8000);
        }, 5000);

        document.getElementById("popupModal").classList.add("hidden");
        document.body.style.overflow = "";
      }
      else {
        overlayMessage.textContent =
          "Calibration failed. Please try again or upload a different image.";
        calibrationOverlay.classList.remove("hidden");

        // Keep error visible for 5 seconds instead of 4
        setTimeout(() => {
          calibrationOverlay.classList.add("hidden");
          scanPreview.classList.add("hidden");
        }, 5000);
      }
    } catch (err) {
      scanOverlay.classList.remove("scanning");
      overlayMessage.textContent =
        "An unexpected issue occurred. Please retry with a clear full-body image.";
      calibrationOverlay.classList.remove("hidden");

      setTimeout(() => {
        calibrationOverlay.classList.add("hidden");
        scanPreview.classList.add("hidden");
      }, 4000);

      console.error("Calibration error:", err);
    } finally {
      calibrationBtn.disabled = false;
      calibrationBtn.textContent = "Submit";
    }
  });
const customSelect = document.getElementById('sportsCustom');
  const optionsList = document.getElementById('sportsOptions');
  const checkboxes = optionsList.querySelectorAll('input[type="checkbox"]');
  const mainBox = document.querySelector('.main-box'); // Adjust if needed
  const options=document.querySelectorAll('#sportsOptions label')

  // Toggle dropdown
  customSelect.addEventListener('click', () => {
    optionsList.classList.toggle('hidden');
    mainBox.classList.toggle('extended-main-box')
  });
  
  // Update selected options in select box
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      const selected = [];
      checkboxes.forEach(cb => {
        if (cb.checked) {
          selected.push(cb.value);
          // options.classList.toggle('selected')
        }
      });

      customSelect.textContent = selected.length > 0
        ? selected.join(', ')
        : 'Select Sport';
    });
  });

}

// Make available globally so `home.js` can call it
window.loadProfile = loadProfile;


