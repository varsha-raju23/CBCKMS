(function () {
  function cleanText(text) {
    if (!text) return text;

    return text
      .replace(/ðŸ[\s\S]{0,6}/g, "")
      .replace(/â€¹/g, "Prev")
      .replace(/â€º/g, "Next")
      .replace(/â†’/g, "->")
      .replace(/â†\s*/g, "->")
      .replace(/â€“/g, "-")
      .replace(/â€”/g, "-")
      .replace(/â€˜/g, "'")
      .replace(/â€™/g, "'")
      .replace(/â€œ/g, '"')
      .replace(/â€�/g, '"')
      .replace(/â€¢/g, "-")
      .replace(/Â/g, "")
      .replace(/�/g, "")
      .replace(/\s+/g, " ")
      .trimStart();
  }

  function fixVisibleText() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;

    while ((node = walker.nextNode())) {
      const oldText = node.nodeValue;
      const newText = cleanText(oldText);
      if (newText !== oldText) node.nodeValue = newText;
    }

    document.querySelectorAll("[placeholder], [title], [aria-label], input[value]").forEach(function (el) {
      ["placeholder", "title", "aria-label", "value"].forEach(function (attr) {
        const value = el.getAttribute(attr);
        if (value) el.setAttribute(attr, cleanText(value));
      });
    });
  }

  function fixImportantLabels() {
    document.querySelectorAll("h1").forEach(function (h1) {
      if (h1.textContent.includes("Welcome back")) {
        h1.textContent = "Welcome back, Engineer!";
      }
    });

    document.querySelectorAll("button, a").forEach(function (el) {
      const text = cleanText(el.textContent || "");

      if (text.toLowerCase().includes("download")) el.textContent = "Download";
      if (text.toLowerCase().includes("upload")) el.textContent = "Upload";
      if (text.toLowerCase().includes("all documents")) el.textContent = "All Documents";

      const finalText = cleanText(el.textContent || "");

      if (finalText === "Prev" || finalText === "<" || finalText === "‹") {
        el.textContent = "Prev";
      }

      if (finalText === "Next" || finalText === ">" || finalText === "›") {
        el.textContent = "Next";
      }
    });

    document.querySelectorAll("input[placeholder]").forEach(function (input) {
      if (input.placeholder.toLowerCase().includes("search documents")) {
        input.placeholder = "Search documents by name, project, type...";
      }
    });
  }

  function fixTopButtons() {
    const navButtons = Array.from(document.querySelectorAll("nav button, .navbar button, header button"));
    const emptyButtons = navButtons.filter(function (btn) {
      return !cleanText(btn.textContent || "");
    });

    if (emptyButtons[0]) {
      emptyButtons[0].textContent = "Theme";
      emptyButtons[0].setAttribute("aria-label", "Theme");
    }

    if (emptyButtons[1]) {
      emptyButtons[1].textContent = "Alerts";
      emptyButtons[1].setAttribute("aria-label", "Alerts");
    }

    if (emptyButtons[2]) {
      emptyButtons[2].textContent = "Menu";
      emptyButtons[2].setAttribute("aria-label", "Menu");
    }
  }

  function fixDropdowns() {
    document.querySelectorAll("select").forEach(function (select) {
      select.removeAttribute("multiple");
      select.setAttribute("size", "1");
      select.size = 1;
      select.style.height = "48px";
      select.style.maxHeight = "48px";
      select.style.overflow = "hidden";
      select.style.display = "block";
    });
  }

  function addTunnelToolsLink() {
    if (document.querySelector('a[href="/pages/tunnel-tools.html"]')) return;

    const nav =
      document.querySelector(".nav-links") ||
      document.querySelector(".navbar-nav") ||
      document.querySelector("nav") ||
      document.querySelector(".navbar");

    if (!nav) return;

    const link = document.createElement("a");
    link.href = "/pages/tunnel-tools.html";
    link.className = "nav-link";
    link.textContent = "Tunnel Tools";

    const help = Array.from(nav.querySelectorAll("a")).find(function (a) {
      return (a.textContent || "").toLowerCase().includes("help");
    });

    if (help) {
      help.parentNode.insertBefore(link, help);
    } else {
      nav.appendChild(link);
    }
  }

  function runFixes() {
    if (!document.body) return;
    fixVisibleText();
    fixImportantLabels();
    fixTopButtons();
    fixDropdowns();
    addTunnelToolsLink();
  }

  document.addEventListener("DOMContentLoaded", runFixes);
  runFixes();
  setTimeout(runFixes, 300);
  setTimeout(runFixes, 1000);
  setInterval(runFixes, 2000);

  new MutationObserver(runFixes).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true
  });
})();
