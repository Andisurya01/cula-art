"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MEDIUMS, MEDIUM_LABELS, PLATFORMS, PLATFORM_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import {
  ANALYTICS_RANGES,
  analyticsHref,
  parseAnalyticsFilters,
  type AnalyticsFilters,
} from "../schema";

const ALL = "all";

/**
 * Filter satu baris di URL + isi halaman. Saat filter diganti, isi lama tetap tampil dengan opacity
 * turun sampai data baru tiba (tanpa skeleton), dan pilihan di filter langsung berpindah.
 */
export function AnalyticsFrame({
  filters,
  children,
}: {
  filters: AnalyticsFilters;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useOptimistic(filters);

  function update(key: "platform" | "rentang" | "medium", value: string) {
    // Validasi ulang lewat parser yang sama dengan server.
    const next = parseAnalyticsFilters({
      platform: current.platform,
      rentang: String(current.days),
      medium: current.medium ?? undefined,
      [key]: value === ALL ? undefined : value,
    });
    startTransition(() => {
      setCurrent(next);
      router.replace(analyticsHref(next), { scroll: false });
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Tabs
          value={current.platform}
          onValueChange={(value) => update("platform", value)}
          className="w-full sm:w-auto"
        >
          <TabsList aria-label="Platform" className="w-full sm:w-fit">
            {PLATFORMS.map((platform) => (
              <TabsTrigger key={platform} value={platform} className="px-3">
                {PLATFORM_LABELS[platform]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Tabs value={String(current.days)} onValueChange={(value) => update("rentang", value)}>
          <TabsList aria-label="Rentang waktu">
            {ANALYTICS_RANGES.map((days) => (
              <TabsTrigger key={days} value={String(days)}>
                {days} hari
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Select value={current.medium ?? ALL} onValueChange={(value) => update("medium", value)}>
          <SelectTrigger className="min-w-0 flex-1 sm:w-40 sm:flex-none" aria-label="Filter medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua medium</SelectItem>
            {MEDIUMS.map((medium) => (
              <SelectItem key={medium} value={medium}>
                {MEDIUM_LABELS[medium]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        className={cn("grid grid-cols-1 gap-4 transition-opacity", pending && "opacity-60")}
        aria-busy={pending}
      >
        {children}
      </div>
    </div>
  );
}
