// Ganti mode terang/gelap dengan penyingkapan melingkar dari tombol (Fase 7, A7). Client saja.
// View Transitions: snapshot halaman lama, mode baru dipasang, lalu halaman baru tersingkap dalam
// lingkaran yang membesar dari tengah tombol (CSS `motion-theme-reveal` di globals.css, durasi token).
// Tanpa dukungan browser, tingkat Mati, atau "kurangi gerakan": langsung berganti tanpa kedip.

import { flushSync } from "react-dom";
import { MOTION_ATTRIBUTE } from "@/lib/theme/motion";

export type ResolvedMode = "light" | "dark";

const SWITCH_ATTRIBUTE = "data-theme-switch";
const NO_TRANSITIONS = "*,*::before,*::after{transition:none!important}";

/** Pusat dan jari-jari lingkaran (px) supaya penyingkapan menutup seluruh layar dari titik itu. */
export function revealCircle(rect: { left: number; top: number; width: number; height: number }, viewport: {
  width: number;
  height: number;
}): { x: number; y: number; r: number } {
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const r = Math.hypot(Math.max(x, viewport.width - x), Math.max(y, viewport.height - y));
  return { x: Math.round(x), y: Math.round(y), r: Math.ceil(r) };
}

/**
 * Penyingkapan hanya jika browser mendukung View Transitions, ada tombol asal, dan tingkat akhir
 * `data-motion` Halus/Penuh (tingkat itu sudah Mati saat "kurangi gerakan").
 */
export function canRevealModeSwitch(options: { supported: boolean; hasOrigin: boolean; level: string | null }): boolean {
  return options.supported && options.hasOrigin && (options.level === "full" || options.level === "subtle");
}

/** Pasang kelas mode seperti next-themes (`attribute="class"`), tanpa transisi warna di tengah jalan. */
function applyModeClass(mode: ResolvedMode) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(mode);
  root.style.colorScheme = mode;
}

/**
 * `setMode` = `setTheme` dari next-themes (menyimpan pilihan di localStorage). `origin` = tombol
 * yang ditekan (pusat lingkaran).
 */
export function switchModeWithReveal(mode: ResolvedMode, setMode: (mode: ResolvedMode) => void, origin: Element | null) {
  const root = document.documentElement;
  const canAnimate = canRevealModeSwitch({
    supported: typeof document.startViewTransition === "function",
    hasOrigin: origin !== null,
    level: root.getAttribute(MOTION_ATTRIBUTE),
  });
  if (!canAnimate || origin === null) {
    setMode(mode);
    return;
  }

  const { x, y, r } = revealCircle(origin.getBoundingClientRect(), {
    width: window.innerWidth,
    height: window.innerHeight,
  });
  root.style.setProperty("--theme-reveal-x", `${x}px`);
  root.style.setProperty("--theme-reveal-y", `${y}px`);
  root.style.setProperty("--theme-reveal-r", `${r}px`);
  root.setAttribute(SWITCH_ATTRIBUTE, "");

  // Transisi warna komponen dimatikan selama snapshot, supaya mode baru tertangkap utuh (bukan di
  // tengah `transition-colors`).
  const style = document.createElement("style");
  style.textContent = NO_TRANSITIONS;
  document.head.appendChild(style);

  const transition = document.startViewTransition(() => {
    applyModeClass(mode);
    flushSync(() => setMode(mode));
    // Paksa hitung ulang gaya selagi transisi mati.
    void window.getComputedStyle(document.body).color;
  });
  const cleanup = () => {
    style.remove();
    root.removeAttribute(SWITCH_ATTRIBUTE);
    root.style.removeProperty("--theme-reveal-x");
    root.style.removeProperty("--theme-reveal-y");
    root.style.removeProperty("--theme-reveal-r");
  };
  transition.ready.then(() => style.remove(), cleanup);
  transition.finished.finally(cleanup);
}
