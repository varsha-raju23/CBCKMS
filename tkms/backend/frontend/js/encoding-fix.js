(function () {
  const cp1252 = {
    '\u20ac': 0x80, '\u201a': 0x82, '\u0192': 0x83, '\u201e': 0x84,
    '\u2026': 0x85, '\u2020': 0x86, '\u2021': 0x87, '\u02c6': 0x88,
    '\u2030': 0x89, '\u0160': 0x8A, '\u2039': 0x8B, '\u0152': 0x8C,
    '\u017d': 0x8E, '\u2018': 0x91, '\u2019': 0x92, '\u201c': 0x93,
    '\u201d': 0x94, '\u2022': 0x95, '\u2013': 0x96, '\u2014': 0x97,
    '\u02dc': 0x98, '\u2122': 0x99, '\u0161': 0x9A, '\u203a': 0x9B,
    '\u0153': 0x9C, '\u017e': 0x9E, '\u0178': 0x9F
  };

  function looksBroken(text) {
    return text.indexOf('\u00f0\u0178') >= 0 ||
           text.indexOf('\u00c3') >= 0 ||
           text.indexOf('\u00c2') >= 0 ||
           text.indexOf('\u00e2') >= 0;
  }

  function repair(text) {
    if (!text || !looksBroken(text) || !window.TextDecoder) return text;

    try {
      const bytes = [];

      for (const ch of text) {
        const code = ch.charCodeAt(0);

        if (code <= 255) {
          bytes.push(code);
        } else if (cp1252[ch] !== undefined) {
          bytes.push(cp1252[ch]);
        } else {
          return text;
        }
      }

      const decoded = new TextDecoder("utf-8").decode(new Uint8Array(bytes));
      return decoded.includes("\uFFFD") ? text : decoded;
    } catch {
      return text;
    }
  }

  function fixPageText() {
    if (!document.body) return;

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;

    while ((node = walker.nextNode())) {
      const fixed = repair(node.nodeValue);
      if (fixed !== node.nodeValue) node.nodeValue = fixed;
    }

    document.querySelectorAll("[placeholder], [title], [aria-label], input[value], button").forEach(el => {
      ["placeholder", "title", "aria-label", "value"].forEach(attr => {
        const val = el.getAttribute(attr);
        if (val) {
          const fixed = repair(val);
          if (fixed !== val) el.setAttribute(attr, fixed);
        }
      });
    });
  }

  document.addEventListener("DOMContentLoaded", fixPageText);
  fixPageText();
  setTimeout(fixPageText, 500);
  setTimeout(fixPageText, 1500);
})();
