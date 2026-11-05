"use client";

import type { AiSettingsPageData } from "@/features/ai/queries";
import type { PillarRow } from "../../queries";
import { AiGuideContentForm } from "./ai-guide-content-form";
import { AiTechnicalCard } from "./ai-technical-card";
import { AiUsageCard } from "./ai-usage-card";

/**
 * Tab Panduan AI: status dan batas di atas, ringkasan biaya, lalu form panduan yang panjang di akhir
 * (tombol Simpan-nya paling bawah, tidak diikuti kartu lain).
 */
export function AiGuideTab({ data, pillars }: { data: AiSettingsPageData; pillars: PillarRow[] }) {
  const { guide } = data;

  return (
    <>
      <AiTechnicalCard
        settings={{
          isEnabled: guide.isEnabled,
          model: guide.model,
          monthlyBudgetUsd: guide.monthlyBudgetUsd,
          dailyCallLimit: guide.dailyCallLimit,
        }}
        hasApiKey={data.hasApiKey}
        mock={data.mock}
      />
      <AiUsageCard usage={data.usage} monthlyBudgetUsd={guide.monthlyBudgetUsd} recentRuns={data.recentRuns} />
      <AiGuideContentForm guide={guide} pillars={pillars} />
    </>
  );
}
