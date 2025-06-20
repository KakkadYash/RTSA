document.addEventListener("DOMContentLoaded", function () {
    const tabs = document.querySelectorAll(".nav-link");
    const contentSections = document.querySelectorAll(".tab-content");
    const userId = localStorage.getItem('user_id');

    console.log("Retrieved User ID:", userId); // Debugging
    
    document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', async (e) => {
        e.preventDefault();
        const page = e.currentTarget.getAttribute('data-page');
        const cssFile = e.currentTarget.getAttribute('data-css');
        const jsFile = e.currentTarget.getAttribute('data-js');

        if (!page) return;

        try {
        // Load HTML
        const res = await fetch(`/src/pages/${page}/${page}.html`);
        if (!res.ok) throw new Error(`Page ${page} not found`);
        const html = await res.text();
        document.getElementById('content-area').innerHTML = html;

        // Remove old CSS
        const oldStyle = document.getElementById('dynamic-page-style');
        if (oldStyle) oldStyle.remove();

        // Inject new CSS
        if (cssFile) {
            const linkEl = document.createElement('link');
            linkEl.id = 'dynamic-page-style';
            linkEl.rel = 'stylesheet';
            linkEl.href = `/src/css/${cssFile}`;
            linkEl.onerror = () => console.warn(`⚠️ Failed to load CSS: ${cssFile}`);
            document.head.appendChild(linkEl);
        }

        // Remove old script if exists
        const oldScript = document.getElementById('dynamic-page-script');
        if (oldScript) oldScript.remove();

        // Inject page-specific JS
        if (jsFile) {
            const scriptEl = document.createElement('script');
            scriptEl.id = 'dynamic-page-script';
            scriptEl.src = `/src/js/${jsFile}`;
            scriptEl.defer = true;
            scriptEl.onerror = () => console.warn(`⚠️ Failed to load JS: ${jsFile}`);
            document.body.appendChild(scriptEl);
        }

        // Toggle active class
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        if (e.currentTarget && e.currentTarget.classList) {
            e.currentTarget.classList.add('active');
        }

        } catch (err) {
        console.error(`Failed to load page ${page}:`, err);
        }
    });
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
});
// Logout
function logout() {
alert("Logging out...");
window.location.href = "../index.html";
} 