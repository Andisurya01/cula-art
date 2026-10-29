import { z } from "zod";
import { isValidWibInputValue } from "@/lib/date";
import { PLATFORMS } from "@/lib/labels";

/** `yyyy-MM-ddTHH:mm`, diartikan sebagai WIB (nilai `datetime-local` atau kunci slot). */
export const wibDateTimeSchema = z
  .string({ error: "Pilih tanggal dan jam" })
  .refine(isValidWibInputValue, "Pilih tanggal dan jam");

export const scheduleContentSchema = z.object({
  contentId: z.string().min(1, "Konten tidak valid"),
  scheduledAt: wibDateTimeSchema,
  platforms: z
    .array(z.enum(PLATFORMS))
    .min(1, "Pilih minimal satu platform")
    .refine((list) => new Set(list).size === list.length, "Platform duplikat"),
});
export type ScheduleContentInput = z.infer<typeof scheduleContentSchema>;
