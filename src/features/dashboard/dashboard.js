function loadDashboard() {
  console.log("[DEBUG] loadDashboard() executed");

  // ✅ Log what key exists in localStorage
  console.log("[DEBUG] LocalStorage keys:", Object.keys(localStorage));

  // ✅ Fix to match backend login (most likely 'userId' not 'user_id')
  const userId = localStorage.getItem("userId") || localStorage.getItem("user_id");
  console.log("[DEBUG] userId from localStorage =", userId);

  const API_BASE = "https://rtsa-backend-gpu-843332298202.us-central1.run.app/";
  if (!userId) {
    console.warn("[WARN] No userId found — skipping API call");
    return;
  }

  const uploadCounter = document.getElementById("uploadCounter");
  const chartCanvas = document.getElementById("dashboardChart");
  console.log("[DEBUG] chartCanvas:", chartCanvas, "uploadCounter:", uploadCounter);

  // ✅ Add DOM readiness check logging
  if (!chartCanvas || !uploadCounter) {
    console.warn("[WARN] Dashboard elements not ready — retrying in 200ms");
    setTimeout(loadDashboard, 200);
    return;
  }

  let dashboardChart = null;

  // ✅ Reusable Chart.js setup like analytics unified chart
  function renderUnifiedChart(topSpeed, maxAccel, headUp) {
    const ctx = chartCanvas.getContext("2d");
    if (dashboardChart) dashboardChart.destroy();

    const labels = Array.from({ length: Math.max(topSpeed.length, maxAccel.length, headUp.length) }, (_, i) => `Video ${i + 1}`);

    const datasets = [
      { label: "Top Speed (yd/s)", data: topSpeed, borderColor: "#1F43E5", fill: false, yAxisID: "y0" },
      { label: "Max Acceleration (yd/s²)", data: maxAccel, borderColor: "#7DD859", fill: false, yAxisID: "y1" },
      { label: "Head Up %", data: headUp, borderColor: "#ff6600ff", fill: false, yAxisID: "y2" },
    ];

    const yAxes = {};
    datasets.forEach((ds, i) => {
      yAxes[`y${i}`] = {
        type: "linear",
        display: false,
        position: "left",
        offset: true,
        grid: { drawOnChartArea: false },
        ticks: { color: ds.borderColor },
      };
    });

    dashboardChart = new Chart(ctx, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "nearest", intersect: true },
        elements: { point: { radius: 3 }, line: { tension: 0.25 } },
        plugins: {
          legend: {
            position: "top",
            labels: { font: { size: 13, weight: "bold" }, color: "#000" },
            onClick: (e, legendItem, legend) => {
              const chart = legend.chart;
              const datasetIndex = legendItem.datasetIndex;
              const meta = chart.getDatasetMeta(datasetIndex);
              meta.hidden = meta.hidden === null ? !chart.data.datasets[datasetIndex].hidden : null;

              // Hide all Y-axes
              Object.keys(chart.options.scales).forEach(axis => {
                if (axis.startsWith("y")) chart.options.scales[axis].display = false;
              });

              // Show Y-axis if only one dataset is visible
              const visible = chart.data.datasets.filter((ds, i) => !chart.getDatasetMeta(i).hidden);
              if (visible.length === 1) {
                chart.options.scales[visible[0].yAxisID].display = true;
              }

              chart.update();
            },
          },
        },
        scales: {
          x: { title: { display: true, text: "Index" } },
          ...yAxes,
        },
      },
    });
  }


  async function fetchUploadCount() {
    try {
      console.log("[NETWORK] Triggering /get-total-uploads for userId", userId);
      const res = await fetch(`${API_BASE}get-total-uploads?userId=${userId}`);
      console.log("[NETWORK] Response status:", res.status);

      if (!res.ok) {
        console.warn("[WARN] Non-OK response from API:", res.status);
        return;
      }

      const data = await res.json();
      console.log("[DEBUG] API response payload:", data);

      uploadCounter.textContent = data.total_uploads || "0";

      const metrics = data.recent_analytics || {};
      const topSpeed = metrics.topSpeed || [];
      const maxAccel = metrics.maxAcceleration || [];
      const headUp = metrics.headUpPercentage || [];

      renderUnifiedChart(topSpeed, maxAccel, headUp);
    } catch (err) {
      console.error("[ERROR] Dashboard data fetch failed:", err);
    }
  }

  // ✅ Always call fetchUploadCount last
  console.log("[DEBUG] Calling fetchUploadCount() in 100ms...");
  setTimeout(fetchUploadCount, 100);

  // Report button setup (unchanged)
  const reportBtn = document.getElementById("one-page-report");
  if (reportBtn) {
    reportBtn.addEventListener("click", () => {
      console.log("clicked one-page-report");
      window.open("../../../src/features/reportForm/reportform.html", "_blank");
    });
  } else {
    console.warn("⚠️ One Page Report button not found.");
  }

  document.addEventListener("click", function (e) {
    const reportBtn = e.target.closest("#one-page-report");
    if (reportBtn) {
      console.log("clicked one-page-report");
      window.open("../../../src/features/reportForm/reportform.html", "_blank");
    }
  });
}

// Required so home.js can access it globally
window.loadDashboard = loadDashboard;