// analyticsCore.js
// Handles Mediapipe Pose init and drawing overlay on the canvas in sync with video.

let pose = null;
let videoEl = null;
let canvasEl = null;
let ctx2D = null;
let playing = false;

export function initPoseOverlay({ video, canvas, ctx2D: ctx }) {
  videoEl = video;
  canvasEl = canvas;
  ctx2D = ctx;

  pose = new Pose({
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

  // Process frames while the video is playing
  videoEl.addEventListener("play", () => {
    playing = true;
    processFrameLoop();
  });
  videoEl.addEventListener("pause", () => {
    playing = false;
  });
  videoEl.addEventListener("ended", () => {
    playing = false;
  });
}

export function startOverlayLoop() {
  if (!videoEl) return;
  if (videoEl.paused) videoEl.play();
  playing = true;
  processFrameLoop();
}

export function stopOverlayLoop() {
  playing = false;
}

export function drawOneFrameIfPaused() {
  if (!videoEl || !canvasEl || !ctx2D) return;
  ctx2D.clearRect(0, 0, canvasEl.width, canvasEl.height);
  ctx2D.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
}

async function processFrameLoop() {
  if (!playing || videoEl.paused || videoEl.ended) return;
  try {
    await pose.send({ image: videoEl });
  } catch (e) {
    console.error("Mediapipe send error:", e);
  }
  // ~30–33 fps target
  setTimeout(processFrameLoop, 30);
}

function onResults(results) {
  if (!results.poseLandmarks) {
    return;
  }
  // Resize canvas once based on the video’s intrinsic dimensions
  if (canvasEl.width !== videoEl.videoWidth || canvasEl.height !== videoEl.videoHeight) {
    canvasEl.width = videoEl.videoWidth;
    canvasEl.height = videoEl.videoHeight;
  }
  // Clear and draw current video frame
  ctx2D.clearRect(0, 0, canvasEl.width, canvasEl.height);
  ctx2D.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);

  // Draw connectors + landmarks
  drawConnectors(ctx2D, results.poseLandmarks, POSE_CONNECTIONS, {
    color: "white",
    lineWidth: 2
  });
  drawLandmarks(ctx2D, results.poseLandmarks, {
    color: "red",
    fillColor: "green",
    radius: 3
  });
}
