// WalkThroughSteps.js

export default [
  {
    id: "welcome",
    selector: "body",
    placement: "center",
    text: `Welcome to Reaction Technologies — where innovation meets athletic excellence.
You’re now officially part of a community leading a new era in sports performance, redefining how athletes train, measure progress, and stay safer on the field.
Let’s push the boundaries of what’s possible and elevate your game.`
  },
  {
    id: "intro-message",
    selector: "body",
    placement: "center",
    text: `This short tutorial will guide you through the core features, help you upload your first video, 
and show you how to harness real-time, data-driven insights designed for serious growth. 
We’re thrilled to have you with us — together, we’re shaping the future of sports technology.`
  },

  {
    id: "upload",
    selector: "#upload-video-btn, #btnUploadVideo, button[data-role='upload']",
    placement: "right",
    text: `Start your journey by uploading a practice video.
Our system instantly processes movement, posture, speed, acceleration, and more — transforming raw footage into actionable, elite-level insights.`
  },

  {
    id: "analytics",
    selector: "#nav-analytics, a[href*='analytics'], #analytics-card",
    placement: "bottom",
    text: `This is the Analytics Hub — your command center for performance.
Dive into head-angle precision, acceleration curves, footwork quality, athletic score breakdowns, and step-by-step improvement insights — all powered by real-time AI analysis.`
  },

  {
    id: "history",
    selector: "#nav-history, a[href*='history']",
    placement: "bottom",
    text: `Your History section stores every uploaded session.
Track progress over time, revisit past analytics, compare performances, and see how your training is evolving rep by rep.`
  },

  {
    id: "profile-highlight",
    selector: "#profile",     // ← Your aside menu profile container ID
    customLayout: true,
  },


  {
    id: "drills",
    selector: "#nav-drills, a[href*='drillCatalog']",
    placement: "top",
    text: `Explore our curated Drill Catalog — packed with technique-driven challenges designed to sharpen footwork, posture, reaction time, and overall athletic output.
Train smarter with purpose-built routines aligned to your analytics.`
  },

  {
    id: "done",
    selector: ".tutorial-complete-marker",
    placement: "center",
    text: `You're all set.`
  }
];
