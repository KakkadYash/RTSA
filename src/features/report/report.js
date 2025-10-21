
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
