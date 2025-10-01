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
