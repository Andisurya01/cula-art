"use client";

import { useOptimistic, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { METRIC_STATUS_LABELS, PLATFORMS, PLATFORM_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import {
  EMPTY_POST_FILTERS,
  POST_STATUS_FILTERS,
  parsePostFilters,
  postFiltersToQuery,
  type PostFilters,
  type PostStatusFilter,
} from "../post-filters";

const ALL = "all";

/** Tahun yang sedang diketik lewat tanggal valid (0002, 0020, 0202), jadi belum diterapkan. */
const EARLIEST_DATE = "2000-01-01";

const STATUS_FILTER_LABELS: Record<PostStatusFilter, string> = {
  ...METRIC_STATUS_LABELS,
  PERLU: "Perlu diisi",
};

type FilterKey = "platform" | "pilar" | "status" | "dari" | "sampai";

/**
 * Filter platform / pilar / status / rentang tanggal. Disimpan di URL; filter baru kembali ke halaman 1.
 * `useOptimistic`: dua perubahan cepat sebelum navigasi selesai tidak saling membuang.
 */
export function PostFiltersBar({
  filters: serverFilters,
  pillars,
}: {
  filters: PostFilters;
  pillars: { id: string; name: string; color: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [filters, setFilters] = useOptimistic(serverFilters);

  function apply(next: PostFilters) {
    const query = postFiltersToQuery(next);
    startTransition(() => {
      setFilters(next);
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  function update(key: FilterKey, value: string | null) {
    // Validasi ulang lewat parser yang sama dengan server.
    const raw = {
      platform: filters.platform ?? undefined,
      pilar: filters.pillarId ?? undefined,
      status: filters.status ?? undefined,
      dari: filters.from ?? undefined,
      sampai: filters.to ?? undefined,
      [key]: value ?? undefined,
    };
    apply(parsePostFilters(raw));
  }

  const selectValue = (value: string) => (value === ALL ? null : value);
  const isDefault = postFiltersToQuery(filters) === "";

  return (
    <div
      className={cn(
        "grid grid-cols-2 items-end gap-2 sm:flex sm:flex-wrap",
        pending && "opacity-70",
      )}
    >
      <Select value={filters.platform ?? ALL} onValueChange={(v) => update("platform", selectValue(v))}>
        <SelectTrigger className="w-full sm:w-40" aria-label="Filter platform">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua platform</SelectItem>
          {PLATFORMS.map((platform) => (
            <SelectItem key={platform} value={platform}>
              {PLATFORM_LABELS[platform]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.pillarId ?? ALL} onValueChange={(v) => update("pilar", selectValue(v))}>
        <SelectTrigger className="w-full sm:w-44" aria-label="Filter pilar">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua pilar</SelectItem>
          {pillars.map((pillar) => (
            <SelectItem key={pillar.id} value={pillar.id}>
              <span className="size-2 rounded-full" style={{ backgroundColor: pillar.color }} />
              {pillar.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.status ?? ALL} onValueChange={(v) => update("status", selectValue(v))}>
        <SelectTrigger className="col-span-2 w-full sm:w-40" aria-label="Filter status metrik">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua status</SelectItem>
          {POST_STATUS_FILTERS.map((status) => (
            <SelectItem key={status} value={status}>
              {STATUS_FILTER_LABELS[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <DateFilterInput
        id="post-filter-from"
        label="Dari"
        value={filters.from}
        onCommit={(value) => update("dari", value)}
      />
      <DateFilterInput
        id="post-filter-to"
        label="Sampai"
        value={filters.to}
        min={filters.from}
        onCommit={(value) => update("sampai", value)}
      />

      {!isDefault && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="col-span-2 justify-self-start sm:mb-0.5"
          onClick={() => apply(EMPTY_POST_FILTERS)}
        >
          <X />
          Reset filter
        </Button>
      )}
    </div>
  );
}

/**
 * Input tanggal WIB. Isinya disimpan lokal supaya tidak terhapus saat tahun sedang diketik,
 * dan mengikuti URL lagi saat filter berubah dari luar (reset, tombol kembali browser).
 */
function DateFilterInput({
  id,
  label,
  value,
  min,
  onCommit,
}: {
  id: string;
  label: string;
  value: string | null;
  min?: string | null;
  onCommit: (value: string | null) => void;
}) {
  const [draft, setDraft] = useState(value ?? "");
  const [syncedValue, setSyncedValue] = useState(value);
  if (syncedValue !== value) {
    setSyncedValue(value);
    setDraft(value ?? "");
  }

  return (
    <div className="grid min-w-0 gap-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label} (WIB)
      </Label>
      <Input
        id={id}
        type="date"
        className="sm:w-38"
        value={draft}
        min={min ?? undefined}
        aria-invalid={Boolean(min && draft && draft < min)}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          if (next === "") onCommit(null);
          else if (next >= EARLIEST_DATE) onCommit(next);
        }}
      />
    </div>
  );
}
