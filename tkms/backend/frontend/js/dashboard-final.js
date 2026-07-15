(function () {
  function getToken() {
    return localStorage.getItem("token") || sessionStorage.getItem("token") || "";
  }

  async function api(url) {
    try {
      const token = getToken();
      const res = await fetch(url, {
        headers: token ? { Authorization: "Bearer " + token } : {}
      });
      return await res.json();
    } catch {
      return null;
    }
  }

  function uniqueDocs(docs) {
    const map = new Map();

    docs.forEach(function (d) {
      const key = d.id || d._id || d.fileName || d.title || d.originalName;
      if (key && !map.has(key)) map.set(key, d);
    });

    return Array.from(map.values());
  }

  function getDocs(data) {
    if (!data) return [];
    if (Array.isArray(data.documents)) return uniqueDocs(data.documents);
    if (data.documents && typeof data.documents === "object") return uniqueDocs(Object.values(data.documents));
    if (Array.isArray(data.data)) return uniqueDocs(data.data);
    return [];
  }

  function groupByType(docs) {
    const result = {};

    docs.forEach(function (d) {
      const type = d.documentType || d.category || "General";
      result[type] = (result[type] || 0) + 1;
    });

    return result;
  }

  function clean(value) {
    return String(value || "").replace(/\bundefined\b/gi, "").trim() || "N/A";
  }

  async function buildDashboard() {
    if (!location.pathname.includes("dashboard.html")) return;

    if (document.getElementById("tkms-dashboard-overview")) return;

    const docsData = await api("/api/documents");
    const docs = getDocs(docsData);

    let usersCount = 0;
    const usersData = await api("/api/admin/users");

    if (usersData) {
      if (Array.isArray(usersData.users)) usersCount = usersData.users.length;
      if (Array.isArray(usersData.data)) usersCount = usersData.data.length;
    }

    const byType = groupByType(docs);
    const recent = docs.slice(0, 5);

    const html = `
      <section id="tkms-dashboard-overview" class="tkms-dashboard-overview">
        <div class="tkms-overview-header">
          <div>
            <h2>Project Knowledge Overview</h2>
            <p>Live summary of available tunnel knowledge documents and project activity.</p>
          </div>
        </div>

        <div class="tkms-stat-grid">
          <div class="tkms-stat-card">
            <span>Total Documents</span>
            <strong>${docs.length}</strong>
          </div>
          <div class="tkms-stat-card">
            <span>Team Members</span>
            <strong>${usersCount}</strong>
          </div>
          <div class="tkms-stat-card">
            <span>My Uploads</span>
            <strong>${docs.length}</strong>
          </div>
          <div class="tkms-stat-card">
            <span>Views Today</span>
            <strong>0</strong>
          </div>
        </div>

        <div class="tkms-dashboard-grid">
          <div class="tkms-panel">
            <h3>Documents by Type</h3>
            ${
              Object.keys(byType).length
                ? Object.entries(byType).map(([type, count]) => `<div class="tkms-type-row"><span>${clean(type)}</span><b>${count}</b></div>`).join("")
                : `<p>No document type data available yet.</p>`
            }
          </div>

          <div class="tkms-panel">
            <h3>Recent Documents</h3>
            ${
              recent.length
                ? recent.map(d => `<div class="tkms-recent-row"><b>${clean(d.title || d.originalName || d.fileName)}</b><span>${clean(d.projectName)} - ${clean(d.documentType || d.category)}</span></div>`).join("")
                : `<p>No uploaded documents yet. Upload documents from the Documents page.</p>`
            }
          </div>
        </div>
      </section>
    `;

    const main =
      document.querySelector(".main-content") ||
      document.querySelector("main") ||
      document.querySelector(".dashboard") ||
      document.body;

    main.insertAdjacentHTML("afterbegin", html);

    document.querySelectorAll("*").forEach(function (el) {
      const text = (el.textContent || "").trim().toLowerCase();
      if (text === "loading chart..." || text === "loading...") {
        el.textContent = "No chart data available yet";
      }
    });
  }

  document.addEventListener("DOMContentLoaded", buildDashboard);
  buildDashboard();
  setTimeout(buildDashboard, 800);
})();
