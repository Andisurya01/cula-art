import { describe, expect, it } from "vitest";
import {
  countUpDuration,
  countUpValue,
  easeOutCubic,
  formatCount,
  initialRevealDecision,
  motionIndex,
  parseCssTime,
  revealOrder,
  STAGGER_CAP,
  staggerIndex,
} from "./motion-utils";
import { canRevealModeSwitch, revealCircle } from "./theme-switch";
import { artworkPhotoTransitionName, transitionName, VT_CLASS } from "./view-transitions";

describe("jeda berurutan", () => {
  it("urutan dibatasi cap, nilai aneh → 0", () => {
    expect(staggerIndex(0)).toBe(0);
    expect(staggerIndex(3)).toBe(3);
    expect(staggerIndex(50)).toBe(STAGGER_CAP);
    expect(staggerIndex(2.7)).toBe(2);
    expect(staggerIndex(-1)).toBe(0);
    expect(staggerIndex(Number.NaN)).toBe(0);
    expect(staggerIndex(5, 2)).toBe(2);
  });

  it("motionIndex menulis --motion-i (dikalikan token jeda di CSS)", () => {
    expect(motionIndex(2)).toEqual({ "--motion-i": 2 });
    expect(motionIndex(99)).toEqual({ "--motion-i": STAGGER_CAP });
  });

  it("urutan muncul: baris atas dulu, lalu kiri ke kanan; selisih kecil dianggap satu baris", () => {
    const positions = [
      { top: 400, left: 0 },
      { top: 10, left: 300 },
      { top: 0, left: 0 },
      { top: 12, left: 150 },
      { top: 400, left: 300 },
    ];
    expect(revealOrder(positions)).toEqual([2, 3, 1, 0, 4]);
    expect(revealOrder([])).toEqual([]);
  });
});

describe("waktu CSS dan hitung naik", () => {
  it("parseCssTime", () => {
    expect(parseCssTime("450ms")).toBe(450);
    expect(parseCssTime(" 0.25s ")).toBe(250);
    expect(parseCssTime("0ms")).toBe(0);
    expect(parseCssTime("")).toBe(0);
    expect(parseCssTime(null)).toBe(0);
    expect(parseCssTime("calc(1s * 2)")).toBe(0);
    expect(parseCssTime("-100ms")).toBe(0);
  });

  it("durasi per tingkat: Mati 0, Halus = lambat, Penuh = 2× lambat, maks. 2 detik", () => {
    expect(countUpDuration("off", 450)).toBe(0);
    expect(countUpDuration("subtle", 450)).toBe(450);
    expect(countUpDuration("full", 450)).toBe(900);
    expect(countUpDuration("full", 3000)).toBe(2000);
    // "Kurangi gerakan": token lambat = 0 → tanpa animasi di tingkat apa pun.
    expect(countUpDuration("full", 0)).toBe(0);
  });

  it("kurva dan nilai: mulai 0, berakhir tepat target, dibulatkan", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(2)).toBe(1);
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875, 5);
    expect(countUpValue(120, 0)).toBe(0);
    expect(countUpValue(120, 0.5)).toBe(105);
    expect(countUpValue(120, 1)).toBe(120);
    expect(countUpValue(120, 1.3)).toBe(120);
    expect(countUpValue(12.5, 0.5, 1)).toBe(10.9);
    expect(Number.isInteger(countUpValue(7, 0.37))).toBe(true);
  });

  it("format angka Indonesia tanpa Intl (sama di server dan browser)", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(999)).toBe("999");
    expect(formatCount(1234)).toBe("1.234");
    expect(formatCount(1234567)).toBe("1.234.567");
    expect(formatCount(12.5, 1)).toBe("12,5");
    expect(formatCount(1234.56, 2)).toBe("1.234,56");
    expect(formatCount(-1500)).toBe("-1.500");
    expect(formatCount(-0.04, 1)).toBe("0,0");
    expect(formatCount(Number.NaN)).toBe("—");
    expect(formatCount(Number.POSITIVE_INFINITY)).toBe("—");
  });
});

describe("nama View Transitions", () => {
  it("aman untuk CSS: huruf kecil, angka, tanda hubung, tidak diawali angka", () => {
    expect(transitionName("karya-foto", "Vas Biru_2024")).toBe("karya-foto-vas-biru-2024");
    expect(transitionName("1x", "a")).toBe("vt-1x-a");
    expect(transitionName("p", "a;}body{x")).toBe("p-a-body-x");
    expect(artworkPhotoTransitionName("vas-biru")).toBe("karya-foto-vas-biru");
  });

  it("kelas transisi tetap (dipetakan ke CSS di globals.css)", () => {
    expect(Object.values(VT_CLASS)).toEqual(["vt-morph", "vt-page", "vt-fade", "vt-pill"]);
  });
});

describe("penyingkapan melingkar ganti mode (A7)", () => {
  it("pusat di tengah tombol, jari-jari sampai sudut layar terjauh", () => {
    const viewport = { width: 1000, height: 800 };
    expect(revealCircle({ left: 940, top: 20, width: 40, height: 40 }, viewport)).toEqual({ x: 960, y: 40, r: 1225 });
    const center = revealCircle({ left: 480, top: 380, width: 40, height: 40 }, viewport);
    expect(center).toEqual({ x: 500, y: 400, r: 641 });
  });
});

describe("keputusan awal Reveal (layar asli, bukan area pemicu)", () => {
  const viewport = { width: 400, height: 800 };
  const rect = (top: number, height = 100, left = 0, width = 200) => ({ top, bottom: top + height, left, right: left + width });
  it("terlihat sedikit saja → dibiarkan (tanpa kedip), termasuk di pita bawah layar", () => {
    expect(initialRevealDecision(rect(0), viewport)).toBe("leave");
    expect(initialRevealDecision(rect(790), viewport)).toBe("leave");
    expect(initialRevealDecision(rect(-50), viewport)).toBe("leave");
  });
  it("seluruhnya di bawah layar → disembunyikan untuk dimunculkan nanti", () => {
    expect(initialRevealDecision(rect(800), viewport)).toBe("hide");
    expect(initialRevealDecision(rect(2000), viewport)).toBe("hide");
  });
  it("di atas layar (posisi gulir dipulihkan) atau di luar layar ke samping → dibiarkan", () => {
    expect(initialRevealDecision(rect(-300, 100), viewport)).toBe("leave");
    expect(initialRevealDecision(rect(2000, 100, 420), viewport)).toBe("leave");
    expect(initialRevealDecision(rect(2000, 100, -300, 200), viewport)).toBe("leave");
  });
});

describe("ganti mode: kapan penyingkapan melingkar dipakai", () => {
  it("hanya dengan dukungan browser, tombol asal, dan tingkat Halus/Penuh", () => {
    expect(canRevealModeSwitch({ supported: true, hasOrigin: true, level: "full" })).toBe(true);
    expect(canRevealModeSwitch({ supported: true, hasOrigin: true, level: "subtle" })).toBe(true);
    expect(canRevealModeSwitch({ supported: true, hasOrigin: true, level: "off" })).toBe(false);
    expect(canRevealModeSwitch({ supported: true, hasOrigin: true, level: null })).toBe(false);
    expect(canRevealModeSwitch({ supported: false, hasOrigin: true, level: "full" })).toBe(false);
    expect(canRevealModeSwitch({ supported: true, hasOrigin: false, level: "full" })).toBe(false);
  });
});
