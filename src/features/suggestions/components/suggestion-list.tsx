"use client";

import { useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motionDurationOf, motionLevelOf } from "@/components/motion/use-motion-level";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SuggestionView } from "../copy";
import { SuggestionCard } from "./suggestion-card";

/**
 * Daftar saran terurut prioritas. Dengan `limit`, hanya N teratas yang tampil plus "Lihat semua (N)"
 * yang membuka sisanya di tempat (E6). Saran yang baru disembunyikan langsung hilang dari daftar.
 *
 * Fase 7: kartu yang disembunyikan memudar dan mengecil keluar (`motion-exit`), baru dilepas dari daftar
 * setelah animasinya selesai; kartu lain lalu langsung naik (tanpa animasi tinggi). Saat animasi Mati /
 * kurangi gerakan kartu langsung dilepas. Data dimuat ulang (router.refresh di tombol) setelah kartu
 * keluar, supaya data baru tidak memotong animasinya.
 */
export function SuggestionList({
  suggestions,
  limit,
  empty = "Tidak ada saran saat ini.",
}: {
  suggestions: readonly SuggestionView[];
  limit?: number;
  empty?: React.ReactNode;
}) {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [exiting, setExiting] = useState<ReadonlySet<string>>(new Set());
  const [expanded, setExpanded] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  /** Penyelesai janji `dismiss` per kunci, dipanggil saat kartu benar-benar dilepas. */
  const exitDone = useRef(new Map<string, () => void>());
  const visible = suggestions.filter((s) => !hidden.has(s.key));
  const shown = limit && !expanded ? visible.slice(0, limit) : visible;
  const rest = visible.length - shown.length;

  function remove(key: string) {
    // Fokus (tombol Sembunyikan) ada di kartu yang dilepas: pindahkan ke kartu tetangga setelah daftar
    // diperbarui, supaya fokus keyboard tidak jatuh ke awal halaman.
    const item = listRef.current?.querySelector<HTMLElement>(`[data-suggestion-key="${CSS.escape(key)}"]`);
    const hadFocus = !!item && item.contains(document.activeElement);
    const neighbor = (item?.nextElementSibling ?? item?.previousElementSibling) as HTMLElement | null | undefined;
    if (hadFocus) {
      requestAnimationFrame(() => {
        const target = neighbor?.isConnected ? neighbor.querySelector<HTMLElement>("a[href], button:not([disabled])") : null;
        target?.focus();
      });
    }
    setHidden((prev) => (prev.has(key) ? prev : new Set([...prev, key])));
    setExiting((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    exitDone.current.get(key)?.();
    exitDone.current.delete(key);
  }

  /** Mulai animasi keluar; selesai (resolve) setelah kartu dilepas dari daftar. */
  function dismiss(key: string): Promise<void> {
    const list = listRef.current;
    if (!list || motionLevelOf(list) === "off") {
      remove(key);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      exitDone.current.set(key, resolve);
      setExiting((prev) => new Set([...prev, key]));
      // Cadangan jika `animationend` tidak datang (durasi 0, tab tersembunyi): 2× durasi token.
      window.setTimeout(() => remove(key), motionDurationOf(list, "base") * 2);
    });
  }

  if (visible.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;

  return (
    <div className="grid gap-2">
      <ul ref={listRef} className="grid gap-2">
        {shown.map((suggestion) => (
          <li
            key={suggestion.key}
            data-suggestion-key={suggestion.key}
            className={cn(exiting.has(suggestion.key) && "motion-exit")}
            onAnimationEnd={(event) => {
              if (event.target === event.currentTarget && exiting.has(suggestion.key)) remove(suggestion.key);
            }}
          >
            <SuggestionCard suggestion={suggestion} onDismissed={dismiss} />
          </li>
        ))}
      </ul>
      {limit !== undefined && (rest > 0 || expanded) && visible.length > limit && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="justify-self-start"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronUp /> : <ChevronDown />}
          {expanded ? "Tampilkan lebih sedikit" : `Lihat semua (${visible.length})`}
        </Button>
      )}
    </div>
  );
}
