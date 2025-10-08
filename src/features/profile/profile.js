function loadProfile() {
  const userId = localStorage.getItem("user_id");
  if (!userId) {
    alert("User ID not found. Redirecting to login.");
    window.location.href = "lo.html";
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

      document.getElementById("nameInfo").innerHTML = data.name || '';
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
}

// Make available globally so `home.js` can call it
window.loadProfile = loadProfile;

function initModal() {
  // Modal elements
  const modal = document.getElementById("popupModal");
  const openModalBtn = document.getElementById('openModalBtn'); // button that opens modal
  const closeModalBtn = modal.querySelector(".close-btn");
  const modalContent = modal.querySelector(".modal-content");

  // Focus trap setup
  const focusableSelectors = [
    'a[href]', 'area[href]', 'input:not([disabled])', 'select:not([disabled])',
    'textarea:not([disabled])', 'button:not([disabled])', '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  let focusableElements, firstFocusableElement, lastFocusableElement;

  function trapFocus(element) {
    focusableElements = element.querySelectorAll(focusableSelectors);
    if (focusableElements.length === 0) return;

    firstFocusableElement = focusableElements[0];
    lastFocusableElement = focusableElements[focusableElements.length - 1];

    // Add keydown event listener inside trapFocus
    element.addEventListener('keydown', handleKeyDown);
  }

  // Handle tab and escape keys inside modal
  function handleKeyDown(e) {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === firstFocusableElement) {
          e.preventDefault();
          lastFocusableElement.focus();
        }
      } else {
        if (document.activeElement === lastFocusableElement) {
          e.preventDefault();
          firstFocusableElement.focus();
        }
      }
    }
    if (e.key === 'Escape') {
      closeModal();
    }
  }

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

  // Remove any old event listeners before adding new ones (optional but safer)
  openModalBtn.replaceWith(openModalBtn.cloneNode(true));
  const newOpenModalBtn = document.getElementById('openModalBtn');
  newOpenModalBtn.addEventListener('click', openModal);

  closeModalBtn.replaceWith(closeModalBtn.cloneNode(true));
  const newCloseModalBtn = modal.querySelector(".close-btn");
  newCloseModalBtn.addEventListener('click', closeModal);

  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  const popupForm = document.getElementById('popupProfileForm');
  popupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Popup form submitted!');
    closeModal();
  });
}
