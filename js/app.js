// ==============================
// Simple staff PIN (change it)
// ==============================
const STAFF_PIN = "5655";

// keep recent intakes on THIS device only (not synced)
const MAX_LOCAL_HISTORY = 25;
function saveLocalIntake(intake) {
  try {
    const k = "intakeHistory";
    const arr = JSON.parse(localStorage.getItem(k) || "[]");
    arr.unshift(intake);
    localStorage.setItem(k, JSON.stringify(arr.slice(0, MAX_LOCAL_HISTORY)));
  } catch {}
}
// ADD THIS DIRECTLY UNDER saveLocalIntake(...) — do not modify saveLocalIntake.
function buildAutoSavedIntake(outcomeId){
  const tree = TREES[state.activeTreeKey] || {};
  const outcomeNode = tree.nodes?.[outcomeId] || {};
  return {
    // quick filters
    topic: state.activeTreeKey || "",
    outcomeId,
    outcomeTitle: outcomeNode.title || "—",
    priority: outcomeNode.priority || "—",

    // timing
    when: new Date().toISOString(),
    visit: {
      broughtInFor: state.visit?.broughtInFor || "",
      startTime: state.visit?.startTime || Date.now(),
      endTime: Date.now()
    },

    // identity / vehicle (derived from identity fields)
    identity: structuredClone(state.identity),
    vehicle: {
      year: state.identity?.year || "",
      make: state.identity?.make || "",
      model: state.identity?.model || "",
      mileage: state.identity?.mileage || "",
      vin: state.identity?.vin || "",
      plate: state.identity?.plate || ""
    },

    // Q/A details
    trail: structuredClone(state.trail),
    answers: structuredClone(state.answers),

    // optional shop field
    ro: state.visit?.ro || ""
  };
}


// ==============================
// Staff mode helpers (NEW)
// - Reads from intakeHistory (auto-saved on outcome)
// ==============================
function enterStaffMode(){
  const pin = prompt("Staff PIN:");
  if (pin === STAFF_PIN) {
    state.isStaff = true;    // ✅ now marked as staff
    renderStaffView();
  } else {
    alert("Incorrect PIN");
  }
}


function exitStaffMode(){
  state.isStaff = false;     // ✅ staff mode off
  renderLanding();
}



