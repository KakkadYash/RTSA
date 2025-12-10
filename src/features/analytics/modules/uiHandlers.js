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

      // Detect orientation
      const isVertical = videoEl.videoHeight > videoEl.videoWidth;

      const canvasWrapper = document.getElementById("canvas-wrapper");

      // Remove all orientation classes first
      canvasWrapper.classList.remove("vertical-canvas-wrapper", "horizonatl-canvas-wrapper");
      canvasEl.classList.remove("vertical-output_canvas", "horizonatl-output_canvas");

      if (isVertical) {
        canvasWrapper.classList.add("vertical-canvas-wrapper");
        canvasEl.classList.add("vertical-output_canvas");
      } else {
        canvasWrapper.classList.add("horizonatl-canvas-wrapper");
        canvasEl.classList.add("horizonatl-output_canvas");
      }

      // Allow caller to reset UI state
      onMetadataReady?.();
    };

  });
}

export function wireCardsAndShowAll(showMetricsBtn, { onShowAllMetrics, onShowTechnique, onShowSpeed, onShowFootwork }) {
  // Card flip logic
  // Card flip logic
  document.querySelectorAll(".card").forEach((card, index, allCards) => {
    card.addEventListener("click", (e) => {
      e.stopPropagation();
      const targetCard = e.currentTarget;  // ALWAYS the .card element

      setTimeout(() => {
        const alreadyFlipped = targetCard.classList.contains("is-flipped");

        allCards.forEach(c => c.classList.remove("is-flipped"));

        if (!alreadyFlipped) {
          targetCard.classList.add("is-flipped");

          if (index === 0) onShowTechnique?.();
          if (index === 1) onShowSpeed?.();
          if (index === 2) onShowFootwork?.();

        } else {
          onShowAllMetrics?.();
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
  playBtn.addEventListener("click", (e) => {
    e.preventDefault();
    handler();
  });
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
  if (!el) return;
  el.textContent = "UPLOAD VIDEO";
  el.classList.remove("button-disabled", "button-success");
  el.disabled = false;
}

export function setAnalyzing(el) {
  el.textContent = "ANALYZING...";
  el.classList.add("button-disabled");
}

export function resetAnalyze(el) {
  if (!el) return;
  el.textContent = "ANALYZE VIDEO";
  el.classList.remove("button-disabled");
  el.disabled = false;
}

export function setPlaying(el) {
  el.textContent = "REPLAY VIDEO";
  el.classList.add("button-disabled");
}


export function resetPlayButton(el) {
  if (!el) return;
  el.textContent = "PLAY VIDEO";
  el.classList.remove("button-disabled");
  el.disabled = false;
}

// export function setPlayButtonEnabled(isEnabled) {
//   const playBtn = document.getElementById("playProcessedButton");
//   if (playBtn) playBtn.disabled = !isEnabled;
// }

export function disableInteractiveButton(el) {
  if (!el) return;
  el.classList.add("button-disabled");
  el.classList.remove("hover-animation", "click-animation", "hover-box-shadow");
  el.disabled = true;
}

export function enableInteractiveButton(el) {
  if (!el) return;
  el.classList.remove("button-disabled");
  el.classList.add("hover-animation", "click-animation", "hover-box-shadow");
  el.disabled = false;
}
