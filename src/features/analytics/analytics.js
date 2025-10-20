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
    setPlayProcessedHandler
} from "./modules/uiHandlers.js";

(function loadAnalytics() {
    console.log("[INIT] Analytics page loaded");

    // 1️⃣ CONSTANTS
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

    // 2️⃣ STATE
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
    };

    if (state.currentChart) state.currentChart.destroy();
    if (Chart.getChart("myChart")) Chart.getChart("myChart").destroy();
    if (Chart.getChart("myChart2")) Chart.getChart("myChart2").destroy();

    // 3️⃣ CHARTS
    console.log("[INIT] Initializing charts...");
    const doughnutChart = initDoughnutChart("myChart", CONFIG);
    showUnifiedChart(state, [0, 1, 2, 3, 4, 5]); // empty at first, becomes populated after analysis
    buildLegend("outerLegend", CONFIG.OUTER_LABELS, doughnutChart.data.datasets[0].backgroundColor);
    buildLegend("innerLegend", CONFIG.INNER_LABELS, doughnutChart.data.datasets[1].backgroundColor);

    // 4️⃣ OVERLAY
    console.log("[INIT] Initializing Mediapipe overlay...");
    initPoseOverlay({ video: els.video, canvas: els.canvas, ctx2D });

    // 5️⃣ UPLOAD BUTTON
    wireUploadButton(
        els.uploadButton,
        els.video,
        els.canvas,
        async () => {
            console.log("[EVENT] Upload metadata ready — preparing /upload request");
            resetCharts(state, doughnutChart);
            resetMetricSlidersUI(CONFIG);

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
                alert(`Video uploaded successfully: ${uploadResp.message}`);
            } catch (err) {
                console.error("[ERROR] Video upload failed:", err);
                alert("Video upload failed. Please try again.");
            }
        },
        (file) => {
            console.log(`[EVENT] Selected file: ${file.name}`);
            state.video = file;
        }
    );

    // 6️⃣ METRIC CARD BUTTONS
    wireCardsAndShowAll(els.showMetricsBtn, {
        onShowAllMetrics: () => { console.log("[EVENT] Show unified all metrics"); showUnifiedChart(state, [0, 1, 2, 3, 4, 5]); },
        onShowTechnique: () => { console.log("[EVENT] Show head-angle only"); showUnifiedChart(state, [0]); },
        onShowSpeed: () => { console.log("[EVENT] Show speed/accel/decel"); showUnifiedChart(state, [1, 2, 3]); },
        onShowFootwork: () => { console.log("[EVENT] Show stride/jump"); showUnifiedChart(state, [4, 5]); },
    });

    // 7️⃣ ANALYZE BUTTON
    setAnalyzeHandler(els.analyzeButton, async () => {
        console.log("[EVENT] Analyze button clicked");
        try {
            if (!state.video) {
                alert("Please upload a video file first.");
                return;
            }

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
            updateDoughnutChartFromData(doughnutChart, state.backend);
            updateSlidersFromData(state.backend, CONFIG);
            updateTopMetricBoxes({
                timeSecs: state.video?.duration,
                totalDistanceYards: state.backend.totalDistance,
                steps: state.backend.totalSteps || 0
            });
            console.log("[UI] Charts and sliders updated with backend data.");

            els.video.style.display = "none";
            els.canvas.style.display = "block";
            els.playProcessedButton.style.display = "block";
            drawOneFrameIfPaused();

        } catch (err) {
            console.error("[ERROR] Analyze failed:", err);
            alert("Video analysis failed. Please try again.");
            els.analyzeButton.style.display = "block";
        } finally {
            els.loadingOverlay.style.display = "none";
            console.log("[STATE] Analysis process finished.");
        }
    });

    // 8️⃣ PLAY PROCESSED VIDEO
    setPlayProcessedHandler(els.playProcessedButton, () => {
        console.log("[EVENT] Play processed video clicked");
        showUnifiedChart(state, [0,1,2,3,4,5]);
        startOverlayLoop();
    });

    // 9️⃣ CHART CLICK → SEEK VIDEO
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

    // 🔟 VIDEO ENDED EVENT
    els.video.addEventListener("ended", () => {
        console.log("[EVENT] Video ended");
        stopOverlayLoop();
    });

    // 🔹 Helper
    function lastKnownVideoTime(video) {
        return Number(video?.currentTime?.toFixed?.(1) || 0);
    }

    function applyBackendResultsToState(st, payload) {
        console.log("[STATE] Applying backend results to state");
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
        if (typeof payload.totalSteps === "number") st.backend.totalSteps = payload.totalSteps;

        console.log("[STATE] Updated backend metrics:", st.backend);
        showUnifiedChart(st, [0, 1, 2, 3, 4, 5]);
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
