function loadHistory() {
  const API_BASE = "https://rtsa-backend-gpu-843332298202.us-central1.run.app/"
  const userId = localStorage.getItem("user_id");
  if (!userId) return;

  const tableBody = document.getElementById("history-table-body");
  if (!tableBody) {
    console.warn("History DOM not ready.");
    return;
  }

  const fetchHistoryData = async () => {
    try {
      const response = await fetch(`${API_BASE}history?userId=${userId}`);
      const historyData = await response.json();

      tableBody.innerHTML = '';

      if (!Array.isArray(historyData.history)) {
        console.error("historyData.history is not an array:", historyData);
        return;
      }

      historyData.history.forEach((item, index) => {
        if (index % 3 === 0) {
          const newRow = document.createElement('div');
          newRow.className = 'drill-row';
          tableBody.appendChild(newRow);
        }

        const currentRow = tableBody.lastElementChild;
        const drillDiv = document.createElement('div');
        drillDiv.className = 'drill';
        drillDiv.innerHTML = `
          <video width="320" height="240" controls>
            <source src="${item.video_url}" type="video/mp4">
            Your browser does not support the video tag.
          </video>
          <div class="description">
            <span>${item.video_name}</span>
            <span>${new Date(item.upload_date).toLocaleDateString()}</span>
            <span>${item.top_speed || 'N/A'} yards/sec</span>
          </div>
        `;
        currentRow.appendChild(drillDiv);
      });
    } catch (error) {
      console.error("Error loading history:", error);
    }
  };

  fetchHistoryData();
}

// Make available to home.js loader
window.loadHistory = loadHistory;
