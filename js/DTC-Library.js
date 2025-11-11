// DTC-Library.js — Merged Max Pack (base + extended + max coverage)
// Load BEFORE app.js

/* Structure per entry:
 * {
 *   match: RegExp | string (exact DTC),
 *   title: string,
 *   priority: "Critical"|"High"|"Moderate"|"Low",
 *   causes: string[],
 *   checks: string[],
 *   fixes: string[],
 *   tech?: string[]   // optional staff-only notes; shown in staff view
 * }
 */

(function () {
  // --- Core library ---------------------------------------------------------
  window.DTC_LIBRARY = [

    // =========================
    // FUEL / AIR / PRESSURE
    // =========================
    { match: /^P0087$/i, title: "P0087 — Fuel Rail/System Pressure Too Low", priority: "High",
      causes: ["Weak pump", "Clogged filter/strainer", "Failing pressure regulator", "Leaking line"],
      checks: ["Fuel pressure under load", "Volume test", "Electrical feed/ground to pump"],
      fixes: ["Replace/repair pump/regulator", "Fix restrictions/leaks"] },

    { match: /^P0088$/i, title: "P0088 — Fuel Rail/System Pressure Too High", priority: "Moderate",
      causes: ["Regulator stuck closed", "Return line restriction", "Commanded high pressure (fault)"],
      checks: ["Command vs actual pressure", "Return flow check"],
      fixes: ["Replace regulator/repair return", "Update calibration if applicable"] },

    { match: /^P019[0-3]$/i, title: "P0190–P0193 — Fuel Rail Pressure Sensor Circuit/Range", priority: "High",
      causes: ["FRP sensor fault", "5V reference/ground issue", "Connector corrosion"],
      checks: ["FRP sensor voltage sweep", "5V ref/ground integrity", "Wiggle test"],
      fixes: ["Replace FRP sensor/repair wiring/connector"] },

    // Intake metering
    { match: /^P0100$/i, title: "P0100 — MAF Circuit Malfunction", priority: "High",
      causes: ["MAF power/ground open", "Signal short", "Failed MAF"],
      checks: ["Backprobe power/ground", "MAF g/s vs RPM/load", "Visual harness inspection"],
      fixes: ["Repair wiring/connector", "Clean/replace MAF"] },

    { match: /^P010[1-4]$/i, title: "P0101–P0104 — MAF Range/Perf/Circuit", priority: "High",
      causes: ["MAF contamination", "Unmetered air (post-MAF leak)", "Restricted intake/exhaust"],
      checks: ["Compare MAF g/s vs RPM", "Smoke test intake", "Inspect air duct & filter"],
      fixes: ["Clean/replace MAF", "Fix vacuum leaks", "Remove restrictions"] },

    { match: /^P010[5-9]$/i, title: "P0105–P0109 — MAP Circuit/Range/Perf", priority: "Moderate",
      causes: ["MAP sensor fault", "Vacuum leak", "5V ref/ground issue"],
      checks: ["KOEO MAP ≈ baro", "Vacuum/boost correlation", "5V ref/ground check"],
      fixes: ["Replace MAP", "Repair vacuum/wiring"] },

    { match: /^P011[0-4]$/i, title: "P0110–P0114 — IAT Circuit/Range/Perf", priority: "Low",
      causes: ["IAT open/short", "Connector/corrosion", "Harness damage"],
      checks: ["IAT vs ambient cold", "5V ref/ground", "Wiggle test"],
      fixes: ["Replace IAT/repair wiring"] },

    { match: /^P011[5-9]$/i, title: "P0115–P0119 — ECT Circuit Range/Performance", priority: "Moderate",
      causes: ["ECT failing", "Open/short", "Ground issues"],
      checks: ["ECT vs IR gun", "5V ref/ground", "Harness flex"],
      fixes: ["Replace sensor/repair wiring"] },

    { match: /^P0128$/i, title: "P0128 — Coolant Below Thermostat Regulating Temp", priority: "Low",
      causes: ["Thermostat stuck open", "ECT reads low"],
      checks: ["Warmup curve", "ECT vs IR gun"],
      fixes: ["Replace thermostat / ECT as needed"] },

    // Mixture/trim
    { match: /^P0171$|^P0172$|^P0174$|^P0175$/i, title: "P0171/172/174/175 — System Too Lean/Rich", priority: "High",
      causes: ["Vacuum leaks (lean)", "MAF contamination", "Low fuel pressure (lean)", "Leaking injectors (rich)"],
      checks: ["STFT/LTFT analysis", "Smoke test intake", "Fuel pressure/volume"],
      fixes: ["Fix air leaks", "Service/replace MAF", "Correct fuel delivery"] },

    // Turbo/boost
    { match: /^P0234$/i, title: "P0234 — Engine Overboost Condition", priority: "High",
      causes: ["Wastegate stuck", "Boost control solenoid fault", "Vacuum/pressure line issues"],
      checks: ["Wastegate actuation", "Boost control duty vs boost", "Vac/pressure plumbing"],
      fixes: ["Repair wastegate/solenoid/lines", "Update calibration if needed"] },

    { match: /^P0299$/i, title: "P0299 — Turbo/Supercharger Underboost", priority: "High",
      causes: ["Charge leak", "Wastegate stuck open", "Weak turbo", "MAP/MAF plausibility"],
      checks: ["Smoke/pressure test charge pipes", "Wastegate test", "Boost target vs actual"],
      fixes: ["Fix leaks", "Repair wastegate", "Turbo service if required"] },

    { match: /^P2261$/i, title: "P2261 — Turbo Bypass Valve Performance", priority: "Moderate",
      causes: ["Bypass valve sticking/leaking", "Vac line issues", "Solenoid fault"],
      checks: ["Commanded vs actual valve", "Vac supply", "Leak test"],
      fixes: ["Replace/repair valve/solenoid/lines"] },

    // =========================
    // MISFIRE / IGNITION / KNOCK
    // =========================
    { match: /^P0300$/i, title: "P0300 — Random/Multiple Misfire", priority: "Critical",
      causes: ["Weak coil/plug/boot", "Fuel delivery issue", "Vacuum leak", "Compression imbalance"],
      checks: ["Mode $06 misfire counters", "Coil/plug swap", "Fuel pressure under load", "Smoke test"],
      fixes: ["Correct root cause; minimize driving to protect catalyst"],
      tech: ["If cat temp spikes, misfire active — protect substrate"] },

    { match: /^P030[1-8]$/i, title: "P030X — Cylinder-Specific Misfire", priority: "Critical",
      causes: ["Coil/plug/boot on that cylinder", "Injector fault", "Low compression"],
      checks: ["Swap coil/plug", "Injector balance/current", "Relative/mech compression"],
      fixes: ["Repair failing component; verify fix with counters"] },

    { match: /^P032[5-9]$|^P033[0-4]$/i, title: "P0325–P0334 — Knock Sensor Circuit/Range (Bank/1/2)", priority: "Moderate",
      causes: ["KS sensor open/short", "Connector/corrosion", "5V ref/ground issue", "Actual knock"],
      checks: ["Sensor resistance", "Harness inspection", "Live data knock counts vs load"],
      fixes: ["Replace KS/repair wiring", "Address mechanical knock/low octane if present"] },

    // =========================
    // CAM/CRANK / VVT
    // =========================
    // Cam/Crank correlation families
    { match: /^P001[0-9]$/i, title: "P0010–P0019 — VVT (Camshaft Position Actuator) Range/Perf", priority: "High",
      causes: ["OCV (oil control valve) sticking", "Sludge/low oil", "Timing chain stretch", "Wiring fault"],
      checks: ["Commanded vs actual cam angle (scan)", "OCV duty/response", "Oil condition/level", "Mechanical timing"],
      fixes: ["Clean/replace OCV", "Oil service", "Timing repair if out-of-range"],
      tech: ["Graph desired vs actual angle; look for lagging response"] },

    // Crank sensor
    { match: /^P0335$|^P0336$|^P0337$|^P0338$|^P0339$/i,
      title: "P0335–P0339 — Crankshaft Position Sensor (CKP) Circuit/Range/Performance", priority: "High",
      causes: ["CKP sensor failure", "Damaged reluctor", "Harness open/short", "ECM 5V/ground issue"],
      checks: ["Sensor waveform (scope if possible)", "Cranking RPM signal", "Reluctor physical inspection"],
      fixes: ["Replace CKP/repair wiring", "Correct reluctor/tone issues"] },

    // Cam sensor A (Bank 1/2, Intake/Exhaust families)
    { match: /^P034[0-9]$/i, title: "P0340–P0349 — Camshaft Position Sensor A Circuit/Range", priority: "High",
      causes: ["CMP A sensor fault", "Wiring/connector", "Tone ring damage"],
      checks: ["CMP signal presence", "5V ref/ground continuity", "Physical tone check"],
      fixes: ["Replace CMP A / repair wiring"] },

    // Cam sensor B
    { match: /^P036[0-9]$/i, title: "P0360–P0369 — Camshaft Position Sensor B Circuit/Range", priority: "High",
      causes: ["CMP B sensor fault", "Wiring/connector", "Tone ring damage"],
      checks: ["CMP signal presence", "5V ref/ground continuity", "Physical tone check"],
      fixes: ["Replace CMP B / repair wiring"] },

    // Cam signal intermittent families
    { match: /^P039[0-4]$/i, title: "P0390–P0394 — Camshaft Position Sensor B Circuit (Bank 2)", priority: "High",
      causes: ["Intermittent CMP B (bank 2)", "Connector loose", "Harness chafe"],
      checks: ["Wiggle test", "Heat soak test", "Scope trace for dropouts"],
      fixes: ["Repair harness/replace sensor"] },

    // Correlation A/B
    { match: /^P0016$|^P0017$|^P0018$|^P0019$/i,
      title: "P0016–P0019 — Crank/Cam Correlation (Bank/Intake/Exhaust)", priority: "High",
      causes: ["Jumped timing", "Stretched chain", "VVT actuator stuck", "Tone wheel shift"],
      checks: ["Correlation test (scan graph)", "Mechanical timing check", "OCV command test"],
      fixes: ["Timing repair", "Actuator/OCV service"] },

    // =========================
    // O₂ / AFR / CATALYST
    // =========================
    // O2 heater families
    { match: /^P003[0-9]$|^P004[0-9]$|^P005[0-9]$|^P006[0-4]$/i,
      title: "P0030–P0064 — O₂/AFR Heater Circuit (various banks/sensors)", priority: "Moderate",
      causes: ["Heater element open", "Fuse/power feed", "Ground/open circuit"],
      checks: ["Heater resistance", "Power/ground present KOEO", "Command test if supported"],
      fixes: ["Replace sensor/repair circuit"] },

    // Upstream B1S1
    { match: /^P013[0-5]$/i, title: "P0130–P0135 — O₂ Sensor B1S1 Circuit/Heater", priority: "Moderate",
      causes: ["Aged O₂", "Heater/wiring fault"],
      checks: ["Heater resistance", "Switching rate vs commanded λ"],
      fixes: ["Replace O₂; repair wiring"] },

    // Upstream B2S1
    { match: /^P015[0-5]$/i, title: "P0150–P0155 — O₂ Sensor B2S1 Circuit/Heater", priority: "Moderate",
      causes: ["Aged O₂", "Heater/wiring fault"],
      checks: ["Heater resistance", "Switching rate vs commanded λ"],
      fixes: ["Replace O₂; repair wiring"] },

    // Downstream B1S2 family
    { match: /^(P013[6-9]|P0140|P0141)$/i, title: "P0136–P0141 — O₂ Sensor B1S2 Circuit/Heater", priority: "Low",
      causes: ["Downstream O₂ aging", "Heater/wiring fault"],
      checks: ["Downstream flat vs upstream switching", "Heater test"],
      fixes: ["Replace B1S2; repair wiring"] },

    // AFR performance
    { match: /^P2A0\d$/i, title: "P2A00–P2A09 — AFR Sensor Range/Performance (B1S1)", priority: "Moderate",
      causes: ["AFR sensor aging", "Exhaust leak upstream", "Mixture bias"],
      checks: ["AFR current/voltage behavior", "Exhaust leak test", "Trims"],
      fixes: ["Replace AFR; fix leaks/cause"] },

    // Catalyst
    { match: /^P0420$/i, title: "P0420 — Catalyst Efficiency Below Threshold (Bank 1)", priority: "Moderate",
      causes: ["Aged/overheated cat", "Exhaust leak", "Upstream misfire/mixture faults"],
      checks: ["Up vs down O₂ correlation", "Check for misfires/leaks", "Temp delta across cat"],
      fixes: ["Address root cause; replace cat if failed"],
      tech: ["Rule out mixture faults before condemning cat"] },

    { match: /^P0430$/i, title: "P0430 — Catalyst Efficiency Below Threshold (Bank 2)", priority: "Moderate",
      causes: ["Same as P0420 for Bank 2"],
      checks: ["Same as P0420"],
      fixes: ["Same as P0420"] },

    // =========================
    // EVAP / EGR
    // =========================
    { match: /^P044[0-6]$/i, title: "P0440–P0446 — EVAP General Leak/Control", priority: "Low",
      causes: ["Loose/damaged cap", "Vent/purge valve leak", "Cracked hose"],
      checks: ["Cap seal/clicks", "Smoke test EVAP", "Command purge/vent"],
      fixes: ["Replace cap", "Repair hose/valve"] },

    { match: /^P0455$/i, title: "P0455 — EVAP Large Leak", priority: "Low",
      causes: ["Cap off", "Hose off/split", "Canister line failure"],
      checks: ["Visual hose/canister", "Smoke test"],
      fixes: ["Reattach/repair hoses", "Replace cap/canister if cracked"] },

    { match: /^P0456$/i, title: "P0456 — EVAP Very Small Leak", priority: "Low",
      causes: ["Cap seal micro-leak", "ESIM/Leak detection pump", "Hairline hose crack"],
      checks: ["EVAP smoke with tight caps", "ESIM valve test", "Connector/hose flex test"],
      fixes: ["Replace cap", "Repair ESIM/hoses"] },

    { match: /^P0496$/i, title: "P0496 — EVAP High Purge Flow", priority: "Low",
      causes: ["Purge valve stuck open", "Purge control short"],
      checks: ["Engine stumble on cap removal", "Command purge closed — RPM change?"],
      fixes: ["Replace purge valve", "Repair control circuit"] },

    { match: /^P0400$|^P040[1-3]\d$/i, title: "P0400–P0439 — EGR Flow/Control Range", priority: "Moderate",
      causes: ["EGR valve sticking", "Carbon blockage", "Control circuit faults"],
      checks: ["Command EGR; observe MAP/idle change", "Clean passages"],
      fixes: ["Service/replace EGR", "Clean ports/passages"] },

    // =========================
    // THROTTLE / IDLE / ETC
    // =========================
    { match: /^P050[5-7]$/i, title: "P0505–P0507 — Idle Control Range/Performance", priority: "Moderate",
      causes: ["IAC fault (if equipped)", "ETC carbon/learn", "Vacuum leak"],
      checks: ["Clean throttle body", "Idle learn procedure", "Smoke test"],
      fixes: ["Service throttle/IAC", "Repair leaks"] },

    { match: /^P210[0-9]$/i, title: "P2100–P2109 — Throttle Actuator Control", priority: "High",
      causes: ["ETC motor fault", "Wiring/connector", "PCM driver"],
      checks: ["Commanded vs actual throttle", "Circuit tests", "TP A/B correlation"],
      fixes: ["Repair wiring/ETC; relearn"] },

    { match: /^P2135$/i, title: "P2135 — Throttle/Pedal Position Sensor A/B Correlation", priority: "High",
      causes: ["TP sensors disagree", "Connector corrosion", "Throttle body fault"],
      checks: ["Graph TP A & B", "Wiggle test", "Inspect throttle body"],
      fixes: ["Replace throttle body/sensors; repair wiring"] },

    // =========================
    // NO-START / BASE DIAG KEYS (pointer outcomes)
    // =========================
    { match: /^P0(340|335)$/i, title: "Cam/Crank Signals Missing or Invalid", priority: "High",
      causes: ["Sensor failure", "Reluctor damage", "Wiring/ECM ref"],
      checks: ["Scope signal while cranking", "Inspect reluctor", "5V ref/ground"],
      fixes: ["Replace sensor/repair wiring", "Timing/reluctor repair"] },

    // =========================
    // TRANS / TCM
    // =========================
    { match: /^P0700$/i, title: "P0700 — TCM Requests MIL", priority: "High",
      causes: ["Transmission DTC present in TCM"],
      checks: ["Scan TCM for sub-codes/data"],
      fixes: ["Diagnose per TCM DTCs"] },

    { match: /^P07[1-9]\d$/i, title: "P0710–P0799 — Transmission Sensors/Ratio/Slip", priority: "High",
      causes: ["Input/output speed sensor", "Shift/pressure solenoid", "Internal slip"],
      checks: ["Live data gear ratio", "Line pressure", "Solenoid command tests"],
      fixes: ["Repair sensor/solenoid", "Overhaul if internal slip"] },

    { match: /^P08\d\d$/i, title: "P0800–P0899 — Transmission Controls/TCM", priority: "High",
      causes: ["TCM control faults", "Wiring/driver"],
      checks: ["Electrical checks", "Update/calibration"],
      fixes: ["Repair wiring/module per diag"] },

    // =========================
    // NETWORK / PCM
    // =========================
    { match: /^P06[0-9]{2}$/i, title: "P0600–P0699 — PCM/Comm/Output Range", priority: "High",
      causes: ["5V reference issues", "Driver faults", "Comm errors"],
      checks: ["Multiple 5V sensor codes?", "Power/ground integrity", "Network faults"],
      fixes: ["Repair wiring/grounds/modules as needed"] },

    { match: /^U0100$/i, title: "U0100 — Lost Communication with ECM/PCM", priority: "High",
      causes: ["CAN wiring/connectors", "Module power/ground loss"],
      checks: ["Scope CAN lines", "Verify ECM powers/grounds"],
      fixes: ["Restore comms; wiring/module repair"] },

    { match: /^U01\d\d$/i, title: "U01xx — Lost Communication (various modules)", priority: "High",
      causes: ["Module offline", "Bus wiring/termination", "Power/ground"],
      checks: ["Network topology; scan all modules"],
      fixes: ["Restore module power/ground; wiring repair"] },

    // =========================
    // ABS / CHASSIS / BODY
    // =========================
    { match: /^C003[0-3]$/i, title: "C0030–C0033 — Wheel Speed Sensor (LF/LR/RF/RR)", priority: "Moderate",
      causes: ["Sensor failure", "Tone ring damage", "Wiring open/short"],
      checks: ["Live data WSS", "Inspect harness/tone ring", "Gap/debris check"],
      fixes: ["Repair harness/sensor/tone ring"] },

    { match: /^C003[5-9]$|^C004[0-2]$/i, title: "C0035–C0042 — ABS Wheel Speed (per corner)", priority: "Moderate",
      causes: ["Specific corner sensor/tone ring", "Connector/corrosion"],
      checks: ["Corner-by-corner WSS graph", "Oscilloscope if needed"],
      fixes: ["Replace sensor/repair tone ring/harness"] },

    { match: /^C00[4-6]\d$/i, title: "C0040–C0069 — ABS Valve/Pressure/Module Range", priority: "Moderate",
      causes: ["Hydraulic solenoid fault", "Pressure sensor issues"],
      checks: ["Bi-directional tests", "Circuit checks"],
      fixes: ["Repair valve/module/wiring"] },

    { match: /^B00[1-9]\d$/i, title: "B0010–B0099 — Airbag/Restraint Circuits", priority: "High",
      causes: ["Open/short squib circuit", "Clock spring", "Under-seat connector"],
      checks: ["SRS connector inspection", "Resistance/short to ground"],
      fixes: ["Repair wiring/clock spring/module as needed"] },

    // =========================
    // HYBRID / EV (sampled)
    // =========================
    { match: /^P0A0[0-9]$/i, title: "P0A00–P0A09 — Hybrid System Generic", priority: "High",
      causes: ["Interlock faults", "HV isolation issue", "Cooling fault"],
      checks: ["HV interlock continuity", "Isolation test per OEM", "Scan hybrid control"],
      fixes: ["Follow OEM hybrid safety & diag"] },

    { match: /^P0A9\d$/i, title: "P0A90–P0A99 — Hybrid Drive Motor/Performance", priority: "High",
      causes: ["Inverter/motor temp/speed", "Sensor or wiring faults"],
      checks: ["Inverter temps/coolant flow", "Motor speed correlation"],
      fixes: ["Cooling/service per OEM; component repair"] },

    // =========================
    // FALLBACKS (kept but rarely hit now)
    // =========================
    { match: /^P0[0-9]{3}$/i, title: "Generic OBD-II Powertrain Code (P0xxx)", priority: "Moderate",
      causes: ["Generic powertrain fault — see subsystem"],
      checks: ["Full scan & freeze frame", "Live data review"],
      fixes: ["Diagnose per OEM flow"] },

    { match: /^P1[0-9]{3}$/i, title: "Manufacturer-Specific Powertrain Code (P1xxx)", priority: "Moderate",
      causes: ["OEM-specific strategy or component"],
      checks: ["Consult OEM service info", "TSBs/software updates"],
      fixes: ["Follow OEM test plan"] },

    { match: /^U[0-9]{4}$/i, title: "Network/Communication Code (Uxxxx)", priority: "High",
      causes: ["Module offline", "Bus wiring", "Power/ground loss"],
      checks: ["Network health; module powers/grounds"],
      fixes: ["Restore comms; wiring/module repair"] },

    { match: /^C[0-9]{4}$/i, title: "Chassis/ABS Code (Cxxxx)", priority: "Moderate",
      causes: ["ABS/suspension system fault"],
      checks: ["ABS data/actuator tests", "Wheel speed coverage"],
      fixes: ["Repair per subsystem"] },

    { match: /^B[0-9]{4}$/i, title: "Body Code (Bxxxx)", priority: "Low",
      causes: ["Body electrical (SRS/BCM/comfort)"],
      checks: ["Module scan; circuit tests"],
      fixes: ["Repair per subsystem"] }
  ];

  // --- Helpers expected by app.js ------------------------------------------
  // Parse any DTCs out of free text (deduped, normalized)
  window.parseDtcList = function (text) {
    const found = String(text || "")
      .toUpperCase()
      .match(/\b([PBUC]\d{4})\b/g);
    return found ? Array.from(new Set(found)) : [];
  };

  // Given array of codes (e.g., ["P0335","P0456"]), return enriched rows
  window.lookupDtcEntries = function (codes) {
    const results = [];
    const lib = window.DTC_LIBRARY || [];
    for (const codeRaw of (codes || [])) {
      const code = String(codeRaw || "").toUpperCase();
      let matched = false;
      for (const row of lib) {
        if ((typeof row.match === "string" && row.match.toUpperCase() === code) ||
            (row.match instanceof RegExp && row.match.test(code))) {
          // ensure code echoed back + tech copy available to staff view
          results.push({
            code,
            title: row.title || (code + " — (no details)"),
            priority: row.priority || "Moderate",
            causes: row.causes || [],
            checks: row.checks || [],
            fixes: row.fixes || [],
            tech: row.tech || []   // <- staff-only notes can be surfaced in your app
          });
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
          fixes: ["Diagnose per OEM flow"],
          tech: ["Add this DTC to the library later if it recurs"]
        });
      }
    }
    return results;
  };
})();
