document.getElementById("signUpForm").addEventListener("submit", async function (event) {
  event.preventDefault();

  const first_name = document.getElementById('first_name').value.trim();
  const last_name = document.getElementById('last_name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const sport = document.getElementById('sport').value.trim();

  if (!first_name || !last_name || !email || !password || !sport) {
    alert('Please fill out all fields.');
    return;
  }

  console.log("[DEBUG] Preparing signup payload...");
  const payload = { first_name, last_name, email, password };
  console.log("[DEBUG] Payload:", payload);

  try {
    console.log("[DEBUG] Sending signup request...");
    const response = await fetch('https://fastapi-app-843332298202.us-central1.run.app/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    console.log("[DEBUG] Response status:", response.status);
    const data = await response.json().catch(() => ({}));
    console.log("[DEBUG] Response data:", data);

    if (!response.ok) {
      const message = data.detail || data.error || 'Signup failed.';
      alert(`Error ${response.status}: ${message}`);
      return;
    }

    alert('Sign-up successful! You can now log in.');
    window.location.href = './login.html';
  } catch (error) {
    console.error('[ERROR] Signup failed:', error);
    alert('An unexpected error occurred. Please try again.');
  }
});

// Smooth scroll on sport select
document.getElementById('sport').addEventListener('click', function () {
  document.getElementById('target').scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
});


