// js/app/voice_assistant.js
import { getLang, translateText } from "./i18n.js";

function cleanText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
}

function isVisible(el) {
  if (!el || !(el instanceof Element)) return false;
  if (el.hidden || el.getAttribute("aria-hidden") === "true") return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function textFrom(root) {
  if (!root) return "";
  const clone = root.cloneNode(true);
  clone.querySelectorAll("script, style, noscript, svg, .leaflet-tile-container, .leaflet-control-attribution").forEach(el => el.remove());
  return cleanText(clone.innerText || clone.textContent || "");
}

function elementLabel(el) {
  if (!el) return "";

  if (el.tagName === "SELECT") {
    return cleanText(el.options?.[el.selectedIndex]?.textContent || el.getAttribute("aria-label") || "");
  }

  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
    return cleanText(el.value || el.placeholder || el.getAttribute("aria-label") || "");
  }

  return cleanText(
    el.getAttribute?.("aria-label") ||
    el.getAttribute?.("title") ||
    el.innerText ||
    el.textContent ||
    el.value ||
    ""
  );
}

function readableElementFrom(target) {
  if (!target || !(target instanceof Element)) return null;
  if (target.closest("#btnVoiceReader")) return null;

  return target.closest(
    "button, a[href], select, input, textarea, option, .alert, [role='alert'], .leaflet-popup-content, .leaflet-control, h1, h2, h3, h4, h5, h6, label, p, li"
  ) || target;
}

export function initVoiceReader() {
  const btn = document.getElementById("btnVoiceReader");
  if (!btn || btn.dataset.voiceReaderReady === "true") return;

  btn.dataset.voiceReaderReady = "true";

  const canSpeak = "speechSynthesis" in window;
  let active = false;
  let lastText = "";
  let lastAt = 0;

  function speak(text) {
    const finalText = cleanText(translateText(text));
    if (!active || !canSpeak || !finalText) return;

    const now = Date.now();
    if (finalText === lastText && now - lastAt < 1300) return;

    lastText = finalText;
    lastAt = now;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(finalText);
    utterance.lang = getLang() === "en" ? "en-US" : "es-EC";
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  function syncButton() {
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
    btn.title = active ? "Desactivar lectura de voz" : "Activar lectura de voz";
    btn.setAttribute("aria-label", btn.title);
  }

  function readTarget(target) {
    if (!active) return;

    const el = readableElementFrom(target);
    if (!el || !isVisible(el)) return;

    const label = elementLabel(el) || textFrom(el);
    if (label) speak(label);
  }

  btn.addEventListener("click", () => {
    active = !active;
    syncButton();

    if (active) {
      speak("Lectura de voz activada");
    } else if (canSpeak) {
      window.speechSynthesis.cancel();
    }
  });

  document.addEventListener("pointerover", event => readTarget(event.target), true);
  document.addEventListener("focusin", event => readTarget(event.target), true);
  document.addEventListener("change", event => readTarget(event.target), true);
  document.addEventListener("click", event => {
    if (event.target === btn || btn.contains(event.target)) return;
    readTarget(event.target);
  }, true);

  syncButton();
}
