document.addEventListener("DOMContentLoaded", () => {

  /* =====================================================
     PREVIEW MODAL LOGIC
  ===================================================== */
  const openPreviewBtn = document.getElementById("openPreviewButton");
  const modal = document.getElementById("reportModal");
  const reportFrame = document.getElementById("reportFrame");
  const shareModal = document.getElementById("shareModal");


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
  let reportLoaded = false;

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

  // Update report fields live
  Object.values(fields).forEach(input => {
    if (input) {
      input.addEventListener("input", () => {
        if (reportLoaded) updateReport();
      });
    }
  });

  function updateReport() {
    if (!reportDoc) return;

    const contactGrid = reportDoc.querySelector(".contact-grid");
    if (contactGrid) {
      const p = contactGrid.querySelectorAll("p");
      if (p[0]) p[0].textContent = fields.email?.value || "—";
      if (p[1]) p[1].textContent = fields.phone?.value || "—";
      if (p[2]) p[2].textContent = fields.handle?.value || "—";
    }

    const bioSection = reportDoc.querySelector(".bio p");
    if (bioSection) bioSection.textContent = fields.bio?.value || "—";

    const headerProfile = reportDoc.querySelector(".profile div > p");
    if (headerProfile) {
      const sport = "Football";
      const parts = [sport];
      if (fields.position?.value.trim()) parts.push(fields.position.value.trim());
      if (fields.school?.value.trim()) parts.push(fields.school.value.trim());
      if (fields.class?.value.trim()) parts.push(fields.class.value.trim());
      headerProfile.textContent = parts.join(" • ");
    }
  }

  /* =====================================================
     ACHIEVEMENTS LOGIC
  ===================================================== */
  const openAchievementModalBtn = document.getElementById("openAchievementModal");
  const achievementModal = document.getElementById("achievementModal");
  const closeAchievementModalBtn = document.getElementById("closeAchievementModal");
  const saveAchievementBtn = document.getElementById("saveAchievement");
  const achievementList = document.getElementById("achievementList");
  let achievements = [];

  openAchievementModalBtn?.addEventListener("click", () => {
    achievementModal?.classList.remove("hidden");
  });
  closeAchievementModalBtn?.addEventListener("click", () => {
    achievementModal?.classList.add("hidden");
  });

  saveAchievementBtn?.addEventListener("click", () => {
    const eventName = document.getElementById("achEvent")?.value.trim();
    const month = document.getElementById("achMonth")?.value;
    const year = document.getElementById("achYear")?.value;
    const desc = document.getElementById("achDesc")?.value.trim();

    if (!eventName || !month || !year) {
      alert("Please fill out event name, month, and year.");
      return;
    }

    achievements.push({ eventName, month, year, desc });

    ["achEvent", "achMonth", "achYear", "achDesc"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    achievementModal?.classList.add("hidden");
    renderAchievements();
  });

  function renderAchievements() {
    if (achievementList) {
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
    }

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

});
