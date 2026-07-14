(function () {
  async function safeJson(url) {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch(url, {
        headers: token ? { Authorization: "Bearer " + token } : {}
      });
      return await res.json();
    } catch (e) {
      console.warn("Dashboard fallback error:", url, e);
      return null;
    }
  }

  function setTextByWords(words, value) {
    const cards = document.querySelectorAll(".stat-card, .card, [class*='stat']");
    cards.forEach(card => {
      const text = (card.textContent || "").toLowerCase();
      if (words.every(w => text.includes(w))) {
        const number =
          card.querySelector(".stat-number") ||
          card.querySelector("h2") ||
          card.querySelector("h3") ||
          card.querySelector("strong");
        if (number) number.textContent = value;
      }
    });
  }

  function stopLoadingText() {
    document.querySelectorAll("*").forEach(el => {
      const text = (el.textContent || "").trim().toLowerCase();

      if (text === "loading chart..." || text === "loading...") {
        el.textContent = "No data available yet";
      }
    });
  }

  async function fixDashboardLoading() {
    if (!location.pathname.includes("dashboard.html")) return;

    const docsData = await safeJson("/api/documents");
    let docs = [];

    if (docsData && Array.isArray(docsData.documents)) docs = docsData.documents;
    if (docsData && docsData.documents && typeof docsData.documents === "object" && !Array.isArray(docsData.documents)) {
      docs = Object.values(docsData.documents);
    }

    setTextByWords(["total", "documents"], String(docs.length || 0));
    setTextByWords(["my", "uploads"], String(docs.length || 0));
    setTextByWords(["views"], "0");

    const usersData = await safeJson("/api/admin/users");
    let usersCount = 0;

    if (usersData && Array.isArray(usersData.users)) usersCount = usersData.users.length;
    if (usersData && Array.isArray(usersData.data)) usersCount = usersData.data.length;

    setTextByWords(["total", "users"], String(usersCount || 0));
    setTextByWords(["team", "members"], String(usersCount || 0));

    stopLoadingText();
  }

  document.addEventListener("DOMContentLoaded", fixDashboardLoading);
  setTimeout(fixDashboardLoading, 500);
  setTimeout(fixDashboardLoading, 1500);
  setTimeout(stopLoadingText, 3000);
})();
