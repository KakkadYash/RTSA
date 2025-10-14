// analytics.js
// Orchestrates UI, backend calls, charts, and the Mediapipe overlay.

import {
    initDoughnutChart,
    initPentagonChart,
    showPentagonChart,
    showUnifiedChart,
    buildLegend,
    updateDoughnutChartFromData,
    updateSlidersFromData,
    resetCharts,
    resetMetricSlidersUI,
    updateTopMetricBoxes
} from "./modules/metricsVisualization.js";

import {
    initPoseOverlay,
    startOverlayLoop,
    stopOverlayLoop,
    drawOneFrameIfPaused
} from "./modules/analyticsCore.js";

import {
    wireUploadButton,
    wireCardsAndShowAll,
    setAnalyzeHandler,
    setPlayProcessedHandler
} from "./modules/uiHandlers.js";

(function loadAnalytics() {
    // ------------------------
    // 1) CONSTANTS & DOM references
    // ------------------------
    const CONFIG = {
        API_BASE: "https://fastapi-app-843332298202.us-central1.run.app",
        OVERLAP_THRESHOLD: 0.5,
        HEAD_ANGLE_MIN: 40,
        HEAD_ANGLE_MAX: 120,
        ACCELERATION_THRESHOLD: 0.5,
        DECELERATION_THRESHOLD: 0.5,
        MAX_SPEED: 10,
        MAX_ACCEL: 10,
        MAX_DECEL: 10,
        MAX_JUMP: 4,
        MAX_STRIDE: 2,
        OUTER_LABELS: ["RUNNING", "STANDING", "CROUCHING"],
        INNER_LABELS: ["HEAD UP", "HEAD DOWN"],
    };

    const els = {
        uploadButton: document.getElementById("uploadButton"),
        analyzeButton: document.getElementById("analyzeButton"),
        showMetricsBtn: document.getElementById("showMetrics"),
        playProcessedButton: document.getElementById("playProcessedButton"),
        video: document.getElementById("uploaded-video"),
        canvas: document.getElementById("output_canvas"),
        loadingOverlay: document.getElementById("analyzingIndicator"),
        myChart: document.getElementById("myChart"),   // doughnut
        myChart2: document.getElementById("myChart2"), // pentagon/line
    };
    const ctx2D = els.canvas.getContext("2d");

    // ------------------------
    // 2) In-memory state (frontend-only)
    // ------------------------
    const state = {
        video: null,
        currentChart: null,
        chartType: "radar",
        // last overlay timing
        lastOverlayTick: 0,
        // derived metrics from backend response for visualizations
        backend: {
            // line chart series
            chartLabels: [],
            headAngleData: [],
            speedData: [],
            accelerationData: [],
            decelerationData: [],
            strideData: [],
            jumpData: [],
            // doughnut rings
            outerRing: { Running: 0, Standing: 0, Crouching: 0 },
            innerRing: { "Head Up": 0, "Head Down": 100 },
            // pentagon scores
            athleticScores: {
                footworkScore: 0,
                speedScore: 0,
                accelerationScore: 0,
                headAngleScore: 0,
                postureScore: 0,
            },
            // top metrics
            topSpeed: 0,
            totalDistance: 0,
            totalSteps: 0, // optional (if backend sends later; we compute from local overlay if needed)
        },
    };

    // ------------------------
    // 3) Charts init
    // ------------------------
    if (state.currentChart) {
        state.currentChart.destroy();
    }
    const doughnutChart = initDoughnutChart("myChart", CONFIG);
    state.currentChart = initPentagonChart("myChart2"); // sets radar default

    // Legends for doughnut
    buildLegend("outerLegend", CONFIG.OUTER_LABELS, doughnutChart.data.datasets[0].backgroundColor);
    buildLegend("innerLegend", CONFIG.INNER_LABELS, doughnutChart.data.datasets[1].backgroundColor);

    // ------------------------
    // 4) Mediapipe overlay
    // ------------------------
    initPoseOverlay({
        video: els.video,
        canvas: els.canvas,
        ctx2D,
    });

    // ------------------------
    // 5) Button wiring (Upload stays same, Analyze/Play can change)
    // ------------------------
    wireUploadButton(els.uploadButton, els.video, els.canvas, () => {
        // on metadata ready for fresh session
        resetCharts(state, doughnutChart);
        resetMetricSlidersUI(CONFIG);
        // hide canvas until analyze/play
        els.canvas.style.display = "none";
        els.playProcessedButton.style.display = "none";
        els.analyzeButton.style.display = "block";
    }, (file) => {
        state.video = file;
    });

    wireCardsAndShowAll(els.showMetricsBtn, {
        onShowPentagon: () => showPentagonChart(state),
        onShowTechnique: () => showUnifiedChart(state, [0]),      // Head Angle
        onShowSpeed: () => showUnifiedChart(state, [1, 2, 3]),    // Speed, Accel, Decel
        onShowFootwork: () => showUnifiedChart(state, [4, 5]),    // Stride, Jump
    });

    // Analyze → call backend, render all charts from JSON, enable canvas overlay
    setAnalyzeHandler(els.analyzeButton, async () => {
        if (!state.video) {
            alert("Please upload a video file first.");
            return;
        }

        els.analyzeButton.style.display = "none";
        els.loadingOverlay.style.display = "block";

        try {
            const analyzeJson = await callAnalyzeVideo({
                apiBase: CONFIG.API_BASE,
                userId: localStorage.getItem("userId"),
                video: state.video
            });

            // Store response → state.backend
            applyBackendResultsToState(state, analyzeJson);

            // Update visuals from backend
            updateDoughnutChartFromData(doughnutChart, state.backend);
            updateSlidersFromData(state.backend, CONFIG);
            updateTopMetricBoxes({
                timeSecs: lastKnownVideoTime(els.video),
                totalDistanceYards: state.backend.totalDistance,
                steps: state.backend.totalSteps || 0,
            });

            // Prepare overlay
            els.video.style.display = "none";
            els.canvas.style.display = "block";
            els.playProcessedButton.style.display = "block";

            // One immediate frame (paused preview)
            drawOneFrameIfPaused();

        } catch (err) {
            console.error("Analyze error:", err);
            alert("Failed to analyze video. Please try again.");
            els.analyzeButton.style.display = "block";
        } finally {
            els.loadingOverlay.style.display = "none";
        }
    });

    // Play → show pentagon, start overlay loop (Mediapipe), keep charts live if needed
    setPlayProcessedHandler(els.playProcessedButton, () => {
        showPentagonChart(state);
        // Start local overlay loop (Mediapipe) while video plays
        startOverlayLoop();
        // For this mode we process frames from video → pose → draw overlay.
        // We don’t recompute metrics here; backend already provided series.
        // (If you want to sync the line chart cursor with time, add it here.)
    });

    // Click on unified line → seek video (and redraw paused frame)
    els.myChart2.addEventListener("click", (evt) => {
        // Only when current chart is a line chart
        const chart = state.currentChart;
        if (!chart || chart.config.type !== "line") return;

        const points = chart.getElementsAtEventForMode(evt, "nearest", { intersect: true }, true);
        if (points && points.length > 0) {
            const idx = points[0].index;
            const t = chart.data.labels[idx]; // seconds label
            els.video.pause();
            els.video.currentTime = Number(t) || 0;
            els.video.addEventListener("seeked", () => {
                drawOneFrameIfPaused();
            }, { once: true });
        }
    });

    // Save analytics when the video ends (optional; you already do this elsewhere)
    els.video.addEventListener("ended", () => {
        stopOverlayLoop();
    });

    // Helpers
    function lastKnownVideoTime(video) {
        return Number(video?.currentTime?.toFixed?.(1) || 0);
    }

    function applyBackendResultsToState(st, payload) {
        // Defensive defaults
        const lineSafe = (x) => Array.isArray(x) ? x : [];
        st.backend.chartLabels = lineSafe(payload.chartLabels);
        st.backend.headAngleData = lineSafe(payload.headAngleData);
        st.backend.speedData = lineSafe(payload.speedData);
        st.backend.accelerationData = lineSafe(payload.accelerationData);
        st.backend.decelerationData = lineSafe(payload.decelerationData);
        st.backend.strideData = lineSafe(payload.strideData);
        st.backend.jumpData = lineSafe(payload.jumpData);

        st.backend.outerRing = payload.outerRing || { Running: 0, Standing: 0, Crouching: 0 };
        st.backend.innerRing = payload.innerRing || { "Head Up": 0, "Head Down": 100 };
        st.backend.athleticScores = payload.athleticScores || {
            footworkScore: 0, speedScore: 0, accelerationScore: 0, headAngleScore: 0, postureScore: 0
        };

        st.backend.topSpeed = Number(payload.topSpeed || 0);
        st.backend.totalDistance = Number(payload.totalDistance || 0);
        // if backend later adds steps, we’ll pick it up:
        if (typeof payload.totalSteps === "number") st.backend.totalSteps = payload.totalSteps;

        // Render unified line chart by default with all series, then we’ll filter per card
        // (The card handlers call showUnifiedChart with indices)
        showUnifiedChart(st, [0, 1, 2, 3, 4, 5]);
    }

    async function callAnalyzeVideo({ apiBase, userId, video }) {
        const form = new FormData();
        form.append("userId", userId || "");
        form.append("video", video);

        // If your backend expects additional fields (e.g., videoId/local_path),
        // append them here:
        // form.append("videoId", "..."); form.append("local_path", "...");

        const resp = await fetch(`${apiBase}/analyze-video`, { method: "POST", body: form });
        if (!resp.ok) {
            const msg = await resp.text().catch(() => "");
            throw new Error(`Analyze failed: ${resp.status} ${msg}`);
        }
        return resp.json();
    }

    // ------------------------
    // 12. MODULE EXPORT
    // ------------------------
    window.loadAnalytics = loadAnalytics;

})();
