// metricsVisualization.js
// All Chart.js logic, legends, sliders, and top metric boxes.

export function initDoughnutChart(canvasId, CONFIG) {
  const ctx = document.getElementById(canvasId).getContext("2d");

  const centerLabelPlugin = {
    id: "centerLabelPlugin",
    afterDraw(chart) {
      const { ctx, width, height } = chart;
      ctx.save();
      ctx.font = "bold 20px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (chart.canvas.id === "speedometerChart") {
        const speedValue = chart.data.datasets[0].data[0] || 0;
        ctx.fillText(`${Number(speedValue).toFixed(2)} yards/sec`, width / 2, height / 2);
      } else if (chart.canvas.id === "headMovementChart") {
        const idealPercentage = chart.data.datasets[0].data[0] || 0;
        ctx.fillText(`${idealPercentage}% Ideal`, width / 2, height / 2);
      }
      ctx.restore();
    }
  };
  Chart.register(centerLabelPlugin);

  return new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: [...CONFIG.OUTER_LABELS, ...CONFIG.INNER_LABELS],
      datasets: [
        {
          // OUTER ring
          data: [0, 0, 0],
          backgroundColor: [
            "rgb(102, 169, 232)",  // Running
            "rgb(82, 113, 255)",   // Standing
            "rgb(0, 74, 100)"      // Crouching
          ],
          borderColor: ["rgb(0,0,0)", "rgb(0,0,0)", "rgb(0,0,0)"],
          borderWidth: 2
        },
        {
          // INNER ring
          data: [0, 100],
          backgroundColor: [
            "rgb(122, 222, 90)",  // Head Up
            "rgb(233, 57, 44)"    // Head Down
          ],
          borderColor: ["rgb(0,0,0)", "rgb(0,0,0)"],
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "40%",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(ctx) {
              const lbl = ctx.datasetIndex === 0
                ? CONFIG.OUTER_LABELS[ctx.dataIndex]
                : CONFIG.INNER_LABELS[ctx.dataIndex];
              return `${lbl}: ${Math.round(ctx.parsed)}%`;
            }
          }
        }
      }
    }
  });
}

export function initPentagonChart(canvasId) {
  const ctx = document.getElementById(canvasId).getContext("2d");
  return new Chart(ctx, {
    type: "radar",
    data: {
      labels: ["Footwork", "Speed", "Acceleration", "Head Angle", "Posture"],
      datasets: [{
        label: "Athletic Scores",
        data: [0, 0, 0, 0, 0],
        backgroundColor: "rgba(230, 42, 42, 0.2)",
        borderColor: "#1a2532ff",
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          align: "end",
          labels: {
            font: { size: 22, weight: "bold" },
            color: "rgb(0, 0, 0)"
          }
        }
      },
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          grid: { lineWidth: 3, color: "rgb(82, 80, 80)" },
          ticks: {
            font: { size: 12 },
            color: "rgb(82, 80, 80)",
            stepSize: 10
          },
          pointLabels: {
            font: { size: 22 },
            color: "rgb(0, 0, 0)"
          }
        }
      }
    }
  });
}

export function showPentagonChart(state) {
  const canvas = document.getElementById("myChart2");
  const ctx = canvas.getContext("2d");
  if (state.currentChart) state.currentChart.destroy();

  state.currentChart = initPentagonChart("myChart2");
  // Populate with current scores if present
  const ds = state.currentChart.data.datasets[0];
  const s = state.backend.athleticScores || {};
  ds.data = [
    s.footworkScore || 0,
    s.speedScore || 0,
    s.accelerationScore || 0,
    s.headAngleScore || 0,
    s.postureScore || 0,
  ];
  state.currentChart.update();
  state.chartType = "radar";
}

 export function showUnifiedChart(state, metricIndices = []) {
   const canvas = document.getElementById("myChart2");
   const ctx = canvas.getContext("2d");
   if (state.currentChart) state.currentChart.destroy();

  state.currentChart = new Chart(ctx, {
     type: "line",
     data: {
       labels: state.backend.chartLabels || [],
       datasets: [
         { label: "Head Angle (°)",          data: state.backend.headAngleData || [],    borderColor: "#FF8C00", fill: false },
         { label: "Speed (yards/sec)",       data: state.backend.speedData || [],        borderColor: "#1F43E5", fill: false },
         { label: "Acceleration (yards/s²)", data: state.backend.accelerationData || [], borderColor: "#7DD859", fill: false },
         { label: "Deceleration (yards/s²)", data: state.backend.decelerationData || [], borderColor: "#E93632", fill: false },
         { label: "Stride Length (yards)",   data: state.backend.strideData || [],       borderColor: "#FFA500", fill: false },
         { label: "Jump Height (yards)",     data: state.backend.jumpData || [],         borderColor: "#800080", fill: false },
       ]
     },
     options: {
       responsive: true,
       maintainAspectRatio: false,
      interaction: { mode: "nearest", intersect: true },
      elements: {
        point: { radius: 3, hitRadius: 10 },
        line:  { tension: 0.2 }
      },
      plugins: {
        legend: {
          position: "top",
          labels: { usePointStyle: true }
          // Default legend click already allows multi-select toggling.
        },
        tooltip: {
          callbacks: {
            title: (items) => {
              const i = items?.[0]?.dataIndex ?? 0;
              const t = state.currentChart?.data?.labels?.[i];
              return `t = ${Number(t || 0).toFixed(2)} s`;
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: "Time (s)" },
          ticks: { autoSkip: true, maxTicksLimit: 10 }
        },
        y: {
          title: { display: true, text: "Value" }
        }
      }
     }
  });

   state.chartType = "line";
   // filter visibility
   state.currentChart.data.datasets.forEach((ds, idx) => {
    ds.hidden = metricIndices.length ? !metricIndices.includes(idx) : false;
   });
   state.currentChart.update();
 }


export function buildLegend(containerId, labels, colors) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
  labels.forEach((label, i) => {
    const item = document.createElement("div");
    const colorBox = document.createElement("span");
    colorBox.classList.add("legend-color-box");
    colorBox.style.backgroundColor = colors[i];

    const text = document.createElement("span");
    text.classList.add("legend-label-text");
    text.textContent = label;

    item.appendChild(colorBox);
    item.appendChild(text);
    container.appendChild(item);
  });
}

