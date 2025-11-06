// Order matters; each step points to an element in your UI.
// If a selector isn't found, the step is auto-skipped.
export default [
  { id: "welcome", selector: "header .title, .header .title, h1.title", placement: "bottom",
    text: "Welcome to Reaction Analytics! Let’s take a 30-second tour." },

  { id: "upload", selector: "#upload-video-btn, #btnUploadVideo, button[data-role='upload']",
    placement: "right",
    text: "Upload your practice video here to start automated analysis." },

  { id: "analytics", selector: "#nav-analytics, a[href*='analytics'], #analytics-card",
    placement: "bottom",
    text: "Open Analytics to view head angle, speed, acceleration, and more." },

  { id: "history", selector: "#nav-history, a[href*='history']",
    placement: "bottom",
    text: "History stores all your past uploads and reports." },

  { id: "profile", selector: "#nav-profile, a[href*='profile']",
    placement: "left",
    text: "Keep your athlete profile updated for more accurate metrics." },

  { id: "drills", selector: "#nav-drills, a[href*='drillCatalog']",
    placement: "top",
    text: "Explore drill catalog for targeted improvements." },

  { id: "done", selector: "body", placement: "center",
    text: "You’re all set! You can re-open this tutorial anytime from the Help menu." }
];
