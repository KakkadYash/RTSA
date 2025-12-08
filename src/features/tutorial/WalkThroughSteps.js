// WalkThroughSteps.js
export default [

  /* ------------------ INTRO ------------------ */

  {
    id: "welcome",
    selector: "body",
    placement: "center",
    text: `
      Welcome to Reaction Technologies — where innovation meets athletic excellence.
      You’re now officially part of a community leading a new era in sports performance.
      Let’s push the boundaries of what’s possible and elevate your game.
    `
  },

  {
    id: "intro-message",
    selector: "body",
    placement: "center",
    text: `
      This short tutorial will guide you through the platform and show you how to use
      real-time AI analytics to grow faster, train smarter, and perform safer.
    `
  },

  /* ------------------ SIDEBAR HIGHLIGHTS ------------------ */
  /* ONLY PROFILE + ANALYTICS */

  {
    id: "profile-highlight",
    selector: "#profile",
    placement: "right",
    text: `This is your Profile section — update your personal and athletic details here to improve measurement accuracy.`
  },

  {
    id: "analytics-highlight",
    selector: "#analytics",
    placement: "right",
    text: `
      Welcome to the Analytics Hub — your performance command center.
      Dive into head-angle precision, acceleration curves, footwork quality,
      jump metrics, and more.
    `
  },

  /* ------------------ COMPLETION ------------------ */

  {
    id: "done",
    selector: "body",
    placement: "center",
    text: `You're all set! Start exploring and improving your game.`
  }
];