function renderStaffView(){
  const k = "intakeHistory";
  const data = JSON.parse(localStorage.getItem(k) || "[]");

  // Newest first
  data.sort((a, b) =>
    new Date(b.visit?.startTime || b.when) - new Date(a.visit?.startTime || a.when)
  );

  const rows = data.map((x, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${x.ro || "—"}</td>
      <td>
        ${(x.identity?.year || x.vehicle?.year || "—")}
        ${(x.identity?.make || x.vehicle?.make || "")}
        ${(x.identity?.model || x.vehicle?.model || "")}
      </td>
      <td>${(window.TREES?.[x.topic]?.title || x.topic || "—")}</td>
      <td>${new Date(x.visit?.startTime || x.when).toLocaleString()}</td>
      <td><button class="btn" onclick='viewIntake(${i})'>Open</button></td>
    </tr>
  `).join("");

  const table = data.length
    ? `<table class="table">
         <thead>
           <tr><th>#</th><th>RO</th><th>Vehicle</th><th>Topic</th><th>Time</th><th></th></tr>
         </thead>
         <tbody>${rows}</tbody>
       </table>`
    : "<div class='muted'>No intakes saved on this device yet.</div>";

  const container = document.getElementById("view");
  if (container) {
    container.innerHTML = `
      <div class="card">
        <h2>Staff — Recent Intakes (this device)</h2>
        ${table}
        <div class="actions" style="margin-top:12px">
          <button class="btn secondary" onclick="exitStaffMode()">Exit</button>
        </div>
      </div>`;
  }
}


function viewIntake(idx){
  const k = "intakeHistory";
  const data = JSON.parse(localStorage.getItem(k) || "[]");
  const x = data[idx]; 
  if (!x) return;

  // Build a readable Q&A trail; fall back to raw answers if the trail isn't present
  const answersSummary = Array.isArray(x.trail) && x.trail.length
    ? x.trail
        .filter(step => step.type !== "outcome")
        .map((step, i) => {
          if (step.choiceLabel) return `${i+1}. ${step.prompt} — ${step.choiceLabel}`;
          if (step.multi && step.multi.length) return `${i+1}. ${step.prompt} — ${step.multi.join(", ")}`;
          return `${i+1}. ${step.prompt}`;
        })
        .join("<br>")
    : (Object.keys(x.answers || {}).length 
        ? escapeHtml(JSON.stringify(x.answers, null, 2)) 
        : "—");

  // Prefer identity fields for vehicle, fall back to any old vehicle field
  const year  = x.identity?.year  || x.vehicle?.year  || "—";
  const make  = x.identity?.make  || x.vehicle?.make  || "";
  const model = x.identity?.model || x.vehicle?.model || "";

  const created = x.visit?.startTime 
    ? new Date(x.visit.startTime).toLocaleString() 
    : (x.when ? new Date(x.when).toLocaleString() : "—");

  document.querySelector("#view").innerHTML = `
    <div class="card">
      <div class="muted">Outcome</div>
      <h2 style="margin:6px 0 10px">
        ${x.outcomeTitle || "Intake Summary"} ${x.ro ? `(RO: ${x.ro})` : ""}
      </h2>
      <div class="row"><span class="tag">Priority: ${x.priority || "—"}</span></div>

      <div class="two-col">
        <div>
          <div class="muted">Customer's own words</div>
          <div class="card" style="margin-top:6px">
            ${escapeHtml(x.visit?.broughtInFor || "—")}
          </div>

          <div class="row"></div>
          <div class="muted">Structured answers</div>
          <div class="card" style="margin-top:6px; line-height:1.6">
            ${answersSummary || "—"}
          </div>
        </div>

        <div>
          <div class="muted">Vehicle</div>
          <div class="card" style="margin-top:6px">
            ${kv("Name", x.identity?.name || "—")}
            ${kv("Phone", x.identity?.phone || "—")}
            ${kv("Email", x.identity?.email || "—")}
            ${kv("Year/Make/Model", `${year} ${make} ${model}`.trim())}
            ${kv("Mileage", x.identity?.mileage || x.vehicle?.mileage || "—")}
            ${kv("VIN", x.identity?.vin || x.vehicle?.vin || "—")}
            ${kv("Plate", x.identity?.plate || x.vehicle?.plate || "—")}
            ${kv("Created", created)}
          </div>
        </div>
      </div>

      <div class="actions">
        <button class="btn" onclick="window.print()">Print</button>
        <button class="btn secondary" onclick="renderStaffView()">Back</button>
      </div>
    </div>`;
}




// ==============================
// Your TREES (unchanged)
// ==============================

// Define your intake trees here. Easy to expand without touching app.js.
// You can add more topics by following the same structure.

window.TREES = {
  overheating: {
    title: "Overheating",
    entry: "q1",
    nodes: {
      q1: {
        type: "single",
        prompt: "When did the overheating start?",
        options: [
          { label: "Today / sudden", next: "q2" },
          { label: "Last few days",  next: "q2" },
          { label: "Weeks or longer",next: "q2" }
        ]
      },
      q2: {
        type: "single",
        prompt: "When does it overheat?",
        options: [
          { label: "Only while idling/parked", next: "q3" },
          { label: "Only while driving",       next: "q4" },
          { label: "All the time",             next: "q5" }
        ]
      },
      q3: {
        type: "single",
        prompt: "Do you notice the cooling fan running?",
        options: [
          { label: "No / not sure", next: "o_fan" },
          { label: "Yes, it's running", next: "q5" }
        ]
      },
      q4: {
        type: "single",
        prompt: "Does it happen mostly at highway speeds?",
        options: [
          { label: "Yes, highway", next: "o_restriction" },
          { label: "No, city speeds", next: "q5" }
        ]
      },
      q5: {
        type: "multi",
        prompt: "Select any that apply:",
        options: [
          { label: "Coolant low or leaks seen", key: "coolant_low" },
          { label: "Steam or sweet smell",      key: "steam" },
          { label: "Heater blows cold at idle", key: "heater_cold" },
          { label: "Temp gauge spikes randomly",key: "spikes" }
        ],
        next: "o_summary"
      },
      o_fan: {
        type: "outcome",
        title: "Cooling fan inoperative suspected",
        notes: [
          "Overheats at idle + fan not observed.",
          "Advise fan circuit diagnosis (relay/fuse/motor/sensor)."
        ],
        priority: "High"
      },
      o_restriction: {
        type: "outcome",
        title: "Coolant flow issue, Possible bad water pump, Thermostat or coolant restriction suspected",
        notes: [
          "Overheats under load/highway.",
          "Possible clogged radiator, airflow restriction, failing water pump, or thermostat issue."
        ],
        priority: "Moderate"
      },
      o_summary: {
        type: "outcome",
        title: "General overheating complaint",
        notes: ["Multiple symptoms selected; see checklist."],
        priority: "High"
      }
    }
  },

  brakes: {
    title: "Brakes (noise/performance)",
    entry: "b1",
    nodes: {
      b1: {
        type: "single",
        prompt: "What best describes the brake concern?",
        options: [
          { label: "Squeal/squeak",            next: "b2" },
          { label: "Grinding",                 next: "o_grind" },
          { label: "Vibration/pulsation",      next: "o_rotors" },
          { label: "Soft or sinking pedal",    next: "o_hydraulic" }
        ]
      },
      b2: {
        type: "single",
        prompt: "Noise mostly at low speed, light braking?",
        options: [
          { label: "Yes", next: "o_glaze" },
          { label: "No",  next: "o_inspect" }
        ]
      },
      o_glaze: {
        type: "outcome",
        title: "Pad glaze or light hardware noise suspected",
        notes: ["Squeal at light pressure; may need pad service/shims."],
        priority: "Low"
      },
      o_inspect: {
        type: "outcome",
        title: "Brake inspection recommended",
        notes: ["Noise reported; verify pads/rotors/hardware, check debris."],
        priority: "Moderate"
      },
      o_grind: {
        type: "outcome",
        title: "Metal-on-metal likely",
        notes: ["Grinding; risk of rotor damage. Minimize driving."],
        priority: "Critical"
      },
      o_rotors: {
        type: "outcome",
        title: "Warped/uneven rotors suspected",
        notes: ["Pulsation under braking; measure rotor runout/thickness."],
        priority: "Moderate"
      },
      o_hydraulic: {
        type: "outcome",
        title: "Hydraulic issue suspected",
        notes: ["Soft/sinking pedal; check fluid leaks, master cylinder, ABS unit."],
        priority: "Critical"
      }
    }
  }
};

// ---------- Utilities ----------
const $ = (sel) => document.querySelector(sel);
const view = $("#view");

function escapeHtml(s){ return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function fmtDateTime(ts) { return new Date(ts).toLocaleString(); }

// ---------- App State ----------
// ---------- App State ----------
const state = {
  isStaff: false,   // tracks if staff is logged in
  activeTreeKey: null,
  trail: [],
  answers: {},
  identity: { name:"", phone:"", email:"", year:"", make:"", model:"", mileage:"", vin:"", plate:"" },
  visit: { broughtInFor:"", startTime: Date.now() }
};


function progressPct() {
  if (!state.activeTreeKey) return 0;
  const steps = state.trail.filter(x => x.type !== "outcome").length;
  return Math.min(100, Math.round((steps / 4) * 100));
}

// ---------- Landing ----------
function renderLanding(){
  // Only render submissions if staff
  const submissionsSection = state.isStaff ? `
    <div class="divider"></div>
    <div class="card">
      <div class="muted">Saved Intakes on this device (manual saves)</div>
      <h3 style="margin:6px 0 12px">Submissions</h3>
      <div id="subs">${renderSubmissionsList()}</div>
      <div class="muted" style="margin-top:6px">
        Note: Staff auto-saved outcomes are under the Staff button (PIN).
      </div>
    </div>
  ` : "";

view.innerHTML = `
  <div class="card">
    <div class="flex" style="justify-content:space-between">
      <div>
        <div class="muted">Welcome</div>
        <h2 style="margin:.2rem 0 0">We Are Here For you!</h2>
      </div>
    </div>
  </div>

  <div class="divider"></div>

    <div class="grid">
      <div class="card">
        <div class="muted">Step 1</div>
        <h3 style="margin:6px 0 12px">Customer Info</h3>
        ${renderIdentityForm()}
      </div>

      <div class="card">
        <div class="muted">Step 2</div>
        <h3 style="margin:6px 0 12px">Customer Concern</h3>
        <label>Describe in your own words</label>
        <textarea id="brought" placeholder="Example: Car is overheating at stop lights and heater blows cold at idle."></textarea>
        <div class="row">
          <label>Pick a starting topic</label>
          <select id="topic">
            <option value="">— choose —</option>
            ${Object.entries(TREES).map(([k,v]) => `<option value="${k}">${v.title}</option>`).join("")}
          </select>
        </div>
        <div class="actions">
          <button class="btn primary" onclick="startIntake()">Start Questions</button>
        </div>
      </div>
    </div>

    ${submissionsSection}
  `;

  // hydrate fields
  const id = state.identity;
  $("#name").value = id.name; $("#phone").value = id.phone; $("#email").value = id.email;
  $("#year").value = id.year; $("#make").value = id.make; $("#model").value = id.model;
  $("#mileage").value = id.mileage; $("#vin").value = id.vin; $("#plate").value = id.plate;
  $("#brought").value = state.visit.broughtInFor || "";
}

function renderIdentityForm(){
  return `
    <div class="grid">
      <div><label>Full name</label><input id="name" placeholder="First Last" oninput="state.identity.name=this.value"/></div>
      <div><label>Phone</label><input id="phone" placeholder="(555) 123-4567" oninput="state.identity.phone=this.value"/></div>
      <div><label>Email</label><input id="email" placeholder="you@example.com" oninput="state.identity.email=this.value"/></div>
      <div><label>Year</label><input id="year" placeholder="2015" oninput="state.identity.year=this.value"/></div>
      <div><label>Make</label><input id="make" placeholder="Toyota" oninput="state.identity.make=this.value"/></div>
      <div><label>Model</label><input id="model" placeholder="Camry" oninput="state.identity.model=this.value"/></div>
      <div><label>Mileage</label><input id="mileage" placeholder="123,456" oninput="state.identity.mileage=this.value"/></div>
      <div><label>VIN (optional)</label><input id="vin" placeholder="1HGCM82633A..." oninput="state.identity.vin=this.value"/></div>
      <div><label>Plate (optional)</label><input id="plate" placeholder="ABC-1234" oninput="state.identity.plate=this.value"/></div>
    </div>
  `;
}

// ---------- Questions ----------
function renderQuestion(nodeId){
  const tree = TREES[state.activeTreeKey];
  const node = tree.nodes[nodeId];

  const progress = progressPct();
  const optionsHtml = (node.options || []).map((opt,i) => {
    if (node.type === "single") {
      return `<button class="btn" style="width:100%" onclick="answerSingle('${nodeId}',${i})">${opt.label}</button>`;
    } else {
      const key = opt.key || `${nodeId}_${i}`;
      const checked = state.answers[key] ? "checked" : "";
      return `
        <label style="display:flex;gap:10px;align-items:flex-start">
          <input type="checkbox" ${checked} onchange="toggleMulti('${key}', this.checked)"/>
          <span>${opt.label}</span>
        </label>`;
    }
  }).join("");

  const nextBtn = node.type === "multi"
    ? `<button class="btn primary" onclick="goNextFromMulti('${nodeId}')">Next</button>`
    : "";

  view.innerHTML = `
    <div class="row">
      <div class="progress"><div class="bar" style="width:${progress}%"></div></div>
    </div>

    <div class="card">
      <div class="muted">Topic</div>
      <h3 style="margin:6px 0 12px">${tree.title}</h3>

      <div class="row">
        <div class="muted">Question</div>
        <h2 style="margin:6px 0 10px">${node.prompt}</h2>
        <div class="row">${optionsHtml}</div>
        <div class="actions">
          <button class="btn secondary" onclick="goBack()">Back</button>
          ${nextBtn}
          <button class="btn ghost" onclick="cancelIntake()">Cancel</button>
        </div>
      </div>
    </div>
  `;
}

function renderOutcome(nodeId){
  const tree = TREES[state.activeTreeKey];
  const node = tree.nodes[nodeId];

  const answersSummary = state.trail
    .filter(step => step.type !== "outcome")
    .map((step, idx) => {
      if (step.choiceLabel) return `${idx+1}. ${step.prompt} — ${step.choiceLabel}`;
      if (step.multi && step.multi.length) return `${idx+1}. ${step.prompt} — ${step.multi.join(", ")}`;
      return `${idx+1}. ${step.prompt}`;
    }).join("<br>");

  view.innerHTML = `
    <div class="card">
      <div class="muted">Outcome</div>
      <h2 style="margin:6px 0 10px">${node.title}</h2>
      <div class="row"><span class="tag">Priority: ${node.priority || "—"}</span></div>

      <div class="two-col">
        <div>
          <div class="muted">Customer's own words</div>
          <div class="card" style="margin-top:6px">
            ${escapeHtml(state.visit.broughtInFor || "—")}
          </div>

          <div class="row"></div>
          <div class="muted">Structured answers</div>
          <div class="card" style="margin-top:6px; line-height:1.6">
            ${answersSummary || "—"}
          </div>
        </div>
        <div>
          <div class="muted">Vehicle</div>
          <div class="card" style="margin-top:6px">
            ${kv("Name", state.identity.name || "—")}
            ${kv("Phone", state.identity.phone || "—")}
            ${kv("Email", state.identity.email || "—")}
            ${kv("Year/Make/Model", `${state.identity.year||"—"} ${state.identity.make||""} ${state.identity.model||""}`.trim())}
            ${kv("Mileage", state.identity.mileage || "—")}
            ${kv("VIN", state.identity.vin || "—")}
            ${kv("Plate", state.identity.plate || "—")}
            ${kv("Created", fmtDateTime(state.visit.startTime))}
          </div>

          <div class="row"></div>
          <div class="muted">Tech notes (auto from app)</div>
          <div class="card" style="margin-top:6px">
            ${(node.notes||[]).map(n=>`• ${n}`).join("<br>") || "—"}
          </div>
        </div>
      </div>

      <div class="actions" style="justify-content:space-between">
        <div class="flex">
          <button class="btn secondary" onclick="goBack()">Back</button>
          <button class="btn ghost" onclick="cancelIntake()">Cancel</button>
        </div>
        <div class="flex">
          <button class="btn" onclick="printSummary()">Print / Save PDF</button>
          <button class="btn" onclick="exportJSON()">Export JSON</button>
          <button class="btn primary" onclick="saveSubmission('${nodeId}')">Save Intake</button>
        </div>
      </div>
    </div>
  `;
}

function kv(k,v){ return `<div class="kv"><div class="muted">${k}</div><div class="hl">${v}</div></div>`; }

// ---------- Actions ----------


function startIntake(){
  const topic = $("#topic").value;
  state.visit.broughtInFor = $("#brought").value.trim();
  if(!topic){ alert("Pick a topic to begin."); return; }
  state.visit.startTime = Date.now();
  state.activeTreeKey = topic;
  state.trail = [];
  state.answers = {};
  renderQuestion(TREES[topic].entry);
}

function cancelIntake(){
  if(confirm("Cancel this intake? Your answers for this session will be cleared.")){
    state.activeTreeKey = null;
    state.trail = [];
    state.answers = {};
    renderLanding();
  }
}

function goBack(){
  if(state.trail.length === 0){ renderLanding(); return; }
  const last = state.trail.pop();
  if(last && last.prevNodeId){ renderQuestion(last.prevNodeId); return; }
  const prev = state.trail.length ? state.trail[state.trail.length-1] : null;
  if(prev && prev.nodeId) renderQuestion(prev.nodeId); else renderLanding();
}

function answerSingle(nodeId, idx){
  const tree = TREES[state.activeTreeKey];
  const node = tree.nodes[nodeId];
  const opt  = node.options[idx];

  // record this answer in the trail
  state.trail.push({
    type: "question",
    nodeId,
    prompt: node.prompt,
    choiceLabel: opt.label,
    prevNodeId: nodeId
  });

  const nextId = opt.next;
  const next   = tree.nodes[nextId];
  if (!next) {
    alert("End of branch.");
    renderLanding();
    return;
  }

  if (next.type === "outcome") {
    state.trail.push({ type: "outcome", nodeId: nextId });
    saveLocalIntake(buildAutoSavedIntake(nextId));   // save full record
    renderOutcome(nextId);
  } else {
    renderQuestion(nextId);
  }
}



function toggleMulti(key, checked){
  if (checked) state.answers[key] = true;
  else delete state.answers[key];
}

function goNextFromMulti(nodeId){
  const tree = TREES[state.activeTreeKey];
  const node = tree.nodes[nodeId];
  const labels = (node.options || [])
    .filter((opt, i) => state.answers[opt.key || `${nodeId}_${i}`])
    .map(opt => opt.label);

  state.trail.push({ type: "question", nodeId, prompt: node.prompt, multi: labels, prevNodeId: nodeId });

  const nextId = node.next;
  const next = tree.nodes[nextId];
  if (!next) { alert("End of branch."); renderLanding(); return; } // safety guard

  // ✅ Use the rich auto-save here
  if (next.type === "outcome") {
    state.trail.push({ type: "outcome", nodeId: nextId });
    saveLocalIntake(buildAutoSavedIntake(nextId));
    renderOutcome(nextId);
  } else {
    renderQuestion(nextId);
  }
}


function printSummary(){ window.print(); }

function exportJSON(){
  const payload = buildSubmissionPayload("__preview__");
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `intake_${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function saveSubmission(finalOutcomeId){
  const id = `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const payload = buildSubmissionPayload(id, finalOutcomeId);
  const all = loadAllSubmissions();
  all.unshift(payload);
  localStorage.setItem("auto_intakes", JSON.stringify(all));
  alert("Saved to this device.");
  renderLanding();
}

function buildSubmissionPayload(id, finalOutcomeId){
  const tree = TREES[state.activeTreeKey] || {};
  const outcomeTitle = finalOutcomeId ? (tree.nodes?.[finalOutcomeId]?.title || "—") : "—";
  return {
    id,
    identity: structuredClone(state.identity),
    visit: {...state.visit, endTime: Date.now(), topic: state.activeTreeKey, outcomeId: finalOutcomeId || null},
    trail: structuredClone(state.trail),
    answers: structuredClone(state.answers),
    outcomeTitle
  };
}

function loadAllSubmissions(){
  try { return JSON.parse(localStorage.getItem("auto_intakes") || "[]"); }
  catch { return []; }
}

function renderSubmissionsList(){
  const items = loadAllSubmissions();
  if (!items.length) return `<div class="muted">No submissions yet.</div>`;
  return `
    <div class="grid">
      ${items.map(s => `
        <div class="card">
          <div class="flex" style="justify-content:space-between">
            <div>
              <div class="muted">${new Date(s.visit.startTime).toLocaleString()}</div>
              <div style="margin-top:6px"><strong>${s.identity.name || "Customer"}</strong> — ${s.identity.year||""} ${s.identity.make||""} ${s.identity.model||""}</div>
              <div class="muted" style="margin-top:4px">${s.outcomeTitle}</div>
            </div>
            <div class="flex">
              <button class="btn" onclick='previewSaved(${JSON.stringify(s.id)})'>View</button>
              <button class="btn danger" onclick='deleteSaved(${JSON.stringify(s.id)})'>Delete</button>
            </div>
          </div>
        </div>
      `).join("")}
    </div>`;
}

function previewSaved(id){
  const all = loadAllSubmissions();
  const item = all.find(x => x.id === id);
  if(!item) return;
  const w = window.open("", "_blank");
  w.document.write(`<pre style="white-space:pre-wrap;font-family:ui-monospace,Menlo,Consolas">${escapeHtml(JSON.stringify(item, null, 2))}</pre>`);
  w.document.close();
}

function deleteSaved(id){
  if(!confirm("Delete this saved intake?")) return;
  const all = loadAllSubmissions().filter(x => x.id !== id);
  localStorage.setItem("auto_intakes", JSON.stringify(all));
  renderLanding();
}

// ---------- Clock + boot ----------
function tickClock(){ const el = $("#clock"); if (el) el.textContent = new Date().toLocaleString(); }
setInterval(tickClock, 1000);
tickClock();
renderLanding();
