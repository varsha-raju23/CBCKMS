(function () {
  function removeBadLinks() {
    document.querySelectorAll("a, button").forEach(function (el) {
      const text = (el.textContent || "").trim().toLowerCase();
      const href = (el.getAttribute("href") || "").toLowerCase();

      if (
        text.includes("tunnel tools") ||
        href.includes("tunnel-tools.html") ||
        text === "profile" ||
        href.includes("profile.html") ||
        text === "action" ||
        text === "menu"
      ) {
        el.remove();
      }
    });
  }

  function ensureDashboardLink() {
    const nav = document.querySelector(".navbar, nav, header");
    if (!nav) return;

    const hasDashboard = Array.from(nav.querySelectorAll("a")).some(function (a) {
      return (a.textContent || "").trim().toLowerCase() === "dashboard";
    });

    if (!hasDashboard) {
      const link = document.createElement("a");
      link.href = "/pages/dashboard.html";
      link.className = "nav-link";
      link.textContent = "Dashboard";

      const firstLink = nav.querySelector("a");
      if (firstLink && firstLink.parentNode) {
        firstLink.parentNode.insertBefore(link, firstLink);
      } else {
        nav.appendChild(link);
      }
    }
  }

  function run() {
    removeBadLinks();
    ensureDashboardLink();
  }

  document.addEventListener("DOMContentLoaded", run);
  run();
  setTimeout(run, 500);
  setTimeout(run, 1500);
  setInterval(run, 2500);
})();
