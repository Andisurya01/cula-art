import { describe, expect, it } from "vitest";
import {
  IDENTITY_VIEW,
  MAX_SCALE,
  TAP_SCALE,
  clampView,
  distance,
  midpoint,
  panBy,
  pinchView,
  swipeDirection,
  toggleZoom,
  zoomTo,
} from "./zoom";

const stage = { width: 400, height: 800 };

describe("zoom foto layar penuh", () => {
  it("clampView: skala 1-4, geseran tidak membuka tepi panggung", () => {
    expect(clampView({ scale: 0.5, x: 30, y: -10 }, stage)).toEqual(IDENTITY_VIEW);
    expect(clampView({ scale: 9, x: 0, y: 0 }, stage).scale).toBe(MAX_SCALE);
    // scale 2 → boleh geser maks. (2-1)*400/2 = 200 horizontal, 400 vertikal
    expect(clampView({ scale: 2, x: 999, y: -999 }, stage)).toEqual({ scale: 2, x: 200, y: -400 });
  });

  it("zoomTo menjaga titik jangkar tetap di tempat", () => {
    const anchor = { x: 100, y: -50 };
    const view = zoomTo(IDENTITY_VIEW, 2, anchor, stage);
    // titik konten di bawah jangkar: (anchor - t) / s harus sama sebelum & sesudah
    expect((anchor.x - view.x) / view.scale).toBeCloseTo(anchor.x);
    expect((anchor.y - view.y) / view.scale).toBeCloseTo(anchor.y);
  });

  it("toggleZoom: ketuk pertama perbesar, ketuk kedua kembali", () => {
    const zoomed = toggleZoom(IDENTITY_VIEW, { x: 0, y: 0 }, stage);
    expect(zoomed).toEqual({ scale: TAP_SCALE, x: 0, y: 0 });
    expect(toggleZoom(zoomed, { x: 50, y: 50 }, stage)).toEqual(IDENTITY_VIEW);
  });

  it("panBy tidak menggeser foto yang tidak diperbesar", () => {
    expect(panBy(IDENTITY_VIEW, { x: 80, y: 40 }, stage)).toEqual(IDENTITY_VIEW);
    expect(panBy({ scale: 2, x: 0, y: 0 }, { x: 80, y: 40 }, stage)).toEqual({ scale: 2, x: 80, y: 40 });
  });

  it("pinchView: jarak jari dua kali lipat → skala dua kali lipat", () => {
    const a = { x: -50, y: 0 };
    const b = { x: 50, y: 0 };
    const start = { view: IDENTITY_VIEW, distance: distance(a, b), midpoint: midpoint(a, b) };
    expect(pinchView(start, { distance: 200, midpoint: { x: 0, y: 0 } }, stage)).toEqual({ scale: 2, x: 0, y: 0 });
    expect(pinchView({ ...start, distance: 0 }, { distance: 200, midpoint: { x: 0, y: 0 } }, stage)).toBe(IDENTITY_VIEW);
  });

  it("swipeDirection: kiri = berikutnya, kanan = sebelumnya, vertikal/pendek = bukan swipe", () => {
    expect(swipeDirection({ x: -80, y: 10 })).toBe(1);
    expect(swipeDirection({ x: 80, y: -10 })).toBe(-1);
    expect(swipeDirection({ x: 30, y: 0 })).toBe(0);
    expect(swipeDirection({ x: 80, y: 120 })).toBe(0);
  });
});
