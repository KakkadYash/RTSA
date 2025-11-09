// analytics.js
// Orchestrates UI, backend calls, charts, and the Mediapipe overlay.

import {
    initDoughnutChart,
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
    setPlayProcessedHandler,
    setUploadUploading, setUploadSuccess, resetUploadButton,
    setAnalyzing, resetAnalyze,
    setPlaying, resetPlayButton,
    setPlayButtonEnabled,
    disableInteractiveButton, enableInteractiveButton
} from "./modules/uiHandlers.js";


(function loadAnalytics() {
    console.log("[INIT] Analytics page loaded");

    // CONSTANTS
    const CONFIG = {
        API_BASE: "https://rtsa-backend-gpu-843332298202.us-central1.run.app",
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
        myChart: document.getElementById("myChart"),
        myChart2: document.getElementById("myChart2"),
    };

    function setInitialUI() {
        // Video + canvas
        els.video.style.display = "block";
        els.video.src = "";
        els.canvas.style.display = "none";

        // Upload label
        const uploadLabel = document.getElementById("uploadvideo");
        resetUploadButton(uploadLabel);
        enableInteractiveButton(uploadLabel);

        // Analyze button
        els.analyzeButton.style.display = "block";
        resetAnalyze(els.analyzeButton);
        enableInteractiveButton(els.analyzeButton);

        // Play button
        els.playProcessedButton.style.display = "none";
        resetPlayButton(els.playProcessedButton);
        setPlayButtonEnabled(false);

        // ALL METRICS button
        enableInteractiveButton(els.showMetricsBtn);

        // Loading overlay
        els.loadingOverlay.style.display = "none";

        // Charts + metrics
        resetCharts(state, doughnutChart);
        resetMetricSlidersUI(CONFIG);

        // Cards unflipped
        document.querySelectorAll(".card").forEach(c => c.classList.remove("is-flipped"));
    }

    function resetButtonsOnly() {
        console.log("[UI] Resetting only buttons (keeping charts, metrics, and canvas)");

        // Upload label
        const uploadLabel = document.getElementById("uploadvideo");
        resetUploadButton(uploadLabel);
        enableInteractiveButton(uploadLabel);

        // Analyze button
        resetAnalyze(els.analyzeButton);
        enableInteractiveButton(els.analyzeButton);
        els.analyzeButton.style.display = "block";

        // Play button
        resetPlayButton(els.playProcessedButton);
        enableInteractiveButton(els.playProcessedButton);
        els.playProcessedButton.style.display = "block";

        // Show metrics button
        enableInteractiveButton(els.showMetricsBtn);

        // Hide loading indicator if still visible
        els.loadingOverlay.style.display = "none";
    }

    function fullReset() {
        console.log("[STATE] Full reset");
        if (state.ticker) {
            clearInterval(state.ticker);
            state.ticker = null;
        }

        state.video = null;
        state.cached.metrics = null;
        state.cached.ready = false;
        state.overlayReady = false;
        window.__RTSA_OVERLAY_READY__ = false;
        const uploadLabel = document.getElementById("uploadvideo");
        enableInteractiveButton(uploadLabel);
        enableInteractiveButton(els.showMetricsBtn);


        localStorage.removeItem("rtsa_metrics");
        localStorage.removeItem("rtsa_hasVideo");
        localStorage.removeItem("rtsa_lastVideoName");

        setInitialUI();
    }

    // ➋ On page load, Play must be disabled
    setPlayButtonEnabled(false);

    const ctx2D = els.canvas.getContext("2d");
    // Hide canvas at start
    els.canvas.style.display = "none";

    // STATE
    const state = {
        video: null,
        currentChart: null,
        chartType: "radar",
        lastOverlayTick: 0,
        backend: {
            chartLabels: [],
            headAngleData: [],
            speedData: [],
            accelerationData: [],
            decelerationData: [],
            strideData: [],
            jumpData: [],
            outerRing: { Running: 0, Standing: 0, Crouching: 0 },
            innerRing: { "Head Up": 0, "Head Down": 100 },
            athleticScores: {
                footworkScore: 0, speedScore: 0, accelerationScore: 0, headAngleScore: 0, postureScore: 0
            },
            topSpeed: 0,
            totalDistance: 0,
            totalSteps: 0
        },
        cached: {
            metrics: null,
            ready: false
        },
        ticker: null,
    };
    state.overlayReady = false;
    state.cached.ready = false;

    // ✅ Listen for Mediapipe overlay finish event
    window.addEventListener("overlayReady", () => {
        console.log("[EVENT] Overlay ready received");
        state.overlayReady = true;
        maybeEnablePlayButton();
    });

    if (state.currentChart) state.currentChart.destroy();
    if (Chart.getChart("myChart")) Chart.getChart("myChart").destroy();
    if (Chart.getChart("myChart2")) Chart.getChart("myChart2").destroy();

    // CHARTS
    console.log("[INIT] Initializing charts...");
    const doughnutChart = initDoughnutChart("myChart", CONFIG);
    showUnifiedChart(state, [0, 1, 2, 3, 4, 5]); // empty at first, becomes populated after analysis
    buildLegend("outerLegend", CONFIG.OUTER_LABELS, doughnutChart.data.datasets[0].backgroundColor);
    buildLegend("innerLegend", CONFIG.INNER_LABELS, doughnutChart.data.datasets[1].backgroundColor);

    // OVERLAY
    console.log("[INIT] Initializing Mediapipe overlay...");
    initPoseOverlay({ video: els.video, canvas: els.canvas, ctx2D });

    // UPLOAD BUTTON
    wireUploadButton(
        els.uploadButton,
        els.video,
        els.canvas,
        () => {
            // onMetadataReady
            console.log("[EVENT] Upload metadata ready");
            // Reset UI/metrics for new run
            if (state.ticker) {
                clearInterval(state.ticker);
                state.ticker = null;
            }
            state.cached.metrics = null;
            state.cached.ready = false;
            state.overlayReady = false;

            resetCharts(state, doughnutChart);
            resetMetricSlidersUI(CONFIG);

            els.canvas.style.display = "none";
            els.playProcessedButton.style.display = "none";
            els.analyzeButton.style.display = "block";
            setPlayButtonEnabled(false);

            // mark "uploaded" locally
            localStorage.setItem("rtsa_lastVideoName", state.video?.name || "");
            localStorage.setItem("rtsa_hasVideo", "1");

            alert("Video uploaded successfully"); // as per your spec
        },
        (file) => {
            console.log(`[EVENT] Selected file: ${file.name}`);
            state.video = file;
        }
    );


    // METRIC CARD BUTTONS
    wireCardsAndShowAll(els.showMetricsBtn, {
        onShowAllMetrics: () => {
            console.log("[EVENT] Show unified all metrics");
            const existing = Chart.getChart("myChart2");
            if (existing) existing.destroy();
            showUnifiedChart(state, [0, 1, 2, 3, 4, 5]);
        },
        onShowTechnique: () => {
            console.log("[EVENT] Show head-angle only");
            const existing = Chart.getChart("myChart2");
            if (existing) existing.destroy();
            showUnifiedChart(state, [0]);
        },
        onShowSpeed: () => {
            console.log("[EVENT] Show speed/accel/decel");
            const existing = Chart.getChart("myChart2");
            if (existing) existing.destroy();
            showUnifiedChart(state, [1, 2, 3]);
        },
        onShowFootwork: () => {
            console.log("[EVENT] Show stride/jump");
            const existing = Chart.getChart("myChart2");
            if (existing) existing.destroy();
            showUnifiedChart(state, [4, 5]);
        },
    });


    // ANALYZE BUTTON
    setAnalyzeHandler(els.analyzeButton, async () => {
        console.log("[EVENT] Analyze button clicked");

        if (!state.video) {
            alert("Upload a video first.");
            return;
        }

        // 1) Lock UI: disable upload + ALL METRICS
        const uploadLabel = document.getElementById("uploadvideo");
        disableInteractiveButton(uploadLabel);
        disableInteractiveButton(els.showMetricsBtn);
        disableInteractiveButton(els.analyzeButton);

        try {
            // Show analyzing
            setAnalyzing(els.analyzeButton);
            els.analyzeButton.style.display = "none";
            els.loadingOverlay.style.display = "block";
            setPlayButtonEnabled(false);

            // 3) Call /analyze-video with the file
            const analyzeJson = await callAnalyzeVideo({
                apiBase: CONFIG.API_BASE,
                userId: localStorage.getItem("userId"),
                video: state.video
            });

            if (!analyzeJson || !analyzeJson.metrics) {
                console.warn("[WARN] /analyze-video returned unexpected structure:", analyzeJson);
                alert("Something went wrong with the analysis data. Please re-upload your video.");
                // fullReset();
                return;
            }

            // 4) Cache metrics locally (no UI yet)
            applyBackendResultsToState(state, analyzeJson.metrics || analyzeJson);
            localStorage.setItem("rtsa_metrics", JSON.stringify(analyzeJson.metrics || analyzeJson));

            // 5) Trigger /upload asynchronously (non-blocking)
            console.log("[NETWORK] Starting background upload to /upload...");
            callUploadVideo({
                apiBase: CONFIG.API_BASE,
                userId: localStorage.getItem("userId"),
                video: state.video,
                metrics: analyzeJson.metrics || analyzeJson
            })
                .then(resp => {
                    console.log("[BACKGROUND] Upload finished:", resp);
                    // ✅ After full analysis & background upload — ensure overlay and metrics both checked
                    state.cached.ready = true;
                    maybeEnablePlayButton();

                })
                .catch(err => {
                    console.error("[BACKGROUND] Upload failed:", err);
                });

            // 6) Show and enable Play button immediately after analysis
            els.loadingOverlay.style.display = "none";
            els.playProcessedButton.style.display = "block";
            els.playProcessedButton.classList.add("enabled"); // fade-in animation
            setPlayButtonEnabled(true); // make it clickable immediately
            console.log("[UI] ✅ /analyze-video complete — Play button enabled instantly");


        } catch (err) {
            console.error("[ERROR] Analyze or upload sequence failed:", err);
            alert("Something went wrong, please upload another video.");

            // Full reset to initial state
            fullReset();
        } finally {
            resetAnalyze(els.analyzeButton);
        }
    });


    //  PLAY PROCESSED VIDEO
    setPlayProcessedHandler(els.playProcessedButton, () => {
        console.log("[EVENT] Play processed video clicked");

        if (!state.cached.ready || !state.cached.metrics) {
            resetPlayButton(els.playProcessedButton);
            alert("Metrics are not ready yet. Please run analysis again.");
            return;
        }

        setPlaying(els.playProcessedButton);
        els.canvas.style.display = "block";
        els.video.play();
        startOverlayLoop();



        // 1) Move cached metrics into live backend state now
        const m = state.cached.metrics;
        state.backend.chartLabels = Array.isArray(m.chartLabels) ? m.chartLabels : [];
        state.backend.headAngleData = Array.isArray(m.headAngleData) ? m.headAngleData : [];
        state.backend.speedData = Array.isArray(m.speedData) ? m.speedData : [];
        state.backend.accelerationData = Array.isArray(m.accelerationData) ? m.accelerationData : [];
        state.backend.decelerationData = Array.isArray(m.decelerationData) ? m.decelerationData : [];
        state.backend.strideData = Array.isArray(m.strideData) ? m.strideData : [];
        state.backend.jumpData = Array.isArray(m.jumpData) ? m.jumpData : [];

        state.backend.outerRing = m.outerRing || { Running: 0, Standing: 0, Crouching: 0 };
        state.backend.innerRing = m.innerRing || { "Head Up": 0, "Head Down": 100 };
        state.backend.athleticScores = m.athleticScores || state.backend.athleticScores;
        state.backend.topSpeed = Number(m.topSpeed || 0);
        state.backend.totalDistance = Number(m.totalDistance || 0);
        state.backend.totalSteps = Number(m.totalSteps || 0);
        state.backend.maxMetrics = m.maxMetrics || null;

        // 2) Initialize the unified chart with labels only (series empty)
        // 🧹 Clean up any existing chart before creating a new one
        if (Chart.getChart("myChart2")) {
            try {
                Chart.getChart("myChart2").destroy();
                console.log("[CLEANUP] Previous myChart2 instance destroyed");
            } catch (err) {
                console.warn("[WARN] Failed to destroy existing chart:", err);
            }
        }

        // ✅ Build fresh chart safely
        showUnifiedChart(state, [0, 1, 2, 3, 4, 5]);

        // immediately clear series so it starts "empty"
        state.currentChart.data.datasets.forEach(ds => ds.data = []);
        state.currentChart.data.labels = state.backend.chartLabels || [];
        state.currentChart.update('none');

        // 5) Progressive metric updates synced to video time
        const labels = state.backend.chartLabels || [];
        const L = labels.length;
        let lastIdx = -1;

        // run exactly on your aggregation cadence
        const TICK_MS = 250;
        state.ticker = setInterval(() => {
            if (!els.video || els.video.paused || els.video.ended) return;

            const t = els.video.currentTime || 0;
            // find index i such that labels[i] <= t < labels[i+1]
            // labels are 0.25s spaced; this is a fast integer map:
            let idx = Math.floor(t / 0.25);
            if (idx >= L) idx = L - 1;
            if (idx <= lastIdx) return; // nothing new to show

            // update chart series up to idx
            const ds = state.currentChart.data.datasets;
            ds[0].data = state.backend.headAngleData.slice(0, idx + 1);
            ds[1].data = state.backend.speedData.slice(0, idx + 1);
            ds[2].data = state.backend.accelerationData.slice(0, idx + 1);
            ds[3].data = state.backend.decelerationData.slice(0, idx + 1);
            ds[4].data = state.backend.strideData.slice(0, idx + 1);
            ds[5].data = state.backend.jumpData.slice(0, idx + 1);
            state.currentChart.update('none');

            // update sliders/top boxes progressively using uptoIndex
            updateSlidersFromData(state.backend, CONFIG, idx);
            updateTopMetricBoxes({
                timeSecs: t,
                totalDistanceYards: state.backend.totalDistance, // (distance is already a total)
                steps: state.backend.totalSteps || 0
            });

            lastIdx = idx;
        }, TICK_MS);

        // stop the ticker when video ends or page unloads
        els.video.addEventListener("ended", () => {
            console.log("[EVENT] Video ended (play handler) — letting global ended handler manage UI");
            stopOverlayLoop();
            if (state.ticker) {
                clearInterval(state.ticker);
                state.ticker = null;
            }
            // ❌ Do NOT call resetButtonsOnly() here.
            // Global 'ended' listener will handle UI + Play button.
        }, { once: true });


    });

    //  CHART CLICK → SEEK VIDEO
    els.myChart2.addEventListener("click", (evt) => {
        console.log("[EVENT] Chart clicked for seeking");
        const chart = state.currentChart;
        if (!chart || chart.config.type !== "line") return;

        const points = chart.getElementsAtEventForMode(evt, "nearest", { intersect: true }, true);
        if (points && points.length > 0) {
            const idx = points[0].index;
            const t = chart.data.labels[idx];
            console.log(`[VIDEO] Seeking to ${t} seconds`);
            els.video.pause();
            els.video.currentTime = Number(t) || 0;
            els.video.addEventListener("seeked", () => {
                console.log("[VIDEO] Seek completed → drawing paused frame");
                drawOneFrameIfPaused();
            }, { once: true });
        }
    });

    els.video.addEventListener("ended", () => {
        console.log("[EVENT] Video ended — keeping Play enabled for replay");

        stopOverlayLoop();

        if (state.ticker) {
            clearInterval(state.ticker);
            state.ticker = null;
        }

        // Show original video, hide overlay canvas
        els.canvas.style.display = "none";
        els.video.style.display = "block";

        // Reset upload/analyze/show-metrics states
        resetButtonsOnly();

        // ✅ Keep Play button visible & enabled as REPLAY
        els.playProcessedButton.style.display = "block";
        els.playProcessedButton.textContent = "REPLAY VIDEO";
        els.playProcessedButton.classList.add("enabled");
        els.playProcessedButton.disabled = false;
        els.playProcessedButton.classList.remove("button-disabled");

        setPlayButtonEnabled(true);
    });


    function maybeEnablePlayButton() {
        const playBtn = document.getElementById("playProcessedButton");
        if (!playBtn) return;

        const metricsReady = state?.cached?.ready;
        const overlayReady = state?.overlayReady;

        if (metricsReady && overlayReady) {
            setPlayButtonEnabled(true);
            playBtn.style.display = "block";
            playBtn.classList.add("enabled");
            console.log("[UI] ✅ Metrics + Overlay ready — Play button enabled");
        } else {
            setPlayButtonEnabled(false);
            console.log("[UI] Waiting for both metrics & overlay...");
        }
    }

    // 🔹 Helper
    function lastKnownVideoTime(video) {
        return Number(video?.currentTime?.toFixed?.(1) || 0);
    }

    function applyBackendResultsToState(st, payload) {
        console.log("[STATE] Caching backend results (no UI updates yet)");
        // just cache aggregated metrics blob as-is
        st.cached.metrics = payload;
        st.cached.ready = true;
        console.log("[STATE] Metrics ready — checking overlay readiness");
        maybeEnablePlayButton();
        // --- Force Play button visible + animated (metrics already ready) ---
        const playBtn = document.getElementById("playProcessedButton");
        if (playBtn) {
            playBtn.style.display = "block";
            playBtn.classList.add("enabled"); // triggers fadeIn animation
            playBtn.disabled = false;
            playBtn.classList.remove("button-disabled");
            console.log("[UI] ✅ Play button forced visible after metrics readiness");
        }



        // ensure visualizations remain reset/empty until Play
        st.backend = {
            chartLabels: [],
            headAngleData: [],
            speedData: [],
            accelerationData: [],
            decelerationData: [],
            strideData: [],
            jumpData: [],
            outerRing: { Running: 0, Standing: 0, Crouching: 0 },
            innerRing: { "Head Up": 0, "Head Down": 100 },
            athleticScores: {
                footworkScore: 0, speedScore: 0, accelerationScore: 0, headAngleScore: 0, postureScore: 0
            },
            topSpeed: 0,
            totalDistance: 0,
            totalSteps: 0,
            maxMetrics: null
        };

        // IMPORTANT: do NOT call showUnifiedChart, updateDoughnutChartFromData, or updateSlidersFromData here
    }

    async function callUploadVideo({ apiBase, userId, video, metrics }) {
        console.log("[NETWORK] Uploading video to /upload AFTER analysis...");
        const form = new FormData();
        form.append("userId", userId || "");
        form.append("video", video);
        if (metrics) {
            form.append("metrics", JSON.stringify(metrics));
        }

        const resp = await fetch(`${apiBase}/upload`, { method: "POST", body: form });
        const data = await resp.json();
        console.log("[NETWORK] /upload response:", resp.status, data);

        if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
        return data;
    }

    async function callAnalyzeVideo({ apiBase, userId, video }) {
        console.log("[NETWORK] Triggering /analyze-video with raw file...");
        const form = new FormData();
        form.append("userId", userId || "");
        form.append("video", video);

        const resp = await fetch(`${apiBase}/analyze-video`, { method: "POST", body: form });
        const data = await resp.json();
        console.log("[NETWORK] /analyze-video response:", resp.status, data);

        if (!resp.ok) throw new Error(`Analyze failed: ${resp.status}`);
        return data; // expected: { status:200, metrics:{...}, ... }
    }

    window.loadAnalytics = loadAnalytics;
})();
