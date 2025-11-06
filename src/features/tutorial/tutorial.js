import steps from "./walkthroughSteps.js";

let state = {
  idx: 0,
  nodes: { backdrop: null, ring: null, tip: null }
};

export function startTutorial() {
  // Build overlay nodes once
  buildScaffold();
  // Attach controls
  window.addEventListener("resize", placeStep, { passive: true });
  window.addEventListener("keydown", onKey);

  // Begin on first valid step
  state.idx = -1;
  next(true);
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
  // OPTIONAL: tell backend the tutorial is completed
  // fetch(`${API_BASE}/users/tutorial-completed`, { method: "POST", headers:{Authorization:`Bearer ${token}`}});
}

/* ---------- DOM helpers ---------- */
function buildScaffold() {
  // Backdrop
  const backdrop = el("div", "rt-tour-backdrop");
  backdrop.addEventListener("click", () => next());
  document.body.appendChild(backdrop);

  // Highlight ring
  const ring = el("div", "rt-tour-highlight");
  document.body.appendChild(ring);

  // Tooltip
  const tip = el("div", "rt-tour-tooltip");
  tip.innerHTML = `
    <div class="rt-tour-text"></div>
    <div class="rt-tour-actions">
      <button class="rt-tour-btn rt-tour-btn-ghost" data-act="skip">Skip</button>
      <button class="rt-tour-btn rt-tour-btn-ghost" data-act="prev">Back</button>
      <button class="rt-tour-btn rt-tour-btn-primary" data-act="next">Next</button>
    </div>
  `;
  tip.addEventListener("click", (e) => {
    const act = e.target?.dataset?.act;
    if (act === "skip") finish();
    else if (act === "prev") prev();
    else if (act === "next") next();
  });
  document.body.appendChild(tip);

  state.nodes = { backdrop, ring, tip };
}

function teardown() {
  window.removeEventListener("resize", placeStep);
  window.removeEventListener("keydown", onKey);
  Object.values(state.nodes).forEach(n => n?.remove());
  state.nodes = { backdrop: null, ring: null, tip: null };
}

/* ---------- Layout ---------- */
function placeStep(firstRun = false) {
  const step = steps[state.idx];
  if (!step) return;
  const target = query(step.selector);
  if (!target) return next(); // selector missing → skip

  const rect = target.getBoundingClientRect();
  const ring = state.nodes.ring;
  ring.style.left = `${rect.left - 6 + window.scrollX}px`;
  ring.style.top  = `${rect.top  - 6 + window.scrollY}px`;
  ring.style.width  = `${rect.width  + 12}px`;
  ring.style.height = `${rect.height + 12}px`;

  const tip = state.nodes.tip;
  tip.querySelector(".rt-tour-text").textContent = step.text;

  // Position tooltip
  const gap = 10;
  let top = rect.top + window.scrollY;
  let left = rect.left + window.scrollX;
  switch ((step.placement || "bottom").toLowerCase()) {
    case "top":    top -= (tip.offsetHeight || 120) + gap; break;
    case "right":  left += rect.width + gap; break;
    case "left":   left -= (tip.offsetWidth || 320) + gap; break;
    default:       top += rect.height + gap; break; // bottom / center
  }
  // Center placement support
  if (step.placement === "center") {
    const w = tip.offsetWidth  || 320;
    const h = tip.offsetHeight || 120;
    top  = window.scrollY + (window.innerHeight - h)/2;
    left = window.scrollX + (window.innerWidth  - w)/2;
  }
  tip.style.top = `${Math.max(window.scrollY + 12, top)}px`;
  tip.style.left = `${Math.max(window.scrollX + 12, left)}px`;

  // Button text for last step
  const nextBtn = tip.querySelector('[data-act="next"]');
  nextBtn.textContent = (state.idx === steps.length - 1) ? "Finish" : "Next";

  // Auto-scroll target into view on first paint of step
  if (!firstRun) target.scrollIntoView({ block: "center", behavior: "smooth" });
}

/* ---------- Utils ---------- */
function query(sel) { try { return document.querySelector(sel); } catch { return null; } }
function el(tag, cls) { const n = document.createElement(tag); if (cls) n.className = cls; return n; }
