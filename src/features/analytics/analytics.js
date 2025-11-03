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
    setPlaying, resetPlayButton
} from "./modules/uiHandlers.js";


(function loadAnalytics() {
    console.log("[INIT] Analytics page loaded");

    // CONSTANTS
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
        myChart: document.getElementById("myChart"),
        myChart2: document.getElementById("myChart2"),
    };
    const ctx2D = els.canvas.getContext("2d");

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
            metrics: null, // holds full backend metrics until Play is clicked
            ready: false
        },
    };

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
        async () => {
            console.log("[EVENT] Upload metadata ready — preparing /upload request");
            resetCharts(state, doughnutChart);
            resetMetricSlidersUI(CONFIG);
            const uploadLabel = document.getElementById("uploadvideo");
            setUploadUploading(uploadLabel);


            els.canvas.style.display = "none";
            els.playProcessedButton.style.display = "none";
            els.analyzeButton.style.display = "block";
            els.analyzeButton.disabled = true;

            try {
                const uploadResp = await callUploadVideo({
                    apiBase: CONFIG.API_BASE,
                    userId: localStorage.getItem("userId"),
                    video: state.video
                });

                console.log("[SUCCESS] Video uploaded:", uploadResp);
                els.analyzeButton.disabled = false;
                localStorage.setItem("lastUploadedVideoId", uploadResp.videoId);
                localStorage.setItem("lastUploadedVideoName", uploadResp.videoName);
                setUploadSuccess(uploadLabel);

                alert(`Video uploaded successfully: ${uploadResp.message}`);
            } catch (err) {
                console.error("[ERROR] Video upload failed:", err);
                resetUploadButton(uploadLabel);

                alert("Video upload failed. Please try again.");
            }
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
        try {
            if (!state.video) {
                alert("Please upload a video file first.");
                return;
            }
            setAnalyzing(els.analyzeButton);

            els.analyzeButton.style.display = "none";
            els.loadingOverlay.style.display = "block";

            console.log("[NETWORK] Sending /analyze-video request...");
            const lastVideoId = localStorage.getItem("lastUploadedVideoId");
            if (!lastVideoId) {
                alert("Please upload a video first.");
                return;
            }

            const analyzeJson = await callAnalyzeVideo({
                apiBase: CONFIG.API_BASE,
                userId: localStorage.getItem("userId"),
                videoId: lastVideoId
            });

            console.log("[NETWORK] /analyze-video response received");

            const { analysisPath } = analyzeJson;
            if (!analysisPath) {
                console.warn("No analysisPath returned; using inline metrics only.");
                applyBackendResultsToState(state, analyzeJson);
                return;
            }

            const videoId = analysisPath.split("/").pop().replace(".json", "");
            console.log(`[NETWORK] Fetching signed URL for videoId ${videoId}`);

            const resp = await fetch(`${CONFIG.API_BASE}/get-analysis/${videoId}`);
            const { analysis_url } = await resp.json();
            console.log(`[NETWORK] Signed URL fetched: ${analysis_url}`);

            const metricsResp = await fetch(analysis_url);
            const fullData = await metricsResp.json();
            console.log("[DATA] Full metrics JSON loaded from GCS:", fullData);

            applyBackendResultsToState(state, fullData.metrics);
            console.log("[UI] Charts and sliders updated with backend data.");

            els.video.style.display = "none";
            els.canvas.style.display = "block";
            els.analyzeButton.style.display = "none";
            els.playProcessedButton.style.display = "block";
            drawOneFrameIfPaused();

        } catch (err) {
            console.error("[ERROR] Analyze failed:", err);
            alert("Video analysis failed. Please try again.");
            els.analyzeButton.style.display = "block";
        } finally {
            els.loadingOverlay.style.display = "none";
            resetAnalyze(els.analyzeButton);

            console.log("[STATE] Analysis process finished.");
        }
    });

    //  PLAY PROCESSED VIDEO
    setPlayProcessedHandler(els.playProcessedButton, () => {
        console.log("[EVENT] Play processed video clicked");

        if (!state.cached.ready || !state.cached.metrics) {
            setPlaying(els.playProcessedButton);

            alert("Metrics are not ready yet. Please analyze the video first.");
            return;
        }

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
        showUnifiedChart(state, [0, 1, 2, 3, 4, 5]); // builds chart with labels+data
        // immediately clear series so it starts "empty"
        state.currentChart.data.datasets.forEach(ds => ds.data = []);
        state.currentChart.data.labels = state.backend.chartLabels || [];
        state.currentChart.update('none');

        // 3) Update doughnut to show posture/head rings at start = 0%
        // (or, if you prefer, show final percentages immediately—comment next line out)
        // updateDoughnutChartFromData(doughnutChart, state.backend); // <- KEEP OFF initially if you want zeroed rings

        // 4) Begin overlay & playback
        startOverlayLoop(); // this plays the video and begins Mediapipe draw loop
        // (Mediapipe onResults draws every frame while video plays)  // :contentReference[oaicite:4]{index=4}

        // 5) Progressive metric updates synced to video time
        const labels = state.backend.chartLabels || [];
        const L = labels.length;
        let lastIdx = -1;

        // run exactly on your aggregation cadence
        const TICK_MS = 250;
        const ticker = setInterval(() => {
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
        els.video.addEventListener("ended", () => clearInterval(ticker), { once: true });
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

    // VIDEO ENDED EVENT
    els.video.addEventListener("ended", () => {
        resetPlayButton(els.playProcessedButton);

        console.log("[EVENT] Video ended");
        stopOverlayLoop();
    });

    // 🔹 Helper
    function lastKnownVideoTime(video) {
        return Number(video?.currentTime?.toFixed?.(1) || 0);
    }

    function applyBackendResultsToState(st, payload) {
        console.log("[STATE] Caching backend results (no UI updates yet)");
        // just cache aggregated metrics blob as-is
        st.cached.metrics = payload;
        st.cached.ready = true;

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

    async function callUploadVideo({ apiBase, userId, video }) {
        console.log("[NETWORK] Uploading video to /upload...");
        const form = new FormData();
        form.append("userId", userId || "");
        form.append("video", video);

        try {
            const resp = await fetch(`${apiBase}/upload`, { method: "POST", body: form });
            console.log("[NETWORK] /upload Response Status:", resp.status);
            const data = await resp.json();
            console.log(`[NETWORK] /upload complete for videoId=${resp.videoId}`);

            if (!resp.ok) throw new Error(`Upload failed: ${resp.status} ${JSON.stringify(data)}`);
            return data; // expected: { videoId, message, status, videoPath, thumbnailPath }
        } catch (error) {
            console.error("[ERROR] Upload network call failed:", error);
            throw error;
        }
    }

    async function callAnalyzeVideo({ apiBase, userId, videoId }) {
        console.log(`[NETWORK] Triggering analysis for videoId: ${videoId}`);

        const form = new FormData();
        form.append("userId", userId || "");
        form.append("videoId", videoId);

        try {
            const resp = await fetch(`${apiBase}/analyze-video`, { method: "POST", body: form });
            console.log("Analyze Response Status:", resp.status);
            const data = await resp.json();
            console.log(`[NETWORK] /analyze-video complete for videoId= `, JSON.stringify(data));


            if (!resp.ok) throw new Error(`Analyze failed: ${resp.status} ${JSON.stringify(data)}`);
            return data; // expected: { analysisPath, videoId, message, status }
        } catch (error) {
            console.error("[ERROR] Analyze network call failed:", error);
            throw error;
        }
    }

    window.loadAnalytics = loadAnalytics;
})();
