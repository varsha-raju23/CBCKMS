(function () {
  function fixUI() {
    document.querySelectorAll("select").forEach(function (select) {
      select.removeAttribute("multiple");
      select.setAttribute("size", "1");
      select.size = 1;
      select.style.height = "48px";
      select.style.maxHeight = "48px";
      select.style.overflow = "hidden";
    });

    document.querySelectorAll("button").forEach(function (btn) {
      const text = (btn.textContent || "").trim();
      if (!text && !btn.classList.contains("user-avatar")) {
        btn.textContent = "Menu";
      }
    });
  }

  document.addEventListener("DOMContentLoaded", fixUI);
  fixUI();
  setTimeout(fixUI, 500);
})();
