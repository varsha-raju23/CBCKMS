(function () {
  function getToken() {
    return localStorage.getItem("token") || sessionStorage.getItem("token") || "";
  }

  async function safeJson(url) {
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

  function findCards() {
    return Array.from(document.querySelectorAll(".stat-card, .card, [class*='stat-card'], [class*='metric']"));
  }

  function setCardValue(words, value) {
    const cards = findCards();

    cards.forEach(function (card) {
      const text = (card.textContent || "").toLowerCase();

      if (words.every(w => text.includes(w))) {
        let valueEl = card.querySelector(".tkms-stat-value");

        if (!valueEl) {
          valueEl = document.createElement("div");
          valueEl.className = "tkms-stat-value";
          card.insertBefore(valueEl, card.firstChild);
        }

        valueEl.textContent = value;
      }
    });
  }

  function stopLoading() {
    document.querySelectorAll("*").forEach(function (el) {
      const text = (el.textContent || "").trim().toLowerCase();

      if (text === "loading chart..." || text === "loading...") {
        el.textContent = "No chart data available yet";
        el.classList.add("tkms-empty-chart");
      }
    });
  }

  function fixWelcome() {
    const h1 = document.querySelector("h1");
    if (h1 && h1.textContent.toLowerCase().includes("welcome")) {
      h1.textContent = "Welcome back!";
    }
  }

  async function restoreDashboard() {
    if (!location.pathname.includes("dashboard.html")) return;

    fixWelcome();

    const docsData = await safeJson("/api/documents");
    const docs = docsArray(docsData);

    setCardValue(["total", "documents"], String(docs.length || 0));
    setCardValue(["my", "uploads"], String(docs.length || 0));
    setCardValue(["views"], "0");

    let usersCount = 0;

    const usersData1 = await safeJson("/api/admin/users");
    const usersData2 = usersData1 && usersData1.success ? usersData1 : await safeJson("/api/azure-admin/users");

    if (usersData2) {
      if (Array.isArray(usersData2.users)) usersCount = usersData2.users.length;
      else if (Array.isArray(usersData2.data)) usersCount = usersData2.data.length;
    }

    setCardValue(["total", "users"], String(usersCount || 0));
    setCardValue(["team", "members"], String(usersCount || 0));

    stopLoading();
  }

  document.addEventListener("DOMContentLoaded", restoreDashboard);
  restoreDashboard();
  setTimeout(restoreDashboard, 500);
  setTimeout(restoreDashboard, 1500);
  setTimeout(stopLoading, 3000);
})();
