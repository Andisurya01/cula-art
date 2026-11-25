import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn dengan utility token tema", () => {
  it("ukuran teks tema tidak bentrok dengan warna teks", () => {
    expect(cn("text-h1 text-muted-foreground")).toBe("text-h1 text-muted-foreground");
    expect(cn("text-body-sm", "text-heading-muted")).toBe("text-body-sm text-heading-muted");
    expect(cn("text-label text-bento-lime-foreground")).toBe("text-label text-bento-lime-foreground");
  });

  it("ukuran teks tema menimpa ukuran lain", () => {
    expect(cn("text-sm", "text-h3")).toBe("text-h3");
    expect(cn("text-h3", "text-2xl")).toBe("text-2xl");
  });

  it("radius, font, durasi, dan easing tema menimpa kelas sejenis", () => {
    expect(cn("rounded-lg", "rounded-card")).toBe("rounded-card");
    expect(cn("rounded-button", "rounded-full")).toBe("rounded-full");
    expect(cn("font-sans", "font-heading")).toBe("font-heading");
    expect(cn("font-heading font-medium")).toBe("font-heading font-medium");
    expect(cn("duration-150", "duration-fast")).toBe("duration-fast");
    expect(cn("ease-in-out", "ease-standard")).toBe("ease-standard");
  });
});
