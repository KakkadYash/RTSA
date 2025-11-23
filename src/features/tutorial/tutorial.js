//tutorial.js 
import steps from "./WalkThroughSteps.js";

let state = {
  idx: 0,
  nodes: { backdrop: null, ring: null, tip: null }
};

let controller = null;   // ← ADD THIS EXACTLY HERE

export function startTutorial() {
  // Build overlay nodes once
  buildScaffold();
  // ✅ Jump directly to openModalBtn spotlight when PROFILE tab is clicked
  // ✅ Force jump to profile tutorial whenever PROFILE tab is clicked
  document.addEventListener("click", (e) => {
    const link = e.target.closest("#profile");
    if (!link) return;

    // ✅ allow page navigation to happen
    document.body.classList.remove("rt-disable-all");

    // ✅ move tutorial index to the first profile step
    const targetStepIndex = steps.findIndex(s => s.id === "profile-open-modal");
    if (targetStepIndex === -1) return;

    state.idx = targetStepIndex;
  });

  // Modern: use AbortController for cleanup
  controller = new AbortController();
  const { signal } = controller;

  window.addEventListener("resize", placeStep, { passive: true, signal });
  window.addEventListener("keydown", onKey, { signal });

  // Begin on first valid step
  state.idx = 0;
  placeStep(true);
}


/* ---------- Controls ---------- */
function onKey(e) {
  if (e.key === "Escape") return finish();
  if (e.key === "ArrowRight" || e.key === "Enter") return next();
  if (e.key === "ArrowLeft") return prev();
}

function next(firstRun = false) {
  let i = state.idx;
  do { i++; } while (i < steps.length && !query(steps[i].selector));
  if (i >= steps.length) return finish();
  state.idx = i;
  placeStep(firstRun);
}

function prev() {
  let i = state.idx;
  do { i--; } while (i >= 0 && !query(steps[i].selector));
  if (i < 0) return; // stay
  state.idx = i;
  placeStep();
}

