// Extract token from query parameters
function getTokenFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("token");
}

const form = document.getElementById("resetPasswordForm");
const successBox = document.getElementById("resetSuccessState");
const submitBtn = document.getElementById("send_reset_link");

form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const newPassword = document.getElementById("newPassword").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();
    const token = getTokenFromURL();

    if (!token) {
        alert("Invalid or missing reset token.");
        return;
    }

    if (newPassword !== confirmPassword) {
        alert("Passwords do not match!");
        return;
    }

    // ✅ Disable button to prevent double submit
    submitBtn.disabled = true;
    submitBtn.style.opacity = "0.6";

    try {
        const response = await fetch(
            `https://rtsa-backend-gpu-843332298202.us-central1.run.app/reset_password/${token}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    password: newPassword   // must match backend Pydantic model
                }),
            }
        );

        const result = await response.json();
        console.log("Reset Response:", result);

        if (result.message) {
            // ✅ Hide form
            form.style.display = "none";

            // ✅ Show success state
            successBox.style.display = "block";

            // ✅ Reset form inputs for clean state
            form.reset();

            // ✅ Redirect to login after 2 seconds
            setTimeout(() => {
                window.location.href = "../../../index.html";
            }, 2000);
        } else {
            alert("Something went wrong. Please try again.");
            submitBtn.disabled = false;
            submitBtn.style.opacity = "1";
        }

    } catch (error) {
        console.error("Reset Password Error:", error);
        alert("An error occurred. Please try again later.");
        submitBtn.disabled = false;
        submitBtn.style.opacity = "1";
    }
});
