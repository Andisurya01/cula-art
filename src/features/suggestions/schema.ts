import { z } from "zod";
import { SUGGESTION_KEY_PATTERN } from "@/lib/analytics/rules";

/** "Sembunyikan 7 hari": kunci `aturan:platform:subjek` dari mesin aturan. */
export const dismissSuggestionSchema = z.object({
  key: z.string().max(200, "Saran tidak valid").regex(SUGGESTION_KEY_PATTERN, "Saran tidak valid"),
});
export type DismissSuggestionInput = z.infer<typeof dismissSuggestionSchema>;
