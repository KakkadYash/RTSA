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
const DECELERATION_THRESHOLD = 0.5;
const JUMP_HEIGHT_BASELINE = 0.05; // Minimum height change to detect a jump
       
// Encapsulating variables in an object to avoid global scope
const appState = {
    postureCounts: {
        Running: 0,
        'Upright Standing': 0,
        Crouching: 0,
    },
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
    score: 0,
    athleteHeightInMeters: null,
    topSpeed: 0,
};

// Wait for the DOM to load
document.addEventListener('DOMContentLoaded', function() {
    const uploadButton = document.getElementById('uploadButton');
    const analyzeButton = document.getElementById('analyzeButton');
    const videoElement = document.getElementById('uploaded-video');
    const canvasElement = document.getElementById('output_canvas');
    const canvasCtx = canvasElement.getContext('2d');
    const playProcessedButton = document.getElementById('playProcessedButton');
    const loadingOverlay = document.getElementById('analyzingIndicator');
    let unifiedChart = null;
    const unifiedChartCtx = document.getElementById('myChart2').getContext('2d');

    function initializeUnifiedChart() {
               if (Chart.getChart("myChart2")) {
               Chart.getChart("myChart2").destroy();
           }
           unifiedChart = new Chart(unifiedChartCtx, {
               type: 'line',
               data: {
                   labels: [],
                   datasets: [
                       {
                           label: 'Head Angle (°)',
                           data: [],
                           borderColor: '#FF8C00',
                           fill: false,
                           tension: 0.3
                       },
                       {
                           label: 'Speed (yards/sec)',
                           data: [],
                           borderColor: '#1F43E5',
                           fill: false,
                           tension: 0.3
                       },
                       {
                           label: 'Acceleration (yards/s²)',
                           data: [],
                           borderColor: '#7DD859',
                           fill: false,
                           tension: 0.3
                       },
                       {
                           label: 'Deceleration (yards/s²)',
                           data: [],
                           borderColor: '#E93632',
                           fill: false,
                           tension: 0.3
                       },
                       {
                           label: 'Stride Length (yards)',
                           data: [],
                           borderColor: '#FFA500',
                           fill: false,
                           tension: 0.3
                       },
                       {
                           label: 'Jump Height (yards)',
                           data: [],
                           borderColor: '#800080',
                           fill: false,
                           tension: 0.3
                       }
                   ]
               },
               options: {
                   responsive: true,
                   maintainAspectRatio: false,
                   scales: {
                       x: {
                           title: { display: true, text: 'Time (seconds)' }
                       },
                       y: {
                           beginAtZero: true
                       }
                   }
               }
           });
       }
    initializeUnifiedChart(); // 👈 Initialize as soon as DOM loads
    function filterUnifiedChart(metricIndices) {
        unifiedChart.data.datasets.forEach((dataset, index) => {
            dataset.hidden = !metricIndices.includes(index);
        });
        unifiedChart.update();
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

    // Initialize the histogram with a frequency polygon for speed
    // const speedHistogramChart = new Chart(document.getElementById('speedHistogramChart').getContext('2d'), {
    //     type: 'bar',
    //     data: {
    //         labels: [],  // X-axis labels (seconds)
    //         datasets: [
    //             {
    //                 label: 'Speed Frequency',  // Histogram data
    //                 data: [],
    //                 backgroundColor: 'rgba(0, 123, 255, 0.5)',
    //                 borderWidth: 1
    //             },
    //             {
    //                 label: 'Speed Trend',  // Frequency polygon overlay
    //                 data: [],
    //                 type: 'line',
    //                 borderColor: '#FF5733',
    //                 fill: false,
    //                 tension: 0.1,
    //                 pointRadius: 0
    //             }
    //         ]
    //     },
    //     options: {
    //         responsive: true,
    //         maintainAspectRatio: false,
    //         scales: {
    //             x: {
    //                 title: { display: true, text: 'Time (seconds)' },
    //                 ticks: { autoSkip: false, maxTicksLimit: 10 } // More clickable labels
    //             },
    //             y: {
    //                 title: { display: true, text: 'Speed (yards/sec)' },
    //                 suggestedMin: 0,
    //                 suggestedMax: 10,  // Adjust this based on your data
    //                 ticks: { stepSize: 1 } // Avoids excessive zoom
    //             }
    //         },
    //         onClick: (evt, activeElements) => {
    //             if(activeElements.length > 0) {
    //                 const index = activeElements[0].index;
    //                 const timestamp = speedHistogramChart.data.labels[index];
    //                 seekToTimestamp(timestamp);
    //             }
    //         }
    //     }
    // });

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
       
    // Initialize the line chart for head angle tracking with click-to-seek functionality
    // const headAngleLineChart = new Chart(document.getElementById('headAngleLineChart').getContext('2d'), {
    //     type: 'line',
    //     data: {
    //         labels: [], // X-axis labels (seconds)
    //         datasets: [{
    //             label: 'Head Angle (degrees)',
    //             data: [],
    //             borderColor: '#00ff00',
    //             fill: false,
    //             tension: 0.1
    //         }]
    //     },
    //     options: {
    //         responsive: true,
    //         maintainAspectRatio: false,
    //         scales: {
    //             x: {
    //                 title: { display: true, text: 'Time (seconds)' },
    //                 ticks: { autoSkip: false, maxTicksLimit: 10 } // Ensures clickable points
    //             },
    //             y: {
    //                 title: { display: true, text: 'Head Angle (degrees)' },
    //                 suggestedMin: 0,
    //                 suggestedMax: 180,
    //                 ticks: { stepSize: 10 } // Adjusts label spacing for clarity
    //             }
    //         },
    //         plugins: {
    //             annotation: {
    //                 annotations: {
    //                     idealLine: {
    //                         type: 'line',
    //                         yMin: 45,
    //                         yMax: 45,
    //                         borderColor: 'red',
    //                         borderWidth: 2,
    //                         label: {
    //                             content: 'Ideal Head Angle',
    //                             enabled: true,
    //                             position: 'start',
    //                             backgroundColor: 'rgba(255, 0, 0, 0.2)',
    //                         }
    //                     }
    //                 }
    //             }
    //         },
    //         onClick: (evt, activeElements) => {
    //             if(activeElements.length > 0) {
    //                 const index = activeElements[0].index;
    //                 const timestamp = headAngleLineChart.data.labels[index];
    //                 seekToTimestamp(timestamp);
    //             }
    //         }
    //     }
    // });

    // Additional chart for acceleration visualization with click-to-seek
    // const accelerationChart = new Chart(document.getElementById('accelerationChart').getContext('2d'), {
    //     type: 'scatter',
    //     data: {
    //         datasets: [{
    //             label: 'Acceleration (yards/s²)',
    //             data: appState.smoothedAccelerationData.map((y, i) => ({ x: i, y })),
    //             backgroundColor: 'yellow',
    //             borderColor: 'orange',
    //             pointRadius: 2,
    //             borderWidth: 2,
    //             showLine: true,
    //         }]
    //     },
    //     options: {
    //         responsive: true,
    //         maintainAspectRatio: false,
    //         scales: {
    //             x: { 
    //                 title: { display: true, text: 'Time (seconds)' },
    //                 ticks: { autoSkip: false, maxTicksLimit: 10 } 
    //             },
    //             y: { 
    //                 title: { display: true, text: 'Acceleration (yards/s²)' },
    //                 suggestedMin: -5,
    //                 suggestedMax: 10,
    //                 ticks: { stepSize: 1 } // Makes values easier to read
    //             }
    //         },
    //         onClick: (evt, activeElements) => {
    //             if(activeElements.length > 0) {
    //                 const index = activeElements[0].index;
    //                 const timestamp = accelerationChart.data.labels[index];
    //                 seekToTimestamp(timestamp);
    //             }
    //         }
    //     }
    // });

    // // Additional chart for deceleration visualization with click-to-seek
    // const decelerationChart = new Chart(document.getElementById('decelerationDisplay').getContext('2d'), {
    //     type: 'scatter',
    //     data: {
    //         datasets: [{
    //             label: 'Deceleration (yards/s²)',
    //             data: appState.smoothedAccelerationData.map((y, i) => ({ x: i, y })),
    //             backgroundColor: 'blue',
    //             borderColor: 'green',
    //             pointRadius: 2,
    //             borderWidth: 2,
    //             showLine: true,
    //         }]
    //     },
    //     options: {
    //         responsive: true,
    //         maintainAspectRatio: false,
    //         scales: {
    //             x: { 
    //                 title: { display: true, text: 'Time (seconds)' },
    //                 ticks: { autoSkip: false, maxTicksLimit: 10 } 
    //             },
    //             y: { 
    //                 title: { display: true, text: 'Deceleration (yards/s²)' },
    //                 suggestedMin: -5,
    //                 suggestedMax: 10,
    //                 ticks: { stepSize: 1 } // Makes values easier to read
    //             }
    //         },
    //         onClick: (evt, activeElements) => {
    //             if(activeElements.length > 0) {
    //                 const index = activeElements[0].index;
    //                 const timestamp = accelerationChart.data.labels[index];
    //                 seekToTimestamp(timestamp);
    //             }
    //         }
    //     }
    // });

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
       
    document.querySelectorAll('.card').forEach((card, index) => {
        card.addEventListener('click', () => {
             // Small delay to wait for flip animation (optional)
             setTimeout(() => {
                 if (card.classList.contains('is-flipped')) {
                    if (index === 0) {
                        // Technique card: head angle only
                        filterUnifiedChart([0]);
                    } else if (index === 1) {
                        // Speed & Movement card: speed, acceleration, deceleration
                        filterUnifiedChart([1, 2, 3]);
                    } else if (index === 2) {
                        // Footwork card: stride, jump height
                        filterUnifiedChart([4, 5]);
                    }
                }
            }, 200);
        });
    });

    // Chart for Jump Height visualization with correct time axis
    // const jumpHeightChart = new Chart(document.getElementById('jumpHeightChart').getContext('2d'), {
    //     type: 'bar',
    //     data: {
    //         datasets: [{
    //             label: 'Jump Height (yards)',
    //             data: [],  // { x: second, y: jumpHeight }
    //             backgroundColor: 'blue',
    //             borderColor: 'blue',
    //             borderWidth: 1
    //         }]
    //     },
    //     options: {
    //         responsive: true,
    //         maintainAspectRatio: false,
    //         scales: {
    //             x: {
    //                 type: 'linear',  // ⬅️ Important: force a linear time axis
    //                 title: { display: true, text: 'Time (seconds)' },
    //                 min: 0,
    //                 ticks: {
    //                     stepSize: 1,
    //                     callback: function(value, index, values) {
    //                         return value.toFixed(0); // Only whole seconds
    //                     }
    //                 }
    //             },
    //             y: {
    //                 title: { display: true, text: 'Jump Height (yards)' },
    //                 suggestedMin: 0,
    //                 suggestedMax: 2,
    //                 ticks: { stepSize: 0.2 }
    //             }
    //         }
    //     }
    // });

    // // Chart for Stride Length visualization with correct time axis
    // const strideChart = new Chart(document.getElementById('strideLengthDisplay').getContext('2d'), {
    //     type: 'bar',
    //     data: {
    //         datasets: [{
    //             label: 'Stride Length (yards)',
    //             data: [],  // { x: second, y: strideLength }
    //             backgroundColor: 'orange',
    //             borderColor: 'orange',
    //             borderWidth: 1
    //         }]
    //     },
    //     options: {
    //         responsive: true,
    //         maintainAspectRatio: false,
    //         scales: {
    //             x: {
    //                 type: 'linear',  // ⬅️ Important: force a linear time axis
    //                 title: { display: true, text: 'Time (seconds)' },
    //                 min: 0,
    //                 ticks: {
    //                     stepSize: 1,
    //                     callback: function(value, index, values) {
    //                         return value.toFixed(0); // Only whole seconds
    //                     }
    //                 }
    //             },
    //             y: {
    //                 title: { display: true, text: 'Stride Length (yards)' },
    //                 suggestedMin: 0,
    //                 suggestedMax: 2,
    //                 ticks: { stepSize: 0.2 }
    //             }
    //         }
    //     }
    // });
    document.getElementById('showMetrics').addEventListener('click', () => {
        filterUnifiedChart([0, 1, 2, 3, 4, 5]);
        document.querySelectorAll('.card').forEach(card => card.classList.add('is-flipped'));
    });

    
    // UPLOAD BUTTON: Only select and preview video (no uploading or height estimation)
    uploadButton.addEventListener('change', (event) => {
        appState.videoFile = event.target.files[0];
        if (appState.videoFile) {
            const videoURL = URL.createObjectURL(appState.videoFile);
            videoElement.src = videoURL;
            videoElement.style.display = 'block';
            const uploadDateInput = document.getElementById('uploadDate').value;

            // Convert '2023-08-15T10:30' to '2023-08-15 10:30:00'
            if (uploadDateInput) {
                const date = new Date(uploadDateInput);
                appState.uploadDate = date.getFullYear() + '-' +
                                    String(date.getMonth() + 1).padStart(2, '0') + '-' +
                                    String(date.getDate()).padStart(2, '0') + ' ' +
                                    String(date.getHours()).padStart(2, '0') + ':' +
                                    String(date.getMinutes()).padStart(2, '0') + ':00';
            }

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
        updatePostureChart();
        updateSlider("speed", ".speed", appState.topSpeed, 0, 15);                // SPEED
        updateSlider("acceleration", ".acceleration", appState.peakAcceleration, 0, 10);   // ACCELERATION
        updateSlider("deceleration", ".value1", appState.peakDeceleration, 0, 10);                 // DECELERATION (same slider ID as footwork — be cautious)
        updateSlider("jumpheight", ".value", appState.averageJumpHeight, 0, 2);                   // JUMP HEIGHT
        updateSlider("strideleng", ".value1", appState.averageStrideLength, 0, 2);                // STRIDE LENGTH
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
            // ✅ Ensure thumbnail exists before appending
            if (appState.thumbnailFile) {
                formData.append('thumbnail', appState.thumbnailFile); // ✅ Fixed spelling
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

            // Compute ideal head angle percentage
            const idealHeadPercentage = appState.idealHeadAngleFrames 
            ? Math.round((appState.idealHeadAngleFrames / appState.totalFrames) * 100) 
            : 0;

            // Compute the average athletic score
            const scores = calculateAthleticScores();
            const averageAthleticScore = scores.length > 0 
                ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
                : 0;
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
            const currentVideoTime = Math.floor(videoElement.currentTime);
            if (currentVideoTime > appState.currentSecond) {
                appState.currentSecond = currentVideoTime;
                appState.headAnglePerSecond.push(headAngle);
                // Update unified chart with all metrics
                unifiedChart.data.labels.push(appState.currentSecond);
                unifiedChart.data.datasets[0].data.push(headAngle); // Head Angle
                unifiedChart.data.datasets[1].data.push(appState.smoothedSpeed); // Speed
              
                // Initialize values in case we don’t have others yet
                const acc = appState.accelerationData.at(-1) || 0;
                const dec = appState.decelerationData.at(-1) || 0;
                const jump = appState.jumpHeights.at(-1)?.height || 0;
                const stride = appState.stridelength.at(-1)?.length || 0;
              
                unifiedChart.data.datasets[2].data.push(acc); // Acceleration
                unifiedChart.data.datasets[3].data.push(dec); // Deceleration
                unifiedChart.data.datasets[4].data.push(stride); // Stride Length
                unifiedChart.data.datasets[5].data.push(jump); // Jump Height
              
                unifiedChart.update();

    
                const speedThisSecond = appState.smoothedSpeed;
                if (isNaN(speedThisSecond) || speedThisSecond < 0) {
                    console.warn("Skipping invalid speed value:", speedThisSecond);
                }
            }
    
            if (headAngle >= HEAD_ANGLE_MIN && headAngle <= HEAD_ANGLE_MAX) {
                appState.idealHeadAngleFrames++;
            }
    
            if (results.poseLandmarks[LEFT_ANKLE_INDEX] && results.poseLandmarks[LEFT_EYE_INDEX]) {
                analyzeFrame(results.poseLandmarks, appState.athleteHeightInMeters, timeElapsedSinceLastFrame, posture);
            }
    
            detectDrillStart(results.poseLandmarks);
            detectDrillEnd(results.poseLandmarks);
        } else {
            console.log("No landmarks detected");
        }
    }
       
    function updatePostureChart() {
        const totalFrames = appState.postureCounts['Running'] + appState.postureCounts['Upright Standing'] + appState.postureCounts['Crouching'];
        if (totalFrames === 0) return;

        const runningPercent = Math.round((appState.postureCounts['Running'] / totalFrames) * 100);
        const standingPercent = Math.round((appState.postureCounts['Upright Standing'] / totalFrames) * 100);
        const crouchingPercent = Math.round((appState.postureCounts['Crouching'] / totalFrames) * 100);

        const chart = Chart.getChart('myChart'); // Get existing chart instance
        if (chart) {
            chart.data.datasets[0].data = [
                0, 0,  // Ideal / Not Ideal (outer ring skipped)
                runningPercent,
                standingPercent,
                crouchingPercent
            ];
            chart.update();
        }
    }
       
    function updateSlider(sliderId, labelSelector, value, min = 0, max = 100) {
        const slider = document.getElementById(sliderId);
        const label = document.querySelector(labelSelector);

        if (!slider || !label) return;

        // Clamp and set slider value
        const normalized = Math.min(Math.max(value, min), max);
        slider.value = normalized;
        label.textContent = normalized.toFixed(1);

        // Gradient color background
        const percent = ((normalized - min) / (max - min)) * 100;
        slider.style.background = `linear-gradient(to right, red 0%, yellow ${percent}%, green ${percent}%, white ${percent}%)`;
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
    
    function showHeadAngleChart() {
        const idealPercentage = Math.round((appState.idealHeadAngleFrames / appState.totalFrames) * 100);
        headAngleChart.data.datasets[0].data[0] = idealPercentage;
        headAngleChart.data.datasets[0].data[1] = 100 - idealPercentage;
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
        const angle = Math.acos(cosineAngle) * (180 / Math.PI);
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
            { x: landmarks[LEFT_SHOULDER_INDEX].x, y: landmarks[LEFT_SHOULDER_INDEX].y - 1 }
        );
    
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
    
    function normalize(value, min, max) {
        return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
    }
    
    function calculateAthleticScores(posture) {
        const footworkScore = calculateFootworkScore();
        const speedScore = normalize(appState.smoothedSpeed, 0, 15);
        const accelerationScore = normalize(appState.smoothedAccelerationData, -5, 20);
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
    
        speedProgressChart.data.datasets[0].data[0] = averageSpeed;
        speedProgressChart.update();
    
        const timeElapsedSinceStart = (currentTime - appState.startTime) / 1000;
        console.log(`Speed: ${speed.toFixed(2)} yards/s`);
        console.log(`Top Speed: ${appState.topSpeed.toFixed(2)} yards/s`);
        console.log(`Distance: ${(appState.totalDistance * 1.09361).toFixed(2)} yards`);
        console.log(`Time: ${timeElapsedSinceStart.toFixed(2)} seconds`);
    
        document.getElementById("speedDisplay").textContent = `Average Speed: ${averageSpeed.toFixed(2)} yards/second`;
        document.getElementById("distanceDisplay").textContent = `Distance: ${appState.totalDistance.toFixed(2)} yards`;
        document.getElementById("timeDisplay").textContent = `Time: ${timeElapsedSinceStart.toFixed(2)} seconds`;
    }
   
    function analyzeFrame(landmarks, athleteHeightInMeters, timeElapsedSinceLastFrame, posture) {
        if (!landmarks || landmarks.length === 0 || !athleteHeightInMeters) {
            console.log("No landmarks or height data available.");
            return;
        }
        calculateDistance(landmarks, athleteHeightInMeters);
        detectJumps(landmarks);
        calculatestride(landmarks);
        showHeadAngleChart();

        const acceleration = calculateAcceleration(appState.speedData, timeElapsedSinceLastFrame);
        if (!isNaN(acceleration) && Math.abs(acceleration) > ACCELERATION_THRESHOLD) {
            appState.accelerationData.push(acceleration);
            accelerationChart.data.labels.push(appState.currentSecond);
            accelerationChart.data.datasets[0].data.push(acceleration);
            // accelerationChart.update();
        }

        const deceleration = calculateDeceleration(appState.speedData, timeElapsedSinceLastFrame);
        if (!isNaN(deceleration) && Math.abs(deceleration) > DECELERATION_THRESHOLD) {
            appState.accelerationData.push(deceleration);
            decelerationChart.data.labels.push(appState.currentSecond);
            decelerationChart.data.datasets[0].data.push(deceleration);
            // decelerationChart.update();
        }

        const scores = calculateAthleticScores(posture);
        console.log("Athletic scores:", scores);
        const invalidScores = scores.filter(score => isNaN(score));
        if (invalidScores.length > 0) {
            console.error("Invalid athletic scores detected:", invalidScores);
        }
    
        if (scores.every(score => !isNaN(score))) {
            appState.score = scores;
            atheleticscorechart.data.datasets[0].data = scores;
            // atheleticscorechart.update();
        } else {
            console.error("Invalid athletic scores, skipping chart update.");
        }
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
        console.log(`Drill Time: ${appState.totalTime}, Start Time: ${appState.startTime}`);
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
       
        // 🟢 Save to appState (for analysis + chart)
        appState.stridelength.push({
            time: appState.currentSecond,
            length: strideValue
        });
       
        // 🟢 Update unified chart only (since we removed individual strideChart)
        if (unifiedChart) {
            // Update dataset index 4 (Stride Length)
            const strideDataset = unifiedChart.data.datasets[4];
            if (strideDataset) {
                strideDataset.data.push(strideValue);
            }
        }
       
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
    
        jumpHeightChart.data.datasets[0].data.push({ x: appState.currentSecond, y: jumpValue });
        jumpHeightChart.data.datasets[0].data.push(jumpValue);
        // jumpHeightChart.update();
    
        appState.previousAnkleY = averageAnkleY;
    }
    
    function resetCharts() {
        speedProgressChart.data.datasets[0].data[0] = 0; 
        speedProgressChart.update();
        headAngleChart.data.datasets[0].data[0] = 0; 
        headAngleChart.update();
        headAngleLineChart.data.labels = [];
        headAngleLineChart.data.datasets[0].data = [];
        // headAngleLineChart.update();
        speedHistogramChart.data.labels = [];
        speedHistogramChart.data.datasets[0].data = [];
        speedHistogramChart.data.datasets[1].data = [];
        // speedHistogramChart.update();
        accelerationChart.data.labels = [];
        accelerationChart.data.datasets[0].data = [];
        // accelerationChart.update();
        decelerationChart.data.labels = [];
        decelerationChart.data.datasets[0].data = [];
        // decelerationChart.update();
        jumpHeightChart.data.labels = [];
        jumpHeightChart.data.datasets[0].data = [];
        // jumpHeightChart.update();
        strideChart.data.labels = [];
        strideChart.data.datasets[0].data = [];
        // strideChart.update();
        if (unifiedChart) {
            unifiedChart.data.labels = [];
            unifiedChart.data.datasets.forEach(ds => ds.data = []);
            unifiedChart.update();
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
});

