// js/app/tutorial.js

const TUTORIAL_SEEN_KEY = "moronabus_tutorial_seen";

const STEPS = [
  {
    selector: ".navbar-brand",
    title: "Bienvenido a MoronaBus",
    body: "Esta plataforma te ayuda a consultar transporte, lugares turísticos, servicios, eventos, clima, rutas y accesibilidad desde un mapa interactivo."
  },
  {
    selector: "#loc-banner-wrap",
    title: "Detección de ubicación",
    body: "Aquí aparece tu provincia, cantón, parroquia y entorno detectado. Si estás en Sevilla o Morona, la app comparte cobertura para mostrar más información útil."
  },
  {
    selector: "#category",
    title: "Categorías",
    body: "Desde este selector puedes buscar terminales, líneas de bus, taxis, restaurantes, hospedaje, salud, comercios, eventos, bancos, educación, iglesias y más."
  },
  {
    selector: "#extra-controls",
    title: "Resultados y filtros",
    body: "Aquí aparecen listas desplegables, botones de lugar más cercano, modos de transporte, eventos, líneas y controles especiales según la categoría elegida."
  },
  {
    selector: "#map",
    title: "Mapa interactivo",
    body: "El mapa muestra tu ubicación, marcadores, rutas, paradas, terminales y puntos seleccionados. También puedes usar clic derecho para indicaciones desde o hasta un punto."
  },
  {
    selector: "#map",
    title: "Indicaciones",
    body: "Puedes calcular rutas caminando, en bicicleta, moto, auto o bus. En bus se muestran caminatas, tramo de bus, paradas aproximadas y sentido de la línea."
  },
  {
    selector: "#extra-controls",
    title: "Iniciar trayecto",
    body: "Después de escoger un destino y un modo de transporte, puede aparecer Iniciar trayecto. Al activarlo, tu ubicación se actualiza conforme avanzas."
  },
  {
    selector: "#weatherBadge",
    title: "Clima",
    body: "El indicador del clima abre el pronóstico por hora y por días para ayudarte a planificar tu salida."
  },
  {
    selector: "#btnVoiceReader",
    title: "Asistente de voz",
    body: "Activa este botón para que la página lea en voz alta los elementos al pasar el mouse, enfocar o seleccionar opciones."
  },
  {
    selector: "#btnLang",
    title: "Idioma",
    body: "Cambia entre español e inglés. La interfaz, avisos, popups, modales y controles se traducen, manteniendo intactos los datos consultados desde la base."
  },
  {
    selector: "#btnTheme",
    title: "Tema",
    body: "Cambia entre modo claro y oscuro según prefieras."
  },
  {
    selector: ".main-footer",
    title: "Footer y enlaces",
    body: "Abajo puedes descargar la app para Android, contactar al creador, registrar lugares, reportar sugerencias, ver proyectos relacionados e información del proyecto."
  }
];

function isVisible(el) {
  if (!el || !(el instanceof Element)) return false;
  const style = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
}

