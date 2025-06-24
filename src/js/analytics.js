function loadAnalytics() {
    // Constants for magic numbers
    const OVERLAP_THRESHOLD = 0.5;    // Minimum overlap required to continue tracking
    const HEAD_ANGLE_MIN = 40;        // Minimum ideal head angle
    const HEAD_ANGLE_MAX = 120;       // Maximum ideal head angle
    const LEFT_SHOULDER_INDEX = 11;   // Landmark index for left shoulder
    const LEFT_KNEE_INDEX = 25;       // Landmark index for left knee
    const LEFT_HIP_INDEX = 23;        // Landmark index for left Hip
    const LEFT_ANKLE_INDEX = 27;      // Landmark index for left ankle
    const RIGHT_SHOULDER_INDEX = 12; 
    const RIGHT_KNEE_INDEX = 26;
    const RIGHT_HIP_INDEX = 24;       // Landmark index for Right Hip
    const RIGHT_ANKLE_INDEX = 28;     // Landmark index for right ankle
    const LEFT_EYE_INDEX = 1;         // Landmark index for left eye
    const MAX_SPEED = 5;
    const ACCELERATION_THRESHOLD = 0.5; // Threshold for acceleration changes
    const DECELERATION_THRESHOLD = 0.5;
    const JUMP_HEIGHT_BASELINE = 0.05; // Minimum height change to detect a jump
        
    // Encapsulating variables in an object to avoid global scope
    const appState = {
        postureCounts: {
            Running: 0,
            'Upright Standing': 0,
            Crouching: 0,
        },
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
        headAnglePerSecond: [], // Store head angles for each second
        currentSecond: 0, // Track the current second
        smoothedSpeed: 0,
        accelerationData: [],
        smoothedAccelerationData: [],
        decelerationData: [],
        smoothedDecelerationData: [],
        reactionTimeData: [],
        jumpHeights: [],
        stridelength: [],
        agilityData: [],
        balanceScore: [],
        landmarkHistory: [],
        score: [],
        athleteHeightInMeters: null,
        topSpeed: 0,
    };

    const uploadButton = document.getElementById('uploadButton');
    const analyzeButton = document.getElementById('analyzeButton');
    const videoElement = document.getElementById('uploaded-video');
    const canvasElement = document.getElementById('output_canvas');
    const canvasCtx = canvasElement.getContext('2d');
    const playProcessedButton = document.getElementById('playProcessedButton');
    const loadingOverlay = document.getElementById('analyzingIndicator');
    let currentChart = null; // Holds the active Chart instance
    let chartType = "radar"; // "radar" for pentagon, "line" for metrics
    
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
                    backgroundColor: "rgba(0, 123, 255, 0.2)",
                    borderColor: "#007bff",
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });

        chartType = "radar";
    }

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

        // Apply metric filter
        currentChart.data.datasets.forEach((dataset, index) => {
            dataset.hidden = !metricIndices.includes(index);
        });

        currentChart.update();
    }

    // Custom plugin to draw text in the center of the doughnut chart
    const centerLabelPlugin = {
        id: 'centerLabelPlugin',
        afterDraw(chart) {
            const { ctx, width, height } = chart;
            ctx.save();
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Set text based on chart type
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

    // Register the custom plugin
    Chart.register(centerLabelPlugin);
    
    const doughnutChart = new Chart(document.getElementById('myChart').getContext('2d'), {
           type: 'doughnut',
           data: {
               datasets: [
                   // Outer ring: Posture Distribution
                   {
                       data: [], // Running, Standing, Crouching
                       backgroundColor: ['#1E90FF', '#FFD700', '#A52A2A'],
                       borderWidth: 0
                   },
                   // Inner ring: Head Angle
                   {
                       data: [],
                       backgroundColor: ['#00ff00', '#FF2429'],
                       borderWidth: 0
                   }
               ],
               labels: [
                   'Running',
                   'Standing',
                   'Crouching',
                   'Ideal Head Angle',
                   'Not Ideal Head Angle'
               ]
           },
           options: {
               responsive: true,
               maintainAspectRatio: false,
               cutout: '70%',
               plugins: {
                   tooltip: {
                       callbacks: {
                           label: function (tooltipItem) {
                               const label = tooltipItem.label || '';
                               const value = Math.round(tooltipItem.raw || 0);
                               return `${label}: ${value}%`;
                           }
                       }
                   }
               }
           }
       });

    document.querySelectorAll('.card').forEach((card, index) => {
        card.addEventListener('click', () => {
            setTimeout(() => {
            if (card.classList.contains('is-flipped')) {
                if (index === 0) showUnifiedChart([0]); // Technique
                if (index === 1) showUnifiedChart([1, 2, 3]); // Speed & Movement
                if (index === 2) showUnifiedChart([4, 5]); // Footwork
            }
            }, 200);
        });
    });

    document.getElementById('showMetrics').addEventListener('click', () => {
        showPentagonChart();
        document.querySelectorAll('.card').forEach(card => card.classList.add('is-flipped'));
    });

    // UPLOAD BUTTON: Only select and preview video (no uploading or height estimation)
    uploadButton.addEventListener('change', (event) => {
        appState.videoFile = event.target.files[0];
        if (appState.videoFile) {
            const videoURL = URL.createObjectURL(appState.videoFile);
            videoElement.src = videoURL;
            videoElement.style.display = 'block';
            // Reset charts and analysis data for new video upload
            resetCharts();
            resetAnalysisData();
            // Ensure processed canvas and play button are hidden
            canvasElement.style.display = 'none';
            playProcessedButton.style.display = 'none';
        }
    });
    
    // -----------------------------
    // ANALYZE BUTTON: Process the temporary video file (no immediate uploading or DB save)
    analyzeButton.addEventListener('click', async (event) => {
        event.preventDefault();
    
        if (!appState.videoFile) {
            alert("Please upload a video file first.");
            return;
        }
    
        // Show loading overlay during processing
        loadingOverlay.style.display = 'block';
    
        // Execute height estimation (processing step) for analysis
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
        // Hide loading overlay once processing setup is complete
        loadingOverlay.style.display = 'none';
    
        // Hide the original video element and display the processed output canvas
        videoElement.style.display = 'none';
        canvasElement.style.display = 'block';
        playProcessedButton.style.display = 'block';
    
        // Reset video playback to the beginning and start processing
        videoElement.currentTime = 0;
        // Start processing frames (drawing on canvas with pose landmarks)
        processVideo(videoElement);
    
        // When processed video playback ends, trigger auto save of analytics
        videoElement.addEventListener('ended', () => {
            autoSaveAnalytics();
        });
    });
    
    // Play Processed Video button: allow user to start/restart playback of the processed output
    playProcessedButton.addEventListener('click', () => {
        videoElement.play();
        playProcessedButton.style.display = 'none';
        processVideo(videoElement);
    });

    // Initialize MediaPipe Pose (added to fix "pose is not defined")
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
    
    // -----------------------------
    // Process video: reads from hidden video element and draws frames (with pose analysis) onto the canvas
    function processVideo(videoEl) {
        let thumbnailCaptured = false;
        function processFrame() {
            if (videoEl.paused || videoEl.ended) return;
            
            canvasElement.width = videoEl.videoWidth;
            canvasElement.height = videoEl.videoHeight;
            canvasCtx.drawImage(videoEl, 0, 0, canvasElement.width, canvasElement.height);
            
            // Capture and save one frame as a thumbnail when video reaches ~2 sec
            if (!thumbnailCaptured && videoEl.currentTime >= 2) {
                saveThumbnail();
                thumbnailCaptured = true; // Prevent multiple captures
            }

            pose.send({ image: canvasElement }).then(() => {
                setTimeout(processFrame, 20); // Ensure smooth frame processing
            }).catch(error => console.error("Error processing frame:", error));
        }
    
        videoEl.addEventListener('play', processFrame);
    }

    // Function to save thumbnail as an image file
    function saveThumbnail() {
        canvasElement.toBlob(blob => {
            if (blob) {
                appState.thumbnailFile = new File([blob], "thumbnail.png", { type: "image/png" });
                console.log("Thumbnail captured successfully!");
            }
        }, "image/png");
    }

    // -----------------------------
    // Seek to a specific timestamp and display that frame on the canvas
    function seekToTimestamp(timestamp) {
        videoElement.pause();
        videoElement.currentTime = timestamp;
        videoElement.addEventListener('seeked', function() {
            canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        }, { once: true });
    }

    function calculateAverageJumpHeight() {
        if (!appState.jumpHeights.length) return 0;
        const sum = appState.jumpHeights.reduce((acc, j) => acc + j.height, 0);
        return sum / appState.jumpHeights.length;
    }
    
    function calculateAverageStrideLength() {
        if (!appState.stridelength.length) return 0;
        const sum = appState.stridelength.reduce((acc, s) => acc + s.length, 0);
        return sum / appState.stridelength.length;
    }
    
    function calculatePeakAcceleration() {
        return appState.accelerationData.length ? Math.max(...appState.accelerationData) : 0;
    }
    
    function calculatePeakDeceleration() {
        return appState.decelerationData.length ? Math.max(...appState.decelerationData) : 0;
    }
    
    // -----------------------------
    // Auto Save Analytics: Once processing is complete, save the video and analytics metadata
    async function autoSaveAnalytics() {
        try {
            const formData = new FormData();
            formData.append('video', appState.videoFile);
            formData.append('userId', localStorage.getItem('user_id'));
            if (appState.uploadDate){
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
    
    // -----------------------------
    // The rest of the functions (onResults, calculateDistance, analyzeFrame, etc.) remain as in the original code.
    // They process pose landmarks, update charts, and calculate metrics.
    
    function onResults(results) {
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        if (results.poseLandmarks) {
            if (!appState.landmarkHistory) {
                appState.landmarkHistory = [];
            }
            appState.landmarkHistory.push([...results.poseLandmarks]);
    
            const MAX_HISTORY_FRAMES = 100;
            if (appState.landmarkHistory.length > MAX_HISTORY_FRAMES) {
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
            const timeElapsedSinceLastFrame = (performance.now() - appState.previousFrameTime) / 1000;
            appState.previousFrameTime = performance.now();
    
            const eye = results.poseLandmarks[LEFT_EYE_INDEX];
            const leftShoulder = results.poseLandmarks[11];
            const rightShoulder = results.poseLandmarks[12];
            const avgShoulderX = (leftShoulder.x + rightShoulder.x) / 2;
            const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
            const distance = Math.sqrt(
                Math.pow(eye.x - avgShoulderX, 2) + Math.pow(eye.y - avgShoulderY, 2)
            );
            const baseDistance = 0.3;
            const scalingFactor = baseDistance / distance;
            const minScale = 0.5;
            const maxScale = 3;
            const effectiveScale = Math.min(maxScale, Math.max(minScale, scalingFactor));
            const lineWidth = effectiveScale * 1;
            const landmarkRadius = effectiveScale * 0.5;
    
            drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: 'white', lineWidth: lineWidth });
            drawLandmarks(canvasCtx, results.poseLandmarks, { color: 'red', lineWidth: landmarkRadius });
            
            const headAngle = calculateHeadAngle(results.poseLandmarks);
            console.log("Head angle data:", headAngle);
            if (headAngle >= 5) {
                appState.totalFrames++;
            }
            // Compute ideal head angle percentage
            const scores = appState.score || [];
            const averageAthleticScore = scores.length > 0
            ? scores.reduce((sum, val) => sum + val, 0) / scores.length
            : 0;
            const currentVideoTime = Math.floor(videoElement.currentTime);
            if (currentVideoTime > appState.currentSecond) {
                appState.currentSecond = currentVideoTime;
                appState.headAnglePerSecond.push(headAngle);
                showPentagonChart();
                // Update Line chart with all metrics
                if (!appState.chartLabels) appState.chartLabels = [];
                if (!appState.headAngleData) appState.headAngleData = [];
                if (!appState.speedData) appState.speedData = [];
                if (!appState.accelerationData) appState.accelerationData = [];
                if (!appState.decelerationData) appState.decelerationData = [];
                if (!appState.strideData) appState.strideData = [];
                if (!appState.jumpData) appState.jumpData = [];

                appState.chartLabels.push(appState.currentSecond);
                appState.headAngleData.push(appState.headAnglePerSecond);
                appState.speedData.push(appState.smoothedSpeed);

                const acc = appState.accelerationDataRaw?.at(-1) || 0;
                const dec = appState.decelerationDataRaw?.at(-1) || 0;
                const jump = appState.jumpHeights?.at(-1)?.height || 0;
                const stride = appState.stridelength?.at(-1)?.length || 0;

                appState.accelerationData.push(acc);
                appState.decelerationData.push(dec);
                appState.strideData.push(stride);
                appState.jumpData.push(jump);
                const speedThisSecond = appState.smoothedSpeed;
                if (isNaN(speedThisSecond) || speedThisSecond < 0) {
                    console.warn("Skipping invalid speed value:", speedThisSecond);
                }
            }
    
            if (headAngle >= HEAD_ANGLE_MIN && headAngle <= HEAD_ANGLE_MAX) {
                appState.idealHeadAngleFrames++;
            }
    
            if (results.poseLandmarks[LEFT_ANKLE_INDEX] && results.poseLandmarks[LEFT_EYE_INDEX]) {
                analyzeFrame(results.poseLandmarks, appState.athleteHeightInMeters, timeElapsedSinceLastFrame, posture, currentVideoTime, appState.totalDistance);
            }
    
            detectDrillStart(results.poseLandmarks);
            detectDrillEnd(results.poseLandmarks);
        } else {
            console.log("No landmarks detected");
        }
    }
       
    function updateDoughnutChart() {
        if (!doughnutChart) return;
       
        // INNER RING: Head angle (ideal vs not ideal)
        const idealPercentage = Math.round((appState.idealHeadAngleFrames / appState.totalFrames) * 100);
        doughnutChart.data.datasets[1].data = [
           idealPercentage,
           100 - idealPercentage
        ];
       
        // OUTER RING: Posture distribution
        const totalPosture = Object.values(appState.postureCounts).reduce((a, b) => a + b, 0) || 1;
        const running = Math.round((appState.postureCounts["Running"] || 0) / totalPosture * 100);
        const standing = Math.round((appState.postureCounts["Upright Standing"] || 0) / totalPosture * 100);
        const crouching = Math.round((appState.postureCounts["Crouching"] || 0) / totalPosture * 100);
       
        doughnutChart.data.datasets[0].data = [0, 0, running, standing, crouching];
        doughnutChart.update();
    }
       
    function updateMetricSliders() {
        const speed = Math.round(appState.smoothedSpeed) || 0;
        const accel = Math.round(appState.peakAcceleration) || 0;
        const decel = Math.round(appState.peakDeceleration) || 0;
        const jump = Math.round(calculateAverageJumpHeight()) || 0;
        const stride = Math.round(calculateAverageStrideLength()) || 0;

        // SPEED & MOVEMENT
        document.getElementById("speedValue").innerText = speed;
        document.getElementById("speed").value = speed;

        document.getElementById("accelerationValue").innerText = accel;
        document.getElementById("acceleration").value = accel;

        document.getElementById("decelerationValue").innerText = decel;
        document.getElementById("deceleration").value = decel;

        // FOOTWORK
        document.querySelector(".value").innerText = jump;
        document.getElementById("jumpheight").value = jump;

        document.querySelector(".value1").innerText = stride;
        document.getElementById("strideleng").value = stride;
    }

    function lockOnAthlete(landmarks) {
        appState.athleteBoundingBox = calculateBoundingBox(landmarks);
        appState.athleteLocked = true;
        console.log("Locked onto athlete");
    }
    
    function isAthleteInFrame(currentLandmarks) {
        const currentBoundingBox = calculateBoundingBox(currentLandmarks);
        const overlapX = Math.max(0, Math.min(appState.athleteBoundingBox.maxX, currentBoundingBox.maxX) - Math.max(appState.athleteBoundingBox.minX, currentBoundingBox.minX));
        const overlapY = Math.max(0, Math.min(appState.athleteBoundingBox.maxY, currentBoundingBox.maxY) - Math.max(appState.athleteBoundingBox.minY, currentBoundingBox.minY));
        const overlapArea = overlapX * overlapY;
        const athleteArea = (appState.athleteBoundingBox.maxX - appState.athleteBoundingBox.minX) * (appState.athleteBoundingBox.maxY - appState.athleteBoundingBox.minY);
        return overlapArea / athleteArea >= OVERLAP_THRESHOLD;
    }
    
    function calculateBoundingBox(landmarks) {
        let minX = Math.min(...landmarks.map(l => l.x));
        let maxX = Math.max(...landmarks.map(l => l.x));
        let minY = Math.min(...landmarks.map(l => l.y));
        let maxY = Math.max(...landmarks.map(l => l.y));
        return { minX, maxX, minY, maxY };
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
        const angle = Math.acos(cosineAngle) * (180 / Math.PI);
        return angle;
    }
    
    function detectPosture(landmarks) {
        if (!landmarks) return "Unknown";

        // Helper to average angle between left and right sides
        const avgAngle = (left, right) => (left + right) / 2;

        const leftKnee = calculateAngle(
            landmarks[LEFT_HIP_INDEX],
            landmarks[LEFT_KNEE_INDEX],
            landmarks[LEFT_ANKLE_INDEX]
        );
        const rightKnee = calculateAngle(
            landmarks[RIGHT_HIP_INDEX],
            landmarks[RIGHT_KNEE_INDEX],
            landmarks[RIGHT_ANKLE_INDEX]
        );
        const kneeAngle = avgAngle(leftKnee, rightKnee);

        const leftHip = calculateAngle(
            landmarks[LEFT_SHOULDER_INDEX],
            landmarks[LEFT_HIP_INDEX],
            landmarks[LEFT_KNEE_INDEX]
        );
        const rightHip = calculateAngle(
            landmarks[RIGHT_SHOULDER_INDEX],
            landmarks[RIGHT_HIP_INDEX],
            landmarks[RIGHT_KNEE_INDEX]
        );
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

        // === Decision logic ===
        if (
            kneeAngle >= 30 && kneeAngle <= 45 &&
            hipAngle >= 20 && hipAngle <= 30 &&
            torsoAngle >= 10 && torsoAngle <= 20
        ) {
            return "Crouching";
        }
        if (
            kneeAngle >= 20 && kneeAngle <= 30 &&
            hipAngle >= 15 && hipAngle <= 25 &&
            torsoAngle >= 5 && torsoAngle <= 15
        ) {
            return "Running";
        }
        if (
            kneeAngle >= 10 && kneeAngle <= 25 &&
            torsoAngle >= 75 && torsoAngle <= 90
        ) {
            return "Standing";
        }
        return "Running"; // fallback
    }

    
    function normalize(value, min, max) {
        return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
    }
    
    function calculateAthleticScores(posture) {
        const footworkScore = calculateFootworkScore();
        const speedScore = normalize(appState.smoothedSpeed, 0, 15);
        const accelArray = appState.smoothedAccelerationData || [];
        const avgAccel = accelArray.length ? accelArray.reduce((a, b) => a + b, 0) / accelArray.length : 0;
        const accelerationScore = normalize(avgAccel, -5, 20);
        const headAngleScore = normalize(appState.idealHeadAngleFrames, 45, 90);
        const postureScore = posture === "Crouching" ? 90 : posture === "Upright Standing" ? 80 : 50;
        return [footworkScore, speedScore, accelerationScore, headAngleScore, postureScore];
    }
    
    function calculateFootworkScore() {
        const totalMovements = analyzeFootMovements(appState.landmarkHistory);
        return normalize(totalMovements, 0, 100);
    }
    
    function analyzeFootMovements(landmarkHistory) {
        const footLandmarks = [LEFT_ANKLE_INDEX, RIGHT_ANKLE_INDEX];
        let movementCount = 0;
    
        for (let i = 1; i < landmarkHistory.length; i++) {
            const prevFrame = landmarkHistory[i - 1];
            const currFrame = landmarkHistory[i];
    
            if (!prevFrame || !currFrame) {
                console.warn(`Skipping frame ${i}: Invalid frame data.`);
                continue;
            }
    
            let frameMovementCount = 0;
    
            for (const footIndex of footLandmarks) {
                const prevPos = prevFrame[footIndex];
                const currPos = currFrame[footIndex];
    
                if (!prevPos || !currPos || prevPos.x === undefined || currPos.x === undefined) {
                    console.warn(`Skipping foot ${footIndex} in frame ${i}: Invalid foot landmark data.`);
                    continue;
                }
    
                if (Math.abs(currPos.x - prevPos.x) > 0.01 || Math.abs(currPos.y - prevPos.y) > 0.01) {
                    frameMovementCount++;
                }
            }
    
            movementCount += frameMovementCount;
        }
    
        return movementCount;
    }
    
    async function estimateHeight(videoFile) {
        const formData = new FormData();
        formData.append('video', videoFile);
        try {
            const response = await fetch('https://uploaded-data-443715.uc.r.appspot.com/estimate_height', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (data.estimated_height) {
                return data.estimated_height;
            } else {
                console.error('Error estimating height:', data.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Error during height estimation:', error);
        }
    }
    
    function calculateScaleFactor(landmarks, athleteHeightInMeters) {
        const headPosition = landmarks[LEFT_EYE_INDEX];
        const anklePosition = landmarks[LEFT_ANKLE_INDEX];
        const heightInFrame = Math.sqrt(Math.pow(headPosition.x - anklePosition.x, 2) + Math.pow(headPosition.y - anklePosition.y, 2));
        
        if (heightInFrame <= 0) {
            console.error("Invalid frame height detected. Scale factor calculation skipped.");
            return null;
        }
        return athleteHeightInMeters / heightInFrame;
    }
    
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
        console.log(`Scale Factor: ${scaleFactor}`);
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
        const averageSpeed = appState.totalDistance / appState.totalTime;
        const timeElapsedSinceStart = (currentTime - appState.startTime) / 1000;
        console.log(`Speed: ${averageSpeed.toFixed(2)} yards/s`);
        console.log(`Top Speed: ${appState.topSpeed.toFixed(2)} yards/s`);
        console.log(`Distance: ${(appState.totalDistance * 1.09361).toFixed(2)} yards`);
        console.log(`Time: ${timeElapsedSinceStart.toFixed(2)} seconds`);
    }

    function analyzeFrame(landmarks, athleteHeightInMeters, timeElapsedSinceLastFrame, posture, currentVideoTime, distanceCovered) {
        if (!landmarks || landmarks.length === 0 || !athleteHeightInMeters) {
            console.log("No landmarks or height data available.");
            return;
        }
        calculateDistance(landmarks, athleteHeightInMeters);
        detectJumps(landmarks);
        calculatestride(landmarks);
        updateDoughnutChart();
        updateMetricSliders();
        calculateSteps(landmarks);
        const acceleration = calculateAcceleration(appState.speedData, timeElapsedSinceLastFrame);
        if (!isNaN(acceleration) && Math.abs(acceleration) > ACCELERATION_THRESHOLD) {
            appState.accelerationData.push(acceleration);

        }

        const deceleration = calculateDeceleration(appState.speedData, timeElapsedSinceLastFrame);
        if (!isNaN(deceleration) && Math.abs(deceleration) > DECELERATION_THRESHOLD) {
            appState.accelerationData.push(deceleration);
        }

        const scores = calculateAthleticScores(posture);
        [
            appState.footworkScore,
            appState.speedScore,
            appState.accelerationScore,
            appState.headAngleScore,
            appState.postureScore
        ] = scores;

        console.log("Athletic scores:", scores);
        const invalidScores = scores.filter(score => isNaN(score));
        if (invalidScores.length > 0) {
            console.error("Invalid athletic scores detected:", invalidScores);
        }
    
        if (scores.every(score => !isNaN(score))) {
            appState.score.push(scores);
        } else {
            console.error("Invalid athletic scores, skipping chart update.");
        }
        const averageAthleticScore = scores.length > 0
        ? scores.reduce((sum, val) => sum + val, 0) / scores.length
        : 0;
        document.getElementById('drillTimeValue').textContent = `${currentVideoTime.toFixed(1)} SECS`;
        document.getElementById('distanceValue').textContent = `${distanceCovered.toFixed(1)} YARDS`;
        document.getElementById('stepsValue').textContent = `${appState.stepCount}`; 
        document.getElementById('athleticScoreValue').textContent = `${averageAthleticScore.toFixed(1)}%`;
    }
    
    function movingAverage(data, windowSize) {
        let smoothedaccData = [];
        for (let i = 0; i < data.length; i++) {
            let start = Math.max(0, i - Math.floor(windowSize / 2));
            let end = Math.min(data.length, i + Math.floor(windowSize / 2));
            let window = data.slice(start, end);
            let avg = window.reduce((sum, val) => sum + val, 0) / window.length;
            smoothedaccData.push(avg);
        }
        return smoothedaccData;
    }
    
    appState.smoothedAccelerationData = movingAverage(appState.accelerationData, 10);
    appState.smoothedDecelerationData = movingAverage(appState.decelerationData, 10);

    function detectDrillStart(landmarks) {
        const leftAnkle = landmarks[LEFT_ANKLE_INDEX];
        const rightAnkle = landmarks[RIGHT_ANKLE_INDEX];
        const avgAnkleX = (leftAnkle.x + rightAnkle.x) / 2;
        const avgAnkleY = (leftAnkle.y + rightAnkle.y) / 2;
        const distanceMoved = Math.sqrt(
            Math.pow(avgAnkleX - appState.previousLegPosition.x, 2) +
            Math.pow(avgAnkleY - appState.previousLegPosition.y, 2)
        );
    
        const movementThreshold = 0.18;
        if (!appState.isDrillActive && distanceMoved > movementThreshold) {
            appState.isDrillActive = true;
            const responseTime = performance.now();
            if (appState.cueTime) {
                const reactionTime = responseTime - appState.cueTime;
                appState.reactionTimeData.push(reactionTime);
            }
            console.log("Drill started");
        }
        appState.previousLegPosition = { x: avgAnkleX, y: avgAnkleY };
    }
    
    function detectDrillEnd() {
        appState.endTime = performance.now();
        appState.totalTime = (appState.endTime - appState.startTime) / 1000;
        appState.isDrillActive = false;
        console.log(`Drill Time: ${appState.totalTime}, Start Time: ${appState.startTime}`)
    }
    
    function calculateAcceleration(speedData, deltaTime) {
        if (speedData.length < 2 || deltaTime <= 0) return 0;
        const latestSpeed = speedData[speedData.length - 1];
        const previousSpeed = speedData[speedData.length - 2];
        return (latestSpeed - previousSpeed) / deltaTime;
    }

    function calculateDeceleration(speedData, deltaTime) {
        if (speedData.length < 2 || deltaTime <= 0) return 0;
        const latestSpeed = speedData[speedData.length - 1];
        const previousSpeed = speedData[speedData.length - 2];
        return (previousSpeed - latestSpeed) / deltaTime;
    }
    function calculateSteps(landmarks){
        const leftFootY = landmarks[LEFT_ANKLE_INDEX].y;
        const rightFootY = landmarks[RIGHT_ANKLE_INDEX].y;
        const footDistance = Math.abs(leftFootY - rightFootY);

        // Detect step when feet switch significantly
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
        if (stridedistance > 0.01) { // reduce threshold to capture smaller valid strides
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
    
    function resetCharts() {
        // Reset doughnut chart (posture)
        if (typeof doughnutChart !== 'undefined' && doughnutChart) {
            doughnutChart.data.datasets[0].data = [0, 0, 0]; // running, standing, crouching
            doughnutChart.data.datasets[1].data = [0, 100]; // head angle
            doughnutChart.update();
        }

        // Clear all chart-related appState arrays
        appState.chartLabels = [];
        appState.headAngleData = [];
        appState.speedData = [];
        appState.accelerationData = [];
        appState.decelerationData = [];
        appState.strideData = [];
        appState.jumpData = [];

        // If a chart is currently rendered, clear it visually
        if (typeof currentChart !== 'undefined' && currentChart) {
            currentChart.destroy();
            currentChart = null;
        }
    }
    
    function resetAnalysisData() {
        appState.previousLegPosition = { x: 0, y: 0 };
        appState.idealHeadAngleFrames = 0;
        appState.totalFrames = 0;
        appState.totalDistance = 0;
        appState.isDrillActive = false;
        appState.athleteLocked = false;
        appState.athleteBoundingBox = null;
        appState.startTime = null;
        appState.endTime = null;
        appState.totalTime = 0;
        appState.previousFrameTime = null;
        appState.speedData = [];
        appState.headAnglePerSecond = [];
        appState.currentSecond = 0;
        appState.accelerationData = [];
        appState.decelerationData = [];
        appState.reactionTimeData = [];
        appState.jumpHeights = [];
        appState.stridelength = [];
        appState.agilityData = [];
        appState.balanceScore = [];
        appState.postureCounts = {
            Running: 0,
            'Upright Standing': 0,
            Crouching: 0,
        };
        console.log("Analysis data and charts reset");
    }

  // Done
  console.log("Analytics module loaded");
}

window.loadAnalytics = loadAnalytics;

