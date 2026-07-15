(function () {
  const BAD = [
    [/ðŸ[\s\S]{0,8}/g, ""],
    [/â€¹/g, "Previous"],
    [/â€º/g, "Next"],
    [/â†’/g, "->"],
    [/â€“/g, "-"],
    [/â€”/g, "-"],
    [/â€¢/g, "-"],
    [/Â/g, ""],
    [/�/g, ""],
    [/undefined/gi, ""],
    [/\$\{Array\(6\)\.fill\(''\)\.join\(''\)\}/g, ""]
  ];

  function cleanText(text) {
    if (!text) return text;
    let out = String(text);
    BAD.forEach(pair => out = out.replace(pair[0], pair[1]));
    return out.replace(/\s+/g, " ").trimStart();
  }

  function cleanDomText() {
    if (!document.body) return;

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;

    while ((node = walker.nextNode())) {
      const newText = cleanText(node.nodeValue);
      if (newText !== node.nodeValue) node.nodeValue = newText;
    }

    document.querySelectorAll("[placeholder], [title], [aria-label], input[value]").forEach(el => {
      ["placeholder", "title", "aria-label", "value"].forEach(attr => {
        const val = el.getAttribute(attr);
        if (val) el.setAttribute(attr, cleanText(val));
      });
    });
  }

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }

  function initTheme() {
    setTheme(localStorage.getItem("theme") || "dark");
  }

  function ensureNavbar() {
    const nav = document.querySelector(".navbar, nav, header");
    if (!nav) return;

    const existingLinks = Array.from(nav.querySelectorAll("a")).map(a => (a.textContent || "").toLowerCase());

    const aiLink = Array.from(nav.querySelectorAll("a")).find(a => (a.textContent || "").toLowerCase().includes("ai assistant"));
    const helpLink = Array.from(nav.querySelectorAll("a")).find(a => (a.textContent || "").toLowerCase().includes("help"));

    if (!existingLinks.some(t => t.includes("tunnel tools"))) {
      const link = document.createElement("a");
      link.href = "/pages/tunnel-tools.html";
      link.className = "nav-link";
      link.textContent = "Tunnel Tools";

      if (helpLink && helpLink.parentNode) {
        helpLink.parentNode.insertBefore(link, helpLink);
      } else if (aiLink && aiLink.parentNode) {
        aiLink.parentNode.insertBefore(link, aiLink.nextSibling);
      } else {
        nav.appendChild(link);
      }
    }

    Array.from(nav.querySelectorAll("button, a")).forEach(el => {
      const text = cleanText(el.textContent || "").toLowerCase();

      if (text === "action" || text.includes("action")) {
        el.style.display = "none";
      }

      if (text === "menu" || text === "") {
        if (!el.classList.contains("tkms-menu-btn") && !el.classList.contains("tkms-theme-btn") && !el.classList.contains("user-avatar")) {
          el.style.display = "none";
        }
      }
    });

    if (!nav.querySelector(".tkms-theme-btn")) {
      const theme = document.createElement("button");
      theme.type = "button";
      theme.className = "tkms-theme-btn";
      theme.textContent = "Theme";
      theme.onclick = function () {
        const current = document.documentElement.getAttribute("data-theme") || "dark";
        setTheme(current === "dark" ? "light" : "dark");
      };
      nav.appendChild(theme);
    }

    if (!nav.querySelector(".tkms-menu-wrap")) {
      const wrap = document.createElement("div");
      wrap.className = "tkms-menu-wrap";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tkms-menu-btn";
      btn.textContent = "Menu";

      const menu = document.createElement("div");
      menu.className = "tkms-menu-panel";

      const user = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");
      const role = String(user.role || "").toUpperCase();

      menu.innerHTML =
        '<a href="/pages/profile.html">Profile</a>' +
        (role.includes("ADMIN") ? '<a href="/pages/admin.html">Admin Panel</a>' : "") +
        '<button type="button" id="tkmsLogoutBtn">Logout</button>';

      btn.onclick = function (e) {
        e.stopPropagation();
        wrap.classList.toggle("open");
      };

      wrap.appendChild(btn);
      wrap.appendChild(menu);
      nav.appendChild(wrap);

      const logout = menu.querySelector("#tkmsLogoutBtn");
      if (logout) {
        logout.onclick = function () {
          localStorage.clear();
          sessionStorage.clear();
          location.href = "/pages/login.html";
        };
      }
    }
  }

  function closeMenus() {
    document.querySelectorAll(".tkms-menu-wrap.open, .tkms-custom-select.open").forEach(el => el.classList.remove("open"));
  }

  function fixUploads() {
    const isDashboard = location.pathname.includes("dashboard.html");
    const isDocuments = location.pathname.includes("documents.html");

    if (isDashboard) {
      document.querySelectorAll("button, a").forEach(el => {
        const text = cleanText(el.textContent || "").toLowerCase();
        if (text === "upload" || text.includes("quick upload")) el.style.display = "none";
      });

      document.querySelectorAll("*").forEach(el => {
        const text = cleanText(el.textContent || "").toLowerCase();
        if (text.includes("quick upload") || (text.includes("drop file") && text.includes("upload"))) {
          const box = el.closest("section, .card, .upload-card, .dashboard-card, div");
          if (box) box.style.display = "none";
        }
      });
    }

    if (isDocuments) {
      let firstUpload = null;

      document.querySelectorAll("button, a").forEach(el => {
        const text = cleanText(el.textContent || "").toLowerCase();
        if (text === "upload" || text.includes("upload document")) {
          if (el.closest(".modal, .upload-modal")) return;
          if (!firstUpload) {
            firstUpload = el;
            el.textContent = "Upload";
          } else {
            el.style.display = "none";
          }
        }
      });

      document.querySelectorAll("button, a").forEach(el => {
        const text = cleanText(el.textContent || "").toLowerCase();
        if (text.includes("download")) el.textContent = "Download";
        if (text === "view" || text.includes("view")) {
          if (!text.includes("view all")) el.textContent = "View";
        }
      });

      document.querySelectorAll("*").forEach(el => {
        const text = cleanText(el.textContent || "").toLowerCase();
        if (text === "recently viewed" || text === "recent documents") {
          const box = el.closest("section, .card, div");
          if (box) box.style.display = "none";
        }
      });
    }
  }

  function fixDashboard() {
    if (!location.pathname.includes("dashboard.html")) return;

    document.querySelectorAll("*").forEach(el => {
      const text = cleanText(el.textContent || "").toLowerCase();
      if (text === "loading chart..." || text === "loading...") {
        el.textContent = "No chart data available yet";
      }
    });
  }

  async function fixAiPage() {
    if (!location.pathname.includes("ai-assistant.html")) return;

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token") || "";
      const res = await fetch("/api/documents", {
        headers: token ? { Authorization: "Bearer " + token } : {}
      });
      const data = await res.json();
      let count = 0;
      if (Array.isArray(data.documents)) count = data.documents.length;
      else if (data.documents && typeof data.documents === "object") count = Object.values(data.documents).length;

      document.querySelectorAll("*").forEach(el => {
        const text = cleanText(el.textContent || "").toLowerCase();
        if (text === "total documents") {
          const parent = el.closest(".card, div");
          if (parent) {
            const number = parent.querySelector("strong, .count, .badge, span:last-child");
            if (number) number.textContent = String(count);
          }
        }

        if (text.includes("ai assistant failed")) {
          el.textContent = "AI could not answer right now. Please upload readable PDF, DOCX, or TXT documents and try again.";
        }
      });
    } catch {}
  }

  function buildCustomSelect(select) {
    if (select.dataset.tkmsCustom === "1") return;

    select.dataset.tkmsCustom = "1";
    select.classList.add("tkms-native-select-hidden");

    const wrap = document.createElement("div");
    wrap.className = "tkms-custom-select";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tkms-custom-select-button";

    const menu = document.createElement("div");
    menu.className = "tkms-custom-select-menu";

    wrap.appendChild(btn);
    wrap.appendChild(menu);
    select.parentNode.insertBefore(wrap, select.nextSibling);

    function refresh() {
      const selected = select.options[select.selectedIndex];
      btn.textContent = selected ? cleanText(selected.textContent || "Select") : "Select";

      menu.innerHTML = "";

      Array.from(select.options).forEach(option => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "tkms-custom-select-item";
        item.textContent = cleanText(option.textContent || "Select");

        if (option.value === select.value) item.classList.add("selected");

        item.onclick = function (e) {
          e.preventDefault();
          e.stopPropagation();
          select.value = option.value;
          select.dispatchEvent(new Event("change", { bubbles: true }));
          select.dispatchEvent(new Event("input", { bubbles: true }));
          refresh();
          wrap.classList.remove("open");
        };

        menu.appendChild(item);
      });
    }

    btn.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      document.querySelectorAll(".tkms-custom-select.open").forEach(x => {
        if (x !== wrap) x.classList.remove("open");
      });
      wrap.classList.toggle("open");
    };

    select.addEventListener("change", refresh);
    refresh();
  }

  function fixSelects() {
    document.querySelectorAll("select").forEach(select => {
      select.removeAttribute("multiple");
      select.setAttribute("size", "1");
      select.size = 1;
      buildCustomSelect(select);
    });
  }

  function cleanupLogin() {
    if (!location.pathname.includes("login.html")) return;

    document.querySelectorAll("p, li").forEach(el => {
      const text = cleanText(el.textContent || "");
      if (text.length > 85) el.style.display = "none";
    });
  }

  function runAll() {
    cleanDomText();
    initTheme();
    ensureNavbar();
    fixUploads();
    fixDashboard();
    fixAiPage();
    fixSelects();
    cleanupLogin();
  }

  document.addEventListener("click", closeMenus);
  document.addEventListener("DOMContentLoaded", runAll);

  runAll();
  setTimeout(runAll, 500);
  setTimeout(runAll, 1500);
  setInterval(runAll, 3000);
})();
