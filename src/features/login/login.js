

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
        const response = await fetch("https://fastapi-app-843332298202.us-central1.run.app/forgot_password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
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
        username: document.getElementById("username").value,
        password: document.getElementById("password").value,
      };

      try {
        const response = await fetch("https://fastapi-app-843332298202.us-central1.run.app/login", {
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
          console.log("User ID from server:", data.user_id);

          // Store user_id and username in localStorage
          localStorage.setItem("user_id", data.user_id);
          localStorage.setItem("user_name", data.username);

          // Redirect to the profile page
          window.location.href = "../home/home.html";
        }
      } catch (error) {
        console.error("Fetch Error:", error);
        alert(`An error occurred: ${error.message}`);
      }
    });
