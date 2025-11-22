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

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const datasets = [
    { label: "Head Angle", key: "headAngleData", color: "#E93632", bg: "rgba(255,140,0,0.10)" },
    { label: "Speed", key: "speedData", color: "#1F43E5", bg: "rgba(31,67,229,0.10)" },
    { label: "Acceleration", key: "accelerationData", color: "#7DD859", bg: "rgba(125,216,89,0.10)" },
    // { label: "Deceleration", key: "decelerationData", color: "#E93632", bg: "rgba(233,54,50,0.10)" },
    { label: "Step Length", key: "stepLengthData", color: "#FFA500", bg: "rgba(255,165,0,0.10)" },
    { label: "Jump Height", key: "jumpData", color: "#800080", bg: "rgba(128,0,128,0.10)" },
  ];

  // Store originals for fade recovery
  datasets.forEach((d) => (d.originalBorderColor = d.color));
  // 🧠 Plugin: force legend colors + remove strike-through
  const legendFixPlugin = {
    id: "legendFixPlugin",
    afterDraw(chart) {
      const legend = chart.legend;
      if (!legend) return;

      const ctx = chart.ctx;
      legend.legendItems.forEach((item, i) => {
        // Find the matching dataset color
        const ds = chart.data.datasets[item.datasetIndex];
        const color = ds?.borderColor || "#000";

        // Get legend text box geometry
        const { text, textAlign, textBaseline, fontString, x, y } = item;
        const font = Chart.helpers.toFont(fontString);
        ctx.save();
        ctx.font = font.string;
        ctx.textAlign = textAlign || "left";
        ctx.textBaseline = textBaseline || "middle";
        ctx.fillStyle = color;        // ✅ dataset color text
        ctx.strokeStyle = "transparent";
        ctx.setLineDash([]);          // ✅ remove strike-through dash
        ctx.fillText(item.text, item.textX, item.textY);
        ctx.restore();
      });
    },
  };
  Chart.register(legendFixPlugin);

  state.currentChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: state.backend.chartLabels || [],
      datasets: datasets.map((d, i) => ({
        label: d.label,
        // 👉 Apply rounding per metric
        data: (state.backend[d.key] || []).map((v) =>
          d.key === "jumpData" || d.key === "stepLengthData"
            ? round2(v)      // Jump Height + Step Length → 2 decimals
            : roundWhole(v)  // Everything else → whole number
        ),
        borderColor: d.color,
        borderWidth: 1.5,
        fill: true,
        backgroundColor: d.bg,
        yAxisID: `y${i}`,
      })),
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500, easing: "easeOutQuart" },
      interaction: { mode: "nearest", intersect: true },
      elements: {
        point: { radius: 0.5, hitRadius: 8 },
        line: { tension: 0.25, borderWidth: 1.5 },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const dsMeta = datasets[ctx.datasetIndex];
              const label = dsMeta?.label || ctx.dataset.label || "";
              const key = dsMeta?.key;
              const rawValue = ctx.parsed.y;

              let formatted;
              if (key === "jumpData" || key === "stepLengthData") {
                formatted = round2(rawValue);     // Jump / Step Length → 2 decimals
              } else {
                formatted = roundWhole(rawValue); // Others → whole number
              }

              return `${label}: ${formatted}`;
            },
          },
        },
      },

      scales: (() => {
        const yAxes = {};
        datasets.forEach((d, i) => {
          yAxes[`y${i}`] = {
            type: "linear",
            display: false,
            position: "left",
            offset: true,
            grid: { drawOnChartArea: false },
            ticks: { color: d.color },
          };
        });
        return {
          x: { title: { display: true, text: "Time (s)" }, ticks: { autoSkip: true, maxTicksLimit: 10 } },
          ...yAxes,
        };
      })(),
    },
  });
  // 🔥 Build Custom HTML Legend for Unified Chart
  buildUnifiedLegend(state.currentChart, datasets);

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
  // Prefer strideData array if available, else fallback to scalar stepFrequency
  const strideArr = backend.strideData && backend.strideData.length
    ? slicer(backend.strideData)
    : [Number(backend.stepFrequency || 0)];


  const mm = backend.maxMetrics || {};

  // 👉 Whole-number rounding for speed / accel / decel
  const speed = roundWhole(
    Number.isFinite(backend.topSpeed) && backend.topSpeed > 0
      ? backend.topSpeed
      : (Number.isFinite(mm.maxSpeed) ? mm.maxSpeed : maxOrZero(speedArr))
  );

  const accel = roundWhole(
    Number.isFinite(mm.maxAcceleration) ? mm.maxAcceleration : maxOrZero(accelArr)
  );

  const decel = roundWhole(
    Math.abs(
      Number.isFinite(mm.maxDeceleration) ? mm.maxDeceleration : minOrZero(decelArr)
    )
  );

  // 👉 Jump height & step frequency: keep 2 decimals
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
}


