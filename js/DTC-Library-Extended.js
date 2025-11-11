// DTC-Library-Extended.js
// Unified + expanded library (Extended + Plus, now greatly enlarged).
// Specific rules come first; broad catch-alls are last so they only hit when needed.

(function () {
  if (!window.DTC_LIBRARY) window.DTC_LIBRARY = [];

  const EXT = [
    // =========================================================
    // POWERTRAIN: AIR / FUEL / SENSORS
    // =========================================================
    { match: /^P0100$/i, title: "P0100 — MAF Circuit Malfunction", priority: "High",
      causes: ["MAF wiring open/short", "Connector corrosion", "Failed MAF"],
      checks: ["Visual inspect harness", "MAF g/s vs RPM", "Backprobe power/ground/signal"],
      fixes: ["Repair wiring/connector", "Clean/replace MAF"],
      tech: ["Expect ~0.8–1.0 g/s per liter at hot idle; scale with RPM"] },

    { match: /^P010[1-4]$/i, title: "P0101–P0104 — MAF Performance/Range/Circuit", priority: "High",
      causes: ["MAF contamination", "Intake leak post-MAF", "Restricted intake/exhaust"],
      checks: ["Compare MAF g/s to calc load", "Smoke test intake", "Inspect airbox/filter"],
      fixes: ["Clean/replace MAF", "Fix intake leaks/restrictions"],
      tech: ["Spray-oiled filters can contaminate hot-wire MAFs"] },

    { match: /^P010[5-9]$/i, title: "P0105–P0109 — MAP Circuit/Range", priority: "Moderate",
      causes: ["MAP fault", "Vacuum leak", "5V ref wiring issue"],
      checks: ["MAP kPa KOEO ≈ baro", "Vacuum at hot idle 17–22 inHg", "5V ref & ground integrity"],
      fixes: ["Replace MAP / repair leaks / wiring"],
      tech: ["If baro PID is wrong, also check MAF/TPS and altitude input"] },

    { match: /^P011[0-4]$/i, title: "P0110–P0114 — IAT Circuit/Range", priority: "Low",
      causes: ["Open/short in IAT", "Connector corrosion"],
      checks: ["IAT ≈ ambient on cold start", "5V reference/ground"],
      fixes: ["Replace sensor / repair connector"],
      tech: ["IAT error skews fueling and spark"] },

    { match: /^P011[5-9]$/i, title: "P0115–P0119 — ECT Circuit Range/Perf", priority: "Moderate",
      causes: ["ECT failing", "Open/short to power/ground"],
      checks: ["ECT cold ≈ ambient", "Wiggle test harness", "5V ref/ground"],
      fixes: ["Replace sensor / repair wiring"],
      tech: ["Bad ECT can cause rich/lean, poor fans control, harsh shifts"] },

    { match: /^P0128$/i, title: "P0128 — Coolant Below Thermostat Reg Temp", priority: "Low",
      causes: ["Thermostat stuck open", "ECT biased low"],
      checks: ["Warm-up profile vs spec", "ECT vs IR gun"],
      fixes: ["Replace thermostat; sensor if biased"],
      tech: ["Low engine temp → poor MPG and heater performance"] },

    // Fuel trim & mixture
    { match: /^(?:P0171|P0174)$/i, title: "P0171/P0174 — System Too Lean (Banks 1/2)", priority: "High",
      causes: ["Vacuum/PCV leak", "MAF contamination", "Low fuel pressure/volume", "Exhaust leak upstream O₂"],
      checks: ["STFT/LTFT +", "Smoke test intake", "Fuel pressure under load", "Upstream O₂ for false lean"],
      fixes: ["Fix vacuum leaks", "Clean/replace MAF", "Repair fuel delivery", "Seal exhaust leaks"],
      tech: ["Trim > +10% at idle = vacuum leak; at load = fuel delivery"] },

    { match: /^(?:P0172|P0175)$/i, title: "P0172/P0175 — System Too Rich (Banks 1/2)", priority: "High",
      causes: ["Leaking injectors", "High fuel pressure", "Stuck purge", "MAF under-reporting"],
      checks: ["Fuel trims −", "Injector balance/leakdown", "Purge commanded vs actual", "Fuel pressure reg"],
      fixes: ["Service injectors", "Correct pressure/regulator", "Replace purge valve"],
      tech: ["Look for fuel in vacuum line on return-type regs"] },

    // Fuel rail pressure
    { match: /^P019[0-3]$/i, title: "P0190–P0193 — Fuel Rail Pressure Sensor Circuit/Range", priority: "High",
      causes: ["FRP sensor fault", "5V ref wiring", "Rail leak/air in fuel"],
      checks: ["Sensor 5V ref/signal/ground", "Compare commanded vs actual rail pressure"],
      fixes: ["Repair wiring/sensor", "Address delivery issues"],
      tech: ["On DI engines, rail faults cause start/stall, long crank"] },

    { match: /^P008[7-9]$/i, title: "P0087–P0089 — Fuel Rail/System Pressure Too Low/High/Perf", priority: "High",
      causes: ["Weak pump", "Clogged filter/strainer", "Regulator stuck", "HP pump/drive issue (DI)"],
      checks: ["Low side psi & volume test", "Rail pressure PID", "Current draw of pump"],
      fixes: ["Replace pump/filter/regulator", "Repair HP pump system"],
      tech: ["Check for restrictions in pickup/lines; verify voltage under load"] },

    { match: /^P023[0-2]$/i, title: "P0230–P0232 — Fuel Pump Primary Circuit", priority: "High",
      causes: ["Relay, fuse, wiring", "FP control module"],
      checks: ["Relay output voltage drop", "Control module commands", "Ground path"],
      fixes: ["Repair wiring/relay", "Replace control module if failed"],
      tech: ["Corroded grounds common near rear subframe"] },

    // Injectors general family already covered in P02xx

    // =========================================================
    // MISFIRE
    // =========================================================
    { match: /^P0300$/i, title: "P0300 — Random/Multiple Misfire", priority: "Critical",
      causes: ["Ignition coil/plug/boot", "Fuel delivery", "Vacuum leak", "Compression/valve"],
      checks: ["Mode $06 misfire counters", "Coil/plug swap", "Smoke test", "Fuel pressure"],
      fixes: ["Correct root cause; protect catalyst"],
      tech: ["Flashing MIL = catalyst damage risk; avoid load"] },

    { match: /^P030[1-8]$/i, title: "P030X — Cylinder-Specific Misfire", priority: "Critical",
      causes: ["Coil/plug on that cylinder", "Injector fault", "Low compression"],
      checks: ["Swap coil/plug", "Injector balance/current", "Relative/mech compression"],
      fixes: ["Repair failing component", "Mechanical repair as needed"],
      tech: ["Use misfire counters to identify cylinder(s)"] },

    // =========================================================
    // CAM / CRANK / VVT / TIMING
    // =========================================================
    // VVT actuator circuits
    { match: /^P0010$/i, title: "P0010 — Camshaft Position Actuator Circuit (Bank 1 Intake/A)", priority: "High",
      causes: ["OCV/solenoid fault", "Wiring/connector", "PCM driver"],
      checks: ["Command OCV; observe duty", "Power/ground/signal", "Oil level/viscosity"],
      fixes: ["Replace OCV/repair wiring", "Oil service if sludge"],
      tech: ["Sludge can stick spool valves; use correct oil grade"] },

    { match: /^P001[1-5]$/i, title: "P0011–P0015 — VVT Over-Adv/Ret/Perf (Bank 1)", priority: "High",
      causes: ["Stuck phaser", "Low oil pressure/dirty oil", "OCV fault", "Timing chain stretch"],
      checks: ["CMP vs CKP scope", "OCV command vs response", "Oil pressure", "Timing marks"],
      fixes: ["Service phaser/OCV", "Address oil system", "Timing set if stretched"],
      tech: ["Compare desired vs actual cam angle PIDs"] },

    { match: /^P002[0-5]$/i, title: "P0020–P0025 — VVT Circuit/Range/Perf (Bank 2)", priority: "High",
      causes: ["OCV B2 fault", "Phaser sticking", "Oil issues", "Chain stretch"],
      checks: ["Same as Bank 1"],
      fixes: ["Same as Bank 1"],
      tech: ["Bank mapping differs by OEM—verify bank orientation"] },

    // Correlation (gold)
    { match: /^P001[6-9]$/i, title: "P0016–P0019 — Crank/Cam Position Correlation", priority: "High",
      causes: ["Timing chain stretch", "Jumped timing", "Phaser stuck", "CMP/CKP sensor or reluctor"],
      checks: ["Scope CKP vs CMP", "Inspect timing marks/guides", "Oil state & VVT actuation"],
      fixes: ["Correct mechanical timing", "Replace worn phaser/guides", "Sensor/reluctor repair"],
      tech: ["Check for metal in oil; evaluate long-term fuel trims after repair"] },

    // CKP A/B
    { match: /^P033[5-9]$/i, title: "P0335–P0339 — Crankshaft Position Sensor A Circuit/Range", priority: "High",
      causes: ["CKP A signal dropout", "Reluctor damage", "Gap/debris"],
      checks: ["Scope waveform", "5V ref/ground/signal", "Inspect gap/reluctor"],
      fixes: ["Repair wiring", "Replace sensor", "Clean/realign reluctor"],
      tech: ["Heat-soak failures common; test hot"] },

    { match: /^P038[5-9]$/i, title: "P0385–P0389 — Crankshaft Position Sensor B Circuit/Range", priority: "High",
      causes: ["CKP B circuit fault", "Reluctor mis-index", "Gap issue"],
      checks: ["Scope CKP A vs B correlation", "Wiring integrity", "Reluctor indexing"],
      fixes: ["Repair wiring", "Replace sensor", "Correct reluctor"],
      tech: ["Dual-CKP systems compare A/B phase; look for missing teeth"] },

    // CMP A/B Bank 1/2
    { match: /^P034[0-9]$/i, title: "P0340–P0349 — Camshaft Position Sensor A (Bank 1/2)", priority: "High",
      causes: ["CMP A circuit", "Contamination/gap", "VVT/timing variance"],
      checks: ["Scope CMP vs CKP", "Harness inspection", "Phaser/timing check"],
      fixes: ["Repair wiring", "Replace CMP", "Service timing/VVT"],
      tech: ["Oil slosh/foaming can disturb CMP signals"] },

    { match: /^P036[5-9]$/i, title: "P0365–P0369 — Camshaft Position Sensor B (Bank 1)", priority: "High",
      causes: ["CMP B circuit", "Improper gap", "Phaser wear/sludge"],
      checks: ["Scope CMP B vs CKP", "Oil pressure/condition", "Command VVT"],
      fixes: ["Wiring repair", "Replace sensor", "Service VVT system"],
      tech: ["Intermittent P0369 often heat-related wiring open"] },

    { match: /^P039[0-4]$/i, title: "P0390–P0394 — Camshaft Position Sensor B (Bank 2)", priority: "High",
      causes: ["CMP B2 circuit", "Contamination", "Timing/phaser issue"],
      checks: ["Scope CMP B2 vs CKP", "Harness test", "Verify mechanical timing"],
      fixes: ["Repair wiring", "Replace sensor", "Timing/VVT service"],
      tech: ["Bank 2 locations differ—verify service info"] },

    // Engine speed input
    { match: /^P0320$/i, title: "P0320 — Ignition/Distributor Engine Speed Input", priority: "High",
      causes: ["Dist/CKP/CMP signal fault", "Reluctor damage", "Wiring"],
      checks: ["Scope engine speed signal", "Power/ground/signal integrity"],
      fixes: ["Repair wiring", "Replace sensor", "Reluctor repair"],
      tech: ["Older distributors: check pickup coil & air gap"] },

    // Knock sensors
    { match: /^P032[5-9]$/i, title: "P0325–P0329 — Knock Sensor 1 (Bank 1) Circuit/Range", priority: "Moderate",
      causes: ["KS wiring open/short", "Sensor failure", "Harness buzz from routing"],
      checks: ["Sensor resistance", "Tap test (per OEM)", "Harness chafe/ground"],
      fixes: ["Repair wiring", "Replace knock sensor", "Reroute harness"],
      tech: ["Coolant intrusion in KS wells on some engines causes false codes"] },

    { match: /^P033[0-4]$/i, title: "P0330–P0334 — Knock Sensor 2 (Bank 2) Circuit/Range", priority: "Moderate",
      causes: ["KS2 wiring", "Sensor failure", "Connector corrosion"],
      checks: ["Resistance vs spec", "Shield ground continuity", "Tap test (OEM)"],
      fixes: ["Replace sensor", "Repair harness/connector"],
      tech: ["Use torque spec; overtightening detunes piezo element"] },

    // =========================================================
    // EVAP / EGR / FTP
    // =========================================================
    { match: /^P0440$/i, title: "P0440 — EVAP System (General)", priority: "Low",
      causes: ["Loose/damaged cap", "Hose cracks", "Valve stuck"],
      checks: ["Cap seal/clicks", "Smoke test EVAP", "Purge/vent commands"],
      fixes: ["Replace cap/hoses", "Valve repair"],
      tech: ["Check fuel tank grommets and filler neck rust"] },

    { match: /^P044[1-9]$/i, title: "P0441–P0449 — EVAP Purge/Flow/Control Range", priority: "Low",
      causes: ["Purge flow incorrect", "Vent control circuit", "Solenoid stuck"],
      checks: ["FTP change with purge", "Command vent closed", "Circuit testing"],
      fixes: ["Replace purge/vent valve", "Repair wiring"],
      tech: ["P0441 often caused by stuck purge drawing vacuum KOEO"] },

    { match: /^P045[0-9]$/i, title: "P0450–P0459 — EVAP Pressure/Purge/Vent / Leaks", priority: "Low",
      causes: ["FTP sensor fault", "Purge/vent electrical", "Leaks (small/large)"],
      checks: ["Smoke test", "5V ref/ground/signal at FTP", "Seal test of canister/lines"],
      fixes: ["Sensor/valve/wiring repair", "Hose/canister replacement"],
      tech: ["P0456 = very small leak; inspect o-ring at cap and ESIM"] },

    { match: /^P0496$/i, title: "P0496 — EVAP High Purge Flow (Non-Commanded)", priority: "Low",
      causes: ["Purge valve stuck open", "Charcoal debris contamination"],
      checks: ["FTP goes negative KOEO with purge off", "Purge duty PID vs actual"],
      fixes: ["Replace purge valve", "Clean/replace lines/canister"],
      tech: ["Hard starts after fueling common symptom"] },

    { match: /^P040[0-9]$/i, title: "P0400–P0409 — EGR Flow/Control", priority: "Moderate",
      causes: ["Valve sticking", "Carbon blockage", "Feedback circuit"],
      checks: ["Command EGR; observe MAP/idle change", "Clean passages"],
      fixes: ["Service/replace valve", "Repair wiring"],
      tech: ["Too much EGR can stall at idle; too little elevates NOx"] },

    // =========================================================
    // O2 / AFR / CATALYST
    // =========================================================
    { match: /^P013[0-5]$/i, title: "P0130–P0135 — O₂ B1S1 Circuit/Heater", priority: "Moderate",
      causes: ["Aged sensor", "Heater open", "Wiring fault"],
      checks: ["Heater resistance", "Switching frequency", "Power/ground"],
      fixes: ["Replace O₂; wiring repair"],
      tech: ["Slow switching on upstream O₂ causes rich/lean trims"] },

    { match: /^P015[0-5]$/i, title: "P0150–P0155 — O₂ B2S1 Circuit/Heater", priority: "Moderate",
      causes: ["Aged sensor", "Heater open", "Wiring fault"],
      checks: ["Heater ohms", "Signal switching", "Pwr/Gnd"],
      fixes: ["Replace O₂; wiring repair"] },

    { match: /^(?:P013[6-9]|P014[0-1])$/i, title: "P0136–P0141 — O₂ B1S2 Circuit/Heater", priority: "Low",
      causes: ["Downstream O₂ aging", "Heater/wiring"],
      checks: ["Downstream signal flat vs upstream switching", "Heater test"],
      fixes: ["Replace sensor; wiring repair"],
      tech: ["Downstream used for cat efficiency monitoring"] },

    { match: /^P016[0-7]$/i, title: "P0160–P0167 — O₂ B2S2 Circuit/Heater", priority: "Low",
      causes: ["Downstream B2 aging", "Heater/wiring"],
      checks: ["Heater ohms", "Signal activity"],
      fixes: ["Replace sensor; repair wiring"] },

    { match: /^P2A0\d$/i, title: "P2A00–P2A09 — AFR/O₂ Sensor Range/Perf (B1S1)", priority: "Moderate",
      causes: ["Wideband aging", "Exhaust leak upstream", "Mixture fault"],
      checks: ["AFR current/voltage behavior", "Exhaust leak test", "Fuel trims"],
      fixes: ["Replace AFR; fix leaks / mixture root cause"],
      tech: ["Wideband sensors are current-based; follow OEM test"] },

    { match: /^P0420$/i, title: "P0420 — Catalyst Efficiency (Bank 1)", priority: "Moderate",
      causes: ["Aged/overheated catalyst", "Exhaust leak", "Upstream faults (misfire/mixture)"],
      checks: ["Up vs down O₂ patterns", "Check misfires, leaks"],
      fixes: ["Address root cause; replace cat if failed"],
      tech: ["Sustained misfire overheats catalyst substrate"] },

    { match: /^P0430$/i, title: "P0430 — Catalyst Efficiency (Bank 2)", priority: "Moderate",
      causes: ["Same as P0420 (Bank 2)"],
      checks: ["Same as P0420"],
      fixes: ["Same as P0420"] },

    // =========================================================
    // THROTTLE / IDLE / ETC
    // =========================================================
    { match: /^P050[5-7]$/i, title: "P0505–P0507 — Idle Control Range/Perf", priority: "Moderate",
      causes: ["IAC fault (if equipped)", "ETC carbon/learn issue", "Vacuum leaks"],
      checks: ["Clean throttle body", "Idle learn/adaptive reset", "Smoke test"],
      fixes: ["Clean/learn; repair leaks; service IAC"],
      tech: ["After cleaning, perform idle/ETC relearn as per OEM"] },

    { match: /^P210[0-9]$/i, title: "P2100–P2109 — Throttle Actuator Control Range", priority: "High",
      causes: ["ETC motor fault", "Wiring/connector", "PCM driver"],
      checks: ["Commanded vs actual throttle", "Circuit tests"],
      fixes: ["Repair wiring/ETC; relearn"],
      tech: ["Check dual TPS correlation and limp-home spring"] },

    { match: /^P2135$/i, title: "P2135 — Throttle/Pedal Position Sensor A/B Correlation", priority: "High",
      causes: ["TP sensors disagree", "Connector corrosion", "Throttle body fault"],
      checks: ["Graph TP A & B", "Wiggle test", "Inspect throttle body"],
      fixes: ["Replace throttle body/sensors; wiring repair"],
      tech: ["Also inspect pedal position sensor correlation"] },

    // =========================================================
    // TRANSMISSION / TCM
    // =========================================================
    { match: /^P0700$/i, title: "P0700 — TCM Requests MIL", priority: "High",
      causes: ["Transmission DTCs present in TCM"],
      checks: ["Scan TCM for sub-codes/data"],
      fixes: ["Diagnose per TCM DTCs"],
      tech: ["Engine ECM just sets P0700; root cause is in TCM"] },

    { match: /^P07[1-9]\d$/i, title: "P0710–P0799 — Transmission Sensors/Ratio/Slip", priority: "High",
      causes: ["ISS/OSS sensors", "Shift/pressure solenoids", "Internal clutch/band slip"],
      checks: ["Live data gear ratio", "Line pressure test", "Solenoid command tests"],
      fixes: ["Sensor/solenoid repair", "Overhaul if internal slip"],
      tech: ["Fluid level/condition is foundational—check first"] },

    { match: /^P08\d\d$/i, title: "P0800–P0899 — Transmission Controls/TCM", priority: "High",
      causes: ["TCM driver/circuit", "Internal faults"],
      checks: ["Electrical checks", "Software/calibration"],
      fixes: ["Repair wiring/module as needed"] },

    // =========================================================
    // NETWORK / CHASSIS / BODY
    // =========================================================
    { match: /^U0100$/i, title: "U0100 — Lost Communication with ECM/PCM", priority: "High",
      causes: ["CAN wiring/connectors", "Module power/ground loss"],
      checks: ["Scope CAN lines", "Verify ECM powers/grounds"],
      fixes: ["Restore comms; wiring/module"],
      tech: ["Check for shorted node pulling CAN down"] },

    { match: /^U01\d\d$/i, title: "U01xx — Lost Communication (various modules)", priority: "High",
      causes: ["Module offline", "Bus wiring/termination", "Power/ground"],
      checks: ["Network topology; scan all modules"],
      fixes: ["Restore module power/ground; wiring repair"],
      tech: ["Terminating resistors 60Ω total across CAN-H/CAN-L"] },

    { match: /^C003[0-3]$/i, title: "C0030–C0033 — Wheel Speed Sensor (LF/LR/RF/RR)", priority: "Moderate",
      causes: ["Sensor failure", "Tone ring damage", "Wiring open/short"],
      checks: ["Live data WSS", "Inspect harness/tone ring"],
      fixes: ["Repair harness/sensor/tone ring"] },

    { match: /^C00[4-6]\d$/i, title: "C0040–C0069 — ABS Valve/Pressure/Module", priority: "Moderate",
      causes: ["Hydraulic solenoid fault", "Pressure sensor issues"],
      checks: ["Bi-directional tests", "Circuit checks"],
      fixes: ["Repair valve/module/wiring"] },

    { match: /^B00[1-9]\d$/i, title: "B0010–B0099 — Airbag/Restraint Circuits", priority: "High",
      causes: ["Open/short squib circuit", "Clock spring", "Under-seat connectors"],
      checks: ["SRS connector inspection", "Resistance/short-to-ground"],
      fixes: ["Repair wiring/clock spring/module"],
      tech: ["Always disable SRS power & wait per OEM before service"] },

    // =========================================================
    // FALLBACK FAMILIES (kept last)
    // =========================================================
    { match: /^P0[0-9]{3}$/i, title: "Generic OBD-II Powertrain Code (P0xxx)", priority: "Moderate",
      causes: ["Generic powertrain fault — see subsystem"],
      checks: ["Full scan + freeze frame", "Live data review"],
      fixes: ["Diagnose per OEM flow"],
      tech: ["Use Mode $06, trims, and FF to narrow root cause"] },

    { match: /^P1[0-9]{3}$/i, title: "Manufacturer-Specific Powertrain Code (P1xxx)", priority: "Moderate",
      causes: ["OEM-specific strategy/component"],
      checks: ["Consult OEM service info", "Check TSBs/software updates"],
      fixes: ["Follow OEM test plan"],
      tech: ["Some OEMs map P1xxx to common faults with unique logic"] },

    { match: /^U[0-9]{4}$/i, title: "Network/Communication Code (Uxxxx)", priority: "High",
      causes: ["Module offline", "Bus wiring", "Power/ground loss"],
      checks: ["Network health; powers/grounds"],
      fixes: ["Restore comms; wiring/module"] },

    { match: /^C[0-9]{4}$/i, title: "Chassis/ABS Code (Cxxxx)", priority: "Moderate",
      causes: ["ABS/suspension system fault"],
      checks: ["ABS data/actuator tests"],
      fixes: ["Repair subsystem"] },

    { match: /^B[0-9]{4}$/i, title: "Body Code (Bxxxx)", priority: "Low",
      causes: ["Body electrical (SRS/BCM/comfort)"],
      checks: ["Module scan; circuit tests"],
      fixes: ["Repair subsystem"] },
  ];

  // Merge — keep your original rules and add these
  window.DTC_LIBRARY = window.DTC_LIBRARY.concat(EXT);
})();