export function updateDoughnutChartFromData(doughnutChart, backend) {
  // inner ring
  const headUp  = Number(backend.innerRing?.["Head Up"] || 0);
  const headDown= Number(backend.innerRing?.["Head Down"] || 0);
  doughnutChart.data.datasets[1].data = [headUp, headDown];

  // outer ring
  const r = Number(backend.outerRing?.Running || 0);
  const s = Number(backend.outerRing?.Standing || 0);
  const c = Number(backend.outerRing?.Crouching || 0);
  doughnutChart.data.datasets[0].data = [r, s, c];

  doughnutChart.update();
}

export function updateSlidersFromData(backend, CONFIG) {
  const speed = Math.round(backend.topSpeed || 0);
  const accel = Math.round(maxOrZero(backend.accelerationData)); // peak accel
  const decel = Math.round(Math.abs(minOrZero(backend.decelerationData))); // peak decel magnitude
  const jump  = round2(avgOrZero(backend.jumpData));
  const stride= round2(avgOrZero(backend.strideData));

  updateProgress("topSpeed", "topSpeedBar", speed, CONFIG.MAX_SPEED);
  updateProgress("peakAcceleration", "peakAccelerationBar", accel, CONFIG.MAX_ACCEL);
  updateProgress("peakDeceleration", "peakDecelerationBar", decel, CONFIG.MAX_DECEL);
  updateProgress("averageJumpHeight", "averageJumpHeightBar", jump, CONFIG.MAX_JUMP);
  updateProgress("averageStrideLength", "averageStrideLengthBar", stride, CONFIG.MAX_STRIDE);

  // athletic score text
  const scores = backend.athleticScores || {};
  const avgScore = avgOrZero([
    scores.footworkScore, scores.speedScore, scores.accelerationScore, scores.headAngleScore, scores.postureScore
  ]);
  document.getElementById("athleticScoreValue").textContent = `${round1(avgScore)}%`;
}

export function updateTopMetricBoxes({ timeSecs, totalDistanceYards, steps }) {
  document.getElementById("drillTimeValue").textContent = `${Number(timeSecs || 0).toFixed(1)} SECS`;
  document.getElementById("distanceValue").textContent = `${Number(totalDistanceYards || 0).toFixed(1)} YARDS`;
  document.getElementById("stepsValue").textContent = `${Number(steps || 0)}`;
}

export function resetCharts(state, doughnutChart) {
  // doughnut
  doughnutChart.data.datasets[0].data = [0, 0, 0];
  doughnutChart.data.datasets[1].data = [0, 100];
  doughnutChart.update();

  if (state.currentChart) {
    state.currentChart.data.labels = [];
    state.currentChart.data.datasets.forEach(ds => ds.data = []);
    state.currentChart.update();
  }
}

export function resetMetricSlidersUI(CONFIG) {
  updateProgress("topSpeed", "topSpeedBar", 0, CONFIG.MAX_SPEED);
  updateProgress("peakAcceleration", "peakAccelerationBar", 0, CONFIG.MAX_ACCEL);
  updateProgress("peakDeceleration", "peakDecelerationBar", 0, CONFIG.MAX_DECEL);
  updateProgress("averageJumpHeight", "averageJumpHeightBar", 0, CONFIG.MAX_JUMP);
  updateProgress("averageStrideLength", "averageStrideLengthBar", 0, CONFIG.MAX_STRIDE);
  document.getElementById("athleticScoreValue").textContent = `0%`;
  document.getElementById("drillTimeValue").textContent = `0 SECS`;
  document.getElementById("distanceValue").textContent = `0 YARDS`;
  document.getElementById("stepsValue").textContent = `0`;
}

// ---- helpers
function updateProgress(textId, barId, value, maxValue) {
  const pct = Math.min((Number(value || 0) / (maxValue || 1)) * 100, 100);
  document.getElementById(textId).innerText = Number(value || 0);
  document.getElementById(barId).style.width = `${pct}%`;
}

const avgOrZero = (arr) => {
  const a = Array.isArray(arr) ? arr.filter((x) => Number.isFinite(x)) : [];
  if (!a.length) return 0;
  return a.reduce((s, v) => s + v, 0) / a.length;
};
const maxOrZero = (arr) => {
  const a = Array.isArray(arr) ? arr.filter((x) => Number.isFinite(x)) : [];
  return a.length ? Math.max(...a) : 0;
};
const minOrZero = (arr) => {
  const a = Array.isArray(arr) ? arr.filter((x) => Number.isFinite(x)) : [];
  return a.length ? Math.min(...a) : 0;
};
const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
