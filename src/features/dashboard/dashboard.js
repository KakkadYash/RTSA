function loadDashboard() {
  console.log("[DEBUG] loadDashboard() executed");
  const userId = localStorage.getItem("user_id");
  if (!userId) return;

  const chartCanvas = document.getElementById("myChart");
  const uploadCounter = document.getElementById("uploadCounter");
  const prevBtn = document.getElementById("prevChart");
  const nextBtn = document.getElementById("nextChart");

  if (!chartCanvas || !uploadCounter || !prevBtn || !nextBtn) {
    console.warn("Dashboard elements not ready");
    return;
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false, // <- keep
    animation: false,           // <- optional
  };

  let chartInstance;
  let currentMetricIndex = 0;

  const metricLabels = ["Combined", "Ideal Head Angle %", "Top Speed (km/h)", "Average Athletic Score"];
  const chartDataCache = { labels: [], headAngleData: [], topSpeedData: [], athleticScoreData: [] };

  const average = arr => arr.length ? arr.reduce((a, b) => a + b, 0) : 0;

  function renderChart(index) {
    const ctx = chartCanvas.getContext("2d");
    if (chartInstance) chartInstance.destroy();

    const { labels, headAngleData, topSpeedData, athleticScoreData } = chartDataCache;

    let datasets = [];
    if (index === 0) {
      datasets = [
        { label: "Ideal Head Angle %", data: headAngleData, borderColor: "blue", fill: false },
        { label: "Top Speed (km/h)", data: topSpeedData, borderColor: "red", fill: false },
        { label: "Average Athletic Score", data: athleticScoreData, borderColor: "green", fill: false }
      ];
    } else {
      const dataMap = [null, headAngleData, topSpeedData, athleticScoreData];
      const colorMap = [null, "blue", "red", "green"];
      datasets = [{
        label: metricLabels[index],
        data: dataMap[index],
        borderColor: colorMap[index],
        fill: false
      }];
    }

    chartInstance = new Chart(ctx, {
      type: "line",
      data: { labels, datasets },
      options: chartOptions
    });
  }

  async function fetchUploadCount() {
    try {
      const res = await fetch(`https://fastapi-app-843332298202.us-central1.run.app/get-total-uploads?userId=${userId}`);
      const data = await res.json();
      uploadCounter.textContent = data.total_uploads || "0";
    } catch (err) {
      console.error("Upload count error:", err);
    }
  }

  async function fetchHistoryData() {
    try {
      const res = await fetch(`https://fastapi-app-843332298202.us-central1.run.app/history?userId=${userId}`);
      const data = await res.json();
      const history = data.history;
      if (!Array.isArray(history)) return;

      history.sort((a, b) => new Date(a.upload_date) - new Date(b.upload_date));
      const uploadDates = history.map(h => new Date(h.upload_date));
      const firstDate = uploadDates[0];
      const lastDate = uploadDates[uploadDates.length - 1];
      const timeSpanDays = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24));

      let labels = [], head = [], speed = [], score = [];

      if (timeSpanDays <= 7) {
        labels = uploadDates.map((_, i) => `Day ${i + 1}`);
        head = history.map(h => parseFloat(h.ideal_head_angle_percentage) || 0);
        speed = history.map(h => parseFloat(h.top_speed) || 0);
        score = history.map(h => parseFloat(h.athletic_score) || 0);
      } else if (timeSpanDays <= 28) {
        const weekly = {};
        history.forEach(h => {
          const week = Math.ceil((new Date(h.upload_date) - firstDate) / (1000 * 60 * 60 * 24 * 7)) + 1;
          const key = `Week ${week}`;
          if (!weekly[key]) weekly[key] = { head: [], speed: [], score: [] };
          weekly[key].head.push(parseFloat(h.ideal_head_angle_percentage) || 0);
          weekly[key].speed.push(parseFloat(h.top_speed) || 0);
          weekly[key].score.push(parseFloat(h.athletic_score) || 0);
        });
        labels = Object.keys(weekly);
        head = labels.map(k => average(weekly[k].head));
        speed = labels.map(k => average(weekly[k].speed));
        score = labels.map(k => average(weekly[k].score));
      } else {
        const monthly = {};
        history.forEach(h => {
          const date = new Date(h.upload_date);
          const month = (date.getFullYear() - firstDate.getFullYear()) * 12 + date.getMonth() - firstDate.getMonth() + 1;
          const key = `Month ${month}`;
          if (!monthly[key]) monthly[key] = { head: [], speed: [], score: [] };
          monthly[key].head.push(parseFloat(h.ideal_head_angle_percentage) || 0);
          monthly[key].speed.push(parseFloat(h.top_speed) || 0);
          monthly[key].score.push(parseFloat(h.athletic_score) || 0);
        });
        labels = Object.keys(monthly);
        head = labels.map(k => average(monthly[k].head));
        speed = labels.map(k => average(monthly[k].speed));
        score = labels.map(k => average(monthly[k].score));
      }

      chartDataCache.labels = labels;
      chartDataCache.headAngleData = head;
      chartDataCache.topSpeedData = speed;
      chartDataCache.athleticScoreData = score;

      renderChart(currentMetricIndex);
    } catch (err) {
      console.error("History fetch error:", err);
    }
  }

  // Run on load
  fetchUploadCount();
  fetchHistoryData();

  // Arrows
  prevBtn.addEventListener("click", () => {
    currentMetricIndex = (currentMetricIndex - 1 + metricLabels.length) % metricLabels.length;
    renderChart(currentMetricIndex);
  });

  nextBtn.addEventListener("click", () => {
    currentMetricIndex = (currentMetricIndex + 1) % metricLabels.length;
    renderChart(currentMetricIndex);
  });
}
const reportBtn = document.getElementById("one-page-report");
if (reportBtn) {
  reportBtn.addEventListener("click", () => {
    console.log('clicked one-page-report')
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
// Required so home.js can access it globally
window.loadDashboard = loadDashboard;