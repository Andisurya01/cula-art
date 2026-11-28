// Satu IntersectionObserver bersama untuk semua elemen `Reveal` (Fase 7, A4/A5).
// Elemen yang terlihat dalam callback yang sama diberi urutan jeda (baris lalu kolom), jadi kartu
// satu baris grid muncul berjeda tanpa perlu nomor dari pemanggil, termasuk kartu dari "Muat lagi".
//
// Progressive enhancement: HTML server selalu terlihat. Status tersembunyi `data-reveal="pending"`
// hanya dipasang di sini (JS jalan, tingkat bukan Mati, elemen seluruhnya di bawah layar), lalu
// `data-reveal="shown"` begitu masuk layar atau menerima fokus keyboard. Elemen yang sudah terlihat
// saat dipasang dibiarkan (tanpa kedip).
//
// Performa: posisi awal TIDAK dibaca dengan getBoundingClientRect (memaksa layout penuh tepat setelah
// hidrasi, terukur sebagai TBT di HP). Keputusan "sembunyikan atau biarkan" diambil dari callback
// pertama observer, yang dihitung browser sendiri bersama frame berikutnya.

import { initialRevealDecision, revealOrder, staggerIndex } from "./motion-utils";
import { motionLevelOf } from "./use-motion-level";

type OnReveal = (order: number) => void;

interface Tracked {
  /** `checking`: belum ada callback pertama; `pending`: tersembunyi, menunggu terlihat. */
  state: "checking" | "pending";
  onReveal: OnReveal;
}

const tracked = new Map<Element, Tracked>();
let observer: IntersectionObserver | null = null;

function release(target: Element) {
  tracked.delete(target);
  observer?.unobserve(target);
}

function reveal(target: Element, order: number) {
  const item = tracked.get(target);
  release(target);
  item?.onReveal(order);
}

function handle(entries: IntersectionObserverEntry[]) {
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const visible: IntersectionObserverEntry[] = [];
  for (const entry of entries) {
    const item = tracked.get(entry.target);
    if (!item) continue;
    if (item.state === "checking") {
      const keep =
        motionLevelOf(entry.target) === "off" || initialRevealDecision(entry.boundingClientRect, viewport) === "leave";
      if (keep) {
        release(entry.target);
      } else {
        item.state = "pending";
        entry.target.setAttribute("data-reveal", "pending");
      }
      continue;
    }
    if (entry.isIntersecting) visible.push(entry);
  }
  const order = revealOrder(visible.map((entry) => entry.boundingClientRect));
  order.forEach((position, rank) => reveal(visible[position].target, staggerIndex(rank)));
}

/**
 * Fokus keyboard (Tab) bisa jatuh ke elemen yang masih tersembunyi tanpa menggulirnya penuh ke layar:
 * munculkan langsung, supaya cincin fokus selalu terlihat (CSS `:focus-within` juga menjaga ini).
 */
function onFocusIn(event: FocusEvent) {
  if (!(event.target instanceof Element)) return;
  for (const [element, item] of tracked) {
    if (item.state === "pending" && element.contains(event.target)) reveal(element, 0);
  }
}

function getObserver(): IntersectionObserver {
  if (observer) return observer;
  // Pemicu = layar penuh (threshold 0): elemen kecil di ujung dokumen tetap bisa muncul.
  observer = new IntersectionObserver(handle, { threshold: 0 });
  document.addEventListener("focusin", onFocusIn);
  return observer;
}

/**
 * Siapkan satu elemen untuk muncul saat di-scroll. Tanpa efek jika gerak Mati atau browser tanpa IO.
 * Mengembalikan fungsi pembersih untuk unmount.
 */
export function prepareReveal(element: HTMLElement): (() => void) | undefined {
  if (typeof IntersectionObserver === "undefined") return undefined;
  if (motionLevelOf(element) === "off") return undefined;
  tracked.set(element, {
    state: "checking",
    onReveal: (order) => {
      element.style.setProperty("--reveal-i", String(order));
      element.setAttribute("data-reveal", "shown");
    },
  });
  getObserver().observe(element);

  return () => {
    release(element);
    // Jangan pernah meninggalkan elemen tersembunyi (mis. efek dijalankan ulang oleh React).
    if (element.getAttribute("data-reveal") === "pending") element.removeAttribute("data-reveal");
  };
}
