document.addEventListener("DOMContentLoaded", () => {

  /* ---------- PREVIEW MODAL LOGIC ---------- */
  const openPreviewBtn = document.getElementById("openPreviewButton");
  const closePreviewBtn = document.getElementById("closePreview");
  const modal = document.getElementById("reportModal");
  const reportFrame = document.getElementById("reportFrame");

  // Form fields mapped to report placeholders
  const fields = {
    email: document.getElementById("email"),
    phone: document.getElementById("phone"),
    handle: document.getElementById("handle"),
    hudl: document.getElementById("hudl"),
    bio: document.getElementById("bio"),
    position: document.getElementById("position"),
    school: document.getElementById("school"),
    class: document.getElementById("class"),
  };

  let reportDoc = null;

  openPreviewBtn.addEventListener("click", () => {
    modal.classList.remove("hidden");
    reportFrame.src = "../../../src/features/report/report.html";

    reportFrame.onload = () => {
      reportDoc = reportFrame.contentDocument || reportFrame.contentWindow.document;
      updateReport();
      renderAchievements(); // Ensure achievements sync immediately
    };
  });

  closePreviewBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  // Update report in real-time as fields change
  Object.values(fields).forEach(input => {
    if (input) {
      input.addEventListener("input", () => {
        if (reportDoc) updateReport();
      });
    }
  });

  function updateReport() {
    if (!reportDoc) return;

    // Contact info section
    const contactGrid = reportDoc.querySelector(".contact-grid");
    if (contactGrid) {
      const pElements = contactGrid.querySelectorAll("p");
      if (pElements[0]) pElements[0].textContent = fields.email.value || "—";
      if (pElements[1]) pElements[1].textContent = fields.phone.value || "—";
      if (pElements[2]) pElements[2].textContent = fields.handle.value || "—";
      if (pElements[3]) {
        pElements[3].innerHTML = fields.hudl.value
          ? `<a href="${fields.hudl.value}" target="_blank"><img src="hudl-icon.png" alt="HUDL Icon" class="hudl-icon" /></a>`
          : `<img src="hudl-icon.png" alt="HUDL Icon" class="hudl-icon" />`;
      }
    }

    // Personal bio
    const bioSection = reportDoc.querySelector(".bio p");
    if (bioSection) bioSection.textContent = fields.bio.value || "—";

    // Athlete info line
    const headerProfile = reportDoc.querySelector(".profile div > p");
    if (headerProfile) {
      const sport = "Football";
      const parts = [sport];
      if (fields.position.value.trim()) parts.push(fields.position.value.trim());
      if (fields.school.value.trim()) parts.push(fields.school.value.trim());
      if (fields.class.value.trim()) parts.push(fields.class.value.trim());
      headerProfile.textContent = parts.join(" • ");
    }
  }


  /* ---------- ACHIEVEMENTS LOGIC ---------- */
  const openAchievementModalBtn = document.getElementById("openAchievementModal");
  const achievementModal = document.getElementById("achievementModal");
  const closeAchievementModalBtn = document.getElementById("closeAchievementModal");
  const saveAchievementBtn = document.getElementById("saveAchievement");
  const achievementList = document.getElementById("achievementList");

  let achievements = [];

  openAchievementModalBtn.addEventListener("click", () => {
    achievementModal.classList.remove("hidden");
  });

  closeAchievementModalBtn.addEventListener("click", () => {
    achievementModal.classList.add("hidden");
  });

  saveAchievementBtn.addEventListener("click", () => {
    const eventName = document.getElementById("achEvent").value.trim();
    const month = document.getElementById("achMonth").value;
    const year = document.getElementById("achYear").value;
    const desc = document.getElementById("achDesc").value.trim();

    if (!eventName || !month || !year) {
      alert("Please fill out event name, month, and year.");
      return;
    }

    achievements.push({ eventName, month, year, desc });

    // Clear form fields
    document.getElementById("achEvent").value = "";
    document.getElementById("achMonth").value = "";
    document.getElementById("achYear").value = "";
    document.getElementById("achDesc").value = "";

    achievementModal.classList.add("hidden");
    renderAchievements();
  });

  function renderAchievements() {
    // Update modal preview list
    achievementList.innerHTML = "";
    achievements.forEach(ach => {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${ach.eventName} - ${ach.month} ${ach.year}</strong>`;
      if (ach.desc) {
        const descP = document.createElement("p");
        descP.classList.add("achievement-desc");
        descP.textContent = ach.desc;
        li.appendChild(descP);
      }
      achievementList.appendChild(li);
    });

    // Update iframe list
    if (reportDoc) {
      const achSection = reportDoc.getElementById("achievementsList");
      if (achSection) {
        achSection.innerHTML = "";
        achievements.forEach(ach => {
          const li = reportDoc.createElement("li");
          li.innerHTML = `<strong>${ach.eventName} - ${ach.month} ${ach.year}</strong>`;
          if (ach.desc) {
            const descP = reportDoc.createElement("p");
            descP.classList.add("achievement-desc");
            descP.textContent = ach.desc;
            li.appendChild(descP);
          }
          achSection.appendChild(li);
        });
      }
    }
  }

  reportFrame.addEventListener("load", renderAchievements);


  /* ---------- SHARE MODAL LOGIC ---------- */
  const shareButton = document.getElementById("shareButton");
  const shareModal = document.getElementById("shareModal");
  const closeShareModal = document.getElementById("closeShareModal");
  const generateLinkBtn = document.getElementById("generateLinkBtn");
  const exportPdfBtn = document.getElementById("exportPdfBtn");

  shareButton.addEventListener("click", () => {
    shareModal.classList.remove("hidden");
  });

  closeShareModal.addEventListener("click", () => {
    shareModal.classList.add("hidden");
  });

  exportPdfBtn.addEventListener("click", () => {
    if (reportFrame && reportFrame.contentWindow) {
      reportFrame.contentWindow.print();
    }
  });

});