function finish() {
  teardown();

  try {
    const userId = localStorage.getItem("userId");
    if (userId) {
      fetch(`${window.API_BASE}/users/tutorial-completed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Id": userId
        }
      });
    }
  } catch (err) {
    console.warn("[TUTORIAL] Could not update completion:", err);
  }
}


/* ---------- DOM helpers ---------- */
function buildScaffold() {
  // Parent container for backdrop + ring
  const container = el("div", "rt-tour-container");

  // Backdrop (mask)
  const backdrop = el("div", "rt-tour-backdrop");
  backdrop.addEventListener("click", () => next());
  container.appendChild(backdrop);
  // Highlight ring
  const ring = el("div", "rt-tour-highlight");
  container.appendChild(ring);

  // Add container to DOM
  document.body.appendChild(container);


  // Tooltip (modern: via <template>)
  let tip;
  const tpl = document.getElementById("rt-tour-tooltip-template");
  if (tpl && 'content' in tpl) {
    tip = tpl.content.firstElementChild.cloneNode(true);
  } else {
    // Fallback (in case template is missing)
    tip = el("div", "rt-tour-tooltip");
    tip.innerHTML = `
  <div class="rt-tour-text"></div>
  <div class="rt-tour-actions">

    <button
      class="
        rt-tour-btn
        rt-tour-btn-ghost
        button
        hover-animation
        click-animation
        btn-scale
        transition-fast
      "
      data-act="skip"
    >Skip</button>

    <button
      class="
        rt-tour-btn
        rt-tour-btn-ghost
        button
        hover-animation
        click-animation
        btn-scale
        transition-fast
      "
      data-act="prev"
    >Back</button>

    <button
      class="
        rt-tour-btn
        rt-tour-btn-primary
        button
        hover-animation
        click-animation
        btn-scale
        transition-fast
      "
      data-act="next"
    >Next</button>

  </div>
`;

  }

  tip.addEventListener("click", (e) => {
    const act = e.target?.dataset?.act;
    if (act === "skip") finish();
    else if (act === "prev") prev();
    else if (act === "next") next();
  });
  document.body.appendChild(tip);

  // Allow initial layout, then fade in (modern, smooth)
  requestAnimationFrame(() => {
    tip.classList.add("rt-tour-tooltip--visible");
  });

  state.nodes = { container, backdrop, ring, tip };
}

function teardown() {
  if (controller) {
    controller.abort();   // removes both listeners
    controller = null;
  }
  Object.values(state.nodes).forEach(n => n?.remove());
  state.nodes = { container: null, backdrop: null, ring: null, tip: null };

}

/* ---------- Layout ---------- */
function placeStep(firstRun = false) {
  const step = steps[state.idx];
  // 🔧 Dynamically sync aside width into CSS variable
  const aside = document.querySelector(".aside");
  if (aside) {
    document.documentElement.style.setProperty(
      "--aside-width",
      `${aside.offsetWidth}px`
    );
  }
  // ⭐ SPECIAL CASE: Wait until profile DOM is loaded
  if (step.id === "profile-open-modal" || step.id === "profile-open-modal-btn") {

    // If button DOES NOT exist yet → wait
    if (!document.querySelector("#openModalBtn")) {
      document.addEventListener(
        "profile-loaded",
        () => placeStep(true),
        { once: true }
      );
      return; // stop execution and wait
    }
  }

  // 🟡 Wait for profile page to finish loading
  if (step.id === "profile-open-modal") {
    const btn = document.querySelector("#openModalBtn");

    // If the button DOES NOT exist → wait
    if (!btn) {
      document.addEventListener("profile-loaded", () => {
        // Run step again when profile is ready
        placeStep(true);
      }, { once: true });

      return; // IMPORTANT: Stop executing spotlight logic
    }
  }

  // For full-screen welcome/intro steps, disable spotlight
  if (["welcome", "intro-message"].includes(step.id)) {
    if (state.nodes.backdrop) {
      state.nodes.backdrop.style.maskImage = "none";
      state.nodes.backdrop.style.webkitMaskImage = "none";
    }
  } else {
    // Use CSS-defined rectangular mask for guided steps
    if (state.nodes.backdrop) {
      state.nodes.backdrop.style.maskImage = "";
      state.nodes.backdrop.style.webkitMaskImage = "";
    }
  }

  if (!step) return;
  const target = query(step.selector);
  if (!target) return next(); // selector missing → skip

  // 🔒 Scroll lock ONLY for specific steps
  const lockSteps = ["welcome", "intro-message"];
  if (lockSteps.includes(step.id)) {
    document.body.classList.add("rt-scroll-lock");
  } else {
    document.body.classList.remove("rt-scroll-lock");
  }
  // Always show backdrop during guided steps
  if (state.nodes.backdrop) {
    state.nodes.backdrop.style.display = "block";
    requestAnimationFrame(() => (state.nodes.backdrop.style.opacity = "1"));
  }




  // CUSTOM SPOTLIGHT LOGIC — for all aside menu items
  // ------------------------------------------------------
  if (["profile-highlight", "profile-open-modal", "analytics-highlight"].includes(step.id)) {
    // 1) Special case: waiting for profile DOM (openModalBtn)
    if (step.id === "profile-open-modal") {
      const maybeBtn = document.querySelector("#openModalBtn");

      // If the button is NOT yet in DOM → wait for profile-loaded event
      if (!maybeBtn) {
        document.addEventListener("profile-loaded", () => placeStep(true), { once: true });
        return; // stop here and wait
      }
    }

    // 2) Normal behavior
    const target = query(step.selector);
    if (!target) return next();


    const rect = target.getBoundingClientRect();
    const ring = state.nodes.ring;
    const tip = state.nodes.tip;

    // Hide text completely during aside highlights
    const txt = tip.querySelector(".rt-tour-text");
    if (txt) txt.style.display = "none";

    // Tooltip layout (buttons only at bottom)
    tip.style.position = "fixed";
    tip.style.top = "128.5px";
    tip.style.left = "30%";
    tip.style.bottom = "5%";
    tip.style.background = "transparent";
    tip.style.boxShadow = "none";
    tip.style.display = "flex";
    tip.style.width = "100%";
    tip.style.flexDirection = "column";
    tip.style.justifyContent = "flex-end";

    // Buttons row styling
    const actions = tip.querySelector(".rt-tour-actions");
    actions.style.display = "flex";
    actions.style.gap = "8px";
    actions.style.width = "100%";
    actions.style.justifyContent = "space-evenly";

    // ✅ Position golden ring
    ring.style.left = `${rect.left - 8 + window.scrollX}px`;
    ring.style.top = `${rect.top - 8 + window.scrollY}px`;
    ring.style.width = `${rect.width + 16}px`;
    ring.style.height = `${rect.height + 16}px`;
    ring.style.display = "block";

    // ✅ Spotlight mask positioning
    if (state.nodes.backdrop) {
      const padding = 12;
      const width = rect.width + padding * 2;
      const height = rect.height + padding * 2;

      const left = rect.left + window.scrollX - padding;
      const top = rect.top + window.scrollY - padding;

      const backdrop = state.nodes.backdrop;

      backdrop.style.setProperty("--spot-left", `${left}px`);
      backdrop.style.setProperty("--spot-top", `${top}px`);
      backdrop.style.setProperty("--spot-width", `${width}px`);
      backdrop.style.setProperty("--spot-height", `${height}px`);

    }
    // --- Make ONLY the current aside link clickable ---
    document.body.classList.add("rt-disable-all");

    // Remove previous spot-active
    document.querySelectorAll(".rt-spot-active")
      .forEach(el => el.classList.remove("rt-spot-active"));

    // Add clickable access back ONLY to the current link
    target.classList.add("rt-spot-active");

    return; // skip default layout
  }
  else {
    // Re-enable whole page for non-aside steps
    document.body.classList.remove("rt-disable-all");
    document.querySelectorAll(".rt-spot-active")
      .forEach(el => el.classList.remove("rt-spot-active"));

    // ⭐ Restore tooltip text for normal steps
    const tip = state.nodes.tip;
    const txt = tip.querySelector(".rt-tour-text");
    if (txt) {
      txt.style.display = "block";
    }

    // ⭐ Restore tooltip default styling
    tip.style.background = "var(--rt-color-bg)";
    tip.style.boxShadow = "";
    tip.style.width = "";
    tip.style.flexDirection = "";
    tip.style.justifyContent = "";
    tip.style.position = "absolute";
    tip.style.bottom = "";
    tip.style.left = "";
    tip.style.top = "";
    tip.style.display = "";

    // ⭐ Restore button row layout
    const actions = tip.querySelector(".rt-tour-actions");
    if (actions) {
      actions.style.display = "";
      actions.style.gap = "";
      actions.style.width = "";
      actions.style.justifyContent = "";
    }

    // ⭐ Restore all buttons to original state
    const buttons = tip.querySelectorAll(".rt-tour-btn");
    buttons.forEach(btn => {
      btn.style.position = "";
      btn.style.bottom = "";
      btn.style.left = "";
      btn.style.right = "";
      btn.style.top = "";
      btn.style.background = "";
      btn.style.boxShadow = "";
      btn.style.width = "";
      btn.style.flex = "";
    });
  }



  const rect = target.getBoundingClientRect();
  const ring = state.nodes.ring;
  ring.style.left = `${rect.left - 6 + window.scrollX}px`;
  ring.style.top = `${rect.top - 6 + window.scrollY}px`;
  ring.style.width = `${rect.width + 12}px`;
  ring.style.height = `${rect.height + 12}px`;

  const tip = state.nodes.tip;
  tip.querySelector(".rt-tour-text").textContent = step.text;

  if (!step.disableAutoPosition) {
    // Position tooltip (default behavior)
    const gap = 10;
    let top = rect.top + window.scrollY;
    let left = rect.left + window.scrollX;

    switch ((step.placement || "bottom").toLowerCase()) {
      case "top": top -= (tip.offsetHeight || 120) + gap; break;
      case "right": left += rect.width + gap; break;
      case "left": left -= (tip.offsetWidth || 320) + gap; break;
      default: top += rect.height + gap; break;
    }

    if (step.placement === "center") {
      const w = tip.offsetWidth || 320;
      const h = tip.offsetHeight || 120;
      top = window.scrollY + (window.innerHeight - h) / 2;
      left = window.scrollX + (window.innerWidth - w) / 2;
    }

    tip.style.top = `${Math.max(window.scrollY + 12, top)}px`;
    tip.style.left = `${Math.max(window.scrollX + 12, left)}px`;
  }

  // Button text for last step
  const nextBtn = tip.querySelector('[data-act="next"]');
  nextBtn.textContent = (state.idx === steps.length - 1) ? "Finish" : "Next";

  // Auto-scroll target into view on first paint of step
  if (!firstRun) target.scrollIntoView({ block: "center", behavior: "smooth" });
}

/* ---------- Utils ---------- */
function query(sel) { try { return document.querySelector(sel); } catch { return null; } }
function el(tag, cls) { const n = document.createElement(tag); if (cls) n.className = cls; return n; }