function getTarget(selector) {
  const el = document.querySelector(selector);
  return isVisible(el) ? el : null;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createTutorialDOM() {
  const overlay = document.createElement("div");
  overlay.id = "tm-tutorial";
  overlay.className = "tm-tutorial";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
    <div class="tm-tutorial__shade"></div>
    <div class="tm-tutorial__spotlight" aria-hidden="true"></div>
    <section class="tm-tutorial__card" role="dialog" aria-modal="true" aria-labelledby="tm-tutorial-title">
      <div class="tm-tutorial__top">
        <div>
          <div class="tm-tutorial__eyebrow" id="tm-tutorial-count">Tutorial</div>
          <h2 class="tm-tutorial__title" id="tm-tutorial-title">MoronaBus</h2>
        </div>
        <button type="button" class="tm-tutorial__icon" id="tm-tutorial-close" aria-label="Cerrar tutorial">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
      <p class="tm-tutorial__body" id="tm-tutorial-body"></p>
      <div class="tm-tutorial__progress" id="tm-tutorial-progress"></div>
      <div class="tm-tutorial__actions">
        <button type="button" class="btn btn-outline-secondary btn-sm" id="tm-tutorial-prev">Anterior</button>
        <button type="button" class="btn btn-primary btn-sm" id="tm-tutorial-next">Siguiente</button>
      </div>
    </section>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

export function initInteractiveTutorial({ autoOpen = false } = {}) {
  const btn = document.getElementById("btnTutorial");
  if (!btn || btn.dataset.tutorialReady === "true") return;

  btn.dataset.tutorialReady = "true";

  const overlay = createTutorialDOM();
  const spotlight = overlay.querySelector(".tm-tutorial__spotlight");
  const card = overlay.querySelector(".tm-tutorial__card");
  const title = overlay.querySelector("#tm-tutorial-title");
  const body = overlay.querySelector("#tm-tutorial-body");
  const count = overlay.querySelector("#tm-tutorial-count");
  const progress = overlay.querySelector("#tm-tutorial-progress");
  const prev = overlay.querySelector("#tm-tutorial-prev");
  const next = overlay.querySelector("#tm-tutorial-next");
  const close = overlay.querySelector("#tm-tutorial-close");

  let index = 0;
  let open = false;

  function renderProgress() {
    progress.innerHTML = STEPS.map((_, i) => (
      `<span class="${i === index ? "active" : ""}" aria-hidden="true"></span>`
    )).join("");
  }

  function placeCard(target) {
    const margin = 14;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cardRect = card.getBoundingClientRect();

    if (!target || vw < 768) {
      card.style.left = `${margin}px`;
      card.style.right = `${margin}px`;
      card.style.top = "auto";
      card.style.bottom = `${margin}px`;
      return;
    }

    const rect = target.getBoundingClientRect();
    const preferRight = rect.left + rect.width / 2 < vw / 2;
    const left = preferRight
      ? clamp(rect.right + margin, margin, vw - cardRect.width - margin)
      : clamp(rect.left - cardRect.width - margin, margin, vw - cardRect.width - margin);
    const top = clamp(rect.top, margin, vh - cardRect.height - margin);

    card.style.left = `${left}px`;
    card.style.right = "auto";
    card.style.top = `${top}px`;
    card.style.bottom = "auto";
  }

  function render() {
    const step = STEPS[index];
    const target = getTarget(step.selector);

    title.textContent = step.title;
    body.textContent = step.body;
    count.textContent = `Paso ${index + 1} de ${STEPS.length}`;
    prev.disabled = index === 0;
    next.textContent = index === STEPS.length - 1 ? "Finalizar" : "Siguiente";
    renderProgress();

    if (target) {
      target.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
      setTimeout(() => {
        const rect = target.getBoundingClientRect();
        spotlight.style.display = "block";
        spotlight.style.left = `${rect.left - 8}px`;
        spotlight.style.top = `${rect.top - 8}px`;
        spotlight.style.width = `${rect.width + 16}px`;
        spotlight.style.height = `${rect.height + 16}px`;
        placeCard(target);
      }, 220);
    } else {
      spotlight.style.display = "none";
      placeCard(null);
    }
  }

  function start() {
    open = true;
    index = 0;
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    btn.classList.add("active");
    btn.setAttribute("aria-pressed", "true");
    render();
  }

  function finish() {
    open = false;
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    btn.classList.remove("active");
    btn.setAttribute("aria-pressed", "false");
    localStorage.setItem(TUTORIAL_SEEN_KEY, "1");
  }

  btn.addEventListener("click", () => {
    if (open) finish();
    else start();
  });

  close.addEventListener("click", finish);
  prev.addEventListener("click", () => {
    if (index > 0) {
      index -= 1;
      render();
    }
  });
  next.addEventListener("click", () => {
    if (index >= STEPS.length - 1) {
      finish();
      return;
    }
    index += 1;
    render();
  });

  window.addEventListener("resize", () => {
    if (open) render();
  });
  window.addEventListener("keydown", (event) => {
    if (!open) return;
    if (event.key === "Escape") finish();
    if (event.key === "ArrowRight") next.click();
    if (event.key === "ArrowLeft") prev.click();
  });

  if (autoOpen && !localStorage.getItem(TUTORIAL_SEEN_KEY)) {
    setTimeout(start, 900);
  }
}
