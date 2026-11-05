// npm run ai:eval -- <fitur|semua> [--model <id>] [--batas <n>] [--panduan-db] [--konfirmasi]
// Set uji Asisten AI. Tanpa --konfirmasi hanya menampilkan rencana dan perkiraan biaya.
// Dengan --konfirmasi memanggil API Anthropic (BERBIAYA; ikut batas di Pengaturan, tercatat di AiRun sebagai EVAL),
// kecuali AI_MOCK=1. Laporan markdown ditulis ke .ai-evals/ (tidak di-commit).

import { AI_FEATURE_LABELS, AI_FEATURES, isAiFeature, type AiFeature } from "../src/features/ai/features";
import { formatUsd } from "../src/features/ai/format";
import { AI_MODEL_IDS, isAiModelId, type AiModelId } from "../src/features/ai/models";
import { getAiGuide } from "../src/features/ai/queries";
import { casesFor, estimateEvalUsd, runEvals } from "../src/features/ai/evals/runner";
import { db } from "../src/lib/db";

try {
  process.loadEnvFile(".env");
} catch {
  // tanpa .env: pakai variabel lingkungan yang sudah ada
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv: string[]) {
  const args = { scope: "", model: null as string | null, limit: undefined as number | undefined, dbGuide: false, confirm: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--model") args.model = argv[++i] ?? null;
    else if (arg === "--batas") args.limit = Number(argv[++i]);
    else if (arg === "--panduan-db") args.dbGuide = true;
    else if (arg === "--konfirmasi") args.confirm = true;
    else if (!arg.startsWith("--")) args.scope = arg;
    else fail(`Opsi tidak dikenal: ${arg}`);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const features: AiFeature[] =
    args.scope === "semua" ? [...AI_FEATURES] : isAiFeature(args.scope) ? [args.scope] : fail(usage());
  if (args.limit !== undefined && (!Number.isInteger(args.limit) || args.limit < 1)) fail("--batas harus bilangan bulat ≥ 1");
  if (args.model !== null && !isAiModelId(args.model)) fail(`Model tidak dikenal. Pilihan: ${AI_MODEL_IDS.join(", ")}`);
  const model: AiModelId = (args.model as AiModelId | null) ?? (await getAiGuide()).model;
  const mock = process.env.AI_MOCK === "1";

  const counts: Partial<Record<AiFeature, number>> = {};
  for (const f of features) counts[f] = (await casesFor(f, args.limit)).length;
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);

  console.log(`Set uji: ${features.map((f) => `${AI_FEATURE_LABELS[f]} (${counts[f]})`).join(", ")}`);
  console.log(`Model: ${mock ? "mode uji (AI_MOCK=1, tanpa API)" : model} · Panduan AI: ${args.dbGuide ? "database" : "contoh"}`);
  console.log(`${total} panggilan, perkiraan biaya ${mock ? formatUsd(0) : `±${formatUsd(estimateEvalUsd(counts, model))}`}`);
  if (!args.confirm) {
    console.log("\nBelum dijalankan. Tambahkan --konfirmasi untuk menjalankan (memakai biaya API kecuali AI_MOCK=1).");
    return;
  }

  const controller = new AbortController();
  process.on("SIGINT", () => {
    console.log("\nDihentikan; menulis laporan untuk kasus yang sudah selesai…");
    controller.abort();
  });
  const { reportPath } = await runEvals({
    features,
    model,
    limit: args.limit,
    useDbGuide: args.dbGuide,
    signal: controller.signal,
    log: (line) => console.log(line),
  });
  if (reportPath) console.log(`Laporan: ${reportPath}`);
}

function usage(): string {
  return `Pakai: npm run ai:eval -- <${[...AI_FEATURES, "semua"].join("|")}> [--model <id>] [--batas <n>] [--panduan-db] [--konfirmasi]`;
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
