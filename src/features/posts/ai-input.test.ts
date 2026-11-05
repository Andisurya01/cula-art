import { describe, expect, it } from "vitest";
import { captionInput } from "@/features/ai/prompts/caption";
import type { ContentFormInput } from "@/features/ai/prompts/content-common";
import { toCaptionAiInput } from "./ai-input";

const content: ContentFormInput = {
  contentId: "content-1",
  title: "Reveal patung naga",
  pillarId: "pillar-1",
  formatId: null,
  hookTypeId: "hook-1",
  hookText: "Hari ke-30!",
  script: null,
  shotList: null,
  targetDurationSec: 30,
  projectId: null,
  seriesPart: null,
};

describe("toCaptionAiInput", () => {
  it("menggabungkan data konten dengan nilai form versi platform", () => {
    const input = toCaptionAiInput({
      content,
      postId: "post-1",
      platform: "INSTAGRAM",
      values: { postType: "REEL", caption: "  Caption lama  ", hashtags: " #clay #sculpting " },
    });
    expect(input).toEqual({
      ...content,
      postId: "post-1",
      platform: "INSTAGRAM",
      postType: "REEL",
      caption: "Caption lama",
      hashtags: "#clay #sculpting",
    });
    expect(captionInput.safeParse(input).success).toBe(true);
  });

  it("caption dan hashtag kosong menjadi null", () => {
    const input = toCaptionAiInput({
      content,
      postId: "post-1",
      platform: "TIKTOK",
      values: { postType: "VIDEO", caption: "", hashtags: "   " },
    });
    expect(input.caption).toBeNull();
    expect(input.hashtags).toBeNull();
    expect(captionInput.safeParse(input).success).toBe(true);
  });

  it("teks melebihi batas dipotong, bukan ditolak", () => {
    const input = toCaptionAiInput({
      content,
      postId: null,
      platform: "TIKTOK",
      values: { postType: "VIDEO", caption: "c".repeat(5000), hashtags: "#a".repeat(600) },
    });
    expect(input.caption).toHaveLength(4000);
    expect(input.hashtags).toHaveLength(1000);
    expect(input.postId).toBeNull();
    expect(captionInput.safeParse(input).success).toBe(true);
  });
});
