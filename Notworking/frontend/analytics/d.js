// Constants for magic numbers
const OVERLAP_THRESHOLD = 0.5;    // Minimum overlap required to continue tracking
const HEAD_ANGLE_MIN = 40;        // Minimum ideal head angle
const HEAD_ANGLE_MAX = 120;       // Maximum ideal head angle
const LEFT_SHOULDER_INDEX = 11;   // Landmark index for left shoulder
const LEFT_KNEE_INDEX = 25;       // Landmark index for left knee
const LEFT_HIP_INDEX = 23;        // Landmark index for left Hip
const LEFT_ANKLE_INDEX = 27;      // Landmark index for left ankle
const RIGHT_HIP_INDEX = 24;       // Landmark index for Right Hip
const RIGHT_ANKLE_INDEX = 28;     // Landmark index for right ankle
const LEFT_EYE_INDEX = 1;         // Landmark index for left eye
const MAX_SPEED = 5;
const ACCELERATION_THRESHOLD = 0.5; // Threshold for acceleration changes
const JUMP_HEIGHT_BASELINE = 0.01; // Minimum height change to detect a jump
       
// Encapsulating variables in an object to avoid global scope
const appState = {
    videoFile: null,
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
    smoothedSpeed: [],
    accelerationData: [],
    smoothedAccelerationData: [],
    reactionTimeData: [],
    jumpHeights: [],
    agilityData: [],
    balanceScore: [],
    landmarkHistory: [],
    score: 0
};

