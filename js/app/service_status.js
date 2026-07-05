// js/app/service_status.js

import { translateHTML } from "./i18n.js";

const SERVICE_NOTICE_ID = "serviceStatusNotice";
let hideTimer = null;

/**
 * Construye build notice markup para mostrar contenido o preparar datos de la interfaz.
 */
function buildNoticeMarkup() {
  return translateHTML(`
    <div class="tm-service-notice__icon" aria-hidden="true">
      <i class="bi bi-exclamation-triangle-fill"></i>
    </div>
    <div class="tm-service-notice__content">
      <strong>Funcionamiento interrumpido</strong>
      <span>
        Lamentablemente ocurrió un problema con el servicio de datos externo. No es culpa de la app; intenta nuevamente en unos minutos.
      </span>
    </div>
    <button
      type="button"
      class="tm-service-notice__close"
      aria-label="Cerrar"
      title="Cerrar"
    >
      <i class="bi bi-x-lg"></i>
    </button>
  `);
}

/**
 * Obtiene ensure service notice desde el estado local, la API o los datos cacheados.
 */
function ensureServiceNotice() {
  let notice = document.getElementById(SERVICE_NOTICE_ID);
  if (notice) return notice;

  notice = document.createElement("div");
  notice.id = SERVICE_NOTICE_ID;
  notice.className = "tm-service-notice";
  notice.setAttribute("role", "alert");
  notice.setAttribute("aria-live", "polite");
  notice.setAttribute("aria-hidden", "true");
  document.body.appendChild(notice);

  notice.addEventListener("click", event => {
    const btn = event.target.closest(".tm-service-notice__close");
    if (btn) hideServiceNotice();
  });

  return notice;
}

/**
 * Muestra show service notice al usuario.
 */
export function showServiceNotice({ autoHideMs = 12000 } = {}) {
  if (typeof document === "undefined") return;

  const notice = ensureServiceNotice();
  notice.innerHTML = buildNoticeMarkup();
  notice.classList.add("is-visible");
  notice.setAttribute("aria-hidden", "false");

  window.clearTimeout(hideTimer);
  if (autoHideMs > 0) {
    hideTimer = window.setTimeout(() => hideServiceNotice(), autoHideMs);
  }
}

/**
 * Oculta hide service notice cuando deja de ser necesario.
 */
export function hideServiceNotice() {
  const notice = document.getElementById(SERVICE_NOTICE_ID);
  if (!notice) return;

  notice.classList.remove("is-visible");
  notice.setAttribute("aria-hidden", "true");
  window.clearTimeout(hideTimer);
  hideTimer = null;
}
