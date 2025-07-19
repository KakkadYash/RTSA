function loadAnalytics() {
    // ------------------------
    // 1. CONSTANTS & DOM REFERENCES
    // ------------------------
    const OVERLAP_THRESHOLD = 0.5;
    const HEAD_ANGLE_MIN = 40;
    const HEAD_ANGLE_MAX = 120;
    const LEFT_SHOULDER_INDEX = 11;
    const LEFT_KNEE_INDEX = 25;
    const LEFT_HIP_INDEX = 23;
    const LEFT_ANKLE_INDEX = 27;
    const RIGHT_SHOULDER_INDEX = 12;
    const RIGHT_KNEE_INDEX = 26;
    const RIGHT_HIP_INDEX = 24;
    const RIGHT_ANKLE_INDEX = 28;
    const LEFT_EYE_INDEX = 1;
    const MAX_SPEED = 10;
    const MAX_ACCEL = 10;
    const MAX_DECEL = 10;
    const MAX_JUMP = 4;
    const MAX_STRIDE = 2;
    const ACCELERATION_THRESHOLD = 0.5;
    const DECELERATION_THRESHOLD = 0.5;
    const JUMP_HEIGHT_BASELINE = 0.05;
    const uploadButton = document.getElementById('uploadButton');
    const analyzeButton = document.getElementById('analyzeButton');
    const showMetricsBtn = document.getElementById('showMetrics');
    const videoElement = document.getElementById('uploaded-video');
    const canvasElement = document.getElementById('output_canvas');
    const canvasCtx = canvasElement.getContext('2d');
    const playProcessedButton = document.getElementById('playProcessedButton');

    // Setting Analyzing Indicator Display to None  
    const loadingOverlay = document.getElementById('analyzingIndicator');

    let currentChart = null;
    let chartType = "radar";
    let lastUpdateTime = 0;

    // ------------------------
    // 2. APP STATE
    // ------------------------
    const appState = {
        postureCounts: { Running: 0, 'Upright Standing': 0, Crouching: 0 },
        lastFootY: 0,
        stepCount: 0,
        videoFile: null,
        uploadDate: '',
        previousLegPosition: { x: 0, y: 0 },
        idealHeadAngleFrames: 0,
        totalFrames: 0,
        totalDistance: 0,
        isDrillActive: false,
        athleteLocked: false,
        athleteBoundingBox: null,
        startTime: null,
        endTime: null,
        totalTime: 0,
        previousFrameTime: null,
        speedData: [],
        accelerationData: [],
        decelerationData: [],
        accelerationDataRaw: [],
        decelerationDataRaw: [],
        headAnglePerSecond: [],
        currentSecond: 0,
        smoothedSpeed: 0,
        jumpHeights: [],
        stridelength: [],
        agilityData: [],
        balanceScore: [],
        landmarkHistory: [],
        score: [],
        athleteHeightInMeters: null,
        topSpeed: 0,
        chartLabels: [],
        headAngleData: [],
        strideData: [],
        jumpData: [],
        videoId: null,
        footworkScore: 0,
        speedScore: 0,
        accelerationScore: 0,
        headAngleScore: 0,
        postureScore: 0
    };

    // ------------------------
    // 3. CHART INITIALIZATION AND DISPLAY FUNCTIONS
    // ------------------------

    // Custom plugin for center text in doughnut charts
    const centerLabelPlugin = {
        id: 'centerLabelPlugin',
        afterDraw(chart) {
            const { ctx, width, height } = chart;
            ctx.save();
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            if (chart.canvas.id === 'speedometerChart') {
                const speedValue = chart.data.datasets[0].data[0] || 0;
                ctx.fillText(`${speedValue.toFixed(2)} yards/sec`, width / 2, height / 2);
            } else if (chart.canvas.id === 'headMovementChart') {
                const idealPercentage = chart.data.datasets[0].data[0] || 0;
                ctx.fillText(`${idealPercentage}% Ideal`, width / 2, height / 2);
            }
            ctx.restore();
        }
    };
    Chart.register(centerLabelPlugin);

    // Doughnut Chart
    // <canvas id="myChart"></canvas>
    const ctx = document.getElementById('myChart').getContext('2d');

    const OUTER_LABELS = ['RUNNING', 'STANDING', 'CROUCHING'];
    const INNER_LABELS = ['HEAD UP', 'HEAD DOWN'];

    const doughnutChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [...OUTER_LABELS, ...INNER_LABELS],

            datasets: [
                {   // OUTER ring – 3 slices
                    data: [0, 0, 0],              // will be filled later
                    backgroundColor: [
                        'rgb(243, 212, 85)',         // Running
                        'rgb(0, 89, 255)',         // Standing
                        'rgb(255, 123, 0)'            // Crouching
                    ],
                    borderColor: [
                        'rgb(0, 0, 0)',  // white border for slice 1
                        'rgb(0, 0, 0)',  // white border for slice 2
                        'rgb(0, 0, 0)'   // white border for slice 3
                    ],
                    borderWidth: 2
                },
                {   // INNER ring – 2 slices
                    data: [0, 0],                 // will be filled later
                    backgroundColor: [
                        'rgb(122, 222, 90)',           // Head Up
                        'rgb(233, 57, 44)'           // Head Down
                    ],
                    borderColor: [
                        'rgb(0, 0, 0)',       // black border for slice 1
                        'rgb(0, 0, 0)'        // black border for slice 2
                    ],
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '40%',
            plugins: {
                legend: { display: false },     // we’re building our own
                tooltip: {
                    callbacks: {
                        label(ctx) {
                            // pick the right label set
                            const lbl =
                                ctx.datasetIndex === 0
                                    ? OUTER_LABELS[ctx.dataIndex]
                                    : INNER_LABELS[ctx.dataIndex];
                            return `${lbl}: ${Math.round(ctx.parsed)}%`;
                        }
                    }
                }
            }
        }
    });

    // Show pentagon athletic score chart
    function showPentagonChart() {
        const ctx = document.getElementById('myChart2').getContext('2d');
        if (currentChart) currentChart.destroy();

        const data = [
            appState.footworkScore || 0,
            appState.speedScore || 0,
            appState.accelerationScore || 0,
            appState.headAngleScore || 0,
            appState.postureScore || 0
        ];

        currentChart = new Chart(ctx, {
            type: "radar",
            data: {
                labels: ["Footwork", "Speed", "Acceleration", "Head Angle", "Posture"],
                datasets: [{
                    label: "Athletic Scores",
                    data: data,
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
                        position: 'top',           // Move legend to top
                        align: 'end',              // Align it to the right (end of the top line)
                        labels: {
                            font: {
                                size: 22,              // Increase legend font size
                                weight: 'bold'
                            },
                            color: 'rgb(0, 0, 0)'         // Optional: legend text color
                        }
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            lineWidth: 3, // Increase this value for thicker radar lines
                            color: 'rgb(82, 80, 80)'
                        },
                        ticks: {
                            font: {
                                size: 12 // increase this number to enlarge the numeric scale
                            },
                            color: 'rgb(82, 80, 80)',         // font color of numbers
                            stepSize: 10,              // optional: controls spacing between ticks
                            transparency: 0.5
                        },
                        pointLabels: {
                            font: {
                                size: 22   // Change this to your desired font size
                            },
                            color: 'rgb(0, 0, 0)' // Optional: label color
                        }
                    }
                }
            }
        });

        chartType = "radar";
    }

    function buildLegend(containerId, labels, colors) {
        const container = document.getElementById(containerId);
        container.innerHTML = ''; // Clear previous content

        labels.forEach((label, index) => {
            const legendItem = document.createElement('div');

            const colorBox = document.createElement('span');
            colorBox.classList.add('legend-color-box');
            colorBox.style.backgroundColor = colors[index];

            const labelText = document.createElement('span');
            labelText.classList.add('legend-label-text');
            labelText.textContent = label;

            legendItem.appendChild(colorBox);
            legendItem.appendChild(labelText);

            container.appendChild(legendItem);
        });
    }

    // Example call for outer and inner doughnut legends:
    buildLegend('outerLegend', OUTER_LABELS,
        doughnutChart.data.datasets[0].backgroundColor);

    buildLegend('innerLegend', INNER_LABELS,
        doughnutChart.data.datasets[1].backgroundColor);


    // Show unified multi-metric chart (line chart)
    function showUnifiedChart(metricIndices = []) {
        const ctx = document.getElementById('myChart2').getContext('2d');
        if (currentChart) currentChart.destroy();

        currentChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: appState.chartLabels || [],
                datasets: [
                    {
                        label: 'Head Angle (°)',
                        data: appState.headAngleData || [],
                        borderColor: '#FF8C00',
                        fill: false
                    },
                    {
                        label: 'Speed (yards/sec)',
                        data: appState.speedData || [],
                        borderColor: '#1F43E5',
                        fill: false
                    },
                    {
                        label: 'Acceleration (yards/s²)',
                        data: appState.accelerationData || [],
                        borderColor: '#7DD859',
                        fill: false
                    },
                    {
                        label: 'Deceleration (yards/s²)',
                        data: appState.decelerationData || [],
                        borderColor: '#E93632',
                        fill: false
                    },
                    {
                        label: 'Stride Length (yards)',
                        data: appState.strideData || [],
                        borderColor: '#FFA500',
                        fill: false
                    },
                    {
                        label: 'Jump Height (yards)',
                        data: appState.jumpData || [],
                        borderColor: '#800080',
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onClick: (evt, activeElements) => {
                    if (activeElements.length > 0) {
                        const pointIndex = activeElements[0].index;
                        const timestamp = currentChart.data.labels[pointIndex];
                        seekToTimestamp(timestamp);
                    }
                }
            }
        });

        chartType = "line";

        currentChart.data.datasets.forEach((dataset, index) => {
            dataset.hidden = !metricIndices.includes(index);
        });

        currentChart.update();
    }

    function handleVideoEnded() {
        autoSaveAnalytics();
    }
    // ------------------------
    // 4. EVENT LISTENERS
    // ------------------------

    // Upload button: Select and preview the video
    uploadButton.addEventListener('change', (event) => {
        appState.videoFile = event.target.files[0];

        if (appState.videoFile) {
            const maxSizeInBytes = 30 * 1024 * 1024; // 30 MB

            if ((appState.videoFile).size > maxSizeInBytes) {
                alert("File size exceeds 30MB. Please upload a smaller video.");
                event.target.value = ""; // Reset the input so they can re-upload
                return;
            }
            const videoURL = URL.createObjectURL(appState.videoFile);
            videoElement.src = videoURL;
            // Wait for metadata to be loaded
            videoElement.onloadedmetadata = () => {
                // Video's intrinsic dimensions are now available
                console.log("Loaded video metadata:", videoElement.videoWidth, videoElement.videoHeight);
                canvasElement.width = videoElement.videoWidth;
                canvasElement.height = videoElement.videoHeight;
                canvasElement.style.width = videoElement.clientHeight + 'px';
                canvasElement.style.height = videoElement.clientWidth + 'px';

                console.log("Canvas metadata:", canvasElement.width, canvasElement.height)
                // Other state resets
                videoElement.style.display = 'block';
                resetCharts();
                resetAnalysisData();
                resetMetricSlidersUI();
                canvasElement.style.display = 'none';
                playProcessedButton.style.display = 'none';
                analyzeButton.style.display = 'block';
            };

        }
    });

    // Analyze button: Estimate height, prepare processing
    analyzeButton.addEventListener('click', async (event) => {
        event.preventDefault();

        if (!appState.videoFile) {
            alert("Please upload a video file first.");
            return;
        }
        analyzeButton.style.display = 'none';
        loadingOverlay.style.display = 'block';

        const estimatedHeight = await estimateHeight(appState.videoFile);
        if (estimatedHeight) {
            appState.athleteHeightInMeters = estimatedHeight;
            console.log(`Estimated height received: ${estimatedHeight}`);
        } else {
            console.error("Height estimation failed.");
            loadingOverlay.style.display = 'none';
            return;
        }

        await pose.initialize();
        loadingOverlay.style.display = 'none';

        // Show the play video button
        playProcessedButton.style.display = 'block';

        // Add fresh listener for this session
        playProcessedButton.addEventListener('click', handlePlayProcessedClick);
        videoElement.style.display = 'none';

        // canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

        canvasElement.style.display = 'block';

        // playProcessedButton.style.display = 'inline-block';

        videoElement.currentTime = 0;
        processVideo(videoElement);

        videoElement.removeEventListener('ended', handleVideoEnded);
        videoElement.addEventListener('ended', handleVideoEnded);

    });

    // Play Processed Video button
    function handlePlayProcessedClick() {
        if (!videoElement.paused) return;
        showPentagonChart();
        videoElement.play();
        processVideo(videoElement);

        // Remove itself after first click
        playProcessedButton.removeEventListener('click', handlePlayProcessedClick);
    }


    // Card click: Show filtered chart for card
    document.querySelectorAll('.card').forEach((card, index, allCards) => {
        card.addEventListener('click', () => {
            setTimeout(() => {
                const alreadyFlipped = card.classList.contains('is-flipped');

                // Unflip all cards first
                allCards.forEach(c => c.classList.remove('is-flipped'));

                // If the clicked card was not flipped, flip it and update chart
                if (!alreadyFlipped) {
                    card.classList.add('is-flipped');

                    // Show the filtered chart based on card index
                    if (index === 0) showUnifiedChart([0]);         // Technique
                    if (index === 1) showUnifiedChart([1, 2, 3]);    // Speed & Movement
                    if (index === 2) showUnifiedChart([4, 5]);       // Footwork
                } else {
                    // If it was already flipped and now being unflipped, show the pentagon chart again
                    showPentagonChart();
                }
            }, 200);
        });
    });

    // Show all metrics → Show pentagon chart and flip all cards
    if (showMetricsBtn) {
        let metricsVisible = false; // Track state
        showMetricsBtn.addEventListener('click', () => {
            metricsVisible = !metricsVisible; // Toggle state

            if (metricsVisible) {
                showPentagonChart(); // Optional: only if you want to re-show the chart each time
                document.querySelectorAll('.card').forEach(card => {
                    card.classList.add('is-flipped');
                });
            } else {
                document.querySelectorAll('.card').forEach(card => {
                    card.classList.remove('is-flipped');
                });
            }
        });
    }

    // ------------------------
    // 5. POSE SETUP
    // ------------------------

    const pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });
    pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
    });
    pose.onResults(onResults);

    // Throttle metric/chart updates to once per second
    function throttledUpdates() {
        const now = performance.now();
        if (now - lastUpdateTime > 1000) {
            updatetopmetricboxes();
            updateDoughnutChart();
            updateMetricSliders();
            lastUpdateTime = now;
        }
    }

    // Main frame-by-frame pose landmark handler
    function onResults(results) {
        if (!results.poseLandmarks) {
            console.log("No landmarks detected");
            return;
        }
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        console.log("Landmark sample:", results.poseLandmarks[0]);


        // Continue with all metric/posture processing
        appState.landmarkHistory.push([...results.poseLandmarks]);
        if (appState.landmarkHistory.length > 100) {
            appState.landmarkHistory.shift();
        }

        const posture = detectPosture(results.poseLandmarks);
        if (['Running', 'Upright Standing', 'Crouching'].includes(posture)) {
            appState.postureCounts[posture]++;
        }

        const currentBoundingBox = calculateBoundingBox(results.poseLandmarks);

        if (!appState.athleteLocked) {
            lockOnAthlete(results.poseLandmarks);
        } else {
            if (!isAthleteInFrame(results.poseLandmarks)) {
                console.log("Lost track of the athlete, ignoring this frame");
                return;
            }
            appState.athleteBoundingBox = currentBoundingBox;
        }

        const now = performance.now();
        const timeElapsedSinceLastFrame = appState.previousFrameTime
            ? (now - appState.previousFrameTime) / 1000
            : 0;
        appState.previousFrameTime = now;

        const lHip = results.poseLandmarks[23];
        const rHip = results.poseLandmarks[24];
        const lShoulder = results.poseLandmarks[11];
        const rShoulder = results.poseLandmarks[12];

        // Safety check: skip if any are missing
        if (!lHip || !rHip || !lShoulder || !rShoulder) return;
        // Get midpoint of shoulders
        const avgHipX = (lHip.x + rHip.x) / 2;
        const avgHipY = (lHip.y + rHip.y) / 2;
        // Get midpoint of shoulders
        const avgShoulderX = (lShoulder.x + rShoulder.x) / 2;
        const avgShoulderY = (lShoulder.y + rShoulder.y) / 2;

        // Measure distance between eye and shoulder midpoint
        const distance = Math.sqrt(
            Math.pow(avgHipX.x - avgShoulderX, 2) +
            Math.pow(avgHipY.y - avgShoulderY, 2)
        );

        // Base (reference) distance when athlete is close to the camera
        const baseDistance = 1;

        // Direct scale: more distance → bigger scale
        let scalingFactor = distance / baseDistance;

        // Clamp to a reasonable range
        scalingFactor = Math.min(Math.max(scalingFactor, 0.5), 3);

        // Calculate visual sizes
        const lineWidth = scalingFactor * 0.5;
        const landmarkRadius = scalingFactor * 500;

        // Draw
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
            color: 'white',
            lineWidth: lineWidth
        });

        drawLandmarks(canvasCtx, results.poseLandmarks, {
            color: 'red',
            fillColor: 'green',
            radius: 5
        });


        const headAngle = calculateHeadAngle(results.poseLandmarks);
        if (headAngle >= 5) {
            appState.totalFrames++;
        }

        if (headAngle >= HEAD_ANGLE_MIN && headAngle <= HEAD_ANGLE_MAX) {
            appState.idealHeadAngleFrames++;
        }

        const currentVideoTime = Math.floor(videoElement.currentTime);
        if (currentVideoTime > appState.currentSecond) {
            appState.currentSecond = currentVideoTime;
            appState.headAnglePerSecond.push(headAngle);
            appState.chartLabels.push(appState.currentSecond);
            appState.headAngleData.push(appState.headAnglePerSecond.at(-1) || 0);
            appState.speedData.push(appState.smoothedSpeed);
            appState.accelerationData.push(appState.accelerationDataRaw?.at(-1) || 0);
            appState.decelerationData.push(appState.decelerationDataRaw?.at(-1) || 0);
            appState.strideData.push(appState.stridelength?.at(-1)?.length || 0);
            appState.jumpData.push(appState.jumpHeights?.at(-1)?.height || 0);
        }

        throttledUpdates();

        if (results.poseLandmarks[LEFT_ANKLE_INDEX] && results.poseLandmarks[LEFT_EYE_INDEX]) {
            analyzeFrame(results.poseLandmarks, appState.athleteHeightInMeters, timeElapsedSinceLastFrame, posture, currentVideoTime);
        }

        detectDrillStart(results.poseLandmarks);
        detectDrillEnd();
    }

    // ------------------------
    // 6. VIDEO PROCESSING
    // ------------------------

    function processVideo(videoElement) {
        function processFrame() {
            if (videoElement.paused || videoElement.ended) return;
            if (videoElement.paused || videoElement.ended) return;

            pose.send({ image: videoElement }).then(() => {
                setTimeout(processFrame, 30);
            }).catch(error => console.error("Error processing frame:", error));
        }

        videoElement.addEventListener('play', processFrame);
    }

    function seekToTimestamp(timestamp) {
        videoElement.pause();
        videoElement.currentTime = timestamp;
        videoElement.addEventListener('seeked', function () {
            canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        }, { once: true });
    }

    // ------------------------
    // 7. ANALYTICS CALCULATIONS AND METRICS
    // ------------------------

    function analyzeFrame(landmarks, athleteHeightInMeters, timeElapsedSinceLastFrame, posture) {
        if (!landmarks || !athleteHeightInMeters) {
            console.warn("Missing landmarks or athlete height");
            return;
        }

        calculateDistance(landmarks, athleteHeightInMeters);
        detectJumps(landmarks);
        calculatestride(landmarks);
        calculateSteps(landmarks);

        const acceleration = calculateAcceleration(appState.speedData, timeElapsedSinceLastFrame);
        if (!isNaN(acceleration) && Math.abs(acceleration) > ACCELERATION_THRESHOLD) {
            appState.accelerationDataRaw.push(acceleration);
        }

        const deceleration = calculateDeceleration(appState.speedData, timeElapsedSinceLastFrame);
        if (!isNaN(deceleration) && Math.abs(deceleration) > DECELERATION_THRESHOLD) {
            appState.decelerationDataRaw.push(deceleration);
        }

        const scores = calculateAthleticScores(posture);
        const hasNaN = scores.some(score => isNaN(score));
        if (!hasNaN) {
            [
                appState.footworkScore,
                appState.speedScore,
                appState.accelerationScore,
                appState.headAngleScore,
                appState.postureScore
            ] = scores;

            appState.score.push(scores);
            const avg = scores.reduce((sum, val) => sum + val, 0) / scores.length;
            document.getElementById('athleticScoreValue').textContent = `${avg.toFixed(1)}%`;
        }

        if (currentChart && chartType === "radar") {
            currentChart.data.datasets[0].data = scores;
            currentChart.update();
        }
    }

    function updatetopmetricboxes() {
        document.getElementById('drillTimeValue').textContent = `${videoElement.currentTime.toFixed(1)} SECS`;
        document.getElementById('distanceValue').textContent = `${appState.totalDistance.toFixed(1)} YARDS`;
        document.getElementById('stepsValue').textContent = `${appState.stepCount}`;
    }

    function updateDoughnutChart() {
        if (!doughnutChart) return;

        // ---------- INNER ring (head‑angle) ----------
        const idealPct = Math.round(
            (appState.idealHeadAngleFrames / appState.totalFrames) * 100
        );
        doughnutChart.data.datasets[1].data = [
            idealPct,
            100 - idealPct
        ];

        // ---------- OUTER ring (posture counts) ----------
        const totals = appState.postureCounts;
        const totalPosture = Object.values(totals).reduce((a, b) => a + b, 0) || 1;

        const running = Math.round(((totals['Running'] || 0) / totalPosture) * 100);
        const standing = Math.round(((totals['Upright Standing'] || 0) / totalPosture) * 100);
        const crouching = Math.round(((totals['Crouching'] || 0) / totalPosture) * 100);

        doughnutChart.data.datasets[0].data = [
            running,
            standing,
            crouching
        ];

        doughnutChart.update();
    }

    function updateMetricSliders() {
        const speed = Math.round(appState.smoothedSpeed) || 0;
        const accel = Math.round(calculatePeakAcceleration()) || 0;
        const decel = Math.round(calculatePeakDeceleration()) || 0;
        const jump = calculateAverageJumpHeight() || 0;
        const stride = calculateAverageStrideLength() || 0;
        console.log(`speed: ${speed}`)
        console.log(`accel: ${accel}`)
        console.log(`decel: ${decel}`)
        console.log(`jump: ${jump}`)
        console.log(`stride: ${stride}`)
        // SPEED & MOVEMENT
        updateProgress("topSpeed", "topSpeedBar", speed, MAX_SPEED);
        updateProgress("peakAcceleration", "peakAccelerationBar", accel, MAX_ACCEL);
        updateProgress("peakDeceleration", "peakDecelerationBar", decel, MAX_DECEL);

        // FOOTWORK
        updateProgress("averageJumpHeight", "averageJumpHeightBar", jump, MAX_JUMP);
        updateProgress("averageStrideLength", "averageStrideLengthBar", stride, MAX_STRIDE);
    }

    function updateProgress(textId, barId, value, maxValue) {
        const percentage = Math.min((value / maxValue) * 100, 100); // Cap at 100%
        document.getElementById(textId).innerText = value;
        document.getElementById(barId).style.width = `${percentage}%`;
    }

    // ------------------------
    // 8. FRAME-BASED METRIC CALCULATIONS
    // ------------------------

    function calculateDistance(landmarks, athleteHeightInMeters) {
        if (!landmarks || !landmarks[RIGHT_HIP_INDEX] || !landmarks[LEFT_HIP_INDEX]) {
            console.warn("Required landmarks not found for distance calculation");
            return;
        }

        const rightHip = landmarks[RIGHT_HIP_INDEX];
        const leftHip = landmarks[LEFT_HIP_INDEX];
        const currentPosition = {
            x: (rightHip.x + leftHip.x) / 2,
            y: (rightHip.y + leftHip.y) / 2,
        };

        if (!appState.startTime) {
            appState.startTime = performance.now();
            appState.previousFrameTime = appState.startTime;
            appState.topSpeed = 0;
            appState.smoothedSpeed = 0;
            return;
        }

        const currentTime = performance.now();
        const timeElapsedSinceLastFrame = (currentTime - appState.previousFrameTime) / 1000;
        if (timeElapsedSinceLastFrame <= 0 || timeElapsedSinceLastFrame > 1) return;

        const scaleFactor = calculateScaleFactor(landmarks, athleteHeightInMeters);
        const distanceCovered = Math.sqrt(
            Math.pow(currentPosition.x - appState.previousLegPosition.x, 2) +
            Math.pow(currentPosition.y - appState.previousLegPosition.y, 2)
        );
        if (distanceCovered < 0.1) return;

        appState.totalDistance += distanceCovered;
        appState.previousLegPosition = currentPosition;
        appState.previousFrameTime = currentTime;

        const SAFE_TIME_THRESHOLD = 0.05;
        const timeStep = Math.max(timeElapsedSinceLastFrame, SAFE_TIME_THRESHOLD);
        const speed = distanceCovered / timeStep;

        appState.speedData.push(speed);
        const smoothingFactor = 0.5;
        appState.smoothedSpeed = smoothingFactor * speed + (1 - smoothingFactor) * appState.smoothedSpeed;

        appState.topSpeed = Math.max(appState.topSpeed || 0, speed);
        appState.totalTime = (currentTime - appState.startTime) / 1000;
    }

    function calculateSteps(landmarks) {
        const leftFootY = landmarks[LEFT_ANKLE_INDEX].y;
        const rightFootY = landmarks[RIGHT_ANKLE_INDEX].y;
        const footDistance = Math.abs(leftFootY - rightFootY);

        if (footDistance > 0.05 && Math.abs(footDistance - appState.lastFootY) > 0.02) {
            appState.stepCount++;
            appState.lastFootY = footDistance;
        }
    }

    function calculatestride(landmarks) {
        const leftAnkle = landmarks[LEFT_ANKLE_INDEX];
        const rightAnkle = landmarks[RIGHT_ANKLE_INDEX];
        const avgAnkleX = (leftAnkle.x + rightAnkle.x) / 2;
        const avgAnkleY = (leftAnkle.y + rightAnkle.y) / 2;

        const stridedistance = Math.sqrt(
            Math.pow(avgAnkleX - appState.previousLegPosition.x, 2) +
            Math.pow(avgAnkleY - appState.previousLegPosition.y, 2)
        );

        let strideValue = 0;
        if (stridedistance > 0.01) {
            strideValue = stridedistance;
        }

        appState.stridelength.push({
            time: appState.currentSecond,
            length: strideValue
        });

        appState.previousLegPosition = { x: avgAnkleX, y: avgAnkleY };
    }

    function detectJumps(landmarks) {
        const leftAnkle = landmarks[LEFT_ANKLE_INDEX];
        const rightAnkle = landmarks[RIGHT_ANKLE_INDEX];
        const averageAnkleY = (leftAnkle.y + rightAnkle.y) / 2;

        if (typeof appState.previousAnkleY !== "number") {
            appState.previousAnkleY = averageAnkleY;
            return;
        }

        const jumpHeight = appState.previousAnkleY - averageAnkleY;
        let jumpValue = 0;
        if (jumpHeight > JUMP_HEIGHT_BASELINE) {
            jumpValue = jumpHeight;
        }

        appState.jumpHeights.push({
            time: appState.currentSecond,
            height: jumpValue
        });

        appState.previousAnkleY = averageAnkleY;
    }

    function detectPosture(landmarks) {
        if (!landmarks) return "Unknown";

        const avgAngle = (a, b) => (a + b) / 2;

        const leftKnee = calculateAngle(landmarks[LEFT_HIP_INDEX], landmarks[LEFT_KNEE_INDEX], landmarks[LEFT_ANKLE_INDEX]);
        const rightKnee = calculateAngle(landmarks[RIGHT_HIP_INDEX], landmarks[RIGHT_KNEE_INDEX], landmarks[RIGHT_ANKLE_INDEX]);
        const kneeAngle = avgAngle(leftKnee, rightKnee);

        const leftHip = calculateAngle(landmarks[LEFT_SHOULDER_INDEX], landmarks[LEFT_HIP_INDEX], landmarks[LEFT_KNEE_INDEX]);
        const rightHip = calculateAngle(landmarks[RIGHT_SHOULDER_INDEX], landmarks[RIGHT_HIP_INDEX], landmarks[RIGHT_KNEE_INDEX]);
        const hipAngle = avgAngle(leftHip, rightHip);

        const leftTorso = calculateAngle(
            landmarks[LEFT_HIP_INDEX],
            landmarks[LEFT_SHOULDER_INDEX],
            { x: landmarks[LEFT_SHOULDER_INDEX].x, y: landmarks[LEFT_SHOULDER_INDEX].y - 1 }
        );
        const rightTorso = calculateAngle(
            landmarks[RIGHT_HIP_INDEX],
            landmarks[RIGHT_SHOULDER_INDEX],
            { x: landmarks[RIGHT_SHOULDER_INDEX].x, y: landmarks[RIGHT_SHOULDER_INDEX].y - 1 }
        );
        const torsoAngle = avgAngle(leftTorso, rightTorso);

        if (
            kneeAngle >= 30 && kneeAngle <= 45 &&
            hipAngle >= 20 && hipAngle <= 30 &&
            torsoAngle >= 10 && torsoAngle <= 20
        ) return "Crouching";

        if (
            kneeAngle >= 20 && kneeAngle <= 30 &&
            hipAngle >= 15 && hipAngle <= 25 &&
            torsoAngle >= 5 && torsoAngle <= 15
        ) return "Running";

        if (
            kneeAngle >= 10 && kneeAngle <= 25 &&
            torsoAngle >= 75 && torsoAngle <= 90
        ) return "Standing";

        return "Running"; // fallback
    }

    function calculateHeadAngle(landmarks) {
        const leftEye = landmarks[3];
        const rightEye = landmarks[6];
        const leftShoulder = landmarks[12];
        const rightShoulder = landmarks[13];

        const headPositionX = (leftEye.x + rightEye.x) / 2;
        const headPositionY = (leftEye.y + rightEye.y) / 2;
        const shoulderPositionX = (leftShoulder.x + rightShoulder.x) / 2;
        const shoulderPositionY = (leftShoulder.y + rightShoulder.y) / 2;

        const deltaX = shoulderPositionX - headPositionX;
        const deltaY = shoulderPositionY - headPositionY;
        const headAngle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

        return headAngle;
    }

    function calculateAngle(pointA, pointB, pointC) {
        const vectorAB = { x: pointB.x - pointA.x, y: pointB.y - pointA.y };
        const vectorBC = { x: pointC.x - pointB.x, y: pointC.y - pointB.y };
        const dotProduct = (vectorAB.x * vectorBC.x) + (vectorAB.y * vectorBC.y);
        const magnitudeAB = Math.sqrt(vectorAB.x ** 2 + vectorAB.y ** 2);
        const magnitudeBC = Math.sqrt(vectorBC.x ** 2 + vectorBC.y ** 2);
        const cosineAngle = dotProduct / (magnitudeAB * magnitudeBC);
        return Math.acos(cosineAngle) * (180 / Math.PI);
    }

    // ------------------------
    // 9. ACCELERATION, REACTION, DRILL DETECTION
    // ------------------------
    function calculateAthleticScores(posture) {
        const strideScore = Math.min(100, (calculateAverageStrideLength() / 0.04) * 100);
        const jumpScore = Math.min(100, (calculateAverageJumpHeight() / 0.03) * 100);
        const speedScore = Math.min(100, (appState.topSpeed / 8.0467) * 100); // converting 8.0467 yards/sec (30 km/h)
        const accelerationScore = Math.min(100, (calculatePeakAcceleration() / 1.5) * 100);
        const headAngleScore = Math.min(100, (appState.idealHeadAngleFrames / appState.totalFrames) * 100);

        let postureScore = 0;
        const totalPostures = Object.values(appState.postureCounts).reduce((a, b) => a + b, 0) || 1;
        if (posture === 'Running') {
            postureScore = Math.min(100, (appState.postureCounts['Running'] / totalPostures) * 100);
        } else if (posture === 'Crouching') {
            postureScore = Math.min(100, (appState.postureCounts['Crouching'] / totalPostures) * 100);
        } else {
            postureScore = Math.min(100, (appState.postureCounts['Upright Standing'] / totalPostures) * 100);
        }

        return [strideScore, speedScore, accelerationScore, headAngleScore, postureScore];
    }

    function calculateAcceleration(speedData, timeStep) {
        if (speedData.length < 2 || timeStep === 0) return 0;
        const lastSpeed = speedData[speedData.length - 1];
        const prevSpeed = speedData[speedData.length - 2];
        return (lastSpeed - prevSpeed) / timeStep;
    }

    function calculateDeceleration(speedData, timeStep) {
        return calculateAcceleration(speedData, timeStep); // same logic reused
    }

    function calculatePeakAcceleration() {
        return appState.accelerationDataRaw.length > 0
            ? Math.max(...appState.accelerationDataRaw)
            : 0;
    }

    function calculatePeakDeceleration() {
        return appState.decelerationDataRaw.length > 0
            ? Math.min(...appState.decelerationDataRaw)
            : 0;
    }

    function detectDrillStart(landmarks) {
        if (!appState.isDrillActive) {
            const feetY = landmarks[LEFT_ANKLE_INDEX].y + landmarks[RIGHT_ANKLE_INDEX].y;
            const hipsY = landmarks[LEFT_HIP_INDEX].y + landmarks[RIGHT_HIP_INDEX].y;
            if (hipsY - feetY > 0.2) {
                appState.isDrillActive = true;
                appState.startTime = performance.now();
                console.log("Drill started");
            }
        }
    }

    function detectDrillEnd() {
        if (appState.isDrillActive && appState.totalTime > 8) {
            appState.endTime = performance.now();
            appState.isDrillActive = false;
            console.log("Drill ended");
        }
    }

    // ------------------------
    // 10. UTILITY FUNCTIONS
    // ------------------------

    function normalize(value, min, max) {
        return (value - min) / (max - min);
    }

    function analyzeFootMovements() {
        // Placeholder if you want to implement future stride gait logic
    }

    function isAthleteInFrame(currentLandmarks) {
        const currentBox = calculateBoundingBox(currentLandmarks);
        const lockedBox = appState.athleteBoundingBox;

        const overlapX = Math.max(
            0,
            Math.min(currentBox.x + currentBox.width, lockedBox.x + lockedBox.width) -
            Math.max(currentBox.x, lockedBox.x)
        );

        const overlapY = Math.max(
            0,
            Math.min(currentBox.y + currentBox.height, lockedBox.y + lockedBox.height) -
            Math.max(currentBox.y, lockedBox.y)
        );

        const overlapArea = overlapX * overlapY;
        const currentArea = currentBox.width * currentBox.height;
        const overlapRatio = overlapArea / currentArea;

        return overlapRatio >= OVERLAP_THRESHOLD;
    }

    function calculateBoundingBox(landmarks) {
        const xs = landmarks.map(p => p.x);
        const ys = landmarks.map(p => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    function lockOnAthlete(landmarks) {
        appState.athleteBoundingBox = calculateBoundingBox(landmarks);
        appState.athleteLocked = true;
    }

    function calculateScaleFactor(landmarks, athleteHeightInMeters) {
        const pixelHeight = Math.abs(landmarks[LEFT_ANKLE_INDEX].y - landmarks[LEFT_EYE_INDEX].y);
        return athleteHeightInMeters / pixelHeight;
    }

    function movingAverage(data, windowSize) {
        const result = [];
        for (let i = 0; i < data.length; i++) {
            const windowStart = Math.max(0, i - windowSize + 1);
            const window = data.slice(windowStart, i + 1);
            const avg = window.reduce((a, b) => a + b, 0) / window.length;
            result.push(avg);
        }
        return result;
    }

    function calculatePeakAcceleration() {
        return appState.accelerationData.length ? Math.max(...appState.accelerationData) : 0;
    }

    function calculatePeakDeceleration() {
        return appState.decelerationData.length ? Math.max(...appState.decelerationData) : 0;
    }

    function calculateAverageJumpHeight() {
        if (!appState.jumpHeights.length) return 0;

        const heights = appState.jumpHeights.map(j => j.height || 0);
        const validHeights = heights.filter(h => h > 0);
        if (!validHeights.length) return 0;

        const sorted = validHeights.slice().sort((a, b) => a - b);
        const midIndex = Math.floor(sorted.length / 2);
        const topHalf = sorted.slice(midIndex);

        const average = topHalf.reduce((a, b) => a + b, 0) / topHalf.length;
        return Math.round(average * 100) / 100; // 2 decimal places
    }

    function calculateAverageStrideLength() {
        if (!appState.stridelength.length) return 0;

        const lengths = appState.stridelength.map(s => s.length || 0);
        const validLengths = lengths.filter(l => l > 0);
        if (!validLengths.length) return 0;

        // Step 1: Sort the valid lengths (ascending)
        const sorted = validLengths.slice().sort((a, b) => a - b);

        // Step 2: Get the index of the median
        const midIndex = Math.floor(sorted.length / 2);

        // Step 3: Get the top 50% (including median)
        const topHalf = sorted.slice(midIndex);

        // Step 4: Calculate the average of the top half
        const average = topHalf.reduce((a, b) => a + b, 0) / topHalf.length;

        return Math.round(average * 100) / 100; // rounded to 2 decimal places
    }
    // ------------------------
    // 11. RESET & UPLOAD
    // ------------------------
    function resetMetricSlidersUI() {
        updateProgress("topSpeed", "topSpeedBar", 0, MAX_SPEED);
        updateProgress("peakAcceleration", "peakAccelerationBar", 0, MAX_ACCEL);
        updateProgress("peakDeceleration", "peakDecelerationBar", 0, MAX_DECEL);
        updateProgress("averageJumpHeight", "averageJumpHeightBar", 0, MAX_JUMP);
        updateProgress("averageStrideLength", "averageStrideLengthBar", 0, MAX_STRIDE);
        document.getElementById('athleticScoreValue').textContent = `${0}%`
        document.getElementById('drillTimeValue').textContent = `${0} SECS`;
        document.getElementById('distanceValue').textContent = `${0} YARDS`;
        document.getElementById('stepsValue').textContent = `${0}`;
    }

    function resetCharts() {
        doughnutChart.data.datasets[0].data = [0, 0, 0, 0, 0];
        doughnutChart.data.datasets[1].data = [0, 100];
        doughnutChart.update();

        if (currentChart) {
            currentChart.data.labels = [];
            currentChart.data.datasets.forEach(ds => ds.data = []);
            currentChart.update();
        }
    }

    function resetAnalysisData() {
        Object.assign(appState, {
            postureCounts: { Running: 0, 'Upright Standing': 0, Crouching: 0 },
            lastFootY: 0,
            stepCount: 0,
            uploadDate: '',
            previousLegPosition: { x: 0, y: 0 },
            idealHeadAngleFrames: 0,
            totalFrames: 0,
            totalDistance: 0,
            isDrillActive: false,
            athleteLocked: false,
            athleteBoundingBox: null,
            startTime: null,
            endTime: null,
            totalTime: 0,
            previousFrameTime: null,
            speedData: [],
            accelerationData: [],
            decelerationData: [],
            accelerationDataRaw: [],
            decelerationDataRaw: [],
            headAnglePerSecond: [],
            currentSecond: 0,
            smoothedSpeed: 0,
            jumpHeights: [],
            stridelength: [],
            agilityData: [],
            balanceScore: [],
            landmarkHistory: [],
            score: [],
            topSpeed: 0,
            chartLabels: [],
            headAngleData: [],
            jumpData: [],
            footworkScore: 0,
            speedScore: 0,
            accelerationScore: 0,
            headAngleScore: 0,
            postureScore: 0
        });
    }

    async function autoSaveAnalytics() {
        try {
            const formData = new FormData();
            formData.append('video', appState.videoFile);
            formData.append('userId', localStorage.getItem('user_id'));
            if (appState.uploadDate) {
                formData.append('uploadDate', appState.uploadDate);
            }
            if (appState.thumbnailFile) {
                formData.append('thumbnail', appState.thumbnailFile);
            }
            const uploadResponse = await fetch('https://uploaded-data-443715.uc.r.appspot.com/upload', {
                method: 'POST',
                body: formData,
            });

            const uploadResult = await uploadResponse.json();
            console.log('Video uploaded successfully:', uploadResult);

            if (!uploadResult.video_id) {
                console.error('Video upload failed. No video_id received.');
                return;
            }

            appState.videoId = uploadResult.video_id;
            const idealHeadPercentage = appState.idealHeadAngleFrames
                ? Math.round((appState.idealHeadAngleFrames / appState.totalFrames) * 100)
                : 0;
            const allscores = appState.score.flat();
            const averageAthleticScore = allscores.length > 0
                ? allscores.reduce((sum, val) => sum + val, 0) / allscores.length
                : 0;

            // Update the metric values to be saved
            appState.averageStrideLength = calculateAverageStrideLength();
            appState.peakAcceleration = calculatePeakAcceleration();
            appState.peakDeceleration = calculatePeakDeceleration();
            appState.averageJumpHeight = calculateAverageJumpHeight();
            const analyticsData = {
                video_Id: appState.videoId,
                userId: localStorage.getItem('user_id'),
                idealHeadPercentage: idealHeadPercentage,
                averageAthleticScore: averageAthleticScore,
                topSpeed: appState.topSpeed || 0,
                averageJumpHeight: appState.averageJumpHeight || 0,
                averageStrideLength: appState.averageStrideLength || 0,
                peakAcceleration: appState.peakAcceleration || 0,
                peakDeceleration: appState.peakDeceleration || 0
            };

            console.log("Sending analytics data:", analyticsData);

            const analyticsResponse = await fetch('https://uploaded-data-443715.uc.r.appspot.com/saveAnalytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(analyticsData),
            });

            const analyticsResult = await analyticsResponse.json();
            console.log('Analytics saved successfully:', analyticsResult);
            alert('Analytics saved successfully!');

        } catch (error) {
            console.error('Error in autoSaveAnalytics:', error);
            alert('An error occurred while saving analytics.');
        }
    }

    async function estimateHeight(videoFile) {
        const formData = new FormData();
        formData.append('video', videoFile);

        try {
            const response = await fetch('https://uploaded-data-443715.uc.r.appspot.com/estimate_height', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            return result.estimated_height;
        } catch (error) {
            console.error("Height estimation error:", error);
            return null;
        }
    }
}

// ------------------------
// 12. MODULE EXPORT
// ------------------------
window.loadAnalytics = loadAnalytics;