// Wait for the DOM to load
document.addEventListener('DOMContentLoaded', function() {
    const uploadButton = document.getElementById('uploadButton');
    const analyzeButton = document.getElementById('analyzeButton');
    const videoElement = document.getElementById('uploaded-video');
    const canvasElement = document.getElementById('output_canvas');
    const canvasCtx = canvasElement.getContext('2d');

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

    // Initialize the histogram with a frequency polygon for speed
    const speedHistogramChart = new Chart(document.getElementById('speedHistogramChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: [],  // X-axis labels (seconds)
            datasets: [
                {
                    label: 'Speed Frequency',  // Histogram data
                    data: [],  // Speed values per second
                    backgroundColor: 'rgba(0, 123, 255, 0.5)',  // Color for bars
                    borderWidth: 1,
                    categoryPercentage: 1.0,
                    barPercentage: 1.0
                },
                {
                    label: 'Speed Trend',  // Frequency polygon overlay
                    data: [],  // Same data points but connected with a line
                    type: 'line',
                    borderColor: '#FF5733',  // Line color for the frequency polygon
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Time (seconds)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Speed (yards/second)'
                    },
                    beginAtZero: true
                }
            }
        }
    });

    // Chart.js setup for the speed Progress Chart
    const speedProgressChart = new Chart(document.getElementById('speedometerChart').getContext('2d'), {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [0, MAX_SPEED],
                backgroundColor: ['#00ff00', '#D3D3D3']
            }],
            labels: ['Top Speed', 'Range']
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (tooltipItem) => {
                            return tooltipItem.label + ': ' + Math.round(tooltipItem.raw) + ' yards/sec';
                        }
                    }
                }
            }
        }
    });
    
    const headAngleChart = new Chart(document.getElementById('headMovementChart').getContext('2d'), {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [0, 100],
                backgroundColor: ['#00ff00', '#FF2429']
            }],
            labels: ['Ideal Head Angle', 'Not Ideal Head Angle']
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (tooltipItem) => {
                            return tooltipItem.label + ': ' + Math.round(tooltipItem.raw) + '%';
                        }
                    }
                }
            }
        }
    });
       
    // Initialize the line chart for head angle tracking
    const headAngleLineChart = new Chart(document.getElementById('headAngleLineChart').getContext('2d'), {
        type: 'line',
        data: {
            labels: [], // X-axis labels (seconds)
            datasets: [{
                label: 'Head Angle (degrees)',
                data: [], // Data points for head angle per second
                borderColor: '#00ff00',
                fill: false,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Time (seconds)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Head Angle (degrees)'
                    },
                    suggestedMin: 0,
                    suggestedMax: 180
                }
            },
            plugins: {
                annotation: {
                    annotations: {
                        idealLine: {
                            type: 'line',
                            yMin: 45,
                            yMax: 45,
                            borderColor: 'red',
                            borderWidth: 2,
                            label: {
                                content: 'Ideal Head Angle',
                                enabled: true,
                                position: 'start',
                                backgroundColor: 'rgba(255, 0, 0, 0.2)',
                            }
                        }
                    }
                }
            }
        }
    });

    // Additional chart for acceleration visualization
    const accelerationChart = new Chart(document.getElementById('accelerationChart').getContext('2d'), {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Acceleration (yards/s²)',
                data: appState.smoothedAccelerationData.map((y, i) => ({ x: i, y })),
                backgroundColor: 'yellow',
                borderColor: 'orange',
                pointRadius: 2,
                borderWidth: 2,
                showLine: true, // Draw lines to make the chart smooth
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: { title: { display: true, text: 'Time (seconds)' } },
                y: { title: { display: true, text: 'Acceleration (yards/s²)' } }
            }
        }
    });

    const atheleticscorechart = new Chart(document.getElementById('athleticScoreChart').getContext('2d'), {
        type: 'radar',
        data: {
            labels: ['Footwork', 'Speed', 'Acceleration', 'Head Angle', 'Posture'],
            datasets: [{
                label: 'Athletic Score',
                data: [],
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
            }],
        },
        options: {
            responsive: true,
            scales: {
                r: {
                    angleLines: { display: true },
                    suggestedMin: 0,
                    suggestedMax: 100,
                },
            },
            plugins: {
                legend: { display: false },
            },
        },
    });

    // Log jump data before initializing the chart
    let jumpData = appState.jumpHeights.map((jump, index) => ({
        x: jump.time, // Timestamp when jump occurred
        y: jump.height // Height of the jump
    }));
    
    // Ensure the target canvas element exists
    const chartElement = document.getElementById('jumpHeightChart');
    if (!chartElement) {
        console.error("Canvas element with ID 'jumpHeightChart' not found.");
    }
    
    // Chart for jump height visualization
    const jumpHeightChart = new Chart(chartElement.getContext('2d'), {
        type: 'bar',
        data: {
            datasets: [{
                label: 'Jump Height (yards)',
                data: jumpData, // Initial jump data
                backgroundColor: 'blue',
                borderColor: 'blue',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'linear', // Linear scale for time
                    title: { display: true, text: 'Time (seconds)' },
                    ticks: { stepSize: 1 }
                },
                y: {
                    title: { display: true, text: 'Jump Height (yards)' },
                    beginAtZero: true
                }
            }
        }
    });
    
    // Handle file upload
    uploadButton.addEventListener('change', async (event) => {
        // Get the uploaded video file and set it to the video element
        appState.videoFile = event.target.files[0];
        const videoURL = URL.createObjectURL(appState.videoFile);
        videoElement.src = videoURL;
        videoElement.style.display = 'block';
        
        // Reset charts and analysis data for new video upload
        resetCharts();
        resetAnalysisData();
        
        // Show loading animation
        showLoadingAnimationHEML();

        // Step 1: Upload Video
        const formData = new FormData();
        formData.append('video', appState.videoFile);
        formData.append('userId', localStorage.getItem('user_id'));
        const uploadResponse = await fetch('http://127.0.0.1:5000/upload', {
            method: 'POST',
            body: formData,
        });

        try {
            // Get estimated height
            const estimatedHeight = await estimateHeight(appState.videoFile);
            if (estimatedHeight) {
                console.log(`Estimated height received: ${estimatedHeight} meters`);
                appState.athleteHeightInMeters = estimatedHeight;
            } else {
                console.error("Height estimation failed.");
                return;
            }

        } catch (error) {
            console.error("Error during height estimation:", error);
        } finally {
            // Hide loading animation once height is fetched or on error
            hideLoadingAnimationHEML();
        } 
        // Confirmation once the video is loaded
        videoElement.onloadeddata = () => {
            console.log("Video loaded successfully");
        };
    });

    // Prevent form submission and process video on click
    analyzeButton.addEventListener('click', async (event) => {
        event.preventDefault();
    
        if (!appState.videoFile) {
            alert("Please upload a video file first.");
            return;
        }

        // Record cue time (analysis start time)
        appState.cueTime = performance.now();
        console.log("Cue time recorded:", appState.cueTime);
    
        // Start video processing
        processVideo(videoElement);

        try {
            // Save analytics to backend
            const response = await fetch('http://127.0.0.1:5000/saveAnalytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoId, // Use videoId from the upload step
                    idealHeadPercentage,
                    topSpeed,
                }),
            });

            if (!response.ok) throw new Error('Failed to save analytics.');

            const result = await response.json();
            console.log('Analytics saved successfully:', result);
            alert('Analytics saved successfully!');
        } catch (error) {
            console.error('Error saving analytics:', error);
            alert('An error occurred while saving analytics.');
        }
        
    });    

    // Initialize MediaPipe Pose
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

    // Show loading overlay
    function showLoadingAnimationHEML() {
        const overlay = document.getElementById('loadingOverlayHEML');
        overlay.style.display = 'flex'; // Show overlay and make page un-interactable
    }

    // Hide loading overlay
    function hideLoadingAnimationHEML() {
        const overlay = document.getElementById('loadingOverlayHEML');
        overlay.style.display = 'none'; // Hide overlay
    }

    // Process video
    function processVideo(videoElement) {
        videoElement.addEventListener('play', () => {
            const analyzeFrame = () => {
                if (!videoElement.paused && !videoElement.ended) {
                    canvasElement.width = videoElement.videoWidth;
                    canvasElement.height = videoElement.videoHeight;
                    canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

                    pose.send({ image: canvasElement })
                        .then(() => requestAnimationFrame(analyzeFrame))
                        .catch(error => console.error("Error sending frame to Pose model:", error));
                }
            };
            analyzeFrame();
        });
    }

    // Inside the onResults function
    function onResults(results) {
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        if (results.poseLandmarks) {
            // console.log("Pose Landmarks:", results.poseLandmarks);
            if (!appState.landmarkHistory) {
                appState.landmarkHistory = [];
            }
            // Add the current frame's landmarks
            appState.landmarkHistory.push([...results.poseLandmarks]);

            // Limit history size to avoid memory overflow
            const MAX_HISTORY_FRAMES = 100; // Adjust based on your requirements
            if (appState.landmarkHistory.length > MAX_HISTORY_FRAMES) {
                appState.landmarkHistory.shift();
            }
            const posture = detectPosture(results.poseLandmarks)
            document.getElementById("postureDisplay").textContent = `Posture: ${posture}`;

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
            const timeElapsedSinceLastFrame = (performance.now() - appState.previousFrameTime) / 1000; // Calculate time interval
            appState.previousFrameTime = performance.now(); // Update frame time for the next calculation
            // Calculate the scaling factor based on the distance between two landmarks
            const eye = results.poseLandmarks[LEFT_EYE_INDEX];
            const leftShoulder = results.poseLandmarks[11]; // Assuming 12 is the left shoulder landmark
            const rightShoulder = results.poseLandmarks[12]; // Assuming 11 is the right shoulder landmark
            // Calculate the average shoulder position
            const avgShoulderX = (leftShoulder.x + rightShoulder.x) / 2;
            const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
            // Calculate distance between eye and left shoulder as an example
            const distance = Math.sqrt(
                Math.pow(eye.x - avgShoulderX, 2) + Math.pow(eye.y - avgShoulderY, 2)
            );
    
            // Set a base distance for when the athlete is "close"
            const baseDistance = 0.3; // Adjust this base distance if needed
            const scalingFactor = baseDistance / distance;
    
            // Define min and max scaling factors to avoid extreme values
            const minScale = 0.5;
            const maxScale = 3;
            const effectiveScale = Math.min(maxScale, Math.max(minScale, scalingFactor));
    
            // Adjust connector line width and landmark radius dynamically
            const lineWidth = effectiveScale * 1; // Adjust multiplier as needed
            const landmarkRadius = effectiveScale * 0.5; // Adjust multiplier as needed
    
            // Draw connectors and landmarks with dynamic size
            drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: 'white', lineWidth: lineWidth });
            drawLandmarks(canvasCtx, results.poseLandmarks, { color: 'red', lineWidth: landmarkRadius });

            // Calculate head angle and update charts
            const headAngle = calculateHeadAngle(results.poseLandmarks); 
            console.log("Head angle data:", headAngle);
            if (headAngle >= 5) {
                appState.totalFrames++;
            }
            
            // Use video playback time for current second tracking
            const currentVideoTime = Math.floor(videoElement.currentTime); // Whole seconds of video time

            if (currentVideoTime > appState.currentSecond) {
                appState.currentSecond = currentVideoTime;

                // Update head angle chart
                appState.headAnglePerSecond.push(headAngle);
                headAngleLineChart.data.labels.push(appState.currentSecond);
                headAngleLineChart.data.datasets[0].data.push(headAngle);
                headAngleLineChart.update();

                // Update speed histogram and frequency polygon
                const speedThisSecond = appState.smoothedSpeed;
                if (!isNaN(speedThisSecond) && speedThisSecond >= 0) {
                    speedHistogramChart.data.labels.push(appState.currentSecond);
                    speedHistogramChart.data.datasets[0].data.push(speedThisSecond);
                    speedHistogramChart.data.datasets[1].data.push(speedThisSecond);
                    speedHistogramChart.update();
                } else {
                    console.warn("Skipping invalid speed value for histogram:", speedThisSecond);
                }
            }

            if (headAngle >= HEAD_ANGLE_MIN && headAngle <= HEAD_ANGLE_MAX) {
                appState.idealHeadAngleFrames++;
            }
            
            // Call analyzeFrame only if required landmarks are available
            if (results.poseLandmarks[LEFT_ANKLE_INDEX] && results.poseLandmarks[LEFT_EYE_INDEX]) {
                analyzeFrame(results.poseLandmarks, appState.athleteHeightInMeters, timeElapsedSinceLastFrame, posture);
            }           

            // Detect the start and end of the drill
            detectDrillStart(results.poseLandmarks);
            detectDrillEnd(results.poseLandmarks);
        } else {
            console.log("No landmarks detected");
        }
    }

    // Lock onto athlete
    function lockOnAthlete(landmarks) {
        appState.athleteBoundingBox = calculateBoundingBox(landmarks);
        appState.athleteLocked = true;
        console.log("Locked onto athlete");
    }

    // Check if current person in frame matches the locked athlete's bounding box
    function isAthleteInFrame(currentLandmarks) {
        const currentBoundingBox = calculateBoundingBox(currentLandmarks);

        const overlapX = Math.max(0, Math.min(appState.athleteBoundingBox.maxX, currentBoundingBox.maxX) - Math.max(appState.athleteBoundingBox.minX, currentBoundingBox.minX));
        const overlapY = Math.max(0, Math.min(appState.athleteBoundingBox.maxY, currentBoundingBox.maxY) - Math.max(appState.athleteBoundingBox.minY, currentBoundingBox.minY));

        const overlapArea = overlapX * overlapY;
        const athleteArea = (appState.athleteBoundingBox.maxX - appState.athleteBoundingBox.minX) * (appState.athleteBoundingBox.maxY - appState.athleteBoundingBox.minY);

        // Ensure at least 50% overlap to continue tracking
        return overlapArea / athleteArea >= OVERLAP_THRESHOLD;
    }

    function calculateBoundingBox(landmarks) {
        let minX = Math.min(...landmarks.map(l => l.x));
        let maxX = Math.max(...landmarks.map(l => l.x));
        let minY = Math.min(...landmarks.map(l => l.y));
        let maxY = Math.max(...landmarks.map(l => l.y));
        return { minX, maxX, minY, maxY };
    }

    // Calculate the head angle based on landmarks
    function calculateHeadAngle(landmarks) {
        const leftEye = landmarks[3];
        const rightEye = landmarks[6];
        const leftShoulder = landmarks[12];
        const rightShoulder = landmarks[13];

        const headPositionX = (leftEye.x + rightEye.x) / 2;
        const headPositionY = (leftEye.y + rightEye.y) / 2;
        const shoulderPositionX = (leftShoulder.x + rightShoulder.x) / 2
        const shoulderPositionY = (leftShoulder.y + rightShoulder.y) / 2;

        const deltaX = shoulderPositionX - headPositionX;
        const deltaY = shoulderPositionY - headPositionY;
        const headAngle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

        return headAngle; // Ensure positive angle
    }

    // Show head angle chart at the end
    function showHeadAngleChart() {
        const idealPercentage = Math.round((appState.idealHeadAngleFrames / appState.totalFrames) * 100); // Round the percentage
        headAngleChart.data.datasets[0].data[0] = idealPercentage; // Update ideal percentage
        headAngleChart.data.datasets[0].data[1] = 100 - idealPercentage; // Update not ideal percentage
        headAngleChart.update();
        console.log("Head angle analysis complete");
    }

    function calculateAngle(pointA, pointB, pointC) {
        const vectorAB = { x: pointB.x - pointA.x, y: pointB.y - pointA.y };
        const vectorBC = { x: pointC.x - pointB.x, y: pointC.y - pointB.y };
    
        const dotProduct = (vectorAB.x * vectorBC.x) + (vectorAB.y * vectorBC.y);
        const magnitudeAB = Math.sqrt(vectorAB.x ** 2 + vectorAB.y ** 2);
        const magnitudeBC = Math.sqrt(vectorBC.x ** 2 + vectorBC.y ** 2);
    
        const cosineAngle = dotProduct / (magnitudeAB * magnitudeBC);
        const angle = Math.acos(cosineAngle) * (180 / Math.PI); // Convert radians to degrees
        return angle;
    }

    function detectPosture(landmarks) {
        const kneeAngle = calculateAngle(
            landmarks[LEFT_HIP_INDEX], 
            landmarks[LEFT_KNEE_INDEX], 
            landmarks[LEFT_ANKLE_INDEX]
        );
    
        const hipAngle = calculateAngle(
            landmarks[LEFT_SHOULDER_INDEX], 
            landmarks[LEFT_HIP_INDEX], 
            landmarks[LEFT_KNEE_INDEX]
        );

        const torsoAngle = calculateAngle(
            landmarks[LEFT_HIP_INDEX], 
            landmarks[LEFT_SHOULDER_INDEX], 
            { x: landmarks[LEFT_SHOULDER_INDEX].x, y: landmarks[LEFT_SHOULDER_INDEX].y - 1 } // Simulating upright vector
        );
    
        // Determine posture
        if (kneeAngle < 10 && torsoAngle > 80) {
            return "Upright Standing";
        } else if (kneeAngle >= 25 && kneeAngle <= 45 && torsoAngle >= 10 && torsoAngle <= 40) {
            return "Crouching";
        } else if (kneeAngle >= 15 && kneeAngle <= 20 && torsoAngle >= 85 && torsoAngle <= 90) {
            return "Throwing Stance";
        } else if (kneeAngle >= 20 && kneeAngle <= 30 && torsoAngle >= 5 && torsoAngle <= 10) {
            return "Reactive Stance";
        } else {
            return "Running";
        }
    }

    // Helper function to normalize a value between 0 and 100
    function normalize(value, min, max) {
        return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
    }

    // Function to calculate Athletic Score parameters
    function calculateAthleticScores(posture) {
        // 1. Footwork: Analyze quick foot movements (requires additional logic)
        const footworkScore = calculateFootworkScore();

        // 2. Speed: Based on distance covered per second
        const speedScore = normalize(appState.smoothedSpeed, 0, 15); // Normalize to a range of 0-13 yards/second

        // 3. Acceleration: Based on calculateAcceleration function
        const accelerationScore = normalize( appState.smoothedAccelerationData, -5, 20); // Normalize to 0-5 m/s²

        // 4. Head Angle: Based on head angle calculations
        const headAngleScore = normalize(appState.idealHeadAngleFrames, 45, 90); // Optimal range 10-45 degrees

        // 5. Posture: Based on detectPosture output
        const postureScore = posture === "Crouching" ? 90 : posture === "Upright Standing" ? 80 : 50;

        // Return scores as an array
        return [footworkScore, speedScore, accelerationScore, headAngleScore, postureScore];
    }

    // Function to calculate footwork score (new logic)
    function calculateFootworkScore() {
        // Analyze foot landmarks (e.g., Mediapipe pose landmarks for feet)
        const totalMovements = analyzeFootMovements(appState.landmarkHistory);
        return normalize(totalMovements, 0, 100); // Adjust range based on observations
    }

    // Function to analyze foot movements (placeholder logic)
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

            // Check movements for both feet in the current frame
            for (const footIndex of footLandmarks) {
                const prevPos = prevFrame[footIndex];
                const currPos = currFrame[footIndex];

                if (!prevPos || !currPos || prevPos.x === undefined || currPos.x === undefined) {
                    console.warn(`Skipping foot ${footIndex} in frame ${i}: Invalid foot landmark data.`);
                    continue;
                }

                // Count significant movements
                if (Math.abs(currPos.x - prevPos.x) > 0.01 || Math.abs(currPos.y - prevPos.y) > 0.01) {
                    frameMovementCount++;
                }
            }

            // Add the frame's movement count to the total
            movementCount += frameMovementCount;
        }
    
        return movementCount;
    }

    async function estimateHeight(videoFile) {
        const formData = new FormData();
        formData.append('video', videoFile);
    
        const response = await fetch('http://127.0.0.1:5500/estimate_height', {
            method: 'POST',
            body: formData
        });
    
        const data = await response.json();
        if (data.estimated_height) {
            // Use the estimated height in meters
            const athleteHeightInMeters = data.estimated_height;
            return athleteHeightInMeters;
        } else {
            console.error('Error estimating height:', data.error);
        }
    }

    // Function to calculate the scale factor based on the athlete's height
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
    
    // Function to calculate the scale factor based on the athlete's height  
    function calculateDistance(landmarks, athleteHeightInMeters) {
        // Check that landmarks are defined and contain necessary indices
        if (!landmarks || !landmarks[RIGHT_HIP_INDEX] || !landmarks[LEFT_HIP_INDEX]) {
            console.warn("Required landmarks not found for distance calculation");
            return;
        }

        // Get current positions of both hips
        const rightHip = landmarks[RIGHT_HIP_INDEX];
        const leftHip = landmarks[LEFT_HIP_INDEX];

        // Calculate the average position between the two hips
        const currentPosition = {
            x: (rightHip.x + leftHip.x) / 2,
            y: (rightHip.y + leftHip.y) / 2,
        };

        // If it's the first frame, initialize the start time and previous position
        if (!appState.startTime) {
            appState.startTime = performance.now();
            appState.previousFrameTime = appState.startTime;
            appState.previousLegPosition = currentPosition;
            appState.topSpeed = 0; // Initialize top speed
            appState.smoothedSpeed = 0;
            return; // Skip calculation for the first frame
        }
    
        // Proceed with distance calculation
        const currentTime = performance.now();
        const timeElapsedSinceLastFrame = (currentTime - appState.previousFrameTime) / 1000;
        
        // Reject invalid or unreasonably large time intervals
        if (timeElapsedSinceLastFrame <= 0 || timeElapsedSinceLastFrame > 1) return;
        
        // Calculate scale factor and distance
        const scaleFactor = calculateScaleFactor(landmarks, athleteHeightInMeters);
        const distanceCovered = Math.sqrt(
            Math.pow(currentPosition.x - appState.previousLegPosition.x, 2) +
            Math.pow(currentPosition.y - appState.previousLegPosition.y, 2)
        );
        console.log(`Scale Factor: ${scaleFactor}`);
        // const distanceCovered = (distance * scaleFactor) 
        // Ignore small distances to avoid noise
        if (distanceCovered < 0.1) return;
        
        appState.totalDistance += distanceCovered ; // Convert to yards
        appState.previousLegPosition = currentPosition;
        appState.previousFrameTime = currentTime;
        
        // Calculate speed in yards/sec
        const SAFE_TIME_THRESHOLD = 0.05; // Minimum valid time step in seconds
        const timeStep = Math.max(timeElapsedSinceLastFrame, SAFE_TIME_THRESHOLD);
        const speed = distanceCovered  / timeStep;
        
        // Smooth out speed readings over time to avoid spikes
        appState.speedData.push(speed);
        // Apply EMA smoothing
        const smoothingFactor = 0.5; // Adjust for desired smoothness
        appState.smoothedSpeed = smoothingFactor * speed + (1 - smoothingFactor) * appState.smoothedSpeed;
        
        // Update top speed
        appState.topSpeed = Math.max(appState.topSpeed || 0, speed); 
        const averageSpeed = appState.totalDistance / appState.totalTime;

        // Update speedometer chart to show top speed
        speedProgressChart.data.datasets[0].data[0] = averageSpeed;
        speedProgressChart.update();
    
        // Log speed, distance, and time to the console
        const timeElapsedSinceStart = (currentTime - appState.startTime) / 1000; // Total elapsed time
        console.log(`Speed: ${speed.toFixed(2)} yards/s`);
        console.log(`Top Speed: ${appState.topSpeed.toFixed(2)} yards/s`);
        console.log(`Distance: ${(appState.totalDistance * 1.09361).toFixed(2)} yards`);
        console.log(`Time: ${timeElapsedSinceStart.toFixed(2)} seconds`);
    
        // Display speed, distance, and time on the web page
        document.getElementById("speedDisplay").textContent = `Average Speed: ${averageSpeed.toFixed(2)} yards/second`;
        document.getElementById("distanceDisplay").textContent = `Distance: ${appState.totalDistance.toFixed(2)} yards`;
        document.getElementById("timeDisplay").textContent = `Time: ${timeElapsedSinceStart.toFixed(2)} seconds`;
    }
   
    // Analyze each frame and call the calculateDistance and other functions if landmarks are detected
    function analyzeFrame(landmarks, athleteHeightInMeters, timeElapsedSinceLastFrame, posture) {
        if (!landmarks || landmarks.length === 0 || !athleteHeightInMeters) {
            console.log("No landmarks or height data available.");
            return;
        }
        calculateDistance(landmarks, athleteHeightInMeters);
        detectJumps(landmarks);
        showHeadAngleChart();
        // Calculate and update acceleration
        const acceleration = calculateAcceleration(appState.speedData, timeElapsedSinceLastFrame);
        if (!isNaN(acceleration) && Math.abs(acceleration) > ACCELERATION_THRESHOLD) {
            appState.accelerationData.push(acceleration);
            accelerationChart.data.labels.push(appState.currentSecond); // Use video time
            accelerationChart.data.datasets[0].data.push(acceleration);
            accelerationChart.update();
        }
        // Calculate the athletic scores
        const scores = calculateAthleticScores(posture);

        // Debugging: Log scores and their validity
        console.log("Athletic scores:", scores);
        const invalidScores = scores.filter(score => isNaN(score));
        if (invalidScores.length > 0) {
            console.error("Invalid athletic scores detected:", invalidScores);
        }

        // Update the athletic score chart
        if (scores.every(score => !isNaN(score))) { // Ensure all scores are valid
            appState.score = scores; // Update the appState with the new scores
            atheleticscorechart.data.datasets[0].data = scores; // Update the chart's dataset
            atheleticscorechart.update(); // Refresh the chart to display updated scores
        } else {
            console.error("Invalid athletic scores, skipping chart update.");
        }
    }  

    // Moving Average Function
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

    // Process acceleration data
    appState.smoothedAccelerationData = movingAverage(appState.accelerationData, 10); 

    function detectDrillStart(landmarks) {
        const leftAnkle = landmarks[LEFT_ANKLE_INDEX];
        const rightAnkle = landmarks[RIGHT_ANKLE_INDEX];
    
        // Calculate average movement of both ankles
        const avgAnkleX = (leftAnkle.x + rightAnkle.x) / 2;
        const avgAnkleY = (leftAnkle.y + rightAnkle.y) / 2;
    
        const distanceMoved = Math.sqrt(
            Math.pow(avgAnkleX - appState.previousLegPosition.x, 2) +
            Math.pow(avgAnkleY - appState.previousLegPosition.y, 2)
        );
    
        const movementThreshold = 0.18; // Adjust this threshold based on sensitivity
        if (!appState.isDrillActive && distanceMoved > movementThreshold) {
            appState.isDrillActive = true;
    
            // Record response time
            const responseTime = performance.now();
            if (appState.cueTime) {
                const reactionTime = responseTime - appState.cueTime;
                appState.reactionTimeData.push(reactionTime);
                // console.log(`Reaction time: ${reactionTime.toFixed(2)} ms`);
    
            }
            console.log("Drill started");
        }
        appState.previousLegPosition = { x: avgAnkleX, y: avgAnkleY };
    }      

    // Detect the end of the drill
    function detectDrillEnd(landmarks) {
        appState.endTime = performance.now();
        appState.totalTime = (appState.endTime - appState.startTime) / 1000;
        appState.isDrillActive = false;
        console.log(`Drill Time: ${appState.totalTime}, Start Time: ${appState.startTime}`);
    }

    // Function to calculate acceleration
    function calculateAcceleration(speedData, deltaTime) {
        if (speedData.length < 2 || deltaTime <= 0) return 0;
        const latestSpeed = speedData[speedData.length - 1];
        const previousSpeed = speedData[speedData.length - 2];
        return (latestSpeed - previousSpeed) / deltaTime;
    }
    
    // Function to detect jumps
    function detectJumps(landmarks) {
        const leftAnkle = landmarks[LEFT_ANKLE_INDEX];
        const rightAnkle = landmarks[RIGHT_ANKLE_INDEX];
        const averageAnkleY = (leftAnkle.y + rightAnkle.y) / 2;

        if (!appState.previousAnkleY) {
            appState.previousAnkleY = averageAnkleY;
            return;
        }

        const jumpHeight = appState.previousAnkleY - averageAnkleY;

        if (jumpHeight > JUMP_HEIGHT_BASELINE) {
            if (typeof appState.currentSecond !== "number") {
                console.error("Current time (appState.currentSecond) is invalid.");
                return;
            }

            appState.jumpHeights.push({
                time: appState.currentSecond,
                height: jumpHeight
            });

            // Update the chart dynamically
            jumpHeightChart.data.labels.push(`Time: ${appState.currentSecond.toFixed(2)}s`);
            jumpHeightChart.data.datasets[0].data.push({
                x: appState.currentSecond,
                y: jumpHeight
            });
            jumpHeightChart.update();
        }
        appState.previousAnkleY = averageAnkleY;
    }

    // Reset charts and analysis data
    function resetCharts() {
        speedProgressChart.data.datasets[0].data[0] = 0; 
        speedProgressChart.update();
        headAngleChart.data.datasets[0].data[0] = 0; 
        headAngleChart.update();
        headAngleLineChart.data.labels = [];
        headAngleLineChart.data.datasets[0].data = [];
        headAngleLineChart.update();
        speedHistogramChart.data.labels = [];
        speedHistogramChart.data.datasets[0].data = [];  // Clear histogram bars
        speedHistogramChart.data.datasets[1].data = [];  // Clear frequency polygon
        speedHistogramChart.update();
        accelerationChart.data.labels = [];
        accelerationChart.data.datasets[0].data = [];
        accelerationChart.update();
        jumpHeightChart.data.labels = [];
        jumpHeightChart.data.datasets[0].data = [];
        jumpHeightChart.update();
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
        appState.reactionTimeData = [];
        appState.jumpHeights = [];
        appState.agilityData = [];
        appState.balanceScore = [];
        console.log("Analysis data and charts reset");
    }
});