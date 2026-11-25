import { describe, expect, it } from "vitest";
import { guardedDestination, type LinkClick } from "./editor-navigation";

const current = new URL("https://galeri.test/studio/tampilan");
const click = (patch: Partial<LinkClick>): LinkClick => ({
  href: "/studio/ide",
  target: null,
  download: false,
  button: 0,
  modifier: false,
  defaultPrevented: false,
  ...patch,
});

describe("tautan yang perlu konfirmasi", () => {
  it("tautan internal ke halaman lain dicegat", () => {
    expect(guardedDestination(click({}), current)).toBe("/studio/ide");
    expect(guardedDestination(click({ href: "/karya?medium=clay#atas" }), current)).toBe("/karya?medium=clay#atas");
    expect(guardedDestination(click({ href: "https://galeri.test/" }), current)).toBe("/");
    expect(guardedDestination(click({ href: "pengaturan" }), current)).toBe("/studio/pengaturan");
    expect(guardedDestination(click({ target: "_self" }), current)).toBe("/studio/ide");
  });

  it("halaman sama dengan query lain tetap dicegat", () => {
    expect(guardedDestination(click({ href: "/studio/tampilan?x=1" }), current)).toBe("/studio/tampilan?x=1");
  });

  it("tidak dicegat: hash di halaman sama, tab baru, unduhan, tautan luar, protokol lain", () => {
    expect(guardedDestination(click({ href: "#pratinjau-kartu" }), current)).toBeNull();
    expect(guardedDestination(click({ href: "/studio/tampilan" }), current)).toBeNull();
    expect(guardedDestination(click({ target: "_blank" }), current)).toBeNull();
    expect(guardedDestination(click({ modifier: true }), current)).toBeNull();
    expect(guardedDestination(click({ button: 1 }), current)).toBeNull();
    expect(guardedDestination(click({ download: true }), current)).toBeNull();
    expect(guardedDestination(click({ defaultPrevented: true }), current)).toBeNull();
    expect(guardedDestination(click({ href: "https://www.instagram.com/x" }), current)).toBeNull();
    expect(guardedDestination(click({ href: "mailto:a@b.test" }), current)).toBeNull();
    expect(guardedDestination(click({ href: "javascript:void(0)" }), current)).toBeNull();
    expect(guardedDestination(click({ href: null }), current)).toBeNull();
    expect(guardedDestination(click({ href: "  " }), current)).toBeNull();
  });
});
