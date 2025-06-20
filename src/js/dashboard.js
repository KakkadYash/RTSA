(function () {
  let headAngleChart, topSpeedChart, athleticScoreChart;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true }
    }
  };

  function average(arr) {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  function createOrUpdateChart(chartInstance, ctx, labels, data, label, color) {
    if (chartInstance) chartInstance.destroy();
    return new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label,
          data,
          borderColor: color,
          fill: false
        }]
      },
      options: chartOptions
    });
  }

  const loadProgressDashboard = async () => {
    try {
      const userId = localStorage.getItem("user_id");
      const response = await fetch(`https://uploaded-data-443715.uc.r.appspot.com/history?userId=${userId}`);
      const historyData = await response.json();

      if (!Array.isArray(historyData.history)) {
        console.error("Error: historyData is not an array", historyData);
        return;
      }

      // Sort and extract values
      historyData.history.sort((a, b) => new Date(a.upload_date) - new Date(b.upload_date));

      const uploadDates = historyData.history.map(item => new Date(item.upload_date));
      const firstDate = uploadDates[0];
      const lastDate = uploadDates[uploadDates.length - 1];
      const timeSpanDays = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24));

      let labels = [];
      let headAngleData = [], topSpeedData = [], athleticScoreData = [];

      if (timeSpanDays <= 7) {
        // DAILY
        labels = uploadDates.map((_, i) => `Day ${i + 1}`);
        headAngleData = historyData.history.map(item => parseFloat(item.ideal_head_angle_percentage) || 0);
        topSpeedData = historyData.history.map(item => parseFloat(item.top_speed) || 0);
        athleticScoreData = historyData.history.map(item => parseFloat(item.athletic_score) || 0);
      } else if (timeSpanDays <= 28) {
        // WEEKLY
        const weeklyData = {};
        historyData.history.forEach(item => {
          const date = new Date(item.upload_date);
          const weekNumber = Math.ceil(((date - firstDate) / (1000 * 60 * 60 * 24)) / 7) + 1;
          const key = `Week ${weekNumber}`;
          if (!weeklyData[key]) weeklyData[key] = { head: [], speed: [], score: [] };
          weeklyData[key].head.push(parseFloat(item.ideal_head_angle_percentage) || 0);
          weeklyData[key].speed.push(parseFloat(item.top_speed) || 0);
          weeklyData[key].score.push(parseFloat(item.athletic_score) || 0);
        });

        labels = Object.keys(weeklyData);
        headAngleData = labels.map(key => average(weeklyData[key].head));
        topSpeedData = labels.map(key => average(weeklyData[key].speed));
        athleticScoreData = labels.map(key => average(weeklyData[key].score));
      } else {
        // MONTHLY
        const monthlyData = {};
        historyData.history.forEach(item => {
          const date = new Date(item.upload_date);
          const monthNumber = (date.getFullYear() - firstDate.getFullYear()) * 12 + (date.getMonth() - firstDate.getMonth()) + 1;
          const key = `Month ${monthNumber}`;
          if (!monthlyData[key]) monthlyData[key] = { head: [], speed: [], score: [] };
          monthlyData[key].head.push(parseFloat(item.ideal_head_angle_percentage) || 0);
          monthlyData[key].speed.push(parseFloat(item.top_speed) || 0);
          monthlyData[key].score.push(parseFloat(item.athletic_score) || 0);
        });

        labels = Object.keys(monthlyData);
        headAngleData = labels.map(key => average(monthlyData[key].head));
        topSpeedData = labels.map(key => average(monthlyData[key].speed));
        athleticScoreData = labels.map(key => average(monthlyData[key].score));
      }

      // Update charts
      const ctx1 = document.getElementById("headAngleChart").getContext("2d");
      const ctx2 = document.getElementById("topSpeedChart").getContext("2d");
      const ctx3 = document.getElementById("athleticScoreChart").getContext("2d");

      headAngleChart = createOrUpdateChart(headAngleChart, ctx1, labels, headAngleData, "Ideal Head Angle %", "blue");
      topSpeedChart = createOrUpdateChart(topSpeedChart, ctx2, labels, topSpeedData, "Top Speed (km/h)", "red");
      athleticScoreChart = createOrUpdateChart(athleticScoreChart, ctx3, labels, athleticScoreData, "Average Athletic Score", "green");

    } catch (error) {
      console.error("Error loading progress dashboard:", error);
    }
  };

  const totaluploads = async () => {
    try {
      const userId = localStorage.getItem("user_id");
      if (!userId) {
        console.error("User ID not found.");
        return;
      }

      const response = await fetch(`https://uploaded-data-443715.uc.r.appspot.com/get-total-uploads?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch total uploads");

      const data = await response.json();
      document.getElementById('uploadCounter').textContent = data.total_uploads;

    } catch (error) {
      console.error("Error fetching total uploads:", error);
    }
  };

  // Bind tab click after DOM is ready (because it's dynamically injected)
  const progressTab = document.querySelector('[data-tab="progress"]');
  if (progressTab) {
    progressTab.addEventListener("click", () => {
      loadProgressDashboard();
      totaluploads();
    });
  } else {
    console.warn("Progress tab not found");
  }
})();
