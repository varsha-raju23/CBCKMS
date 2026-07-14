(function () {
  function hideDashboardUpload() {
    if (!location.pathname.includes("dashboard.html")) return;

    document.querySelectorAll("button, a").forEach(function (el) {
      const text = (el.textContent || "").trim().toLowerCase();

      if (text === "upload" || text.includes("upload document")) {
        el.style.display = "none";
      }
    });

    document.querySelectorAll("*").forEach(function (el) {
      const text = (el.textContent || "").trim().toLowerCase();

      if (text === "quick upload" || text.includes("drag") && text.includes("upload")) {
        const card =
          el.closest(".card") ||
          el.closest(".upload-card") ||
          el.closest("section") ||
          el.parentElement;

        if (card) card.style.display = "none";
      }
    });
  }

  document.addEventListener("DOMContentLoaded", hideDashboardUpload);
  hideDashboardUpload();
  setTimeout(hideDashboardUpload, 500);
  setTimeout(hideDashboardUpload, 1500);
})();
