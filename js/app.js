/***** Staff unlock + encrypted history (AES-GCM) *****
 * Works on HTTPS or http://localhost (WebCrypto requirement)
 * Stores encrypted data under localStorage key "intakeHistoryEnc"
 ********************************************************/

const ENC_STORAGE_KEY = "intakeHistoryEnc";   // { v, salt, iv, cipher, updatedAt }
const LOCK_STATE_KEY  = "staffLockState";     // { tries, lockedUntil, backoff }
const ENC_VERSION     = 1;
const PBKDF2_ITER     = 250000;
const GCM_IV_BYTES    = 12;
const SALT_BYTES      = 16;

let STAFF_UNLOCKED  = false;
let _cryptoKey      = null;   // in-memory only
let _historyCache   = [];     // decrypted for current session
let _recoveryKey    = null;   // memory-only; set after recovery or when you set a code

const te = new TextEncoder();
const td = new TextDecoder();

// ===== Encrypted pending store for locked mode =====
// When staff is locked, we encrypt intakes with this fallback secret,
// into a separate encrypted blob. On staff unlock, we decrypt + merge
// into the main history store and delete the pending blob.
const PENDING_ENC_STORAGE_KEY = "intakePendingEnc";       // { v, salt, iv, cipher, updatedAt }

// Pending-store helpers (structured just like the main enc store)
function getPendingEncStore(){ try { return JSON.parse(localStorage.getItem(PENDING_ENC_STORAGE_KEY) || "null"); } catch { return null; } }
function setPendingEncStore(obj){ localStorage.setItem(PENDING_ENC_STORAGE_KEY, JSON.stringify(obj)); }

// ===== Recovery store (second encrypted copy under a Recovery Code) =====
const RECOVERY_STORAGE_KEY = "intakeHistoryEncRecovery"; // { v, salt, iv, cipher, updatedAt }

function getRecStore(){ try { return JSON.parse(localStorage.getItem(RECOVERY_STORAGE_KEY) || "null"); } catch { return null; } }
function setRecStore(obj){ localStorage.setItem(RECOVERY_STORAGE_KEY, JSON.stringify(obj)); }

async function encryptRecovery(arr, key, saltB64){
  const iv = randomBytes(GCM_IV_BYTES);
  const data = te.encode(JSON.stringify(arr));
  const cipher = await crypto.subtle.encrypt({ name:"AES-GCM", iv }, key, data);
  setRecStore({ v: ENC_VERSION, salt: saltB64, iv: bufToB64(iv), cipher: bufToB64(cipher), updatedAt: nowMs() });
}
async function decryptRecovery(key){
  const store = getRecStore();
  if(!store) return null;
  const plain = await crypto.subtle.decrypt({ name:"AES-GCM", iv: b64ToBuf(store.iv) }, key, b64ToBuf(store.cipher));
  return JSON.parse(td.decode(plain) || "[]");
}


async function encryptPending(arr, key, saltB64){
  const iv = randomBytes(GCM_IV_BYTES);
  const data = te.encode(JSON.stringify(arr));
  const cipher = await crypto.subtle.encrypt({ name:"AES-GCM", iv }, key, data);
  setPendingEncStore({ v: ENC_VERSION, salt: saltB64, iv: bufToB64(iv), cipher: bufToB64(cipher), updatedAt: nowMs() });
}
async function decryptPending(key){
  const store = getPendingEncStore();
  if(!store) return [];
  const plain = await crypto.subtle.decrypt({ name:"AES-GCM", iv: b64ToBuf(store.iv) }, key, b64ToBuf(store.cipher));
  return JSON.parse(td.decode(plain) || "[]");
}

// --- small helpers ---
function nowMs(){ return Date.now(); }
function bufToB64(buf){ return btoa(String.fromCharCode(...new Uint8Array(buf))); }
function b64ToBuf(b64){ return Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer; }
function randomBytes(n){ const u8 = new Uint8Array(n); crypto.getRandomValues(u8); return u8.buffer; }


// --- IndexedDB helpers for a non-extractable AES key (pending store) ---
const DB_NAME = 'intake-sec';
const STORE   = 'keys';
const PENDING_KEY_NAME = 'pending-v1';

