// Render Button di server: `asChild` harus tetap jalan dengan dan tanpa ikon ↗ (Slot hanya menerima
// tepat satu anak; saudara `false` dulu membuat semua `<Button asChild>` crash).

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

const render = (props: Parameters<typeof Button>[0]) => renderToStaticMarkup(createElement(Button, props));

describe("Button", () => {
  it("asChild tanpa panah: kelas pindah ke anak, tanpa elemen tambahan", () => {
    const html = render({ asChild: true, children: createElement("a", { href: "/karya" }, "Lihat") });
    expect(html).toMatch(/^<a [^>]*href="\/karya"[^>]*>Lihat<\/a>$/);
    expect(html).toContain('data-slot="button"');
    expect(html).toContain("rounded-button");
  });

  it("asChild dengan panah: ikon ↗ di dalam anak, di akhir atau di awal", () => {
    const end = render({ asChild: true, arrow: true, children: createElement("a", { href: "/" }, "Lihat") });
    expect(end).toMatch(/^<a [^>]*>Lihat<svg[^>]*data-icon="inline-end"/);
    const start = render({ asChild: true, arrow: "start", children: createElement("a", { href: "/" }, "Tanya") });
    expect(start).toMatch(/^<a [^>]*><svg[^>]*data-icon="inline-start"[\s\S]*<\/svg>Tanya<\/a>$/);
  });

  it("tombol biasa dengan dan tanpa panah", () => {
    expect(render({ children: "Simpan" })).toMatch(/^<button [^>]*>Simpan<\/button>$/);
    expect(render({ arrow: true, children: "Daftar" })).toMatch(/^<button [^>]*>Daftar<svg/);
  });
});
