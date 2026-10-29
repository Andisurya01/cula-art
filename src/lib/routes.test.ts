import { describe, expect, it } from "vitest";
import { isActivePath } from "@/components/layout/nav-items";
import { isStudioPath, loginHref, routes, safeNextPath } from "./routes";

describe("routes", () => {
  it("path Studio dan Galeri", () => {
    expect(routes.studio.home).toBe("/studio");
    expect(routes.studio.content("abc")).toBe("/studio/pipeline/abc");
    expect(routes.studio.artworkPreview("x1")).toBe("/studio/karya/x1/pratinjau");
    expect(routes.gallery.artwork("kepala naga")).toBe("/karya/kepala%20naga");
  });

  it("isStudioPath", () => {
    expect(isStudioPath("/studio")).toBe(true);
    expect(isStudioPath("/studio/ide")).toBe(true);
    expect(isStudioPath("/studiox")).toBe(false);
    expect(isStudioPath("/karya")).toBe(false);
  });
});

describe("safeNextPath (cegah open redirect)", () => {
  it.each([
    ["/studio/pipeline?x=1", "/studio/pipeline?x=1"],
    ["/studio", "/studio"],
    [undefined, "/studio"],
    ["", "/studio"],
    ["//evil.com/studio", "/studio"],
    ["https://evil.com/studio", "/studio"],
    ["/\\evil.com", "/studio"],
    ["/karya", "/studio"],
    ["/studio/../masuk", "/studio"],
    ["studio/ide", "/studio"],
  ])("%s → %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it("loginHref hanya menambah next untuk selain Beranda Studio", () => {
    expect(loginHref("/studio")).toBe("/masuk");
    expect(loginHref("/studio/kalender?view=month")).toBe("/masuk?next=%2Fstudio%2Fkalender%3Fview%3Dmonth");
    expect(loginHref("https://evil.com")).toBe("/masuk");
  });
});

describe("isActivePath", () => {
  it("Beranda Studio hanya aktif di /studio persis", () => {
    expect(isActivePath("/studio", routes.studio.home)).toBe(true);
    expect(isActivePath("/studio/ide", routes.studio.home)).toBe(false);
    expect(isActivePath("/studio/pipeline/abc", routes.studio.pipeline)).toBe(true);
  });
});
