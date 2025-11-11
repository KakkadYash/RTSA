// metricsVisualization.js
// All Chart.js logic, legends, sliders, and top metric boxes.

// HTML-based double doughnut (outer posture ring + inner head ring)
export function initDoughnutChart(canvasId, CONFIG) {
  const root = document.getElementById("doubleDonut");
  if (!root) {
    console.warn("[DOUGHNUT] #doubleDonut not found in DOM");
    return null;
  }

  const outer = root.querySelector(".outer-ring");
  const inner = root.querySelector(".inner-ring");
  const center = document.getElementById("donutCenterLabel");

  if (!outer || !inner || !center) {
    console.warn("[DOUGHNUT] Missing inner elements in #doubleDonut");
    return null;
  }

  // Initialize as cleared
  resetHtmlDoughnut({ outer, inner, center });

  // Return a reference object instead of a Chart.js instance
  return { outer, inner, center };
}
function resetHtmlDoughnut(refs) {
  if (!refs) return;
  refs.outer.style.background = "conic-gradient(#444 0deg, #444 360deg)";
  refs.inner.style.background = "conic-gradient(#222 0deg, #222 360deg)";
  refs.center.textContent = "--%";
}

export function updateDoughnutChartFromData(donutRefs, backend) {
  if (!donutRefs || !backend) return;
  const { outer, inner, center } = donutRefs;

  // ----- OUTER RING: Running / Standing / Crouching -----
  const r = Number(backend.outerRing?.Running || 0);
  const s = Number(backend.outerRing?.Standing || 0);
  const c = Number(backend.outerRing?.Crouching || 0);

  const totalOuter = r + s + c || 1;
  const rDeg = (r / totalOuter) * 360;
  const sDeg = (s / totalOuter) * 360;
  const cDeg = (c / totalOuter) * 360;

  outer.style.background = `
    conic-gradient(
      rgb(102,169,232) 0deg ${rDeg}deg,
      rgb(82,113,255) ${rDeg}deg ${rDeg + sDeg}deg,
      rgb(0,74,100) ${rDeg + sDeg}deg 360deg
    )
  `;

  // ----- INNER RING: Head Up / Head Down -----
  const headUp = Number(backend.innerRing?.["Head Up"] || 0);
  const headDown = Number(backend.innerRing?.["Head Down"] || 0);
  const totalInner = headUp + headDown || 1;
  const upDeg = (headUp / totalInner) * 360;

  inner.style.background = `
    conic-gradient(
      rgb(122,222,90) 0deg ${upDeg}deg,
      rgb(233,57,44) ${upDeg}deg 360deg
    )
  `;

  // Center label -> Head Up %
  center.textContent = `${Math.round(headUp)}%`;
}


