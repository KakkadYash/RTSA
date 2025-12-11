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
  playing = true;
  requestAnimationFrame(processFrameLoop);
}

export function stopOverlayLoop() {
  playing = false;
}

export function drawOneFrameIfPaused() {
  if (!videoEl || !canvasEl || !ctx2D) return;
  ctx2D.clearRect(0, 0, canvasEl.width, canvasEl.height);
  ctx2D.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
}

let isProcessingFrame = false;

export async function processFrameLoop() {
  // Stop if not in "playing" mode or missing pieces
  if (!playing || !pose || !videoEl) return;

  // Ensure we have a valid frame
  if (
    videoEl.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
    videoEl.paused ||
    videoEl.ended
  ) {
    if (playing) {
      requestAnimationFrame(processFrameLoop);
    }
    return;
  }

  if (isProcessingFrame) {
    // Avoid overlapping pose.send calls
    if (playing) {
      requestAnimationFrame(processFrameLoop);
    }
    return;
  }

  isProcessingFrame = true;
  try {
    await pose.send({ image: videoEl });
  } catch (err) {
    console.error("Mediapipe send error:", err);
  } finally {
    isProcessingFrame = false;
  }

  if (playing) {
    requestAnimationFrame(processFrameLoop);
  }
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
  // ✅ Dispatch overlayReady event after first stick figure draw
  if (!window.__RTSA_OVERLAY_READY__) {
    window.__RTSA_OVERLAY_READY__ = true;
    console.log("[EVENT] Stick figure drawn — dispatching overlayReady");
    window.dispatchEvent(new Event("overlayReady"));
  }
}
