import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  ClipboardList,
  Hourglass,
  Layers,
  Lightbulb,
  ListOrdered,
  Repeat2,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RuleId } from "@/lib/analytics/rules";
import { cn } from "@/lib/utils";
import { PlatformBadge } from "@/features/contents/components/platform-badge";
import type { SuggestionView } from "../copy";
import { DismissSuggestionButton } from "./dismiss-suggestion-button";

const ICONS: Record<RuleId, LucideIcon> = {
  rhythm: CalendarClock,
  "pending-metrics": ClipboardList,
  "stale-content": Hourglass,
  "best-pillar": TrendingUp,
  "best-hook": TrendingUp,
  "best-time": TrendingUp,
  "continue-series": ListOrdered,
  crosspost: Repeat2,
  "neglected-pillar": Layers,
  "low-ideas": Lightbulb,
};

/** Satu saran: judul + platform, kalimat dengan angka jadi, tautan tindakan, dan Sembunyikan 7 hari. */
export function SuggestionCard({
  suggestion,
  onDismissed,
  className,
}: {
  suggestion: SuggestionView;
  /**
   * Dipanggil setelah berhasil disembunyikan (mis. untuk menyembunyikan kartu sebelum data dimuat ulang).
   * Boleh mengembalikan Promise (animasi keluar); data dimuat ulang setelah Promise selesai.
   */
  onDismissed?: (key: string) => void | Promise<void>;
  className?: string;
}) {
  const Icon = ICONS[suggestion.rule];
  // Kartu bertingkat abu (di dalam kartu putih Beranda/Review): ikon di lingkaran putih, tombol pil primer.
  return (
    <article
      className={cn("flex gap-3 rounded-card-nested bg-muted p-4 text-foreground", className)}
      data-rule={suggestion.rule}
    >
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card text-foreground"
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex min-h-9 flex-wrap items-center gap-2">
          <h3 className="font-heading text-h6">{suggestion.title}</h3>
          {suggestion.platform && <PlatformBadge platform={suggestion.platform} />}
        </div>
        <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">{suggestion.message}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm">
            <Link href={suggestion.href}>
              {suggestion.actionLabel}
              <ArrowRight />
            </Link>
          </Button>
          <DismissSuggestionButton suggestionKey={suggestion.key} title={suggestion.title} onDismissed={onDismissed} />
        </div>
      </div>
    </article>
  );
}
