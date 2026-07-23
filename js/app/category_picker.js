const normalizeText = value => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .trim();

/** Crea un selector visual buscable sin alterar los valores del select original. */
export function initCategoryPicker(select) {
  if (!select) return { sync() {} };

  const picker = document.createElement("div");
  picker.id = "categoryPicker";
  picker.className = "tm-category-picker d-none mb-2";
  picker.innerHTML = `
    <button id="categoryPickerButton" class="tm-category-picker__trigger" type="button"
      aria-haspopup="dialog" aria-expanded="false" aria-controls="categoryPickerPanel">
      <span class="tm-category-picker__value">Seleccione categoría</span>
      <i class="bi bi-chevron-down" aria-hidden="true"></i>
    </button>
    <button class="tm-category-picker__reset" type="button" aria-label="Limpiar categoría seleccionada" hidden>
      <i class="bi bi-x-lg" aria-hidden="true"></i>
    </button>
    <button class="tm-category-picker__backdrop" type="button" aria-label="Cerrar selector de categorías" hidden></button>
    <div id="categoryPickerPanel" class="tm-category-picker__panel" role="dialog"
      aria-label="Seleccionar categoría" hidden>
      <div class="tm-category-picker__search-wrap">
        <i class="bi bi-search" aria-hidden="true"></i>
        <input class="tm-category-picker__search" type="search"
          placeholder="Buscar categoría o servicio…" aria-label="Buscar categoría o servicio" autocomplete="off">
        <button class="tm-category-picker__clear-search" type="button" aria-label="Limpiar búsqueda" hidden>
          <i class="bi bi-x-lg" aria-hidden="true"></i>
        </button>
      </div>
      <div class="tm-category-picker__groups"></div>
      <p class="tm-category-picker__empty" hidden>No se encontraron categorías.</p>
    </div>`;
  select.insertAdjacentElement("afterend", picker);

  const trigger = picker.querySelector(".tm-category-picker__trigger");
  const valueLabel = picker.querySelector(".tm-category-picker__value");
  const resetSelection = picker.querySelector(".tm-category-picker__reset");
  const backdrop = picker.querySelector(".tm-category-picker__backdrop");
  const panel = picker.querySelector(".tm-category-picker__panel");
  const search = picker.querySelector(".tm-category-picker__search");
  const clearSearch = picker.querySelector(".tm-category-picker__clear-search");
  const groupsContainer = picker.querySelector(".tm-category-picker__groups");
  const emptyState = picker.querySelector(".tm-category-picker__empty");

  const groups = [...select.querySelectorAll("optgroup")].map((optgroup, index) => ({
    label: optgroup.label,
    index,
    options: [...optgroup.querySelectorAll("option")].map(option => ({
      label: option.textContent.trim(),
      value: option.value
    }))
  }));

  const escapeAttribute = value => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  groupsContainer.innerHTML = groups.map(group => `
    <section class="tm-category-group" data-category-group="${group.index}">
      <button class="tm-category-group__toggle" type="button" aria-expanded="false"
        aria-controls="categoryGroup${group.index}">
        <span>${group.label}</span><i class="bi bi-chevron-right" aria-hidden="true"></i>
      </button>
      <div id="categoryGroup${group.index}" class="tm-category-group__options" hidden>
        ${group.options.map(option => `
          <button class="tm-category-option" type="button"
            data-category-value="${escapeAttribute(option.value)}"
            data-search-text="${escapeAttribute(normalizeText(`${group.label} ${option.label}`))}"
            role="option" aria-selected="false">${option.label}</button>
        `).join("")}
      </div>
    </section>`).join("");

  const setGroupOpen = (section, open) => {
    section.querySelector(".tm-category-group__toggle").setAttribute("aria-expanded", String(open));
    section.querySelector(".tm-category-group__options").hidden = !open;
    section.classList.toggle("is-open", open);
  };

  function applyFilter() {
    const query = normalizeText(search.value);
    let visibleOptions = 0;
    picker.querySelectorAll(".tm-category-group").forEach(section => {
      let groupMatches = 0;
      section.querySelectorAll(".tm-category-option").forEach(option => {
        const matches = !query || option.dataset.searchText.includes(query);
        option.hidden = !matches;
        if (matches) groupMatches += 1;
      });
      section.hidden = groupMatches === 0;
      visibleOptions += groupMatches;
      setGroupOpen(section, Boolean(query && groupMatches));
    });
    clearSearch.hidden = !query;
    emptyState.hidden = visibleOptions > 0;
  }

  const positionPanel = () => {
    const mobile = window.matchMedia("(max-width: 767.98px)").matches;
    panel.style.removeProperty("--picker-panel-left");
    panel.style.removeProperty("--picker-panel-top");
    panel.style.removeProperty("--picker-panel-bottom");
    panel.style.removeProperty("--picker-panel-width");
    panel.style.removeProperty("--picker-panel-max-height");
    panel.dataset.placement = mobile ? "bottom" : "below";
    if (mobile) return;

    const rect = trigger.getBoundingClientRect();
    const edge = 12;
    const gap = 6;
    const width = Math.min(Math.max(rect.width, 300), window.innerWidth - edge * 2);
    const left = Math.min(Math.max(rect.left, edge), window.innerWidth - width - edge);
    const roomBelow = window.innerHeight - rect.bottom - edge - gap;
    const roomAbove = rect.top - edge - gap;
    const openAbove = roomBelow < 280 && roomAbove > roomBelow;

    panel.style.setProperty("--picker-panel-left", `${left}px`);
    panel.style.setProperty("--picker-panel-width", `${width}px`);
    panel.style.setProperty("--picker-panel-max-height", `${Math.max(220, openAbove ? roomAbove : roomBelow)}px`);
    panel.dataset.placement = openAbove ? "above" : "below";

    if (openAbove) {
      panel.style.setProperty("--picker-panel-bottom", `${window.innerHeight - rect.top + gap}px`);
    } else {
      panel.style.setProperty("--picker-panel-top", `${rect.bottom + gap}px`);
    }
  };

  const closePanel = ({ restoreFocus = false } = {}) => {
    panel.hidden = true;
    backdrop.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    picker.classList.remove("is-open");
    search.value = "";
    applyFilter();
    if (restoreFocus) trigger.focus();
  };

  const openPanel = () => {
    if (select.disabled) return;
    panel.hidden = false;
    backdrop.hidden = false;
    positionPanel();
    trigger.setAttribute("aria-expanded", "true");
    picker.classList.add("is-open");
    picker.dispatchEvent(new CustomEvent("category-picker-open", { bubbles: true }));
    if (window.matchMedia("(min-width: 768px)").matches) {
      requestAnimationFrame(() => search.focus());
    }
  };

  const sync = () => {
    const selected = select.selectedOptions[0];
    const hasSelection = Boolean(select.value && selected);
    valueLabel.textContent = hasSelection ? selected.textContent.trim() : "Seleccione categoría";
    picker.classList.toggle("d-none", select.classList.contains("d-none"));
    trigger.disabled = select.disabled;
    trigger.classList.toggle("has-value", hasSelection);
    resetSelection.hidden = !hasSelection || select.disabled;
    picker.querySelectorAll(".tm-category-option").forEach(option => {
      const isSelected = option.dataset.categoryValue === select.value;
      option.classList.toggle("is-selected", isSelected);
      option.setAttribute("aria-selected", String(isSelected));
    });
    if (select.disabled || select.classList.contains("d-none")) closePanel();
  };

  trigger.addEventListener("click", () => panel.hidden ? openPanel() : closePanel({ restoreFocus: true }));
  backdrop.addEventListener("click", () => closePanel({ restoreFocus: true }));
  resetSelection.addEventListener("click", () => {
    select.value = "";
    sync();
    closePanel();
    select.dispatchEvent(new Event("change", { bubbles: true }));
    trigger.focus();
  });
  groupsContainer.addEventListener("click", event => {
    const option = event.target.closest(".tm-category-option");
    if (option) {
      select.value = option.dataset.categoryValue;
      sync();
      closePanel({ restoreFocus: true });
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    const toggle = event.target.closest(".tm-category-group__toggle");
    if (!toggle) return;
    const section = toggle.closest(".tm-category-group");
    const shouldOpen = toggle.getAttribute("aria-expanded") !== "true";
    picker.querySelectorAll(".tm-category-group").forEach(group => setGroupOpen(group, group === section && shouldOpen));
  });
  search.addEventListener("input", applyFilter);
  clearSearch.addEventListener("click", () => {
    search.value = "";
    applyFilter();
    search.focus();
  });
  select.addEventListener("change", sync);
  picker.addEventListener("keydown", event => {
    if (event.key === "Escape" && !panel.hidden) closePanel({ restoreFocus: true });
  });
  document.addEventListener("click", event => {
    if (!panel.hidden && !picker.contains(event.target)) closePanel();
  });
  window.addEventListener("resize", () => {
    if (!panel.hidden) positionPanel();
  });
  document.addEventListener("scroll", () => {
    if (!panel.hidden) positionPanel();
  }, true);
  new MutationObserver(sync).observe(select, { attributes: true, attributeFilter: ["class", "disabled"] });

  sync();
  return { sync, close: closePanel };
}
