(function () {
  const badPatterns = [
    [/ðŸ[\s\S]{0,10}/g, ""],
    [/â€¹/g, "Previous"],
    [/â€º/g, "Next"],
    [/â†’/g, "->"],
    [/â†/g, "->"],
    [/â€“/g, "-"],
    [/â€”/g, "-"],
    [/â€¢/g, "-"],
    [/â€˜/g, "'"],
    [/â€™/g, "'"],
    [/â€œ/g, '"'],
    [/â€�/g, '"'],
    [/Â/g, ""],
    [/�/g, ""],
    [/\$\{Array\(6\)\.fill\(''\)\.join\(''\)\}/g, ""]
  ];

  function cleanText(value) {
    if (!value) return value;
    let text = String(value);
    badPatterns.forEach(function (pair) {
      text = text.replace(pair[0], pair[1]);
    });
    return text.replace(/\bundefined\b/gi, "").replace(/\s+/g, " ").trimStart();
  }

  function cleanDomText() {
    if (!document.body) return;

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;

    while ((node = walker.nextNode())) {
      const fixed = cleanText(node.nodeValue);
      if (fixed !== node.nodeValue) node.nodeValue = fixed;
    }

    document.querySelectorAll("[placeholder], [title], [aria-label], input[value]").forEach(function (el) {
      ["placeholder", "title", "aria-label", "value"].forEach(function (attr) {
        const val = el.getAttribute(attr);
        if (val) el.setAttribute(attr, cleanText(val));
      });
    });
  }

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }

  function setupTheme() {
    setTheme(localStorage.getItem("theme") || "dark");

    document.querySelectorAll(".tkms-theme-btn").forEach(function (btn, index) {
      if (index > 0) btn.remove();
    });

    const nav = document.querySelector(".navbar, nav, header");
    if (!nav) return;

    if (!document.querySelector(".tkms-theme-btn")) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tkms-theme-btn";
      btn.textContent = "Theme";
      btn.onclick = function () {
        const current = document.documentElement.getAttribute("data-theme") || "dark";
        setTheme(current === "dark" ? "light" : "dark");
      };
      nav.appendChild(btn);
    }
  }

  function setupProfileOnly() {
    const nav = document.querySelector(".navbar, nav, header");
    if (!nav) return;

    document.querySelectorAll(".tkms-menu-wrap, .tkms-menu-btn, .tkms-menu-panel").forEach(function (el) {
      el.remove();
    });

    Array.from(nav.querySelectorAll("button, a")).forEach(function (el) {
      const text = cleanText(el.textContent || "").trim().toLowerCase();

      if (text === "action" || text.includes("action")) {
        el.remove();
        return;
      }

      if (text === "menu") {
        el.remove();
        return;
      }

      if (!text && !el.classList.contains("user-avatar")) {
        el.remove();
      }
    });

    document.querySelectorAll(".tkms-profile-btn").forEach(function (btn, index) {
      if (index > 0) btn.remove();
    });

    if (!document.querySelector(".tkms-profile-btn")) {
      const profile = document.createElement("a");
      profile.href = "/pages/profile.html";
      profile.className = "tkms-profile-btn";
      profile.textContent = "Profile";
      nav.appendChild(profile);
    }
  }

  function ensureTunnelToolsLink() {
    const nav = document.querySelector(".navbar, nav, header");
    if (!nav) return;

    const hasTools = Array.from(nav.querySelectorAll("a")).some(function (a) {
      return (a.textContent || "").toLowerCase().includes("tunnel tools");
    });

    if (!hasTools) {
      const link = document.createElement("a");
      link.href = "/pages/tunnel-tools.html";
      link.className = "nav-link";
      link.textContent = "Tunnel Tools";

      const help = Array.from(nav.querySelectorAll("a")).find(function (a) {
        return (a.textContent || "").toLowerCase().includes("help");
      });

      if (help && help.parentNode) {
        help.parentNode.insertBefore(link, help);
      } else {
        nav.appendChild(link);
      }
    }
  }

  function fixUploads() {
    const isDocs = location.pathname.includes("documents.html");

    if (!isDocs) {
      document.querySelectorAll("button, a").forEach(function (el) {
        const text = cleanText(el.textContent || "").toLowerCase();
        if (text === "upload" || text.includes("upload document") || text.includes("quick upload")) {
          el.style.display = "none";
        }
      });

      document.querySelectorAll("*").forEach(function (el) {
        const text = cleanText(el.textContent || "").toLowerCase();
        if (text.includes("quick upload") || (text.includes("drag") && text.includes("upload"))) {
          const box = el.closest("section, .card, .upload-card, div");
          if (box) box.style.display = "none";
        }
      });

      return;
    }

    let firstUpload = null;

    document.querySelectorAll("button, a").forEach(function (el) {
      const text = cleanText(el.textContent || "").toLowerCase();

      if (text === "upload" || text.includes("upload document")) {
        if (el.closest(".modal, .upload-modal, form")) return;

        if (!firstUpload) {
          firstUpload = el;
          el.textContent = "Upload";
          el.style.display = "";
        } else {
          el.style.display = "none";
        }
      }

      if (text.includes("download")) el.textContent = "Download";
      if (text === "view" || text.includes("view document")) el.textContent = "View";
      if (text === "previous" || text === "prev") el.textContent = "Previous";
      if (text === "next") el.textContent = "Next";
    });
  }

  function dedupeDocuments() {
    if (!location.pathname.includes("documents.html")) return;

    const seen = new Set();
    const cards = document.querySelectorAll(".doc-card, .document-card, .document-item, [data-document-id]");

    cards.forEach(function (card) {
      const id = card.getAttribute("data-document-id") || "";
      const titleEl = card.querySelector("h1, h2, h3, h4, .title, .document-title");
      const title = cleanText(titleEl ? titleEl.textContent : card.textContent).slice(0, 120);
      const key = id || title;

      if (!key) return;

      if (seen.has(key)) {
        card.style.display = "none";
      } else {
        seen.add(key);
      }
    });

    document.querySelectorAll("*").forEach(function (el) {
      const text = cleanText(el.textContent || "").trim().toLowerCase();
      if (text === "recently viewed" || text === "recent documents") {
        const box = el.closest("section, .card, div");
        if (box) box.style.display = "none";
      }
    });
  }

  function fixAiChatScroll() {
    if (!location.pathname.includes("ai-assistant.html")) return;

    const candidates = document.querySelectorAll(
      ".chat-messages, .messages, .chat-container, .conversation, #chatMessages, #messages, [class*='chat'], [id*='chat']"
    );

    candidates.forEach(function (el) {
      const text = (el.textContent || "").toLowerCase();

      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "BUTTON") return;
      if (text.includes("send") && el.querySelector("input, textarea")) return;

      el.classList.add("tkms-ai-scroll-box");
      el.style.maxHeight = "62vh";
      el.style.overflowY = "auto";
      el.style.scrollBehavior = "smooth";
    });

    const scrollBox =
      document.querySelector("#chatMessages") ||
      document.querySelector(".chat-messages") ||
      document.querySelector(".messages") ||
      document.querySelector(".tkms-ai-scroll-box");

    if (scrollBox) {
      setTimeout(function () {
        scrollBox.scrollTop = scrollBox.scrollHeight;
      }, 200);
    }

    document.querySelectorAll("*").forEach(function (el) {
      const text = cleanText(el.textContent || "").toLowerCase();
      if (text.includes("ai assistant failed")) {
        el.textContent = "AI could not answer right now. Please upload readable PDF, DOCX, or TXT documents and try again.";
      }
    });
  }

  function fixDashboardLoading() {
    if (!location.pathname.includes("dashboard.html")) return;

    document.querySelectorAll("*").forEach(function (el) {
      const text = cleanText(el.textContent || "").trim().toLowerCase();
      if (text === "loading chart..." || text === "loading...") {
        el.textContent = "No chart data available yet";
      }
    });
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

      Array.from(select.options).forEach(function (option) {
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

      document.querySelectorAll(".tkms-custom-select.open").forEach(function (x) {
        if (x !== wrap) x.classList.remove("open");
      });

      wrap.classList.toggle("open");
    };

    select.addEventListener("change", refresh);
    refresh();
  }

  function fixSelects() {
    document.querySelectorAll("select").forEach(function (select) {
      select.removeAttribute("multiple");
      select.setAttribute("size", "1");
      select.size = 1;
      buildCustomSelect(select);
    });
  }

  function cleanupLogin() {
    if (!location.pathname.includes("login.html")) return;

    document.querySelectorAll("p, li").forEach(function (el) {
      const text = cleanText(el.textContent || "");
      if (text.length > 80) el.style.display = "none";
    });
  }

  function run() {
    cleanDomText();
    setupTheme();
    setupProfileOnly();
    ensureTunnelToolsLink();
    fixUploads();
    dedupeDocuments();
    fixAiChatScroll();
    fixDashboardLoading();
    fixSelects();
    cleanupLogin();
  }

  document.addEventListener("click", function () {
    document.querySelectorAll(".tkms-custom-select.open").forEach(function (el) {
      el.classList.remove("open");
    });
  });

  document.addEventListener("DOMContentLoaded", run);
  run();
  setTimeout(run, 500);
  setTimeout(run, 1500);
  setInterval(run, 3000);
})();
