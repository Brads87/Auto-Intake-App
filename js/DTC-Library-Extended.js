// DTC-Library-Extended.js
// Extends window.DTC_LIBRARY with broader coverage using regex families
// Load AFTER DTC-Library.js and BEFORE app.js

(function () {
  if (!window.DTC_LIBRARY) window.DTC_LIBRARY = [];

  const EXT = [
    // --- POWERTRAIN: FUEL / AIR / MIXTURE ---
    { match: /^P0100$/i, title: "P0100 — MAF Circuit Malfunction", priority: "High",
      causes: ["MAF wiring open/short", "Connector corrosion", "Failed MAF"],
      checks: ["Visual inspect harness", "Scan MAF g/s vs RPM", "Backprobe power/ground/signal"],
      fixes: ["Repair wiring/connector", "Clean/replace MAF"] },

    { match: /^P010[1-4]$/i, title: "P0101–P0104 — MAF Performance/Range/Circuit", priority: "High",
      causes: ["MAF contamination/out-of-range", "Intake leak post-MAF", "Restricted intake/exhaust"],
      checks: ["Compare MAF g/s vs RPM", "Smoke test intake", "Check air filter/ducting"],
      fixes: ["Clean/replace MAF", "Fix intake leaks/restrictions"] },

    { match: /^P011[5-9]$/i, title: "P0115–P0119 — ECT Circuit Range/Perf", priority: "Moderate",
      causes: ["ECT sensor failing", "Wiring open/short", "Poor grounds"],
      checks: ["ECT vs ambient cold", "Wiggle test harness", "Verify 5V ref/ground"],
      fixes: ["Replace sensor/repair wiring"] },

    { match: /^P0128$/i, title: "P0128 — Coolant Below Thermostat Regulating Temp", priority: "Low",
      causes: ["Thermostat stuck open", "ECT reads low"],
      checks: ["Warmup profile", "ECT vs IR gun"],
      fixes: ["Replace thermostat / sensor as needed"] },

    { match: /^P013[0-5]$/i, title: "P0130–P0135 — O2 Sensor Bank1 Sensor1 (circuit/heater)", priority: "Moderate",
      causes: ["Aged O2/heater open", "Wiring fault"],
      checks: ["Heater resistance", "Signal switching", "Power/ground"],
      fixes: ["Replace O2; repair wiring"] },

    { match: /^P015[0-5]$/i, title: "P0150–P0155 — O2 Sensor Bank2 Sensor1 (circuit/heater)", priority: "Moderate",
      causes: ["Aged O2/heater open", "Wiring fault"],
      checks: ["Heater resistance", "Signal switching", "Power/ground"],
      fixes: ["Replace O2; repair wiring"] },

    { match: /^(?:P013[6-9]|P014[0-1])$/i, title: "P0136–P0141 — O2 Sensor Bank1 Sensor2", priority: "Low",
      causes: ["Aged downstream O2", "Heater/wiring fault"],
      checks: ["Downstream signal flat vs upstream switching", "Heater circuit test"],
      fixes: ["Replace downstream O2; repair wiring"] },

    { match: /^(?:P0171|P0172|P0174|P0175)$/i, title: "P0171/172/174/175 — System Too Lean/Rich", priority: "High",
      causes: ["Vacuum leaks (lean)", "MAF contamination", "Fuel delivery or leaking injectors (rich)"],
      checks: ["Fuel trims STFT/LTFT", "Smoke test", "Fuel pressure/volume"],
      fixes: ["Fix leaks", "Service MAF", "Correct fuel delivery"] },

    { match: /^P02[0-9]{2}$/i, title: "P0200–P0299 — Injectors / Fuel & Air Metering Range", priority: "High",
      causes: ["Injector electrical fault", "Low fuel pressure/volume", "Boost/air metering faults"],
      checks: ["Injector balance/current", "Fuel pressure under load", "Boost/Air leaks (turbo apps)"],
      fixes: ["Repair injector/wiring", "Address fuel/air faults"] },

    // --- MISFIRE ---
    { match: /^P0300$/i, title: "P0300 — Random/Multiple Misfire", priority: "Critical",
      causes: ["Ignition (coil/plug/boot)", "Fuel delivery", "Vacuum leak", "Compression"],
      checks: ["Mode $06 misfire counters", "Coil swap", "Smoke test", "Fuel pressure"],
      fixes: ["Correct root cause; protect catalyst"] },

    { match: /^P030[1-8]$/i, title: "P030X — Cylinder-Specific Misfire", priority: "Critical",
      causes: ["Coil/plug on that cylinder", "Injector issue", "Low compression"],
      checks: ["Swap coil/plug", "Injector test", "Relative/mechanical compression"],
      fixes: ["Repair/replace failing component"] },

    // --- EVAP / EGR ---
    { match: /^P04[0-3]\d$/i, title: "P0400–P0439 — EGR Flow/Control Range", priority: "Moderate",
      causes: ["EGR valve sticking", "Carbon blockage", "Control circuit faults"],
      checks: ["Command EGR; observe MAP/idle change", "Inspect/clean passages"],
      fixes: ["Service/replace EGR/clean passages"] },

    { match: /^P044[0-6]$/i, title: "P0440–P0446 — EVAP General Leak/Control", priority: "Low",
      causes: ["Loose/damaged cap", "Vent/purge valve leak", "Hose cracks"],
      checks: ["Cap seal/click", "Smoke test EVAP", "Command purge/vent"],
      fixes: ["Tighten/replace cap", "Repair EVAP leak"] },

    { match: /^P045[5-8]$/i, title: "P0455–P0458 — EVAP Large Leak / Purge/vent circuit", priority: "Low",
      causes: ["Cap off/large hose off", "Valve stuck open/closed", "Circuit fault"],
      checks: ["Visual hose/canister", "Seal test", "Circuit checks"],
      fixes: ["Reattach/repair hoses", "Replace failed valve"] },

    // --- CATALYST / O2 PERFORMANCE ---
    { match: /^P0420$/i, title: "P0420 — Catalyst Efficiency (Bank 1)", priority: "Moderate",
      causes: ["Aged/overheated cat", "Exhaust leak", "Upstream faults (misfire/mixture)"],
      checks: ["Up vs down O2 patterns", "Check misfires/leaks"],
      fixes: ["Address root cause; cat as needed"] },

    { match: /^P0430$/i, title: "P0430 — Catalyst Efficiency (Bank 2)", priority: "Moderate",
      causes: ["Same as P0420 (Bank 2)"],
      checks: ["Same as P0420"],
      fixes: ["Same as P0420"] },

    // --- THROTTLE / IDLE / ETC ---
    { match: /^P050[5-7]$/i, title: "P0505–P0507 — Idle Control Range/Perf", priority: "Moderate",
      causes: ["IAC fault (if equipped)", "ETC carbon/learn issue", "Vacuum leaks"],
      checks: ["Clean throttle body", "Idle learn", "Smoke test"],
      fixes: ["Clean/learn; repair leaks; service IAC"] },

    { match: /^P210[0-9]$/i, title: "P2100–P2109 — Throttle Actuator Control Range", priority: "High",
      causes: ["ETC motor fault", "Wiring/connector", "PCM driver"],
      checks: ["Commanded vs actual throttle", "Circuit tests", "TP sensors agree?"],
      fixes: ["Repair wiring/ETC; re-learn"] },

    { match: /^P2135$/i, title: "P2135 — Throttle/Pedal Position Sensor A/B Correlation", priority: "High",
      causes: ["TP sensors disagree", "Connector corrosion", "Throttle body fault"],
      checks: ["Graph TP A & B", "Wiggle test", "Inspect throttle body"],
      fixes: ["Replace throttle body/sensors; repair wiring"] },

    // --- SENSORS (MAP/MAF/TPS/IAT) ---
    { match: /^P011[0-4]$/i, title: "P0110–P0114 — IAT Circuit/Range", priority: "Low",
      causes: ["IAT sensor/wiring", "Connector corrosion"],
      checks: ["IAT vs ambient", "5V ref/ground"],
      fixes: ["Replace sensor/repair wiring"] },

    { match: /^P010[5-9]$/i, title: "P0105–P0109 — MAP Circuit/Range", priority: "Moderate",
      causes: ["MAP fault", "Vacuum leak", "Wiring issues"],
      checks: ["MAP kPa vs key on/engine off", "Manifold vacuum test"],
      fixes: ["Replace MAP/repair leaks/wiring"] },

    // --- COMPUTER/COMM/REFERENCE ---
    { match: /^P06[0-9]{2}$/i, title: "P0600–P0699 — PCM/Comm/Output Range", priority: "High",
      causes: ["5V ref issues", "Driver faults", "Comm errors"],
      checks: ["Check for multiple 5V sensor codes", "Power/ground integrity", "Network faults"],
      fixes: ["Repair wiring/grounds/modules as needed"] },

    { match: /^U0100$/i, title: "U0100 — Lost Communication with ECM/PCM", priority: "High",
      causes: ["CAN wiring/connectors", "Module power/ground loss"],
      checks: ["Scope CAN lines", "Verify ECM powers/grounds"],
      fixes: ["Restore comms; wiring/module repair"] },

    { match: /^U01\d\d$/i, title: "U01xx — Lost Communication (various modules)", priority: "High",
      causes: ["Module offline", "Bus wiring/termination", "Power/ground"],
      checks: ["Network topology; scan all modules"],
      fixes: ["Restore module power/ground; wiring repair"] },

    // --- TRANSMISSION / TCM ---
    { match: /^P0700$/i, title: "P0700 — TCM Requests MIL", priority: "High",
      causes: ["Transmission DTC present in TCM"],
      checks: ["Scan TCM for sub-codes/data"],
      fixes: ["Diagnose per TCM DTCs"] },

    { match: /^P07[1-9]\d$/i, title: "P0710–P0799 — Transmission Sensors/Ratio/Slip", priority: "High",
      causes: ["Input/output speed sensor", "Shift/pressure solenoids", "Clutch/band slip"],
      checks: ["Live data gear ratio", "Line pressure tests", "Solenoid command tests"],
      fixes: ["Repair sensor/solenoid; overhaul if internal slip"] },

    { match: /^P08\d\d$/i, title: "P0800–P0899 — Transmission Controls/TCM", priority: "High",
      causes: ["TCM control faults", "Wiring/driver"],
      checks: ["Electrical checks", "Update/calibration"],
      fixes: ["Repair wiring/module per diag"] },

    // --- O2/AFR PERFORMANCE (WIDEBAND) ---
    { match: /^P2A0\d$/i, title: "P2A00–P2A09 — O2/AFR Sensor Range/Perf (B1S1)", priority: "Moderate",
      causes: ["AFR sensor aging", "Exhaust leak upstream", "Mixture faults"],
      checks: ["AFR current/voltage behavior", "Exhaust leak test", "Fuel trims"],
      fixes: ["Replace AFR; fix leaks/mixture root cause"] },

    // --- ABS / BRAKE (Chassis “C” Codes) ---
    { match: /^C003[0-3]$/i, title: "C0030–C0033 — Wheel Speed Sensor (LF/LR/RF/RR)", priority: "Moderate",
      causes: ["Sensor failure", "Tone ring damage", "Wiring open/short"],
      checks: ["Live data WSS", "Inspect harness/tone ring"],
      fixes: ["Repair harness/sensor/tone ring"] },

    { match: /^C00[4-6]\d$/i, title: "C0040–C0069 — ABS Valve/Pressure/Module Range", priority: "Moderate",
      causes: ["Hydraulic solenoid fault", "Pressure sensor issues"],
      checks: ["Bi-directional tests", "Circuit checks"],
      fixes: ["Repair valve/module/wiring"] },

    // --- AIRBAG / RESTRAINT (Body “B” Codes) ---
    { match: /^B00[1-9]\d$/i, title: "B0010–B0099 — Airbag/Restraint Circuits", priority: "High",
      causes: ["Open/short squib circuit", "Clock spring", "Connector under seats"],
      checks: ["SRS connector inspection", "Resistance/short to ground"],
      fixes: ["Repair wiring/clock spring/module as needed"] },

    // --- HYBRID / EV (sampling) ---
    { match: /^P0A0[0-9]$/i, title: "P0A00–P0A09 — Hybrid System Generic", priority: "High",
      causes: ["Hybrid system request/inhibit", "Interlock faults"],
      checks: ["HV interlock continuity", "Scan hybrid control data"],
      fixes: ["Follow OEM hybrid safety & diag"] },

    { match: /^P0A9\d$/i, title: "P0A90–P0A99 — Hybrid Drive Motor/Performance", priority: "High",
      causes: ["Inverter/motor temp/speed issues", "Sensor or wiring faults"],
      checks: ["Inverter temps/coolant flow", "Motor speed correlation"],
      fixes: ["Cooling/service per OEM; component repair"] },

    // --- FALLBACK FAMILY RULES ---
    { match: /^P0[0-9]{3}$/i, title: "Generic OBD-II Powertrain Code (P0xxx)", priority: "Moderate",
      causes: ["Generic powertrain fault — see sub-system"],
      checks: ["Full scan and freeze frame", "Live data review"],
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

  window.DTC_LIBRARY = window.DTC_LIBRARY.concat(EXT);
})();
