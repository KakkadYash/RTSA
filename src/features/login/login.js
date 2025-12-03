const API_BASE = "https://rtsa-backend-gpu-843332298202.us-central1.run.app/"
// Open modal on forgot password click
document.getElementById("forgotPasswordLink").addEventListener("click", function () {
  const modal = new bootstrap.Modal(document.getElementById("forgotPasswordModal"));
  document.getElementById("forgotPasswordForm").reset();
  document.getElementById("forgotPasswordMessage").innerText = "";
  modal.show();
});

// Forgot password form submission
document.getElementById("forgotPasswordForm").addEventListener("submit", async function (event) {
  event.preventDefault();

  const email = document.getElementById("forgotEmail").value;

  try {
    const response = await fetch(`${API_BASE}forgot_password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const result = await response.json();
    console.log("Forgot Password Response:", result);

    document.getElementById("forgotEmail").style.display = "none";
    document.getElementById("forgotPasswordModal").style.display = "flex";
    document.getElementById("forgotPasswordMessage").style.display = "flex";


    document.getElementById("forgotPasswordMessage").innerText =
      "If this email exists, a reset link will be sent.";
  } catch (error) {
    console.error("Forgot Password Error:", error);
    document.getElementById("forgotPasswordMessage").innerText = "Something went wrong. Please try again.";
  }
});


// Login Form Submission
document.getElementById("loginForm").addEventListener("submit", async function (event) {
  event.preventDefault();

  const loginData = {
    email: document.getElementById("email").value,
    password: document.getElementById("password").value,
  };

  try {
    const response = await fetch(`${API_BASE}login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(loginData),
    });

    if (!response.ok) {
      // If the response status code is not 200-299
      const errorText = await response.text();
      throw new Error(`Server responded with ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("Server Response:", data);

    if (data.error) {
      alert(`Login failed: ${data.error}`);
    } else {
      alert("Login successful!");
      console.log("User ID from server:", data.userId);

      // ✅ Create unified cache object
      const userCache = {
        userId: data.userId,
        first_name: data.first_name,
        last_name: data.last_name,
        height_input_m: data.height_input_m,
        calibrated_height_m: data.calibrated_height_m,
        profilePicUrl: data.profilePicUrl,
        is_first_login: data.is_first_login,
        timestamp: Date.now(),
        subscriptionPlanType: data.subscription_plan_type,
        uploadCount: data.upload_count || 0,
      };

      // ✅ Store compact user cache
      localStorage.setItem("userCache", JSON.stringify(userCache));
      // Store subscription + free-trial gating info
      localStorage.setItem("subscriptionPlanType", data.subscription_plan_type || "None");
      localStorage.setItem("subscriptionStatus", data.subscription_status || "inactive");
      localStorage.setItem("isFirstLogin", String(data.is_first_login));
      localStorage.setItem("calibratedHeightM", data.calibrated_height_m ?? "");

      // Store userId and email in localStorage
      localStorage.setItem("userId", data.userId);
      localStorage.setItem("user_id", data.userId); // <- added line

      // Optionally store name or email for profile usage
      localStorage.setItem("user_name", data.email || `${data.first_name || ""} ${data.last_name || ""}`);

      // Redirect to the profile page
      window.location.href = "../home/home.html";
    }
  } catch (error) {
    console.error("Fetch Error:", error);
    alert(`An error occurred: ${error.message}`);
  }
});
