(function () {
  const NAV_LINKS = [
    { text: "Dashboard", href: "/pages/dashboard.html" },
    { text: "Documents", href: "/pages/documents.html" },
    { text: "AI Assistant", href: "/pages/ai-assistant.html" },
    { text: "Tunnel Tools", href: "/pages/tunnel-tools.html" },
    { text: "Help Center", href: "/pages/help-center.html" }
  ];

  function txt(el) {
    return (el.textContent || "").trim().toLowerCase();
  }

  function cleanBadTopButtons(nav) {
    Array.from(nav.querySelectorAll("button, a")).forEach(function (el) {
      const text = txt(el);
      const href = (el.getAttribute("href") || "").toLowerCase();

      if (
        text === "action" ||
        text === "menu" ||
        text === "profile" ||
        text.includes("notification") ||
        text.includes("alert") ||
        href.includes("profile.html") ||
        el.classList.contains("tkms-profile-btn") ||
        el.classList.contains("tkms-menu-btn") ||
        el.classList.contains("tkms-menu-wrap")
      ) {
        el.remove();
        return;
      }

      if (!text && !el.classList.contains("user-avatar") && !el.classList.contains("tkms-theme-btn")) {
        el.remove();
      }
    });

    document.querySelectorAll(".tkms-menu-wrap, .tkms-menu-panel, .tkms-profile-btn").forEach(function (el) {
      el.remove();
    });
  }

  function ensureLinks(nav) {
    NAV_LINKS.forEach(function (item) {
      const exists = Array.from(nav.querySelectorAll("a")).some(function (a) {
        return txt(a) === item.text.toLowerCase() || (a.getAttribute("href") || "").includes(item.href);
      });

      if (!exists) {
        const link = document.createElement("a");
        link.href = item.href;
        link.className = "nav-link";
        link.textContent = item.text;
        nav.appendChild(link);
      }
    });

    const seen = new Set();
    Array.from(nav.querySelectorAll("a")).forEach(function (a) {
      const text = txt(a);
      if (!text) return;

      if (NAV_LINKS.some(x => x.text.toLowerCase() === text)) {
        if (seen.has(text)) {
          a.remove();
        } else {
          seen.add(text);
        }
      }
    });
  }

  function ensureThemeRight(nav) {
    document.querySelectorAll(".tkms-theme-btn").forEach(function (btn, index) {
      if (index > 0) btn.remove();
    });

    let theme = document.querySelector(".tkms-theme-btn");

    if (!theme) {
      theme = document.createElement("button");
      theme.type = "button";
      theme.className = "tkms-theme-btn";
      theme.textContent = "Theme";
      theme.onclick = function () {
        const current = document.documentElement.getAttribute("data-theme") || localStorage.getItem("theme") || "dark";
        const next = current === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem("theme", next);
      };
    }

    nav.appendChild(theme);
  }

  function runNavFix() {
    const nav = document.querySelector(".navbar, nav, header");
    if (!nav) return;

    cleanBadTopButtons(nav);
    ensureLinks(nav);
    ensureThemeRight(nav);
  }

  document.addEventListener("DOMContentLoaded", runNavFix);
  runNavFix();
  setTimeout(runNavFix, 500);
  setTimeout(runNavFix, 1500);
  setInterval(runNavFix, 2000);
})();
