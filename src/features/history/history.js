function loadHistory() {
  const API_BASE = "https://rtsa-backend-gpu-843332298202.us-central1.run.app/";
  const userId = localStorage.getItem("user_id") || localStorage.getItem("userId");

  if (!userId) {
    console.warn("[HISTORY] No user_id in localStorage");
    return;
  }

  const tableBody = document.getElementById("history-table-body");
  const prevBtn = document.getElementById("history-prev");
  const nextBtn = document.getElementById("history-next");
  const pageLabel = document.getElementById("history-page-label");

  if (!tableBody || !prevBtn || !nextBtn || !pageLabel) {
    console.warn("[HISTORY] Required DOM elements missing");
    return;
  }

  // pageTokens[pageNumber] = lastUploadDate cursor to send for that page
  // For page 1, cursor is null (no lastUploadDate)
  const pageTokens = { 1: null };

  let currentPage = 1;
  let lastResponseHasNext = false;

  const renderHistory = (history) => {
    tableBody.innerHTML = "";

    if (!Array.isArray(history) || history.length === 0) {
      tableBody.innerHTML = `<p style="color:white;">No videos found yet.</p>`;
      return;
    }

    history.forEach((item, index) => {
      // Support both camelCase and snake_case just in case
      const uploadDateRaw = item.uploadDate || item.upload_date;
      const videoName = item.video_name || item.videoName || "Untitled Video";
      const topSpeed = item.top_speed || item.topSpeed || "N/A";
      const videoUrl = item.video_url || item.videoUrl;

      if (index % 3 === 0) {
        const newRow = document.createElement("div");
        newRow.className = "drill-row";
        tableBody.appendChild(newRow);
      }

      const currentRow = tableBody.lastElementChild;

      const drillDiv = document.createElement("div");
      drillDiv.className = "drill";

      const displayDate = uploadDateRaw
        ? new Date(uploadDateRaw).toLocaleString()
        : "Unknown date";

      drillDiv.innerHTML = `
        <video controls>
          <source src="${videoUrl || ""}" type="video/mp4">
          Your browser does not support the video tag.
        </video>
        <div class="description">
          <span>${videoName}</span>
          <span>${displayDate}</span>
          <span>${topSpeed} yards/sec</span>
        </div>
      `;

      currentRow.appendChild(drillDiv);
    });
  };

  const updateControls = () => {
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = !lastResponseHasNext;
    pageLabel.textContent = `Page ${currentPage}`;
  };

  const fetchPage = async (pageNumber) => {
    try {
      const cursor = pageTokens[pageNumber] || null;

      const url = new URL(API_BASE + "history");
      url.searchParams.set("userId", userId);
      if (cursor) {
        url.searchParams.set("lastUploadDate", cursor);
      }

      console.log(`[HISTORY] Fetching page ${pageNumber} with cursor:`, cursor);

      const response = await fetch(url.toString());
      if (!response.ok) {
        console.error("[HISTORY] Failed to fetch:", response.status, response.statusText);
        return;
      }

      const data = await response.json();

      renderHistory(data.history || []);

      // If backend returns nextPageToken, that means there IS another page
      if (data.nextPageToken) {
        pageTokens[pageNumber + 1] = data.nextPageToken;
        lastResponseHasNext = true;
      } else {
        // No more pages beyond this
        delete pageTokens[pageNumber + 1];
        lastResponseHasNext = false;
      }

      currentPage = pageNumber;
      updateControls();
    } catch (err) {
      console.error("[HISTORY] Error fetching page:", err);
    }
  };

  // Button handlers (lazy-load on click)

  prevBtn.addEventListener("click", () => {
    if (currentPage === 1) return;
    const target = currentPage - 1;
    // For previous pages, we already have their cursor stored in pageTokens
    fetchPage(target);
  });

  nextBtn.addEventListener("click", () => {
    if (!lastResponseHasNext) return;
    const target = currentPage + 1;
    // Cursor for next page is already stored in pageTokens[target] by the last fetch
    if (pageTokens.hasOwnProperty(target)) {
      fetchPage(target);
    }
  });

  // Initial load = Page 1 (no cursor)
  fetchPage(1);
}

// Expose to your main loader
window.loadHistory = loadHistory;
