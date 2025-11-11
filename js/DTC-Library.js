// ---------------- DTC Library (staff-only guidance) ----------------
// Match by exact code or regex pattern. Keep this lean & local; extend anytime.
window.DTC_LIBRARY = [
  { match: /^P0300$/i,
    title: "P0300 — Random/Multiple Misfire",
    priority: "Critical",
    causes: [
      "Ignition: weak coil/plug/boot; secondary arcing",
      "Fuel: low pressure, clogged injectors",
      "Air: vacuum leak, unmetered air",
      "Mechanical: compression imbalance"
    ],
    checks: [
      "Mode $06 misfire counters; fuel trims STFT/LTFT",
      "Coil/plug swap test on cylinders showing counts",
      "Vacuum/Smoke test for intake leaks",
      "Fuel pressure under load"
    ],
    fixes: ["Repair root cause; avoid extended driving to protect catalyst"]
  },
  { match: /^P030[1-8]$/i,
    title: "P030X — Cylinder-Specific Misfire",
    priority: "Critical",
    causes: [
      "Coil/plug/boot fault on the listed cylinder",
      "Injector fault or wiring to that injector",
      "Compression low on that cylinder"
    ],
    checks: [
      "Swap coil/plug to see if misfire follows",
      "Injector balance or scope current pattern",
      "Relative/mechanical compression"
    ],
    fixes: ["Address failing component; protect catalyst by minimizing load"]
  },

  // (shortened example — include the rest of your codes here)
];

// === Helper functions ===
window.parseDtcList = function(text) {
  const found = String(text || "")
    .toUpperCase()
    .match(/\b([PBUC]\d{4})\b/g);
  return found ? Array.from(new Set(found)) : [];
};

window.lookupDtcEntries = function(codes) {
  const results = [];
  for (const code of codes) {
    let matched = false;
    for (const row of window.DTC_LIBRARY) {
      if ((typeof row.match === "string" && row.match.toUpperCase() === code) ||
          (row.match instanceof RegExp && row.match.test(code))) {
        results.push({ code, ...row });
        matched = true;
        break;
      }
    }
    if (!matched) {
      results.push({
        code,
        title: `${code} — (no local details)`,
        priority: "Moderate",
        causes: ["No local details. Refer to OEM service info."],
        checks: ["Full scan; freeze frame; data review."],
        fixes: ["Diagnose per OEM flow."]
      });
    }
  }
  return results;
};
