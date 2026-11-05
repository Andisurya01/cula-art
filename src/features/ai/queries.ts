import "server-only";
import { db } from "@/lib/db";
import { startOfWibMonth } from "@/lib/date";
import { COST_ESTIMATE_SAMPLE, estimateCallCost, summarizeAiUsage } from "@/lib/analytics/ai-usage";
import { hasAnthropicKey, isAiMockMode } from "./client";
import { AI_FEATURES, type AiFeature } from "./features";
import { parseAiGuideRow } from "./guide-schema";
import { AI_MODELS, DEFAULT_AI_MODEL, isAiModelId, MOCK_MODEL } from "./models";
import { FEATURE_PROMPTS } from "./prompts";

export const AI_GUIDE_ID = "default";

/** Baris AiGuide; dibuat dengan default (AI nonaktif) jika belum ada. */
export async function getAiGuideRow() {
  return db.aiGuide.upsert({ where: { id: AI_GUIDE_ID }, update: {}, create: { id: AI_GUIDE_ID } });
}

export async function getAiGuide() {
  return parseAiGuideRow(await getAiGuideRow());
}

/** Status untuk tombol Bantu AI di seluruh Studio (lewat AiStatusProvider). Tanpa isi kunci API. */
export type AiStatus = {
  enabled: boolean;
  mock: boolean;
  /** Perkiraan biaya per fitur (US$) untuk model aktif. */
  estimates: Record<AiFeature, number>;
};

export async function getAiStatus(): Promise<AiStatus> {
  const guide = await getAiGuideRow();
  const mock = isAiMockMode();
  const model = mock ? MOCK_MODEL : guide.model;
  const recent = await db.aiRun.findMany({
    where: { model, status: "OK" },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { feature: true, status: true, costUsd: true },
  });
  // Angka awal per fitur dihitung untuk Opus 5.5; model lain disesuaikan dengan harga output-nya.
  const priceRatio = isAiModelId(model) ? AI_MODELS[model].price.output / AI_MODELS[DEFAULT_AI_MODEL].price.output : 1;
  const estimates = Object.fromEntries(
    AI_FEATURES.map((feature) => [
      feature,
      mock
        ? 0
        : estimateCallCost(
            recent.filter((r) => r.feature === feature).slice(0, COST_ESTIMATE_SAMPLE),
            FEATURE_PROMPTS[feature].initialEstimateUsd * priceRatio,
          ),
    ]),
  ) as Record<AiFeature, number>;
  return { enabled: guide.isEnabled, mock, estimates };
}

/** Data tab Panduan AI: panduan, status kunci, ringkasan bulan ini, 20 run terakhir. */
export async function getAiSettingsPageData(now: Date = new Date()) {
  const guide = await getAiGuide();
  const [monthRuns, recentRuns] = await Promise.all([
    db.aiRun.findMany({
      where: { createdAt: { gte: startOfWibMonth(now) } },
      select: {
        status: true,
        inputTokens: true,
        outputTokens: true,
        cacheReadTokens: true,
        cacheWriteTokens: true,
        costUsd: true,
        accepted: true,
      },
    }),
    db.aiRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        feature: true,
        model: true,
        targetType: true,
        status: true,
        costUsd: true,
        durationMs: true,
        accepted: true,
        errorMessage: true,
        createdAt: true,
      },
    }),
  ]);
  return {
    guide,
    hasApiKey: hasAnthropicKey(),
    mock: isAiMockMode(),
    usage: summarizeAiUsage(monthRuns, guide.monthlyBudgetUsd),
    recentRuns,
  };
}
export type AiSettingsPageData = Awaited<ReturnType<typeof getAiSettingsPageData>>;
