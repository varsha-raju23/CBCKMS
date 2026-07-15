(function () {
  function createDashboardTools() {
    if (!location.pathname.includes("dashboard.html")) return;
    if (document.getElementById("dashboardTunnelTools")) return;

    const html = `
      <section id="dashboardTunnelTools" class="dashboard-tunnel-tools">
        <div class="dt-hero">
          <h2>Tunnel Intelligence Tools</h2>
          <p>Support recommendation, cycle time estimation, and problem-solving guidance inside your dashboard.</p>
        </div>

        <div class="dt-tabs">
          <button class="dt-tab active" data-tab="dtSupport">Support System</button>
          <button class="dt-tab" data-tab="dtCycle">Cycle Time</button>
          <button class="dt-tab" data-tab="dtProblem">Problem Solver</button>
        </div>

        <div id="dtSupport" class="dt-panel active">
          <div class="dt-grid">
            <div class="dt-card">
              <h3>Support System Inputs</h3>
              <label>RMR Value</label>
              <input id="dtRmr" type="number" placeholder="0-100">

              <label>UCS MPa</label>
              <input id="dtUcs" type="number" placeholder="Example 65">

              <label>RQD Percent</label>
              <input id="dtRqd" type="number" placeholder="Example 70">

              <label>Groundwater</label>
              <select id="dtWater">
                <option>Dry</option>
                <option>Damp</option>
                <option>Seepage</option>
                <option>Heavy Inflow</option>
              </select>

              <button class="dt-btn" onclick="dtSupportAnswer()">Get Recommendation</button>
            </div>

            <div class="dt-card">
              <h3>Recommendation</h3>
              <div id="dtSupportResult" class="dt-result">Enter values and generate support recommendation.</div>
            </div>
          </div>
        </div>

        <div id="dtCycle" class="dt-panel">
          <div class="dt-grid">
            <div class="dt-card">
              <h3>Cycle Time Inputs</h3>
              <label>RMR Value</label>
              <input id="dtCycleRmr" type="number" placeholder="0-100">

              <label>Tunnel Length m</label>
              <input id="dtLength" type="number" placeholder="Example 500">

              <label>Round Length m</label>
              <input id="dtRound" type="number" placeholder="Example 1.5">

              <label>Method</label>
              <select id="dtMethod">
                <option>NATM</option>
                <option>Drill and Blast</option>
                <option>TBM</option>
                <option>Cut and Cover</option>
              </select>

              <button class="dt-btn" onclick="dtCycleAnswer()">Predict Cycle Time</button>
            </div>

            <div class="dt-card">
              <h3>Cycle Output</h3>
              <div id="dtCycleResult" class="dt-result">Enter cycle values and generate estimate.</div>
            </div>
          </div>
        </div>

        <div id="dtProblem" class="dt-panel">
          <div class="dt-grid">
            <div class="dt-card">
              <h3>Problem Solver</h3>
              <label>Problem Keywords</label>
              <textarea id="dtProblemText" placeholder="water ingress, shotcrete falling, settlement, overbreak, TBM stoppage"></textarea>

              <label>Category</label>
              <select id="dtCategory">
                <option>Safety</option>
                <option>Quality</option>
                <option>Delay</option>
                <option>Geotechnical</option>
                <option>Equipment</option>
              </select>

              <button class="dt-btn" onclick="dtProblemAnswer()">Search Solution</button>
            </div>

            <div class="dt-card">
              <h3>Corrective Actions</h3>
              <div id="dtProblemResult" class="dt-result">Enter problem details and generate actions.</div>
            </div>
          </div>
        </div>
      </section>
    `;

    const target =
      document.querySelector(".main-content") ||
      document.querySelector("main") ||
      document.querySelector(".dashboard") ||
      document.body;

    target.insertAdjacentHTML("beforeend", html);

    document.querySelectorAll(".dt-tab").forEach(function (btn) {
      btn.onclick = function () {
        document.querySelectorAll(".dt-tab").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".dt-panel").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById(btn.dataset.tab).classList.add("active");
      };
    });
  }

  function rockClass(rmr) {
    if (rmr >= 81) return "Very Good Rock";
    if (rmr >= 61) return "Good Rock";
    if (rmr >= 41) return "Fair Rock";
    if (rmr >= 21) return "Poor Rock";
    return "Very Poor Rock";
  }

  window.dtSupportAnswer = function () {
    const rmr = Number(document.getElementById("dtRmr").value || 50);
    const ucs = Number(document.getElementById("dtUcs").value || 40);
    const rqd = Number(document.getElementById("dtRqd").value || 50);
    const water = document.getElementById("dtWater").value;

    let support = "50 mm local shotcrete, spot bolting, routine mapping.";
    let risk = "Low";
    let monitoring = "Periodic convergence monitoring.";

    if (rmr < 61) {
      support = "75-100 mm shotcrete with mesh, systematic bolts at 1.5-2.0 m spacing.";
      risk = "Medium";
      monitoring = "Daily convergence and crown settlement monitoring.";
    }

    if (rmr < 41) {
      support = "100-150 mm shotcrete, bolts at 1.0-1.5 m spacing, lattice girder if deformation starts.";
      risk = "High";
      monitoring = "Increase monitoring frequency and review trigger levels.";
    }

    if (rmr < 21) {
      support = "150-200 mm shotcrete, steel ribs, forepoling/spiling, very short advance.";
      risk = "Critical";
      monitoring = "Continuous deformation, crown, face stability and seepage monitoring.";
    }

    let drainage = "Routine drainage check.";
    if (water === "Seepage") drainage = "Drainage holes, inflow logging, waterproofing checks and local grouting.";
    if (water === "Heavy Inflow") drainage = "Probe drilling, pre-grouting, emergency pumping and waterproofing review.";

    let notes = [];
    if (ucs < 20) notes.push("Low UCS means weak intact rock; install support early.");
    if (rqd < 40) notes.push("Low RQD means fractured rock; increase mesh and bolting.");
    if (!notes.length) notes.push("Use this as preliminary support guidance and verify with approved design.");

    document.getElementById("dtSupportResult").innerHTML =
      `<b>Rock Class:</b> ${rockClass(rmr)}<br>
       <b>Risk:</b> ${risk}<br>
       <b>Support:</b> ${support}<br>
       <b>Drainage:</b> ${drainage}<br>
       <b>Monitoring:</b> ${monitoring}<br>
       <b>Site Notes:</b> ${notes.join(" ")}`;
  };

  window.dtCycleAnswer = function () {
    const rmr = Number(document.getElementById("dtCycleRmr").value || 50);
    const length = Number(document.getElementById("dtLength").value || 100);
    const round = Math.max(Number(document.getElementById("dtRound").value || 1.5), 0.5);
    const method = document.getElementById("dtMethod").value;

    let hours = 9;
    if (method === "TBM") hours = 4.5;
    if (method === "NATM") hours = 10;
    if (method === "Cut and Cover") hours = 7;

    if (rmr < 40) hours += 3;
    if (rmr < 20) hours += 5;
    if (rmr > 75) hours -= 1;

    const rounds = Math.ceil(length / round);
    const totalHours = Math.ceil(rounds * hours);
    const days = Math.ceil(totalHours / 16);

    document.getElementById("dtCycleResult").innerHTML =
      `<b>Rounds:</b> ${rounds}<br>
       <b>Total Hours:</b> ${totalHours}<br>
       <b>Working Days:</b> ${days}<br>
       <b>Method:</b> ${method}<br>
       <b>Assumptions:</b> 16 working hours/day and ${round} m round length.<br>
       <b>Delay Risks:</b> support installation, mucking, ventilation, equipment availability and geological variation.`;
  };

  window.dtProblemAnswer = function () {
    const text = String(document.getElementById("dtProblemText").value || "").toLowerCase();
    const category = document.getElementById("dtCategory").value;
    const out = [];

    function add(title, risk, causes, actions, docs) {
      out.push(`<h4>${title}</h4>
        <b>Risk:</b> ${risk}<br>
        <b>Category:</b> ${category}<br>
        <b>Probable Causes:</b> ${causes}<br>
        <b>Immediate Actions:</b> ${actions}<br>
        <b>Documents to Check:</b> ${docs}<br><br>`);
    }

    if (text.includes("water") || text.includes("seepage") || text.includes("ingress")) {
      add("Water Ingress", "High", "open joints, fault zone, groundwater pressure", "measure inflow, drainage holes, pumping, probe drilling and grouting", "seepage log, geology report, grouting record, DPR");
    }

    if (text.includes("shotcrete") || text.includes("falling")) {
      add("Shotcrete Falling", "High", "poor surface cleaning, rebound, wrong accelerator, seepage", "barricade area, remove loose layer, reapply shotcrete with mesh and quality checks", "shotcrete test report, inspection checklist, NCR photos");
    }

    if (text.includes("settlement") || text.includes("crown") || text.includes("instability")) {
      add("Settlement / Crown Instability", "Critical", "weak ground, long advance, delayed support", "reduce advance, install immediate support, increase monitoring and escalate design review", "convergence report, survey report, design note");
    }

    if (text.includes("overbreak") || text.includes("blast")) {
      add("Overbreak / Poor Blasting", "Medium", "incorrect drilling pattern, excessive charge, poor delay timing", "review blast design, reduce perimeter charge, check drilling accuracy", "blast log, vibration record, face photos");
    }

    if (text.includes("tbm") || text.includes("stoppage")) {
      add("TBM Stoppage", "High", "cutter wear, muck blockage, mixed face, power issue", "inspect cutterhead, verify mucking, check utilities and record downtime", "TBM log, maintenance report, shift report");
    }

    if (!out.length) {
      add("General Tunnel Issue", "Medium", "missing field data or changing ground condition", "inspect site, record photos, check monitoring and review method statement", "DPR, inspection checklist, monitoring report, method statement");
    }

    document.getElementById("dtProblemResult").innerHTML = out.join("");
  };

  document.addEventListener("DOMContentLoaded", createDashboardTools);
  createDashboardTools();
  setTimeout(createDashboardTools, 800);
})();
