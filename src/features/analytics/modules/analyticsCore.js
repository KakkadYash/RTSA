// analyticsCore.js
// Handles Mediapipe Pose init and drawing overlay on the canvas in sync with video.
let lastLandmarks = null;

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
  if (!lastLandmarks) return;
  ctx2D.clearRect(0, 0, canvasEl.width, canvasEl.height);
  drawConnectors(ctx2D, lastLandmarks, POSE_CONNECTIONS, { color: "white", lineWidth: 1 });
  drawLandmarks(ctx2D, lastLandmarks, { color: "red", fillColor: "green", radius: 2 });
}



let isProcessingFrame = false;

export async function processFrameLoop() {
  if (isProcessingFrame) return; // prevent overlap
  isProcessingFrame = true;

  try {
    await pose.send({ image: videoEl });
  } catch (err) {
    console.error("Mediapipe send error:", err);
  } finally {
    isProcessingFrame = false;
  }

  requestAnimationFrame(processFrameLoop);
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
  // Transparent overlay: only skeleton (no video frame)
  ctx2D.clearRect(0, 0, canvasEl.width, canvasEl.height);
  // ✅ MATCH REAL VIDEO DRAW REGION TO CANVAS (fix misalignment)
  const videoW = videoEl.videoWidth;
  const videoH = videoEl.videoHeight;
  const canvasW = canvasEl.width;
  const canvasH = canvasEl.height;

  // preserve aspect ratio inside canvas
  const scale = Math.min(canvasW / videoW, canvasH / videoH);
  const offsetX = (canvasW - videoW * scale) / 2;
  const offsetY = (canvasH - videoH * scale) / 2;

  ctx2D.save();
  ctx2D.translate(offsetX, offsetY);
  ctx2D.scale(scale, scale);


  drawConnectors(ctx2D, results.poseLandmarks, POSE_CONNECTIONS, {
    color: "white",
    lineWidth: 1
  });
  drawLandmarks(ctx2D, results.poseLandmarks, {
    color: "red",
    fillColor: "green",
    radius: 2
  });

  // remember for paused-draw
  lastLandmarks = results.poseLandmarks;
  ctx2D.restore();

}