export function showUnifiedChart(state, metricIndices = []) {
  const canvas = document.getElementById("myChart2");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // Always destroy any existing chart before reusing canvas
  if (state.currentChart) {
    try {
      state.currentChart.destroy();
    } catch (err) {
      console.warn("Chart destroy failed:", err);
    }
    state.currentChart = null;
  }

  // Optional: clear canvas context manually
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Now safely create a fresh Chart instance
  // Custom plugin to color each legend text per dataset
  const legendColorPlugin = {
    id: "legendColorPlugin",
    afterDraw(chart) {
      const legend = chart.legend;
      if (!legend?.legendItems) return;

      legend.legendItems.forEach((item, i) => {
        // force text color based on index
        const colorMap = [
          "#FF8C00", // Head Angle
          "#1F43E5", // Speed
          "#7DD859", // Acceleration
          "#E93632", // Deceleration
          "#FFA500", // Stride Length
          "#800080", // Jump Height
        ];
        item.fontColor = colorMap[i] || "#000";
      });
    },
  };
  Chart.register(legendColorPlugin);

  state.currentChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: state.backend.chartLabels || [],
      datasets: [
        { label: "Head Angle (°)", data: state.backend.headAngleData || [], borderColor: "#FF8C00", fill: false, yAxisID: "y0" },
        { label: "Speed (yd/s)", data: state.backend.speedData || [], borderColor: "#1F43E5", fill: false, yAxisID: "y1" },
        { label: "Acceleration (yd/s²)", data: state.backend.accelerationData || [], borderColor: "#7DD859", fill: false, yAxisID: "y2" },
        { label: "Deceleration (yd/s²)", data: state.backend.decelerationData || [], borderColor: "#E93632", fill: false, yAxisID: "y3" },
        { label: "Stride Length (yd)", data: state.backend.strideData || [], borderColor: "#FFA500", fill: false, yAxisID: "y4" },
        { label: "Jump Height (yd)", data: state.backend.jumpData || [], borderColor: "#800080", fill: false, yAxisID: "y5" },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "nearest", intersect: true },
      elements: { point: { radius: 3, hitRadius: 10 }, line: { tension: 0.2 } },
      plugins: {
        legend: {
          position: "top",
          labels: {
            usePointStyle: false,
            boxWidth: 0,
            padding: 14,
            font: { size: 13, weight: "bold" },
            color: "#000", // base color (legendColorPlugin adjusts per item)
          },
          onClick(e, legendItem, legend) {
            const chart = legend.chart;
            const datasetIndex = legendItem.datasetIndex;

            // How many are currently visible?
            const visibleIndexes = chart.data.datasets
              .map((ds, i) => ({ i, meta: chart.getDatasetMeta(i) }))
              .filter(({ meta }) => meta && meta.hidden !== true)
              .map(({ i }) => i);

            const clickedMeta = chart.getDatasetMeta(datasetIndex);
            const isClickedVisible = clickedMeta && clickedMeta.hidden !== true;
            const allVisible = visibleIndexes.length === chart.data.datasets.length;
            const singleVisible = visibleIndexes.length === 1 && visibleIndexes[0] === datasetIndex;

            if (allVisible) {
              // Case 1: all visible -> focus on clicked only
              chart.data.datasets.forEach((ds, i) => {
                const meta = chart.getDatasetMeta(i);
                meta.hidden = i !== datasetIndex;
              });
            } else if (singleVisible && isClickedVisible) {
              // Case 2: only this one visible -> reset to all
              chart.data.datasets.forEach((ds, i) => {
                const meta = chart.getDatasetMeta(i);
                meta.hidden = false;
              });
            } else {
              // Case 3: mixed state -> focus on clicked only
              chart.data.datasets.forEach((ds, i) => {
                const meta = chart.getDatasetMeta(i);
                meta.hidden = i !== datasetIndex;
              });
            }

            chart.update();
            
            // 🧠 After toggling visibility, adjust which Y-axes show
            Object.keys(chart.options.scales).forEach((axis) => {
              if (axis.startsWith("y")) chart.options.scales[axis].display = false;
            });

            const visibleDatasets = chart.data.datasets.filter((ds, i) => !chart.getDatasetMeta(i).hidden);
            if (visibleDatasets.length === 1) {
              chart.options.scales[visibleDatasets[0].yAxisID].display = true;
            }
            chart.update();
          },
        },

        tooltip: {
          // ...
        },
      },

    scales: (() => {
      // dynamically create separate hidden y-axes for each dataset
      const yAxes = {};
      const colors = ["#FF8C00","#1F43E5","#7DD859","#E93632","#FFA500","#800080"];
      const keys = ["headAngleData","speedData","accelerationData","decelerationData","strideData","jumpData"];

      keys.forEach((key, i) => {
        yAxes[`y${i}`] = {
          type: "linear",
          display: false,       // hidden in combined mode
          position: "left",
          offset: true,         // avoids overlap → stacked visual
          grid: { drawOnChartArea: false },
          ticks: { color: colors[i] }
        };
      });

      return {
        x: {
          title: { display: true, text: "Time (s)" },
          ticks: { autoSkip: true, maxTicksLimit: 10 }
        },
        ...yAxes
      };
    })()
    }
  });

  state.chartType = "line";
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

export function updateSlidersFromData(backend, CONFIG, uptoIndex = null) {
  // slice arrays to "uptoIndex" (for progressive updates while playing)
  const slicer = (arr) => {
    if (!Array.isArray(arr)) return [];
    return (uptoIndex === null) ? arr : arr.slice(0, Math.max(0, uptoIndex + 1));
  };

  const speedArr = slicer(backend.speedData);
  const accelArr = slicer(backend.accelerationData);
  const decelArr = slicer(backend.decelerationData);
  const jumpArr = slicer(backend.jumpData);
  const strideArr = slicer(backend.strideData);

  const mm = backend.maxMetrics || {};
  const speed = Math.round( // prefer backend.topSpeed or mm.maxSpeed
    Number.isFinite(backend.topSpeed) && backend.topSpeed > 0
      ? backend.topSpeed
      : (Number.isFinite(mm.maxSpeed) ? mm.maxSpeed : maxOrZero(speedArr))
  );

  const accel = Math.round(
    Number.isFinite(mm.maxAcceleration) ? mm.maxAcceleration : maxOrZero(accelArr)
  );

  const decel = Math.round(
    Math.abs(
      Number.isFinite(mm.maxDeceleration) ? mm.maxDeceleration : minOrZero(decelArr)
    )
  );

  const jump = round2(avgOrZero(jumpArr));
  const stride = round2(avgOrZero(strideArr));

  updateProgress("topSpeed", "topSpeedBar", speed, CONFIG.MAX_SPEED);
  updateProgress("peakAcceleration", "peakAccelerationBar", accel, CONFIG.MAX_ACCEL);
  updateProgress("peakDeceleration", "peakDecelerationBar", decel, CONFIG.MAX_DECEL);
  updateProgress("averageJumpHeight", "averageJumpHeightBar", jump, CONFIG.MAX_JUMP);
  updateProgress("averageStrideLength", "averageStrideLengthBar", stride, CONFIG.MAX_STRIDE);

  // athletic score text stays as-is (uses full aggregated scores already)
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
  // Reset HTML double donut
  if (doughnutChart) {
    resetHtmlDoughnut(doughnutChart);
  }

  // Reset unified line chart (Chart.js) safely
  if (state.currentChart && state.currentChart.data) {
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
