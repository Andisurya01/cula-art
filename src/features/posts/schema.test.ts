import { describe, expect, it } from "vitest";
import { markPostedSchema } from "@/features/contents/schema";
import { postFormSchema, postedFormSchema, toPostedEntries } from "./schema";

describe("postFormSchema", () => {
  it("string kosong menjadi null dan idempoten", () => {
    const raw = {
      postType: "VIDEO",
      caption: "  ",
      hashtags: "#clay",
      scheduledAt: "2026-10-28T19:00",
      url: "",
      postedAt: "",
      durationSec: "45",
    };
    const first = postFormSchema.parse(raw);
    expect(first).toEqual({
      postType: "VIDEO",
      caption: null,
      hashtags: "#clay",
      scheduledAt: "2026-10-28T19:00",
      url: null,
      postedAt: null,
      durationSec: 45,
    });
    expect(postFormSchema.parse(first)).toEqual(first);
  });

  it("menolak URL non-http dan durasi bukan angka", () => {
    expect(postFormSchema.safeParse({ postType: "REEL", url: "javascript:alert(1)" }).success).toBe(
      false,
    );
    expect(postFormSchema.safeParse({ postType: "REEL", durationSec: "abc" }).success).toBe(false);
  });
});

describe("postedFormSchema", () => {
  const base = {
    entries: [
      { platform: "TIKTOK" as const, enabled: false, url: "", postedAt: "" },
      { platform: "INSTAGRAM" as const, enabled: false, url: "", postedAt: "" },
    ],
  };

  it("wajib minimal satu platform", () => {
    expect(postedFormSchema.safeParse(base).success).toBe(false);
  });

  it("platform yang dicentang wajib URL + waktu", () => {
    const value = structuredClone(base);
    value.entries[0].enabled = true;
    value.entries[0].url = "https://www.tiktok.com/@a/video/1";
    expect(postedFormSchema.safeParse(value).success).toBe(false);
    value.entries[0].postedAt = "2026-10-28T19:05";
    expect(postedFormSchema.safeParse(value).success).toBe(true);
    expect(toPostedEntries(value)).toEqual([
      {
        platform: "TIKTOK",
        url: "https://www.tiktok.com/@a/video/1",
        postedAt: "2026-10-28T19:05",
      },
    ]);
  });
});

describe("markPostedSchema", () => {
  it("menolak entri kosong dan platform ganda", () => {
    expect(markPostedSchema.safeParse({ contentId: "c", entries: [] }).success).toBe(false);
    const entry = { platform: "TIKTOK", url: "https://x.com/1", postedAt: "2026-10-28T19:05" };
    expect(markPostedSchema.safeParse({ contentId: "c", entries: [entry, entry] }).success).toBe(
      false,
    );
    expect(markPostedSchema.safeParse({ contentId: "c", entries: [entry] }).success).toBe(true);
  });
});
