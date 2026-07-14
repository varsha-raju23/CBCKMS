(function () {
  function closeAll(except) {
    document.querySelectorAll(".tkms-custom-select.open").forEach(function (box) {
      if (box !== except) box.classList.remove("open");
    });
  }

  function getSignature(select) {
    return Array.from(select.options).map(function (o) {
      return o.value + "::" + o.textContent;
    }).join("|") + "::" + select.value;
  }

  function buildCustomSelect(select) {
    if (!select || select.dataset.tkmsCustomDone === "1") {
      if (select && select.dataset.tkmsCustomDone === "1") refreshCustomSelect(select);
      return;
    }

    select.dataset.tkmsCustomDone = "1";
    select.classList.add("tkms-native-select-hidden");

    const wrapper = document.createElement("div");
    wrapper.className = "tkms-custom-select";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "tkms-custom-select-button";

    const menu = document.createElement("div");
    menu.className = "tkms-custom-select-menu";

    wrapper.appendChild(button);
    wrapper.appendChild(menu);

    select.parentNode.insertBefore(wrapper, select.nextSibling);

    button.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      const isOpen = wrapper.classList.contains("open");
      closeAll(wrapper);

      if (!isOpen) wrapper.classList.add("open");
    });

    wrapper.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    select._tkmsWrapper = wrapper;
    select._tkmsButton = button;
    select._tkmsMenu = menu;

    refreshCustomSelect(select);
  }

  function refreshCustomSelect(select) {
    if (!select._tkmsWrapper) return;

    const sig = getSignature(select);
    if (select.dataset.tkmsSignature === sig) return;
    select.dataset.tkmsSignature = sig;

    const button = select._tkmsButton;
    const menu = select._tkmsMenu;

    const selected = select.options[select.selectedIndex];
    button.textContent = selected && selected.textContent ? selected.textContent : "Select option";

    menu.innerHTML = "";

    Array.from(select.options).forEach(function (option) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "tkms-custom-select-item";
      item.textContent = option.textContent || "Select option";
      item.dataset.value = option.value;

      if (option.disabled) item.disabled = true;
      if (option.value === select.value) item.classList.add("selected");

      item.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();

        select.value = option.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        select.dispatchEvent(new Event("input", { bubbles: true }));

        button.textContent = option.textContent || "Select option";

        menu.querySelectorAll(".tkms-custom-select-item").forEach(function (x) {
          x.classList.remove("selected");
        });

        item.classList.add("selected");
        select._tkmsWrapper.classList.remove("open");
      });

      menu.appendChild(item);
    });
  }

  function applyCustomSelects() {
    document.querySelectorAll("select").forEach(function (select) {
      buildCustomSelect(select);
      refreshCustomSelect(select);
    });
  }

  document.addEventListener("click", function () {
    closeAll();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeAll();
  });

  document.addEventListener("DOMContentLoaded", applyCustomSelects);
  applyCustomSelects();

  setInterval(applyCustomSelects, 700);

  new MutationObserver(applyCustomSelects).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
