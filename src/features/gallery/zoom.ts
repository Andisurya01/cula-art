// Matematika zoom & geser foto layar penuh (fungsi murni). Titik selalu relatif ke pusat panggung,
// transform = translate(x, y) scale(scale) dengan transform-origin di tengah.

export type ZoomView = { scale: number; x: number; y: number };
export type Point = { x: number; y: number };
export type Size = { width: number; height: number };

export const MIN_SCALE = 1;
export const MAX_SCALE = 4;
/** Skala saat foto diketuk/diklik sekali. */
export const TAP_SCALE = 2.5;
export const IDENTITY_VIEW: ZoomView = { scale: 1, x: 0, y: 0 };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Batasi skala, dan geseran supaya foto yang diperbesar tetap menutupi panggung. */
export function clampView(view: ZoomView, stage: Size): ZoomView {
  const scale = clamp(view.scale, MIN_SCALE, MAX_SCALE);
  const maxX = ((scale - 1) * stage.width) / 2;
  const maxY = ((scale - 1) * stage.height) / 2;
  // `+ 0` mengubah -0 menjadi 0 supaya hasil mudah dibandingkan.
  return { scale, x: clamp(view.x, -maxX, maxX) + 0, y: clamp(view.y, -maxY, maxY) + 0 };
}

/** Zoom ke `scale` dengan titik `anchor` (mis. posisi jari) tetap di tempat yang sama di layar. */
export function zoomTo(view: ZoomView, scale: number, anchor: Point, stage: Size): ZoomView {
  const next = clamp(scale, MIN_SCALE, MAX_SCALE);
  const ratio = next / view.scale;
  return clampView(
    { scale: next, x: anchor.x - ratio * (anchor.x - view.x), y: anchor.y - ratio * (anchor.y - view.y) },
    stage,
  );
}

/** Ketuk: perbesar di titik ketukan, atau kembali ke ukuran semula jika sedang diperbesar. */
export function toggleZoom(view: ZoomView, anchor: Point, stage: Size): ZoomView {
  return view.scale > MIN_SCALE ? IDENTITY_VIEW : zoomTo(view, TAP_SCALE, anchor, stage);
}

export function panBy(view: ZoomView, delta: Point, stage: Size): ZoomView {
  return clampView({ ...view, x: view.x + delta.x, y: view.y + delta.y }, stage);
}

/** Cubit: skala mengikuti perubahan jarak dua jari, dan foto ikut bergeser bersama titik tengahnya. */
export function pinchView(
  start: { view: ZoomView; distance: number; midpoint: Point },
  now: { distance: number; midpoint: Point },
  stage: Size,
): ZoomView {
  if (start.distance <= 0) return start.view;
  const zoomed = zoomTo(start.view, (start.view.scale * now.distance) / start.distance, start.midpoint, stage);
  return panBy(zoomed, { x: now.midpoint.x - start.midpoint.x, y: now.midpoint.y - start.midpoint.y }, stage);
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Geser horizontal saat tidak diperbesar: 1 = foto berikutnya, -1 = sebelumnya, 0 = bukan swipe. */
export function swipeDirection(delta: Point, threshold = 50): -1 | 0 | 1 {
  if (Math.abs(delta.x) < threshold || Math.abs(delta.x) < Math.abs(delta.y) * 1.2) return 0;
  return delta.x < 0 ? 1 : -1;
}