function idbOpen(){
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
}
async function idbGet(key){
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readonly');
    const r  = tx.objectStore(STORE).get(key);
    r.onsuccess = () => res(r.result);
    r.onerror   = () => rej(r.error);
  });
}
async function idbSet(key, val){
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    const r  = tx.objectStore(STORE).put(val, key);
    r.onsuccess = () => res();
    r.onerror   = () => rej(r.error);
  });
}

// Create or fetch a non-extractable AES-GCM key for pending encryption.
async function getOrCreatePendingKey(){
  let key = await idbGet(PENDING_KEY_NAME);
  if (key) return key;
  key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    /* extractable */ false,
    ['encrypt','decrypt']
  );
  await idbSet(PENDING_KEY_NAME, key);
  return key;
}


async function migratePendingToHistory(){
  const p = getPendingEncStore();
  if(!p || !_cryptoKey) return;
  try {
    const pendingKey = await getOrCreatePendingKey();
    const pendingArr = await decryptPending(pendingKey);
    if (Array.isArray(pendingArr) && pendingArr.length) {
      await loadDecryptedHistory(); // ensure latest main cache
      _historyCache.unshift(...pendingArr);
      _historyCache = _historyCache.slice(0, MAX_LOCAL_HISTORY);
      await persistHistory(); // re-encrypt under staff key
    }
  } catch (e) {
    console.warn("Pending decrypt failed; skipping migration.", e);
  }
  localStorage.removeItem(PENDING_ENC_STORAGE_KEY);
}



function getLockState(){ try { return JSON.parse(localStorage.getItem(LOCK_STATE_KEY) || "{}"); } catch { return {}; } }
function setLockState(s){ localStorage.setItem(LOCK_STATE_KEY, JSON.stringify(s || {})); }

async function deriveKeyFromPass(pass, saltBuf){
  const base = await crypto.subtle.importKey("raw", te.encode(pass), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name:"PBKDF2", salt: saltBuf, iterations: PBKDF2_ITER, hash:"SHA-256" },
    base,
    { name:"AES-GCM", length:256 },
    false,
    ["encrypt","decrypt"]
  );
}
function getEncStore(){ try { return JSON.parse(localStorage.getItem(ENC_STORAGE_KEY) || "null"); } catch { return null; } }
function setEncStore(obj){ localStorage.setItem(ENC_STORAGE_KEY, JSON.stringify(obj)); }

async function encryptHistory(arr, key, saltB64){
  const iv = randomBytes(GCM_IV_BYTES);
  const data = te.encode(JSON.stringify(arr));
  const cipher = await crypto.subtle.encrypt({ name:"AES-GCM", iv }, key, data);
  setEncStore({ v: ENC_VERSION, salt: saltB64, iv: bufToB64(iv), cipher: bufToB64(cipher), updatedAt: nowMs() });
}
async function decryptHistory(key){
  const store = getEncStore();
  if(!store) return [];
  const plain = await crypto.subtle.decrypt({ name:"AES-GCM", iv: b64ToBuf(store.iv) }, key, b64ToBuf(store.cipher));
  return JSON.parse(td.decode(plain) || "[]");
}
async function ensureInitializedForPass(pass){
  let store = getEncStore();
  if(store){
    const key = await deriveKeyFromPass(pass, b64ToBuf(store.salt));
    const arr = await decryptHistory(key); // throws if wrong pass
    return { key, arr };
  } else {
    const salt = randomBytes(SALT_BYTES);
    const saltB64 = bufToB64(salt);
    const key = await deriveKeyFromPass(pass, salt);
    await encryptHistory([], key, saltB64);
    return { key, arr: [] };
  }
}

