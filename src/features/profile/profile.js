function loadProfile() {
  const calibrationBtn = document.getElementById('calibration')
  const userId = localStorage.getItem("user_id");

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

      const sports = data.sports ? data.sports.split(', ') : [];
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

  if (popupForm && calibrationBtn) {
    popupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const userId = localStorage.getItem("user_id");
      if (!userId) {
        alert("User not found. Please log in again.");
        return;
      }

      // ✅ Read input values *now*, not at page load
      const firstName = document.getElementById("firstName").value.trim();
      const lastName = document.getElementById("lastName").value.trim();
      const age = document.getElementById("popupAge").value.trim();
      const height = document.getElementById("height").value.trim();
      const sports = document.getElementById("popupSports").value.trim();
      const fullBodyPic = document.getElementById("fullBodyPic").files[0];

      console.log("firstName", firstName);
      console.log("lastName", lastName);
      console.log("age", age);
      console.log("height", height);
      console.log("sports", sports);
      console.log("fullBodyPic", fullBodyPic);

      if (!firstName || !lastName || !age || !height || !sports) {
        alert("Please fill out all required fields.");
        return;
      }

      // ✅ Build FormData dynamically
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

        const result = await response.json();

        if (response.ok) {
          console.log("Calibration response:", result);
          alert("Profile updated successfully!");

          if (result.calibrated_height_m) {
            console.log(
              "Calibrated Height (m):",
              result.calibrated_height_m.toFixed(3)
            );
          }

          // ✅ Close the modal on success
          const modal = document.getElementById("popupModal");
          modal.classList.add("hidden");
          document.body.style.overflow = "";
        } else {
          console.error("Error response:", result);
          alert(result.detail || "Error during calibration.");
        }
      } catch (err) {
        console.error("Calibration error:", err);
        alert("An unexpected error occurred during calibration.");
      } finally {
        calibrationBtn.disabled = false;
        calibrationBtn.textContent = "Submit";
      }
    });
  }



  //Upload Photo Button: Height Calibration popup-modal  

  const openModalBtn = document.getElementById('openModalBtn');
  const modal = document.getElementById("popupModal");

  openModalBtn.addEventListener('click', () => {
    openModal();
  })

  let focusableElements, firstFocusableElement, lastFocusableElement;

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


  // Focus trap setup
  const focusableSelectors = [
    'a[href]', 'area[href]', 'input:not([disabled])', 'select:not([disabled])',
    'textarea:not([disabled])', 'button:not([disabled])', '[tabindex]:not([tabindex="-1"])'
  ].join(',');


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
}

// Make available globally so `home.js` can call it
window.loadProfile = loadProfile;






