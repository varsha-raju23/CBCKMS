(function () {
  function val(id, fallback) {
    const el = document.getElementById(id);
    return el && el.value ? el.value : fallback;
  }

  function num(id, fallback) {
    const n = Number(val(id, fallback));
    return Number.isFinite(n) ? n : fallback;
  }

  function rockClass(rmr) {
    if (rmr >= 81) return "Very Good Rock";
    if (rmr >= 61) return "Good Rock";
    if (rmr >= 41) return "Fair Rock";
    if (rmr >= 21) return "Poor Rock";
    return "Very Poor Rock";
  }

  function risk(rmr, water, span, complexity) {
    let score = 0;
    if (rmr < 60) score += 1;
    if (rmr < 40) score += 2;
    if (rmr < 20) score += 3;
    if (String(water).toLowerCase().includes("seep")) score += 1;
    if (String(water).toLowerCase().includes("heavy")) score += 3;
    if (span > 8) score += 1;
    if (span > 12) score += 2;
    if (complexity === "High") score += 1;
    if (complexity === "Critical") score += 2;
    if (score >= 6) return "Critical";
    if (score >= 4) return "High";
    if (score >= 2) return "Medium";
    return "Low";
  }

  window.supportAnswer = function () {
    const rmr = num("rmr", 50);
    const ucs = num("ucs", 40);
    const rqd = num("rqd", 50);
    const span = num("span", 6);
    const rock = val("rockType", "Medium Rock");
    const method = val("method", "NATM");
    const water = val("water", "Dry");

    const cls = rockClass(rmr);
    const level = risk(rmr, water, span, "Medium");

    let shotcrete = "50 mm local shotcrete where required";
    let bolts = "Spot bolting only in fractured zones";
    let ribs = "Steel ribs normally not required";
    let advance = "Normal advance can be considered after face mapping";
    let drainage = "Routine drainage inspection";
    let monitoring = "Daily face mapping and periodic convergence monitoring";

    if (rmr <= 60) {
      shotcrete = "75 to 100 mm shotcrete with wire mesh in weak zones";
      bolts = "Systematic rock bolts at 1.5 to 2.0 m spacing";
      advance = "Use controlled advance and inspect joints after every round";
      monitoring = "Daily convergence and crown settlement monitoring";
    }

    if (rmr <= 40) {
      shotcrete = "100 to 150 mm shotcrete in layers";
      bolts = "Systematic bolts at 1.0 to 1.5 m spacing with mesh";
      ribs = "Lattice girder or steel ribs recommended based on deformation";
      advance = "Reduce advance length and install support close to face";
      monitoring = "Increase monitoring frequency; review trigger levels";
    }

    if (rmr <= 20) {
      shotcrete = "150 to 200 mm shotcrete with mesh and staged application";
      bolts = "Dense bolting with forepoling or spiling";
      ribs = "Steel ribs required at close spacing";
      advance = "Very short advances with immediate support";
      monitoring = "Continuous monitoring of convergence, crown and face extrusion";
    }

    if (String(water).toLowerCase().includes("seep")) {
      drainage = "Drainage holes, waterproofing checks, inflow logging and local grouting";
    }

    if (String(water).toLowerCase().includes("heavy")) {
      drainage = "Probe drilling, pre-grouting, drainage pipes, emergency pumping and waterproofing review";
    }

    let notes = [];
    if (ucs < 20) notes.push("Low UCS indicates weak intact rock; support should be installed early.");
    if (rqd < 40) notes.push("Low RQD indicates blocky/fractured rock; increase mesh, bolting and mapping frequency.");
    if (span > 8) notes.push("Large span increases deformation risk; check support stiffness and ring closure time.");
    if (method.toLowerCase().includes("blast")) notes.push("Use controlled blasting to reduce overbreak and loosening.");
    if (method.toLowerCase().includes("tbm")) notes.push("Check cutter wear, face pressure and muck characteristics continuously.");
    if (!notes.length) notes.push("Recommendation is suitable for preliminary planning; final design must follow approved design and site monitoring.");

    const out = document.getElementById("supportResult");
    if (out) {
      out.innerHTML = `
        <h3>Support System Recommendation</h3>
        <span class="badge">${cls}</span>
        <span class="badge">Risk: ${level}</span>
        <p><b>Recommended Support:</b> ${shotcrete}, ${bolts}.</p>
        <p><b>Steel Support:</b> ${ribs}.</p>
        <p><b>Drainage:</b> ${drainage}.</p>
        <p><b>Advance Strategy:</b> ${advance}.</p>
        <p><b>Monitoring:</b> ${monitoring}.</p>
        <p><b>Practical Site Notes:</b> ${notes.join(" ")}</p>
      `;
    }
  };

  window.cycleAnswer = function () {
    const rmr = num("cycleRmr", 50);
    const length = num("length", 100);
    const round = Math.max(num("roundLength", 1.5), 0.5);
    const shift = Math.max(num("shiftHours", 16), 1);
    const method = val("cycleMethod", "NATM");
    const complexity = val("complexity", "Medium");

    let hoursPerRound = 8;

    if (method.toLowerCase().includes("tbm")) hoursPerRound = 4.5;
    if (method.toLowerCase().includes("natm")) hoursPerRound = 10;
    if (method.toLowerCase().includes("blast")) hoursPerRound = 9;
    if (method.toLowerCase().includes("cut")) hoursPerRound = 7;

    if (rmr < 60) hoursPerRound += 1;
    if (rmr < 40) hoursPerRound += 3;
    if (rmr < 20) hoursPerRound += 5;
    if (rmr > 75) hoursPerRound -= 1;

    if (complexity === "High") hoursPerRound += 3;
    if (complexity === "Critical") hoursPerRound += 5;

    const rounds = Math.ceil(length / round);
    const totalHours = Math.ceil(rounds * hoursPerRound);
    const days = Math.ceil(totalHours / shift);

    const risks = [];
    if (rmr < 40) risks.push("weak ground support time may dominate the cycle");
    if (complexity === "High" || complexity === "Critical") risks.push("steel/shotcrete support installation can delay advance");
    if (method.toLowerCase().includes("tbm")) risks.push("cutter wear, mucking blockage and maintenance stoppages must be considered");
    if (method.toLowerCase().includes("blast")) risks.push("drilling accuracy, charging, ventilation clearance and mucking affect productivity");
    if (!risks.length) risks.push("normal delays may occur from survey, ventilation, mucking and inspection");

    const out = document.getElementById("cycleResult");
    if (out) {
      out.innerHTML = `
        <h3>Cycle Time Estimate</h3>
        <span class="badge">${rounds} rounds</span>
        <span class="badge">${totalHours} hours</span>
        <span class="badge">${days} working days</span>
        <p><b>Assumptions:</b> ${round} m round length, ${shift} working hours/day, ${method}, ${complexity} support complexity.</p>
        <p><b>Delay Risks:</b> ${risks.join(", ")}.</p>
        <p><b>Improvement Suggestions:</b> pre-position support materials, optimize mucking, maintain backup equipment, track actual cycle time in DPR, and review delays weekly.</p>
      `;
    }
  };

  window.problemAnswer = function () {
    const text = String(val("problemText", "")).toLowerCase();
    const rock = val("problemRock", "Fair");
    const cat = val("problemCategory", "Geotechnical");

    const answers = [];

    function add(title, riskLevel, causes, immediate, preventive, docs) {
      answers.push(`
        <h3>${title}</h3>
        <span class="badge">Risk: ${riskLevel}</span>
        <span class="badge">${cat}</span>
        <p><b>Probable Causes:</b> ${causes}</p>
        <p><b>Immediate Corrective Actions:</b> ${immediate}</p>
        <p><b>Preventive Actions:</b> ${preventive}</p>
        <p><b>Documents to Check/Upload:</b> ${docs}</p>
      `);
    }

    if (text.includes("water") || text.includes("seepage") || text.includes("ingress")) {
      add("Water Ingress", "High", "open joints, fault zone, high groundwater pressure, inadequate pre-grouting", "measure inflow, install drainage, start pumping, perform probe drilling, stop unsafe activity", "pre-grouting, drainage holes, waterproofing inspection, advance geological probing", "seepage log, geology report, grouting record, DPR, inspection photos");
    }

    if (text.includes("shotcrete") || text.includes("falling")) {
      add("Shotcrete Falling", "High", "poor surface cleaning, excessive rebound, wrong accelerator dosage, weak substrate, seepage", "barricade zone, remove loose material, inspect thickness and reapply with mesh", "surface preparation checklist, nozzleman control, mix design checks, thickness testing", "shotcrete report, quality checklist, NCR, photos, method statement");
    }

    if (text.includes("settlement") || text.includes("crown") || text.includes("instability")) {
      add("Settlement or Crown Instability", "Critical", "weak ground, long advance, delayed support, groundwater, excessive overbreak", "reduce advance length, install immediate support, increase monitoring, escalate to design team", "forepoling, canopy tubes, stronger ribs, faster ring closure, trigger-level monitoring", "convergence report, settlement readings, survey report, face photos, design note");
    }

    if (text.includes("overbreak") || text.includes("blast") || text.includes("blasting")) {
      add("Overbreak or Poor Blasting", "Medium", "incorrect drilling pattern, high charge, poor delay timing, unfavorable joint orientation", "review blast record, reduce perimeter charge, inspect drilling accuracy", "controlled blasting, smooth blasting, face mapping before blast, drill jumbo calibration", "blast design, drilling log, vibration record, face mapping photos");
    }

    if (text.includes("tbm") || text.includes("stoppage")) {
      add("TBM Stoppage", "High", "cutter wear, mixed face, muck blockage, power/hydraulic issue, high thrust", "inspect cutterhead, check mucking, verify utilities, record stoppage cause", "planned maintenance, probe drilling, cutter stock, daily equipment checklist", "TBM log, breakdown report, maintenance record, shift report");
    }

    if (text.includes("ventilation") || text.includes("gas")) {
      add("Ventilation or Gas Issue", "Critical", "duct leakage, insufficient airflow, equipment emissions, poor gas monitoring", "increase ventilation, stop hot work if unsafe, verify gas readings, inspect ducts", "fan maintenance, continuous gas monitoring, duct inspection, permit control", "gas log, ventilation checklist, safety permit, incident report");
    }

    if (!answers.length) {
      const defaultRisk = rock === "Very Poor" || rock === "Poor" ? "High" : "Medium";
      add("General Tunnel Issue", defaultRisk, "insufficient field data, changing geology, missing inspection or monitoring records", "inspect site, record photos, review face condition, check monitoring and DPR", "maintain DPR discipline, update checklist, perform lessons learned review, escalate repeated problems", "DPR, inspection checklist, photos, monitoring report, method statement");
    }

    const out = document.getElementById("problemResult");
    if (out) out.innerHTML = answers.join("");
  };
})();
