import { z } from "zod";

// Zod → JSON schema untuk structured output (`output_config.format`). Mengikuti aturan API: semua objek
// `additionalProperties: false`, `minItems` hanya 0/1, batas panjang/angka tidak didukung (dipindah ke
// deskripsi sebagai petunjuk; Zod tetap memvalidasinya di server). Berbeda dari helper SDK 1.3.0
// (`betaZodOutputFormat`), `enum` dan `const` DIPERTAHANKAN, supaya API benar-benar mengunci pilihan
// kategori (pilar/format/tipe hook) dan nomor foto.

type JsonSchema = { [key: string]: unknown };

const SUPPORTED_STRING_FORMATS = new Set([
  "date-time",
  "time",
  "date",
  "duration",
  "email",
  "hostname",
  "uri",
  "ipv4",
  "ipv6",
  "uuid",
]);

export function toOutputJsonSchema(schema: z.ZodType): JsonSchema {
  const raw = z.toJSONSchema(schema, { reused: "ref" }) as JsonSchema;
  delete raw.$schema;
  return strict(raw);
}

/** Bentuk `output_config.format` untuk Messages API. */
export function toOutputFormat(schema: z.ZodType) {
  return { type: "json_schema" as const, schema: toOutputJsonSchema(schema) };
}

function isSchema(value: unknown): value is JsonSchema {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mapSchemas(value: unknown): JsonSchema {
  if (!isSchema(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, strict(isSchema(child) ? child : {})]));
}

function strict(input: JsonSchema): JsonSchema {
  const rest: JsonSchema = { ...input };
  const take = (key: string) => {
    const value = rest[key];
    delete rest[key];
    return value;
  };
  const out: JsonSchema = {};

  const defs = take("$defs");
  if (defs !== undefined) out.$defs = mapSchemas(defs);
  const ref = take("$ref");
  if (ref !== undefined) {
    out.$ref = ref;
    return out;
  }

  const type = take("type");
  const anyOf = take("anyOf") ?? take("oneOf");
  const allOf = take("allOf");
  if (Array.isArray(anyOf)) out.anyOf = anyOf.map((s) => strict(isSchema(s) ? s : {}));
  else if (Array.isArray(allOf)) out.allOf = allOf.map((s) => strict(isSchema(s) ? s : {}));
  else if (type !== undefined) out.type = type;

  for (const key of ["description", "title", "enum", "const"]) {
    const value = take(key);
    if (value !== undefined) out[key] = value;
  }

  if (type === "object") {
    out.properties = mapSchemas(take("properties"));
    take("additionalProperties");
    out.additionalProperties = false;
    const required = take("required");
    if (required !== undefined) out.required = required;
  } else if (type === "string") {
    const format = take("format");
    if (typeof format === "string" && SUPPORTED_STRING_FORMATS.has(format)) out.format = format;
    else if (format !== undefined) rest.format = format;
  } else if (type === "array") {
    const items = take("items");
    if (isSchema(items)) out.items = strict(items);
    const minItems = take("minItems");
    if (minItems === 0 || minItems === 1) out.minItems = minItems;
    else if (minItems !== undefined) rest.minItems = minItems;
  }

  // Batas lain (maxLength, maxItems, minimum…): petunjuk di deskripsi; divalidasi Zod setelah jawaban datang.
  const hints = Object.entries(rest);
  if (hints.length) {
    const text = `{${hints.map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join(", ")}}`;
    out.description = typeof out.description === "string" ? `${out.description}\n\n${text}` : text;
  }
  return out;
}
