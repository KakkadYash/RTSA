// uiHandlers.js

export function wireUploadButton(inputEl, videoEl, canvasEl, onMetadataReady, onFilePicked) {
  inputEl.addEventListener("change", (evt) => {
    const file = evt.target.files?.[0];
    if (!file) return;

    const maxBytes = 30 * 1024 * 1024; // 30 MB
    if (file.size > maxBytes) {
      alert("File size exceeds 30MB. Please upload a smaller video.");
      evt.target.value = "";
      return;
    }

    onFilePicked?.(file);

    const url = URL.createObjectURL(file);
    videoEl.src = url;
    videoEl.onloadedmetadata = () => {
      // match canvas to intrinsic video size
      canvasEl.width = videoEl.videoWidth;
      canvasEl.height = videoEl.videoHeight;

      // Allow caller to reset UI state
      onMetadataReady?.();
    };
  });
}

export function wireCardsAndShowAll(showMetricsBtn, { onShowAllMetrics, onShowTechnique, onShowSpeed, onShowFootwork }) {
  // Card flip logic
  // Card flip logic
  document.querySelectorAll(".card").forEach((card, index, allCards) => {
    card.addEventListener("click", () => {
      setTimeout(() => {
        const alreadyFlipped = card.classList.contains("is-flipped");
        allCards.forEach(c => c.classList.remove("is-flipped"));

        if (!alreadyFlipped) {
          card.classList.add("is-flipped");
          if (index === 0) onShowTechnique?.(); // Technique: Head Angle
          if (index === 1) onShowSpeed?.();     // Speed & Movement
          if (index === 2) onShowFootwork?.();  // Footwork
        } else {
          onShowAllMetrics?.(); // Restore unified full chart when card is unselected
        }
      }, 200);
    });
  });

  // Show All Metrics button toggles flipping all cards and restores pentagon
  if (showMetricsBtn) {
    let metricsVisible = false;
    showMetricsBtn.addEventListener("click", () => {
      metricsVisible = !metricsVisible;
      if (metricsVisible) {
        onShowAllMetrics?.(); // show unified with all series
        document.querySelectorAll(".card").forEach(c => c.classList.add("is-flipped"));
      } else {
        document.querySelectorAll(".card").forEach(c => c.classList.remove("is-flipped"));
      }
    });
  }
}

export function setAnalyzeHandler(analyzeBtn, handler) {
  analyzeBtn.addEventListener("click", async (evt) => {
    evt.preventDefault();
    await handler();
  });
}

export function setPlayProcessedHandler(playBtn, handler) {
  const once = (e) => {
    handler(e);
    playBtn.removeEventListener("click", once);
  };
  playBtn.addEventListener("click", once);
}
// --- Button state helpers ---

export function setUploadUploading(el) {
  el.textContent = "UPLOADING...";
  el.classList.add("button-disabled");
  el.classList.remove("button-success");
}

export function setUploadSuccess(el) {
  el.textContent = "UPLOADED";
  el.classList.remove("button-disabled");
  el.classList.add("button-success");
}

export function resetUploadButton(el) {
  el.textContent = "UPLOAD VIDEO";
  el.classList.remove("button-disabled", "button-success");
}

export function setAnalyzing(el) {
  el.textContent = "ANALYZING...";
  el.classList.add("button-disabled");
}

export function resetAnalyze(el) {
  el.textContent = "ANALYZE VIDEO";
  el.classList.remove("button-disabled");
}

export function setPlaying(el) {
  el.textContent = "PLAYING...";
  el.classList.add("button-disabled");
}

export function resetPlayButton(el) {
  el.textContent = "PLAY VIDEO";
  el.classList.remove("button-disabled");
}

