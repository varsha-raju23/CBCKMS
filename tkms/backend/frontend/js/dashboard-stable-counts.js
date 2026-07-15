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

  function docsArray(data) {
    if (!data) return [];
    if (Array.isArray(data.documents)) return data.documents;
    if (data.documents && typeof data.documents === "object") return Object.values(data.documents);
    if (Array.isArray(data.data)) return data.data;
    return [];
  }

  function uniqueDocs(docs) {
    const map = new Map();
    docs.forEach(function (d) {
      const key = d.id || d._id || d.fileName || d.title || d.originalName;
      if (key && !map.has(key)) map.set(key, d);
    });
    return Array.from(map.values());
  }

  function clean(value) {
    return String(value || "").replace(/\bundefined\b/gi, "").trim() || "N/A";
  }

  function hideDashboardUpload() {
    document.querySelectorAll("button, a").forEach(function (el) {
      const text = (el.textContent || "").trim().toLowerCase();
      if (text === "upload" || text.includes("quick upload") || text.includes("upload document")) {
        el.style.display = "none";
      }
    });

    document.querySelectorAll("*").forEach(function (el) {
      const text = (el.textContent || "").trim().toLowerCase();
      if (text.includes("quick upload") || (text.includes("drop file") && text.includes("upload"))) {
        const box = el.closest("section, .card, .upload-card, div");
        if (box) box.style.display = "none";
      }
    });
  }

  async function buildStableDashboard() {
    if (!location.pathname.includes("dashboard.html")) return;

    hideDashboardUpload();

    document.querySelectorAll("#dashboardTunnelTools, #tkms-dashboard-overview, .dashboard-tunnel-tools").forEach(function (el) {
      el.remove();
    });

    const docsData = await api("/api/documents");
    const docs = uniqueDocs(docsArray(docsData));

    let usersCount = 0;
    const users1 = await api("/api/admin/users");
    const users2 = users1 || await api("/api/azure-admin/users");

    if (users2) {
      if (Array.isArray(users2.users)) usersCount = users2.users.length;
      if (Array.isArray(users2.data)) usersCount = users2.data.length;
    }

    const byType = {};
    docs.forEach(function (d) {
      const type = clean(d.documentType || d.category || "General");
      byType[type] = (byType[type] || 0) + 1;
    });

    let section = document.getElementById("stableDashboardCounts");

    if (!section) {
      section = document.createElement("section");
      section.id = "stableDashboardCounts";
      section.className = "stable-dashboard-counts";

      const main =
        document.querySelector(".main-content") ||
        document.querySelector("main") ||
        document.querySelector(".dashboard") ||
        document.body;

      main.insertAdjacentElement("afterbegin", section);
    }

    section.innerHTML = `
      <div class="stable-dashboard-hero">
        <h2>Dashboard Overview</h2>
        <p>Quick summary of tunnel project knowledge and uploaded documents.</p>
      </div>

      <div class="stable-count-grid">
        <div class="stable-count-card">
          <span>Available Documents</span>
          <strong>${docs.length}</strong>
        </div>

        <div class="stable-count-card">
          <span>Available Users</span>
          <strong>${usersCount}</strong>
        </div>

        <div class="stable-count-card">
          <span>Document Types</span>
          <strong>${Object.keys(byType).length}</strong>
        </div>

        <div class="stable-count-card">
          <span>Views Today</span>
          <strong>0</strong>
        </div>
      </div>

      <div class="stable-dashboard-panel">
        <h3>Available Documents by Type</h3>
        ${
          Object.keys(byType).length
            ? Object.entries(byType).map(([type, count]) => `<div class="stable-type-row"><span>${type}</span><b>${count}</b></div>`).join("")
            : `<p>No documents uploaded yet. Upload documents from the Documents page.</p>`
        }
      </div>
    `;

    document.querySelectorAll("*").forEach(function (el) {
      const text = (el.textContent || "").trim().toLowerCase();
      if (text === "loading chart..." || text === "loading...") {
        el.textContent = "No chart data available yet";
      }
    });
  }

  document.addEventListener("DOMContentLoaded", buildStableDashboard);
  buildStableDashboard();
  setTimeout(buildStableDashboard, 700);
  setTimeout(buildStableDashboard, 1500);
})();