// --- header + modal UI helpers ---
function updateStaffUI(){
  const status = document.getElementById("staffStatus");
  const btnUnlock = document.getElementById("btnStaffUnlock");
  const btnLock = document.getElementById("btnStaffLock");
  if(!status || !btnUnlock || !btnLock) return;
  if(STAFF_UNLOCKED){
    status.textContent = "Staff Mode (Unlocked)";
    btnUnlock.style.display = "none";
    btnLock.style.display = "inline-block";
  } else {
    status.textContent = "Customer Mode (Locked)";
    btnUnlock.style.display = "inline-block";
    btnLock.style.display = "none";
  }
}
function showModal(show){
  const m = document.getElementById("staffLoginModal");
  if(!m) return;
  m.style.display = show ? "flex" : "none";
  const err = document.getElementById("staffLoginError");
  if(err) err.style.display = "none";
  if(show){ setTimeout(()=> document.getElementById("staffPassInput")?.focus(), 30); }
  if (show) setUnlockMode("pass");
  else { const input = document.getElementById("staffPassInput"); if(input) input.value = ""; }
}
function modalError(msg){ const err = document.getElementById("staffLoginError"); if(err){ err.textContent = msg; err.style.display = "block"; } }

function checkLockedOut(){ const s = getLockState(); return s.lockedUntil ? nowMs() < s.lockedUntil : false; }
function recordBadAttempt(){
  const s = getLockState();
  const tries = (s.tries || 0) + 1;
  if(tries >= 5){
    const extra = (s.backoff || 0) + 5*60*1000; // +5 min each round
    setLockState({ tries, backoff: extra, lockedUntil: nowMs()+extra });
  } else setLockState({ ...s, tries });
}

function clearLockout(){ setLockState({}); }

let _unlockMode = "pass"; // "pass" | "recovery"

function setUnlockMode(mode){
  _unlockMode = mode;
  const title   = document.querySelector("#staffLoginModal h3");
  const hint    = document.querySelector("#staffLoginModal p"); // fixed: grab the hint <p>
  const input   = document.getElementById("staffPassInput");
  const linkRec = document.getElementById("linkRecovery");
  const linkPass= document.getElementById("linkPass");

  if (mode === "recovery"){
    if (title) title.textContent = "Recovery Unlock";
    if (hint)  hint.textContent  = "Enter your Recovery Code to access saved intakes and set a new staff passphrase.";
    if (input) { input.value = ""; input.placeholder = "Recovery Code"; input.type = "password"; }
    if (linkRec)  linkRec.style.display = "none";
    if (linkPass) linkPass.style.display = "inline";
  } else {
    if (title) title.textContent = "Staff Unlock";
    if (hint)  hint.textContent  = "Enter your staff passphrase to unlock saved intakes.";
    if (input) { input.value = ""; input.placeholder = "Staff passphrase"; input.type = "password"; }
    if (linkRec)  linkRec.style.display = "inline";
    if (linkPass) linkPass.style.display = "none";
  }

  const err = document.getElementById("staffLoginError");
  if (err) err.style.display = "none";
}



// Don't auto-open the modal; only open it from the Unlock button
function requireStaffUnlockIfNeeded(){
  return !!STAFF_UNLOCKED;  // true if unlocked, false if locked (no modal)
}


// secure I/O helpers for history
async function loadDecryptedHistory(){
  if(!_cryptoKey) throw new Error("Staff is locked. Unlock first.");
  _historyCache = await decryptHistory(_cryptoKey);
  return _historyCache;
}

async function persistHistory(){
  if(!_cryptoKey) throw new Error("Staff is locked.");
  const saltB64 = getEncStore()?.salt || bufToB64(randomBytes(SALT_BYTES));
  await encryptHistory(_historyCache, _cryptoKey, saltB64);

  // If a recovery code is configured and we have the recovery key in memory this session,
  // also refresh the recovery-encrypted copy so it stays up to date.
  const rec = getRecStore();
  if (rec && _recoveryKey) {
    const recSalt = rec.salt || bufToB64(randomBytes(SALT_BYTES));
    await encryptRecovery(_historyCache, _recoveryKey, recSalt);
  }
}

