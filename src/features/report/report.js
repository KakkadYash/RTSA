// report.js
document.addEventListener("DOMContentLoaded", () => {
  const shareButton = document.getElementById("shareButton");
  const shareModal = document.querySelector('#shareModal')
  const closePreview = document.querySelector('#closePreview')
  const closeShareModal = document.querySelector('#closeShareModal')

  const generateLinkBtn = document.getElementById("generateLink");
  const exportPdfBtn = document.getElementById("exportPDF");

  /* =====================================================
     SHARE MODAL LOGIC
  ===================================================== */
  shareButton.addEventListener('click', () => {
    console.log('Clicked Share Button')
    shareModal.classList.remove('hidden')
  })

  closeShareModal.addEventListener('click', () => {
    console.log('Clicked Close Preview')
    shareModal.classList.add('hidden')
  })

  exportPdfBtn.addEventListener("click", () => {
    console.log("🖨 Export PDF clicked");
    window.print();
  });


  generateLinkBtn.addEventListener("click", async () => {
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
});