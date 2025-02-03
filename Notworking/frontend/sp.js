document.addEventListener("DOMContentLoaded", function () {
    const profilePage = document.getElementById("profilePage");
    const tabs = document.querySelectorAll(".nav-link");
    const contentSections = document.querySelectorAll(".tab-content");
    const logoutButton = document.getElementById("logoutButton");
    const userId = localStorage.getItem('user_id');
    const menuButton = document.getElementById("menuButton");
    const menuIcon = document.getElementById("menuIcon");
    const sideMenu = document.getElementById("sideMenu");
    const newAnalyticsLink = document.getElementById("newAnalyticsLink");

    // Fetch and populate profile data
    console.log("Retrieved User ID:", userId); // Debugging
    const fetchProfileData = async () => {
        const userId = localStorage.getItem("user_id");
        if (!userId) {
            alert("User ID not found. Redirecting to login.");
            window.location.href = "login.html";
            return;
        }
        try {
            const response = await fetch(`http://127.0.0.1:5000/profile?userId=${userId}`);
            const data = await response.json();
    
            if (data.error) {
                console.error(data.error);
            } else {
                // Populate the form fields with fetched data
                document.getElementById("name").value = data.name || '';
                document.getElementById("email").value = data.email || '';
                document.getElementById("username").value = data.username || '';
                document.getElementById("password").value = '********'; // Masked for security
                document.getElementById("age").value = data.age || '';
                document.getElementById("state").value = data.state || '';
                
                const sports = data.sports ? data.sports.split(', ') : [];
                const sportsDropdown = document.getElementById("sports");
                for (let option of sportsDropdown.options) {
                    option.selected = sports.includes(option.value);
                }
            }
        } catch (error) {
            console.error('Error fetching profile data:', error);
        }
    };
    fetchProfileData();

    // Fetch and populate history data
    const loadHistory = async () => {
        try {
            const response = await fetch(`http://127.0.0.1:5000/history?userId=${userId}`);
            const historyData = await response.json();

            const tableBody = document.getElementById('history-table-body');
            tableBody.innerHTML = ''; // Clear previous rows

            historyData.forEach((item, index) => {
                const row = `
                    <tr>
                        <td>${index + 1}</td>
                        <td><img src="${item.thumbnail_url}" alt="Thumbnail" width="100"></td>
                        <td>${new Date(item.upload_date).toLocaleDateString()}</td>
                        <td><a href="${item.video_url}" target="_blank">${item.video_name}</a></td>
                        <td>${item.head_percentage || 'N/A'}%</td>
                        <td>${item.top_speed || 'N/A'} km/h</td>
                    </tr>`;
                tableBody.innerHTML += row;
            });
        } catch (error) {
            console.error('Error loading history:', error);
        }
    };

    // Load history when History tab is clicked
    const historyTab = document.querySelector('[data-tab="history"]');
    historyTab.addEventListener("click", loadHistory);

    // Toggle Side Menu
    menuButton.addEventListener("click", function() {
        if (sideMenu.classList.contains("show")) {
            sideMenu.classList.remove("show");
            sideMenu.classList.add("hide");
        } else {
            sideMenu.classList.remove("hide");
            sideMenu.classList.add("show");
        }

        profilePage.classList.toggle('show-menu');
        const isMenuOpen = sideMenu.classList.contains("show");
        if (isMenuOpen) {
            menuIcon.classList.remove("fa-bars");
            menuIcon.classList.add("fa-times");
        } else {
            menuIcon.classList.remove("fa-times");
            menuIcon.classList.add("fa-bars");
        }
    });

    // New Analytics Link
    newAnalyticsLink.addEventListener("click", function(event) {
        event.preventDefault();
        window.open("./analytics/a.html", "_blank");
    });

    // Tab Navigation
    tabs.forEach(tab => {
        tab.addEventListener("click", function (event) {
            event.preventDefault();
            const targetTab = event.target.getAttribute("data-tab");
            if (targetTab) {
                contentSections.forEach(section => section.classList.add("d-none"));
                document.getElementById(targetTab).classList.remove("d-none");
            }
        });
    });

    // Logout
    logoutButton.addEventListener("click", () => {
        localStorage.clear();
        window.location.href = "login.html";
    });

    document.getElementById("userProfileForm").addEventListener("submit", async (e) => {
        e.preventDefault();
    
        const profileData = {
            userId: userId, // Ensure userId is passed
            age: document.getElementById("age").value,
            state: document.getElementById("state").value,
            sports: Array.from(document.getElementById("sports").selectedOptions).map(option => option.value),
        };
    
        try {
            const response = await fetch("http://127.0.0.1:5000/updateProfile", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(profileData),
            });
    
            const result = await response.json();
            if (result.success) {
                alert("Profile updated successfully!");
                await fetchProfileData(); // Reload the updated data
            } else {
                alert(`Error updating profile: ${result.error}`);
            }
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("An error occurred while updating the profile.");
        }
    });
    
});
