// Format angka Eksperimen (fungsi murni, aman di client dan server). Nilai null/NaN → "—".

import type { DecidingMetric } from "@/lib/analytics/experiments";
import {
  EMPTY_VALUE,
  formatCount,
  formatFollowRate,
  formatPercent,
  formatScore,
} from "@/features/metrics/format";

const oneDecimal = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Nilai metrik penentu dalam satuannya: skor `150,0`, rate `8,0%`, follow rate `4,0`, views `12.345`. */
export function formatMetricValue(metric: DecidingMetric, value: number | null | undefined): string {
  switch (metric) {
    case "SCORE":
      return formatScore(value);
    case "ER":
    case "SAVE_RATE":
    case "SHARE_RATE":
      return formatPercent(value);
    case "FOLLOW_RATE":
      return formatFollowRate(value);
    case "VIEWS":
      return formatCount(value);
  }
}

/** Selisih % bertanda: `+12,5%`, `−8,0%`, `0,0%`. */
export function formatDiffPercent(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return EMPTY_VALUE;
  const rounded = Math.round(value * 10) / 10;
  if (rounded > 0) return `+${oneDecimal.format(rounded)}%`;
  if (rounded < 0) return `−${oneDecimal.format(-rounded)}%`;
  return `${oneDecimal.format(0)}%`;
}
