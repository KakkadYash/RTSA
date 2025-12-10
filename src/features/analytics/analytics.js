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
    updateTopMetricBoxes,
    updateAverageSpeedBox
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
    resetUploadButton,
    setAnalyzing, resetAnalyze,
    setPlaying, resetPlayButton,
    disableInteractiveButton, enableInteractiveButton
} from "./modules/uiHandlers.js";


(function loadAnalytics() {
    console.log("[INIT] Analytics page loaded");
    // 🚫 Prevent double-initialization
    if (window.__RTSA_ANALYTICS_INIT__) {
        console.log("[INIT] Analytics already initialized, skipping.");
        return;
    }
    window.__RTSA_ANALYTICS_INIT__ = true;
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
    // state.overlayReady = false;
    state.cached.ready = false;
    state.videoSelected = false;
    state.metricsReady = false;

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
        updatePlayButtonStatus();

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
        // els.analyzeButton.style.display = "block";

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
        // state.overlayReady = false;
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
    updatePlayButtonStatus();

    function updatePlayButtonStatus() {
        const btn = els.playProcessedButton;

        if (state.videoSelected && state.metricsReady) {
            btn.disabled = false;
            btn.classList.add("enabled");
            btn.style.opacity = "1";
            btn.style.pointerEvents = "auto";
        } else {
            btn.disabled = true;
            btn.classList.remove("enabled");
            btn.style.opacity = "0.4";
            btn.style.pointerEvents = "none";
        }
    }

    const ctx2D = els.canvas.getContext("2d");
    // Hide canvas at start
    els.canvas.style.display = "none";


    // Listen for Mediapipe overlay finish event
    window.addEventListener("overlayReady", () => {
        console.log("[EVENT] Overlay ready received");
        // state.overlayReady = true;
        // maybeEnablePlayButton();
    });

    if (state.currentChart) state.currentChart.destroy();
    if (Chart.getChart("myChart")) Chart.getChart("myChart").destroy();
    if (Chart.getChart("myChart2")) Chart.getChart("myChart2").destroy();

    // CHARTS
    console.log("[INIT] Initializing charts...");

    // HTML double donut (technique ring)
    const doughnutChart = initDoughnutChart("myChart", CONFIG);

    // Unified time-series chart (still Chart.js)
    showUnifiedChart(state, [0, 1, 2, 3, 4, 5]);

    // Legends: use your known colors directly
    buildLegend("outerLegend", CONFIG.OUTER_LABELS, [
        "rgb(102, 169, 232)",
        "rgb(82, 113, 255)",
        "rgb(0, 74, 100)"
    ]);

    buildLegend("innerLegend", CONFIG.INNER_LABELS, [
        "rgb(122, 222, 90)",
        "rgb(233, 57, 44)"
    ]);

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
            // state.overlayReady = false;

            resetCharts(state, doughnutChart);
            resetMetricSlidersUI(CONFIG);

            els.canvas.style.display = "none";
            els.playProcessedButton.style.display = "none";
            els.analyzeButton.style.display = "block";
            updatePlayButtonStatus();

            // mark "uploaded" locally
            localStorage.setItem("rtsa_lastVideoName", state.video?.name || "");
            localStorage.setItem("rtsa_hasVideo", "1");

            alert("Video uploaded successfully"); // as per your spec
            // Now show Analyze button only after upload success
            els.analyzeButton.style.display = "block";
            enableInteractiveButton(els.analyzeButton);
            resetAnalyze(els.analyzeButton);
            els.playProcessedButton.textContent = "PLAY VIDEO"; // reset text for next run

        },
        (file) => {
            console.log(`[EVENT] Selected file: ${file.name}`);

            state.video = file;
            state.videoSelected = true;
            updatePlayButtonStatus();
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
            showUnifiedChart(state, [1, 2]);
        },
        onShowFootwork: () => {
            console.log("[EVENT] Show stride/jump");
            const existing = Chart.getChart("myChart2");
            if (existing) existing.destroy();
            showUnifiedChart(state, [3, 4]);
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
            updatePlayButtonStatus();

            const analyzeJson = await callAnalyzeVideo({
                apiBase: CONFIG.API_BASE,
                userId: localStorage.getItem("userId"),
                video: state.video
            });

            if (!analyzeJson || !analyzeJson.metrics) {
                console.warn("[WARN] /analyze-video returned unexpected structure:", analyzeJson);
                alert("Something went wrong with the analysis data. Please re-upload your video.");
                return;
            }

            // ⬅️ grab videoId from backend
            const backendVideoId = analyzeJson.videoId;

            // 4) Cache metrics locally (no UI yet)
            const metricsPayload = analyzeJson.metrics || analyzeJson;
            applyBackendResultsToState(state, metricsPayload);

            // NEW: backend metrics arrived
            state.metricsReady = true;
            updatePlayButtonStatus();

            localStorage.setItem("rtsa_metrics", JSON.stringify(metricsPayload));

            // 5) Trigger /upload asynchronously (non-blocking)
            console.log("[NETWORK] Starting background upload to /upload...");
            callUploadVideo({
                apiBase: CONFIG.API_BASE,
                userId: localStorage.getItem("userId"),
                video: state.video,
                videoId: backendVideoId,       // ⬅️ send it
                metrics: metricsPayload
            })

                .then(resp => {
                    console.log("[BACKGROUND] Upload finished:", resp);
                    // After full analysis & background upload — ensure overlay and metrics both checked
                    state.cached.ready = true;
                    // maybeEnablePlayButton();

                })
                .catch(err => {
                    console.error("[BACKGROUND] Upload failed:", err);
                });

            // 6) Show and enable Play button immediately after analysis
            els.loadingOverlay.style.display = "none";
            els.playProcessedButton.style.display = "block";
            els.playProcessedButton.classList.add("enabled"); // fade-in animation
            updatePlayButtonStatus();
            console.log("[UI] /analyze-video complete — Play button enabled instantly");


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
        state.backend.stepLengthData = Array.isArray(m.stepWidth) ? m.stepWidth : [];
        state.backend.jumpData = Array.isArray(m.jumpData) ? m.jumpData : [];

        state.backend.outerRing = m.outerRing || { Running: 0, Standing: 0, Crouching: 0 };
        state.backend.innerRing = m.innerRing || { "Head Up": 0, "Head Down": 100 };
        state.backend.athleticScores = m.athleticScores || state.backend.athleticScores;
        state.backend.topSpeed = Number(m.topSpeed || 0);
        state.backend.totalDistance = Number(m.totalDistance || 0);
        state.backend.totalSteps = Number(m.totalSteps || 0);
        state.backend.stepFrequency = Number(m.stepFrequency || 0);
        state.backend.maxMetrics = m.maxMetrics || null;

        // 3) Update the double donut now that backend has posture/head metrics
        updateDoughnutChartFromData(doughnutChart, state.backend);


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
        // ---- Rounding helpers (mirror metricsVisualization.js rules) ----
        const roundWhole = (n) => {
            const num = Number(n) || 0;
            const base = Math.floor(num);
            const decimal = num - base;
            if (decimal < 0.5) return base;
            return base + 1;
        };

        const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

        // Slice up to index and round depending on metric key
        const sliceAndRound = (arr, key, uptoIdx) => {
            const raw = (arr || []).slice(0, uptoIdx + 1);
            if (key === "jumpData" || key === "stepLengthData") {
                return raw.map(round2);
            }
            return raw.map(roundWhole);
        };

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

            // update chart series up to idx (rounded)
            const ds = state.currentChart.data.datasets;

            ds[0].data = sliceAndRound(state.backend.headAngleData, "headAngleData", idx);
            ds[1].data = sliceAndRound(state.backend.speedData, "speedData", idx);
            ds[2].data = sliceAndRound(state.backend.accelerationData, "accelerationData", idx);
            // ds[3].data = sliceAndRound(state.backend.decelerationData, "decelerationData", idx);
            ds[3].data = sliceAndRound(state.backend.stepLengthData, "stepLengthData", idx);
            ds[4].data = sliceAndRound(state.backend.jumpData, "jumpData", idx);

            state.currentChart.update("none");
            state.currentChart.update("none");


            // update sliders/top boxes progressively using uptoIndex
            updateSlidersFromData(state.backend, CONFIG, idx);
            updateTopMetricBoxes({
                timeSecs: t,
                totalDistanceYards: state.backend.totalDistance, // (distance is already a total)
                steps: state.backend.totalSteps || 0
            });
            const avgSpeed = state.backend.totalDistance / (t || 1);
            updateAverageSpeedBox(avgSpeed);

            lastIdx = idx;
        }, TICK_MS);

        // stop the ticker when video ends or page unloads
        els.video.addEventListener("ended", () => {
            console.log("[EVENT] Video ended (play handler) — letting global ended handler manage UI");
            // stopOverlayLoop();
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

        // stopOverlayLoop();

        if (state.ticker) {
            clearInterval(state.ticker);
            state.ticker = null;
        }

        // Show original video, hide overlay canvas
        // els.canvas.style.display = "none";
        // els.video.style.display = "block";

        // Reset upload/analyze/show-metrics states
        resetButtonsOnly();

        // ✅ Keep Play button visible & enabled as REPLAY
        els.playProcessedButton.style.display = "block";
        els.playProcessedButton.textContent = "REPLAY VIDEO";
        els.playProcessedButton.classList.add("enabled");
        els.playProcessedButton.disabled = false;
        els.playProcessedButton.classList.remove("button-disabled");

        // setPlayButtonEnabled(true);
    });


    // function maybeEnablePlayButton() {
    //     const playBtn = document.getElementById("playProcessedButton");
    //     if (!playBtn) return;

    //     const metricsReady = state?.cached?.ready;
    //     const overlayReady = state?.overlayReady;

    //     if (metricsReady && overlayReady) {
    //         setPlayButtonEnabled(true);
    //         playBtn.style.display = "block";
    //         playBtn.classList.add("enabled");
    //         els.canvas.style.display = "block";
    //         console.log("[UI] ✅ Metrics + Overlay ready — Play button enabled");
    //     } else {
    //         setPlayButtonEnabled(false);
    //         console.log("[UI] Waiting for both metrics & overlay...");
    //     }
    // }

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
        // maybeEnablePlayButton();
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
            topSpeed: 0,
            totalDistance: 0,
            totalSteps: 0,
            maxMetrics: null
        };

        // IMPORTANT: do NOT call showUnifiedChart, updateDoughnutChartFromData, or updateSlidersFromData here
    }

    async function callUploadVideo({ apiBase, userId, video, videoId, metrics }) {
        console.log("[NETWORK] Uploading video to /upload AFTER analysis...");
        const form = new FormData();
        form.append("userId", userId || "");
        if (videoId) {
            form.append("videoId", videoId);   // ⬅️ link to analyze-video
        }
        form.append("video", video);

        // (optional) still send metrics if you want for future use
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
    // Cleanup hook for SPA navigation
    window.addEventListener("beforeunloadAnalytics", () => {
        console.log("[CLEANUP] Analytics tearing down...");
        window.__RTSA_ANALYTICS_INIT__ = false;
    });
})();
