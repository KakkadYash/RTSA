const backendUrl = "https://rtsa-backend-gpu-843332298202.us-central1.run.app/";   // ← Replace with your actual API domain
const drillCategories = {
    "RT Broad Jump Drill": "Explosiveness",
    "RT Split Jump Drill": "Explosiveness",
    "RT Vertical Jump Drill": "Explosiveness",

    "RT 3 Cone Drill": "Speed",
    "RT Box Drill": "Speed",
    "RT Sprint Drill": "Speed",

    "RT Pro Agility Drill": "Agility",
    "RT Shuffle Drill": "Agility",
    "RT Backpedal Drill": "Agility"
};

const categoryTitles = {
    "Explosiveness": "Explosiveness Drills",
    "Speed": "Speed Drills",
    "Agility": "Agility Drills"
};

async function loadDrills() {
    try {
        console.log("📡 Fetching:", `${backendUrl}drills`);

        const res = await fetch(`${backendUrl}drills`);

        console.log("📍 Status:", res.status);

        // Read raw text so we SEE what the backend returned
        const raw = await res.text();
        console.log("🔍 Raw Response:", raw);

        let data;
        try {
            data = JSON.parse(raw);
        } catch (jsonErr) {
            console.error("❌ JSON parsing failed:", jsonErr);
            return;
        }

        console.log("🧩 Parsed JSON:", data);

        if (!data.drills) {
            console.error("❌ ERROR: data.drills is missing in API response!");
            return;
        }

        const list = document.getElementById("drillList");
        list.innerHTML = "";

        // Group drills by category before rendering
        const grouped = {
            "Explosiveness": [],
            "Speed": [],
            "Agility": []
        };

        data.drills.forEach(drill => {
            const cat = drillCategories[drill.name] || "Misc";
            grouped[cat].push(drill);
        });

        // Now render categories + drill cards
        list.innerHTML = "";

        Object.keys(grouped).forEach(category => {
            if (grouped[category].length === 0) return;

            // Add category header
            const header = document.createElement("h2");
            header.className = "drill-category-header";
            header.innerText = categoryTitles[category];
            list.appendChild(header);

            // Add drill cards under this category
            grouped[category].forEach(drill => {
                const card = document.createElement("div");
                card.className = "drill-card";

                card.innerHTML = `
            <div class="drill-video-col">
                <video controls preload="metadata" src="${drill.videoUrl}"></video>
            </div>

            <div class="drill-info-col">
                <div class="drill-title">${drill.name}</div>
                <div class="drill-desc">${getDescription(drill.name)}</div>
            </div>
        `;

                list.appendChild(card);
            });
        });


    } catch (err) {
        console.error("❌ Failed to load drills:", err);
    }
}


// Simple description generator — customize later
function getDescription(name) {
    const map = {
        "RT Broad Jump Drill":
            "The broad jump drill builds lower-body power and helps athletes learn to explode forward with strength.",

        "RT Split Jump Drill":
            "The split jump drill improves quick leg drive and balance, helping athletes explode faster in every direction.",

        "RT Vertical Jump Drill":
            "The vertical jump drill boosts upward power, helping athletes jump higher and move more explosively.",

        "RT 3 Cone Drill":
            "The 3-cone drill teaches athletes to speed up, change direction quickly, and run smoother between turns.",

        "RT Box Drill":
            "The box drill helps athletes accelerate in different directions while keeping speed and control during movement.",

        "RT Sprint Drill":
            "The sprint drill increases straight-line speed by improving stride length, quickness, and fast acceleration.",

        "RT Pro Agility Drill":
            "The pro agility drill helps athletes stop, plant, and change direction quickly to move faster on the field.",

        "RT Shuffle Drill":
            "The shuffle drill strengthens side-to-side quickness and teaches athletes to move fast while staying balanced.",

        "RT Backpedal Drill":
            "The backpedal drill builds smooth backward movement and helps athletes transition into fast forward acceleration."
    };


    return map[name] || "This drill improves speed, agility, and athletic movement.";
}

// Auto-run
loadDrills();
