(function () {
  function removeDashboardAndProfileOptions() {
    document.querySelectorAll("a, button").forEach(function (el) {
      const text = (el.textContent || "").trim().toLowerCase();
      const href = (el.getAttribute("href") || "").toLowerCase();

      if (
        text === "dashboard" ||
        text === "profile" ||
        href.includes("dashboard.html") ||
        href.includes("profile.html")
      ) {
        el.remove();
      }
    });

    document.querySelectorAll(".tkms-profile-btn, .profile-btn, [class*='profile']").forEach(function (el) {
      if (!el.classList.contains("profile-page") && !location.pathname.includes("profile.html")) {
        el.remove();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", removeDashboardAndProfileOptions);
  removeDashboardAndProfileOptions();
  setTimeout(removeDashboardAndProfileOptions, 500);
  setTimeout(removeDashboardAndProfileOptions, 1500);
  setInterval(removeDashboardAndProfileOptions, 3000);
})();
