  const closePreviewBtn = document.getElementById("closePreview"); // will exist inside iframe
  const closeShareModalBtn = document.getElementById("closeShareModal");
  const generateLinkBtn = document.getElementById("generateLink");
  const exportPdfBtn = document.getElementById("exportPDF");
  /* =====================================================
     SHARE MODAL LOGIC
  ===================================================== */
  function closeShare() {
    shareModal?.classList.add("hidden");
  }

  closeShareModalBtn?.addEventListener("click", closeShare);

  shareModal?.addEventListener("click", (e) => {
    if (e.target === shareModal) closeShare();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeShare();
  });

  exportPdfBtn?.addEventListener("click", () => {
    if (reportFrame?.contentWindow) {
      reportFrame.contentWindow.print();
    } else {
      alert("Open the preview first, then click Export as PDF.");
    }
  });

  generateLinkBtn?.addEventListener("click", async () => {
    const randomId = Math.random().toString(36).slice(2, 10);
    const link = `${window.location.origin}/share/report/${randomId}`;
    try {
      await navigator.clipboard.writeText(link);
      const original = generateLinkBtn.textContent;
      generateLinkBtn.textContent = "Copied!";
      setTimeout(() => (generateLinkBtn.textContent = original || "Generate Link & Copy"), 1200);
    } catch {
      prompt("Copy this link:", link);
    }
  });

    if (openPreviewBtn && modal && reportFrame) {
    openPreviewBtn.addEventListener("click", () => {
      modal.classList.remove("hidden");
      reportLoaded = false;
      reportFrame.src = "../../../src/features/report/report.html";
    });

    reportFrame.addEventListener("load", () => {
      reportDoc = reportFrame.contentDocument || reportFrame.contentWindow.document;
      reportLoaded = true;

      // Bind iframe buttons (share + close)
      const shareButtonInIframe = reportDoc.getElementById("shareButton");
      const closePreviewInIframe = reportDoc.getElementById("closePreview");

      if (shareButtonInIframe) {
        shareButtonInIframe.addEventListener("click", () => {
          console.log('Clicked Share Report Button')
          shareModal?.classList.remove("hidden");
        });
      }

      if (closePreviewInIframe) {
        closePreviewInIframe.addEventListener("click", () => {
          modal.classList.add("hidden");
        });
      }

      updateReport();
      renderAchievements();
    });
  }