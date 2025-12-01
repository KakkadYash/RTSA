import { buildUnifiedLegend } from "../analytics/modules/metricsVisualization.js";

function loadDashboard() {
  console.log("[DEBUG] loadDashboard() executed");
  // ✅ Retrieve cached user info
  const userCache = JSON.parse(localStorage.getItem("userCache") || "{}");
  const nameInfo = document.getElementById("nameInfo");

  if (userCache.first_name && nameInfo) {
    nameInfo.textContent = userCache.first_name.toUpperCase(); // Example: "YASH"
  } else {
    console.warn("[WARN] No cached first_name found or #nameInfo missing");
  }

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

    const labels = window.dashboardUploadDates && window.dashboardUploadDates.length
      ? window.dashboardUploadDates.map(d => {
        const date = new Date(d);
        return (
          String(date.getMonth() + 1).padStart(2, "0") + "/" +
          String(date.getDate()).padStart(2, "0")
        );
      })
      : Array.from({ length: topSpeed.length }, (_, i) => `Video ${i + 1}`);

    const datasets = [
      { label: "Head Angle", key: "headUp", color: "#E93632", bg: "rgba(255,0,0,0.12)", data: headUp },
      { label: "Top Speed", key: "speed", color: "#1F43E5", bg: "rgba(31,67,229,0.15)", data: topSpeed },
      { label: "Acceleration", key: "acceleration", color: "#7DD859", bg: "rgba(125,216,89,0.15)", data: maxAccel },
    ];

    // Legend color restore plugin — same as Analytics
    const legendFixPlugin = {
      id: "legendFixPlugin",
      afterDraw(chart) {
        const legend = chart.legend;
        if (!legend) return;

        const ctx = chart.ctx;
        legend.legendItems.forEach((item) => {
          const ds = chart.data.datasets[item.datasetIndex];
          ctx.save();
          ctx.fillStyle = ds.borderColor;
          ctx.fillText(item.text, item.textX, item.textY);
          ctx.restore();
        });
      }
    };
    Chart.register(legendFixPlugin);

    dashboardChart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: datasets.map((d, i) => ({
          label: d.label,
          data: d.data,
          borderColor: d.color,
          backgroundColor: d.bg,
          borderWidth: 1.5,
          fill: true,
          tension: 0.25,
          pointRadius: 0.5,
          yAxisID: `y${i}`,
        })),
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        interaction: { mode: "nearest", intersect: true },
        plugins: { legend: { display: false } },
        scales: (() => {
          const yAxes = {};
          datasets.forEach((d, i) => {
            yAxes[`y${i}`] = {
              display: false,
              offset: true,
              grid: { drawOnChartArea: false }
            };
          });
          return { x: { ticks: { color: "white" } }, ...yAxes };
        })(),
      }
    });

    buildUnifiedLegend(dashboardChart, datasets);
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
      window.dashboardUploadDates = metrics.uploadDates || [];


      renderUnifiedChart(topSpeed, maxAccel, headUp);
    } catch (err) {
      console.error("[ERROR] Dashboard data fetch failed:", err);
    }
  }

  // ✅ Always call fetchUploadCount last
  console.log("[DEBUG] Calling fetchUploadCount() in 100ms...");
  setTimeout(fetchUploadCount, 100);

  // ==== One Page Report button shake setup ====
  const reportBtn = document.getElementById("one-page-report");

  // Remove the shake class after the animation finishes so it can retrigger
  if (reportBtn) {
    reportBtn.addEventListener("animationend", () => {
      reportBtn.classList.remove("shake-report");
    });
  }

  function triggerReportShake() {
    const btn = document.getElementById("one-page-report");
    if (!btn) return;

    // Reset class so re-click retriggers animation
    btn.classList.remove("shake-report");
    // Force reflow to restart animation
    void btn.offsetWidth;
    btn.classList.add("shake-report");
  }

  // Use a single delegated listener so clicks on the text, lock icon, etc. all count
  document.addEventListener("click", function (e) {
    const clickedReportBtn = e.target.closest("#one-page-report");
    if (clickedReportBtn) {
      console.log("clicked one-page-report");
      triggerReportShake();
      // Comment out the line below when you want One Page Report feature
      // window.open("../../../src/features/reportForm/reportform.html", "_blank");
    }
  });

}

// Required so home.js can access it globally
window.loadDashboard = loadDashboard;