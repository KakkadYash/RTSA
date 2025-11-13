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
    { label: "Head Angle (°)", key: "headAngleData", color: "#E93632", bg: "rgba(255,140,0,0.10)" },
    { label: "Speed (yd/s)", key: "speedData", color: "#1F43E5", bg: "rgba(31,67,229,0.10)" },
    { label: "Acceleration (yd/s²)", key: "accelerationData", color: "#7DD859", bg: "rgba(125,216,89,0.10)" },
    { label: "Deceleration (yd/s²)", key: "decelerationData", color: "#E93632", bg: "rgba(233,54,50,0.10)" },
    { label: "Step Length (yd)", key: "stepLengthData", color: "#FFA500", bg: "rgba(255,165,0,0.10)" },
    { label: "Jump Height (yd)", key: "jumpData", color: "#800080", bg: "rgba(128,0,128,0.10)" },
  ];

  // Store originals for fade recovery
  datasets.forEach((d) => (d.originalBorderColor = d.color));

  // Plugin: disable default legend text drawing
  const disableLegendTextPlugin = {
    id: "disableLegendTextPlugin",
    beforeDraw(chart, args, opts) {
      const legend = chart.legend;
      if (!legend) return;

      const ctx = chart.ctx;
      // Temporarily override fillText & strokeText so the legend can't draw its text
      if (!ctx._originalFillText) {
        ctx._originalFillText = ctx.fillText;
        ctx._originalStrokeText = ctx.strokeText;
        ctx.fillText = function () { };  // block text draw
        ctx.strokeText = function () { }; // block stroke draw
      }
    },
    afterDraw(chart) {
      const ctx = chart.ctx;
      // Restore the original text methods for rest of chart drawing
      if (ctx._originalFillText) {
        ctx.fillText = ctx._originalFillText;
        ctx.strokeText = ctx._originalStrokeText;
        delete ctx._originalFillText;
        delete ctx._originalStrokeText;
      }
    },
  };
  Chart.register(disableLegendTextPlugin);

  // Plugin: force legend colors + remove strike-through
  const legendFixPlugin = {
    id: "legendFixPlugin",
    afterDraw(chart) {
      const legend = chart.legend;
      if (!legend) return;

      const ctx = chart.ctx;
      const items = legend.legendItems || [];
      const font = Chart.helpers.toFont(legend.options.labels.font);

      ctx.save();
      ctx.font = font.string;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";

      items.forEach((item) => {
        const ds = chart.data.datasets[item.datasetIndex];
        const lighten = (hex, amt = 40) =>
          "#" +
          hex
            .replace(/^#/, "")
            .replace(/../g, (c) =>
              ("0" + Math.min(255, Math.max(0, parseInt(c, 16) + amt)).toString(16)).slice(-2)
            );
        const color = lighten(ds?.borderColor || "#FFF");
        // remove any previous dash / strike
        ctx.setLineDash([]);
        ctx.strokeStyle = "transparent";

        // draw the text in its dataset color
        ctx.fillStyle = color;
        ctx.fillText(item.text, item.textX, item.textY);
      });
      ctx.restore();
    },
  };
  Chart.register(legendFixPlugin);

  // Debug plugin: log all Chart.js drawing stages (especially legend)
  const legendDebugPlugin = {
    id: "legendDebugPlugin",
    beforeInit(chart) {
      console.log("[DEBUG] Chart initialized:", chart.id || "(no id)");
    },
    beforeDraw(chart) {
      console.log("[DEBUG] → beforeDraw() - about to draw chart area");
    },
    afterDraw(chart) {
      console.log("[DEBUG] → afterDraw() - finished drawing everything");
    },
    beforeDatasetsDraw(chart) {
      console.log("[DEBUG] → beforeDatasetsDraw() - about to draw datasets");
    },
    afterDatasetsDraw(chart) {
      console.log("[DEBUG] → afterDatasetsDraw() - finished drawing datasets");
    },
    beforeTooltipDraw(chart) {
      console.log("[DEBUG] → beforeTooltipDraw()");
    },
    afterTooltipDraw(chart) {
      console.log("[DEBUG] → afterTooltipDraw()");
    },
    beforeEvent(chart, args) {
      if (args.event?.type === "click") {
        console.log("[DEBUG] Click detected on chart");
      }
    },
    afterLayout(chart) {
      console.log("[DEBUG] → afterLayout() - legend positioned:", chart.legend?.legendHitBoxes);
    },
    beforeDatasetsUpdate(chart) {
      console.log("[DEBUG] → beforeDatasetsUpdate()");
    },
    afterDatasetsUpdate(chart) {
      console.log("[DEBUG] → afterDatasetsUpdate()");
    },
    beforeRender(chart) {
      console.log("[DEBUG] → beforeRender() - starting full render");
    },
    afterRender(chart) {
      console.log("[DEBUG] → afterRender() - chart fully rendered");
    },
    beforeDatasetDraw(chart, args) {
      console.log(`[DEBUG]   ↳ Drawing dataset index ${args.index}:`, chart.data.datasets[args.index].label);
    },
    afterDatasetDraw(chart, args) {
      console.log(`[DEBUG]   ↳ Finished dataset index ${args.index}`);
    },
  };
  Chart.register(legendDebugPlugin);

  state.currentChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: state.backend.chartLabels || [],
      datasets: datasets.map((d, i) => ({
        label: d.label,
        data: state.backend[d.key] || [],
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
          position: "top",
          onClick(e, legendItem, legend) {
            console.log("[DEBUG] Legend onClick() triggered:", legendItem.text);
            // existing click logic...
          },
          onHover(e, legendItem, legend) {
            console.log("[DEBUG] Legend hover:", legendItem.text);
          },
          labels: {
            usePointStyle: false,
            boxWidth: 0,
            padding: 8,
            font: { size: 15, weight: "500" },
            color: "#fff",
            textStrokeWidth: 0,
            textDecoration: "none",
          },
          onClick(e, legendItem, legend) {
            const chart = legend.chart;
            const datasetIndex = legendItem.datasetIndex;

            // Determine visibility state
            const visibleIndexes = chart.data.datasets
              .map((ds, i) => ({ i, meta: chart.getDatasetMeta(i) }))
              .filter(({ meta }) => meta && meta.hidden !== true)
              .map(({ i }) => i);

            const clickedMeta = chart.getDatasetMeta(datasetIndex);
            const isClickedVisible = clickedMeta && clickedMeta.hidden !== true;
            const allVisible = visibleIndexes.length === chart.data.datasets.length;
            const singleVisible = visibleIndexes.length === 1 && visibleIndexes[0] === datasetIndex;

            if (allVisible) {
              chart.data.datasets.forEach((ds, i) => (chart.getDatasetMeta(i).hidden = i !== datasetIndex));
            } else if (singleVisible && isClickedVisible) {
              chart.data.datasets.forEach((ds, i) => (chart.getDatasetMeta(i).hidden = false));
            } else {
              chart.data.datasets.forEach((ds, i) => (chart.getDatasetMeta(i).hidden = i !== datasetIndex));
            }

            //  Fade logic with color restoration (no black issue)
            chart.data.datasets.forEach((ds, i) => {
              const meta = chart.getDatasetMeta(i);
              const isVisible = meta.hidden !== true;
              const original = datasets[i];
              ds.borderColor = original.color; // restore base color
              ds.backgroundColor = isVisible
                ? original.bg
                : original.bg.replace(/,0\.10\)/, ",0.03)"); // faded alpha
              ds.borderWidth = isVisible ? 2 : 1;
            });

            // Manage Y-axis visibility
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
