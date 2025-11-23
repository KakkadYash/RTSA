function loadHistory() {
  const API_BASE = "https://rtsa-backend-gpu-843332298202.us-central1.run.app/";
  const userId = localStorage.getItem("user_id") || localStorage.getItem("userId");

  if (!userId) return;

  const tableBody = document.getElementById("history-table-body");
  const prevBtn = document.getElementById("history-prev");
  const nextBtn = document.getElementById("history-next");
  const pageLabel = document.getElementById("history-page-label");

  let currentPage = 1;
  let lastResponseHasNext = false;

  const renderHistory = (history) => {
    tableBody.innerHTML = "";

    if (!history.length) {
      tableBody.innerHTML = `<p style="color:white;">No videos found yet.</p>`;
      return;
    }

    history.forEach((item, index) => {
      const videoUrl = item.video_url;
      const videoName = item.videoName || "Untitled Video";
      const uploadDate = item.uploadDate
        ? new Date(item.uploadDate).toLocaleString()
        : "Unknown date";

      const div = document.createElement("div");
      div.className = "drill";
      div.innerHTML = `
        <video controls>
          <source src="${videoUrl}" type="video/mp4">
        </video>
        <div class="description">
          <span>${videoName}</span>
          <span>${uploadDate}</span>
        </div>
      `;

      tableBody.appendChild(div);
    });
  };

  const updateControls = () => {
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = !lastResponseHasNext;
    pageLabel.textContent = `Page ${currentPage}`;
  };

  const fetchPage = async (pageNumber) => {
    try {
      const url = new URL(API_BASE + "history");
      url.searchParams.set("userId", userId);
      url.searchParams.set("page", pageNumber);

      const res = await fetch(url);
      const data = await res.json();

      renderHistory(data.history || []);
      lastResponseHasNext = data.nextPageAvailable;
      currentPage = data.currentPage;
      updateControls();
    } catch (err) {
      console.error(err);
    }
  };

  prevBtn.addEventListener("click", () => {
    if (currentPage > 1) fetchPage(currentPage - 1);
  });

  nextBtn.addEventListener("click", () => {
    if (lastResponseHasNext) fetchPage(currentPage + 1);
  });

  fetchPage(1);
}

window.loadHistory = loadHistory;