async function setRecoveryCodeFlow(){
  if (!STAFF_UNLOCKED) { alert("Unlock Staff first."); return; }
  const code = prompt("Create a Recovery Code (min 8 characters):", "");
  if (!code || code.length < 8) { alert("Recovery Code must be at least 8 characters."); return; }

  // Derive key from code with a fresh salt
  const salt = randomBytes(SALT_BYTES);
  const saltB64 = bufToB64(salt);
  const key = await deriveKeyFromPass(code, salt);

  await loadDecryptedHistory(); // make sure _historyCache is current
  await encryptRecovery(_historyCache, key, saltB64);
  _recoveryKey = key; // keep for this session so it stays synced

  alert("Recovery Code set. Keep it safe!");
}

async function removeRecoveryCodeFlow(){
  if (!STAFF_UNLOCKED) { alert("Unlock Staff first."); return; }
  if (!getRecStore()) { alert("No Recovery Code is configured."); return; }
  if (!confirm("Remove Recovery Code and its encrypted backup?")) return;
  localStorage.removeItem(RECOVERY_STORAGE_KEY);
  _recoveryKey = null;
  alert("Recovery Code removed.");
}


// wire buttons AFTER DOM (don’t call renderLanding here)
window.addEventListener("DOMContentLoaded", ()=>{
  // Open/close modal
  document.getElementById("btnStaffUnlock")?.addEventListener("click", ()=> showModal(true));
  document.getElementById("btnStaffCancel")?.addEventListener("click", ()=> showModal(false));

  // Toggle between passphrase and recovery modes (moved out of Lock handler)
  document.getElementById("linkRecovery")?.addEventListener("click", (e)=>{ e.preventDefault(); setUnlockMode("recovery"); });
  document.getElementById("linkPass")?.addEventListener("click", (e)=>{ e.preventDefault(); setUnlockMode("pass"); });

  // Lock button
  document.getElementById("btnStaffLock")?.addEventListener("click", ()=>{
    STAFF_UNLOCKED = false;
    _cryptoKey = null;
    _historyCache = [];
    if (window.state) window.state.isStaff = false;
    updateStaffUI();
    if (typeof renderLanding === "function") renderLanding();
  });

  // Submit (handles both passphrase and recovery flows)
  document.getElementById("btnStaffSubmit")?.addEventListener("click", async ()=>{
    if(_unlockMode === "recovery"){
      // --- Recovery Unlock path ---
      if(checkLockedOut()) { modalError("Too many attempts. Try again later."); return; }
      const code = document.getElementById("staffPassInput")?.value || "";
      if(!code || code.length < 8){ modalError("Recovery Code must be at least 8 characters."); return; }

      const rec = getRecStore();
      if(!rec){ modalError("No Recovery Code is set on this device."); return; }

      try{
        const recKey = await deriveKeyFromPass(code, b64ToBuf(rec.salt));
        const arr = await decryptRecovery(recKey); // throws if wrong code

        // Prompt for NEW passphrase
        let newPass = prompt("Recovery successful. Enter a NEW staff passphrase (min 6 characters):", "");
        if(!newPass || newPass.length < 6){ modalError("New passphrase must be at least 6 characters."); return; }

        const salt = randomBytes(SALT_BYTES);
        const saltB64 = bufToB64(salt);
        const key = await deriveKeyFromPass(newPass, salt);
        _cryptoKey = key;
        _historyCache = Array.isArray(arr) ? arr : [];
        STAFF_UNLOCKED = true;

        await encryptHistory(_historyCache, _cryptoKey, saltB64);

        // Keep recovery copy in sync now that we have the recKey
        _recoveryKey = recKey;
        await persistHistory(); // also refreshes recovery copy if present

        clearLockout();
        showModal(false);
        updateStaffUI();

        // Pull in any pending (customer-mode) records
        await migratePendingToHistory();

        if(typeof renderStaffView === "function") renderStaffView();
      }catch(e){
        recordBadAttempt();
        modalError("Recovery Code incorrect.");
      }
      return;
    }

    // --- Normal Staff Unlock path ---
    if(checkLockedOut()) { modalError("Too many attempts. Try again later."); return; }
    const pass = document.getElementById("staffPassInput")?.value || "";
    if(!pass || pass.length < 6){ modalError("Use a passphrase of at least 6 characters."); return; }

    try{
      const { key, arr } = await ensureInitializedForPass(pass);
      _cryptoKey = key;
      _historyCache = arr;
      STAFF_UNLOCKED = true;

      await migratePendingToHistory();

      clearLockout();
      showModal(false);
      updateStaffUI();
      if(typeof renderStaffView === "function") renderStaffView();
    }catch(e){
      recordBadAttempt();
      modalError("Passphrase incorrect.");
    }
  });

  updateStaffUI();
});