export function updateTopMetricBoxes({ timeSecs, totalDistanceYards, steps }) {
  document.getElementById("drillTimeValue").textContent = `${Number(timeSecs || 0).toFixed(1)} SECS`;
  document.getElementById("distanceValue").textContent = `${Number(totalDistanceYards || 0).toFixed(1)} YARDS`;
  document.getElementById("stepsValue").textContent = `${Number(steps || 0)}`;
}
export function updateAverageSpeedBox(avgSpeed) {
  document.getElementById("averageSpeedValue").textContent =
    `${Number(avgSpeed || 0).toFixed(2)} YD/S`;
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
  document.getElementById("drillTimeValue").textContent = `0 SECS`;
  document.getElementById("distanceValue").textContent = `0 YARDS`;
  document.getElementById("stepsValue").textContent = `0`;
  document.getElementById("averageSpeedValue").textContent = `0 YD/S`;
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

// Round to whole number with custom rule:
// - decimals < 0.5  → floor
// - decimals >= 0.5 → ceil
const roundWhole = (n) => {
  const num = Number(n) || 0;
  const base = Math.floor(num);
  const decimal = num - base;
  if (decimal < 0.5) return base;
  return base + 1;
};
export function buildUnifiedLegend(chart, datasets) {
  const container = document.getElementById("unifiedLegend");
  if (!container) return;

  container.innerHTML = "";

  datasets.forEach((d, index) => {
    // WRAPPER
    const item = document.createElement("div");
    item.classList.add("unified-legend-item");

    // Color box
    const color = document.createElement("span");
    color.classList.add("unified-legend-color");
    color.style.backgroundColor = d.color;

    // Label
    const label = document.createElement("span");
    label.classList.add("unified-legend-text");
    label.innerText = d.label;

    // CHECKBOX
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.classList.add("legend-checkbox");

    // Assemble
    item.appendChild(color);
    item.appendChild(label);
    item.appendChild(checkbox);
    container.appendChild(item);

    // ---- SHARED TOGGLE FUNCTION ----
    const applyToggle = () => {
      if (checkbox.checked) {
        // SHOW ONLY ONE METRIC
        chart.data.datasets.forEach((ds, i) => {
          chart.getDatasetMeta(i).hidden = i !== index;
        });

        // Fade UI
        [...container.children].forEach((el, i) => {
          el.style.opacity = i === index ? "1" : "0.25";
        });

        // Show only correct y-axis
        Object.keys(chart.options.scales).forEach(axis => {
          if (axis.startsWith("y"))
            chart.options.scales[axis].display = axis === `y${index}`;
        });

      } else {
        // RESTORE ALL METRICS
        chart.data.datasets.forEach((ds, i) => {
          chart.getDatasetMeta(i).hidden = false;
        });

        [...container.children].forEach(el => el.style.opacity = "1");

        Object.keys(chart.options.scales).forEach(axis => {
          if (axis.startsWith("y"))
            chart.options.scales[axis].display = false;
        });
      }

      chart.update();
    };

    // ---- ON CHECKBOX CLICK ----
    checkbox.addEventListener("change", applyToggle);

    // ---- ON LEGEND ROW CLICK (label or color or empty space) ----
    item.addEventListener("click", (e) => {
      // Prevent double-trigger if clicking checkbox directly
      if (e.target === checkbox) return;

      checkbox.checked = !checkbox.checked;
      applyToggle();
    });
  });


}
