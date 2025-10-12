document.getElementById("signUpForm").addEventListener("submit", function (event) {
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

      fetch('https://fastapi-app-843332298202.us-central1.run.app/signup', {
        method: 'POST',  // ✅ Change this from 'OPTIONS' to 'POST'
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name, last_name, email, password }),
      })
        .then(response => response.json())  // Handle response correctly
        .then(data => {
          if (data.error) {
            alert(data.error);
          } else {
            alert('Sign-up successful! You can now log in.');
            window.location.href = './login.html'; // Redirect to login page
          }
        })
        .catch(error => {
          console.error('Error:', error);
          alert('An error occurred. Please try again.');
        });
    });

     // Below script is for automatic scroll down on clicking arrows
    document.getElementById('sport').addEventListener('click', function () {
      document.getElementById('target').scrollIntoView({
        behavior: 'smooth',   // smooth scrolling animation
        block: 'start'
      });
    });