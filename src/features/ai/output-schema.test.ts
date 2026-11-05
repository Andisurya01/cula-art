import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AI_FEATURES } from "./features";
import { toOutputJsonSchema } from "./output-schema";
import { FEATURE_PROMPTS } from "./prompts";

const NAMES = { pillars: ["Progres Gambar", "Proses Clay"], formats: ["Time-lapse"], hookTypes: [] };

/** Semua node skema (untuk memeriksa aturan API di setiap tingkat). */
function nodes(schema: unknown): Record<string, unknown>[] {
  if (typeof schema !== "object" || schema === null) return [];
  if (Array.isArray(schema)) return schema.flatMap(nodes);
  const node = schema as Record<string, unknown>;
  return [node, ...Object.values(node).flatMap(nodes)];
}

describe("toOutputJsonSchema", () => {
  it("mempertahankan enum (kategori dikunci API), memindahkan batas yang tidak didukung ke deskripsi", () => {
    const schema = toOutputJsonSchema(
      z.object({
        pillar: z.enum(["A", "B"]).nullable(),
        text: z.string().max(300).describe("Maks. ±100 karakter"),
        items: z.array(z.string()).length(3),
        n: z.number().int().min(1).max(99),
      }),
    );
    const props = schema.properties as Record<string, Record<string, unknown>>;
    expect(props.pillar).toEqual({ anyOf: [{ type: "string", enum: ["A", "B"] }, { type: "null" }] });
    expect(props.text).toEqual({ type: "string", description: "Maks. ±100 karakter\n\n{maxLength: 300}" });
    expect(props.items).toMatchObject({ type: "array", description: "{maxItems: 3, minItems: 3}" });
    expect(props.n!.minimum).toBeUndefined();
    expect(schema.additionalProperties).toBe(false);
    expect(schema).not.toHaveProperty("$schema");
  });

  it.each(AI_FEATURES)("%s: skema terkirim memenuhi aturan structured output", (feature) => {
    const ctx = feature === "artwork-photos" ? { photos: [] } : {};
    const schema = toOutputJsonSchema(FEATURE_PROMPTS[feature].output(NAMES, ctx as never));
    for (const node of nodes(schema)) {
      if (node.type === "object") expect(node.additionalProperties).toBe(false);
      for (const key of ["maxLength", "minLength", "maximum", "minimum", "maxItems"]) expect(node).not.toHaveProperty(key);
      if ("minItems" in node) expect([0, 1]).toContain(node.minItems);
    }
  });

  it("pilihan pilar dan nomor foto benar-benar dikirim sebagai enum", () => {
    const idea = JSON.stringify(toOutputJsonSchema(FEATURE_PROMPTS["idea-expand"].output(NAMES, {} as never)));
    expect(idea).toContain('"enum":["Progres Gambar","Proses Clay"]');
    const photos = JSON.stringify(toOutputJsonSchema(FEATURE_PROMPTS["artwork-photos"].output(NAMES, { photos: [] } as never)));
    expect(photos).toContain('"enum":["1","2","3","4"]');
  });
});