// keep recent intakes on THIS device only (not synced)
const MAX_LOCAL_HISTORY = 25;

async function saveLocalIntake(intake){
  try {
    if(!intake.when) intake.when = Date.now();

    if (_cryptoKey) {
      // Staff unlocked → write to main encrypted history
      await loadDecryptedHistory();
      _historyCache.unshift(intake);
      _historyCache = _historyCache.slice(0, MAX_LOCAL_HISTORY);
      await persistHistory();
    } else {
      // Staff locked → encrypted pending (no repo secrets)
      const key = await getOrCreatePendingKey();
      let p = getPendingEncStore();
      let arr = [];
      let saltB64 = "-"; // legacy field only

      if (p) {
        if (p.salt) saltB64 = p.salt;
        try { arr = await decryptPending(key); } catch { arr = []; }
      }
      arr.unshift(intake);
      arr = arr.slice(0, MAX_LOCAL_HISTORY);
      await encryptPending(arr, key, saltB64);
    }
  } catch(e) {
    console.error("saveLocalIntake failed:", e);
  }
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


function enterStaffMode(){ showModal(true); }

function exitStaffMode(){
  STAFF_UNLOCKED = false;
  _cryptoKey = null;
  _historyCache = [];
  if(window.state) window.state.isStaff = false;
  updateStaffUI();
  renderLanding();
}
window.addEventListener("beforeunload", () => {
  STAFF_UNLOCKED = false;
  _cryptoKey = null;
  _historyCache = [];
});

async function renderStaffView(){
  const container = document.getElementById("view");
  if(!container) return;

  if(!STAFF_UNLOCKED){
    container.innerHTML = `
      <div class="card">
        <h2>Staff — Recent Intakes</h2>
        <div class='muted'>Locked. Click “Unlock Staff” in the header.</div>
        <div class="actions" style="margin-top:12px">
          <button class="btn secondary" onclick="renderLanding()">Back</button>
        </div>
      </div>`;
    return;
  }

  try{
    const data = await loadDecryptedHistory();

    // Newest first
    data.sort((a, b) =>
      new Date(b.visit?.startTime || b.when) - new Date(a.visit?.startTime || a.when)
    );

   const rows = data.map((x, i) => `
  <tr>
    <td>${i + 1}</td>
    <td>${escapeHtml(x.ro || "—")}</td>
    <td>
      ${escapeHtml(x.identity?.year || x.vehicle?.year || "—")}
      ${escapeHtml(x.identity?.make || x.vehicle?.make || "")}
      ${escapeHtml(x.identity?.model || x.vehicle?.model || "")}
    </td>
    <td>${escapeHtml(
  window.TREES?.[ (x.visit && x.visit.topic) || x.topic ]?.title
  || (x.visit && x.visit.topic)
  || x.topic
  || "—"
)}</td>

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

    const submissionsHtml = `
      <div class="divider"></div>
      <div class="card">
        <div class="muted">Saved Intakes (manual saves, this device)</div>
        <h3 style="margin:6px 0 12px">Submissions</h3>
        <div id="subs">${renderSubmissionsList()}</div>
        <div class="muted" style="margin-top:6px">
          Note: Auto-saved outcomes appear in the table above when staff is unlocked.
        </div>
      </div>
    `;


    const recoveryHtml = `
  <div class="divider"></div>
  <div class="card">
    <div class="muted">Recovery (optional)</div>
    <h3 style="margin:6px 0 12px">Recovery Code</h3>
    <div class="flex">
      <button class="btn" onclick="setRecoveryCodeFlow()">Set / Update Recovery Code</button>
      <button class="btn secondary" onclick="removeRecoveryCodeFlow()">Remove</button>
    </div>
    <div class="muted" style="margin-top:6px">
      If you ever forget the staff passphrase, use the Recovery Code on the unlock screen to regain access and set a new passphrase.
    </div>
  </div>
`;

container.innerHTML = `
  <div class="card">
    <h2>Staff — Recent Intakes (this device)</h2>
    ${table}
  </div>
  ${submissionsHtml}
  ${recoveryHtml}
  <div class="actions" style="margin-top:12px">
    <button class="btn secondary" onclick="exitStaffMode()">Exit</button>
  </div>`;

  }catch(e){
    container.innerHTML = `
      <div class="card">
        <h2>Staff — Recent Intakes</h2>
        <div style="color:#c00;">Unlock failed or data unreadable.</div>
        <div class="actions" style="margin-top:12px">
          <button class="btn secondary" onclick="renderLanding()">Back</button>
        </div>
      </div>`;
  }
}


function viewIntake(idx){
  const x = _historyCache?.[idx];
  if (!x) return;

  let answersSummary = "—";
  if (Array.isArray(x.trail) && x.trail.length) {
    answersSummary = x.trail
      .filter(step => step.type !== "outcome")
      .map((step, i) => {
        if (step.choiceLabel) return `${i+1}. ${escapeHtml(step.prompt)} — ${escapeHtml(step.choiceLabel)}`;
        if (step.multi && step.multi.length) return `${i+1}. ${escapeHtml(step.prompt)} — ${step.multi.map(escapeHtml).join(", ")}`;
        return `${i+1}. ${escapeHtml(step.prompt)}`;
      })
      .join("<br>");
  } else if (x.answers && Object.keys(x.answers).length) {
    answersSummary = escapeHtml(JSON.stringify(x.answers, null, 2));
  }

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
        ${escapeHtml(x.outcomeTitle || "Intake Summary")} ${x.ro ? `(RO: ${escapeHtml(x.ro)})` : ""}
      </h2>

      <div class="row"><span class="tag">Priority: ${escapeHtml(x.priority || "—")}</span></div>

      <div class="two-col">
        <div>
          <div class="muted">Customer's own words</div>
          <div class="card" style="margin-top:6px">
            ${escapeHtml(x.visit?.broughtInFor || "—")}
          </div>

          <div class="row"></div>
          <div class="muted">Structured answers</div>
          <div class="card" style="margin-top:6px; line-height:1.6">
            ${answersSummary}
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

function escapeHtml(v){
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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
  // 🔒 Auto-lock if we came here while unlocked
  if (STAFF_UNLOCKED) {
    STAFF_UNLOCKED = false;
    _cryptoKey = null;
    _historyCache = [];
    state.isStaff = false;
    updateStaffUI();
  }
  
  // Only render submissions if staff
  const submissionsSection = state.isStaff ? `
    <div class="divider"></div>
    <div class="card">
      <div class="muted">Saved Intakes on this device (manual saves)</div>
      <h3 style="margin:6px 0 12px">Submissions</h3>
      <div id="subs">${renderSubmissionsList()}</div>
      <div class="muted" style="margin-top:6px">
        Note: Staff auto-saved outcomes are under the “Unlock Staff” button.

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
    return `<button class="btn" style="width:100%" onclick="answerSingle('${nodeId}',${i})">${escapeHtml(opt.label)}</button>`;
  } else {
    const key = opt.key || `${nodeId}_${i}`;
    const checked = state.answers[key] ? "checked" : "";
    return `
      <label style="display:flex;gap:10px;align-items:flex-start">
        <input type="checkbox" ${checked} onchange="toggleMulti('${key}', this.checked)"/>
        <span>${escapeHtml(opt.label)}</span>
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
      <h3 style="margin:6px 0 12px">${escapeHtml(tree.title)}</h3>

      <div class="row">
        <div class="muted">Question</div>
        <h2 style="margin:6px 0 10px">${escapeHtml(node.prompt)}</h2>
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

  // Build answers summary from the live state trail
  // BEFORE
  const answersSummary = state.trail
  .filter(step => step.type !== "outcome")
  .map((step, idx) => {
    if (step.choiceLabel) return `${idx+1}. ${escapeHtml(step.prompt)} — ${escapeHtml(step.choiceLabel)}`;
    if (step.multi && step.multi.length) return `${idx+1}. ${escapeHtml(step.prompt)} — ${step.multi.map(escapeHtml).join(", ")}`;
    return `${idx+1}. ${escapeHtml(step.prompt)}`;
  })
  .join("<br>");


  view.innerHTML = `
    <div class="card">
      <div class="muted">Outcome</div>
      <h2 style="margin:6px 0 10px">${escapeHtml(node.title)}</h2>
      <div class="row"><span class="tag">Priority: ${escapeHtml(node.priority || "—")}</span></div>

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
            ${(node.notes||[]).map(n=>`• ${escapeHtml(n)}`).join("<br>") || "—"}
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


function kv(k, v){
  return `<div class="kv">
    <div class="muted">${escapeHtml(k)}</div>
    <div class="hl">${escapeHtml(v ?? "—")}</div>
  </div>`;
}


function resetForNewIntake(){
  state.activeTreeKey = null;
  state.trail = [];
  state.answers = {};
  state.identity = { name:"", phone:"", email:"", year:"", make:"", model:"", mileage:"", vin:"", plate:"" };
  state.visit = { broughtInFor:"", startTime: Date.now(), ro: "" };
}


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
    resetForNewIntake();
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

async function saveSubmission(finalOutcomeId){
  const id = `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const payload = buildSubmissionPayload(id, finalOutcomeId);

  try {
    if (_cryptoKey) {
      // Staff unlocked → write to main encrypted history
      await loadDecryptedHistory();
      _historyCache.unshift(payload);
      _historyCache = _historyCache.slice(0, MAX_LOCAL_HISTORY);
      await persistHistory();
    } else {
      // Staff locked → write to encrypted pending blob using non-extractable AES key
      const key = await getOrCreatePendingKey();
      let p = getPendingEncStore();
      let arr = [];
      let saltB64 = "-"; // legacy field only

      if (p) {
        if (p.salt) saltB64 = p.salt; // kept for schema continuity
        try { arr = await decryptPending(key); } catch { arr = []; }
      }
      arr.unshift(payload);
      arr = arr.slice(0, MAX_LOCAL_HISTORY);
      await encryptPending(arr, key, saltB64);
    }

    alert("Saved to this device.");
    resetForNewIntake();
    renderLanding();
    window.scrollTo(0, 0);
  } catch (e) {
    console.error("saveSubmission failed:", e);
    alert("Save failed.");
  }
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
  // Only manual saves (they have an `id`)
  return STAFF_UNLOCKED ? (_historyCache || []).filter(x => x && x.id) : [];
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
              <div class="muted">${new Date(s.visit?.startTime || s.when).toLocaleString()}</div>
              <div style="margin-top:6px"><strong>${escapeHtml(s.identity?.name || "Customer")}</strong>
               — ${escapeHtml(s.identity?.year||"")} ${escapeHtml(s.identity?.make||"")} ${escapeHtml(s.identity?.model||"")}</div>
              <div class="muted" style="margin-top:4px">${escapeHtml(s.outcomeTitle || "—")}</div>
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
  const item = (_historyCache || []).find(x => x.id === id);
  if(!item) return;
  const w = window.open("", "_blank", "noopener,noreferrer");
  w.document.write(`<pre style="white-space:pre-wrap;font-family:ui-monospace,Menlo,Consolas">${escapeHtml(JSON.stringify(item, null, 2))}</pre>`);
  w.document.close();
}

function deleteSaved(id){
  if(!confirm("Delete this saved intake?")) return;
  _historyCache = (_historyCache || []).filter(x => x.id !== id);
  if (STAFF_UNLOCKED) { persistHistory().catch(console.error); }
  // refresh whichever screen you're on
  if (STAFF_UNLOCKED) renderStaffView(); else renderLanding();
}


// ---------- Clock + boot ----------
function tickClock(){ const el = $("#clock"); if (el) el.textContent = new Date().toLocaleString(); }
setInterval(tickClock, 1000);
tickClock();
renderLanding();
