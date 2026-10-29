"use client";

import { useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LoaderCircle, Search } from "lucide-react";
import { MEDIUMS } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  CATALOG_SORTS,
  CATALOG_STATUSES,
  catalogHref,
  catalogHrefFromForm,
  hasActiveFilters,
  type CatalogFilters,
} from "../../catalog";
import { galleryCopy } from "../../copy";

const copy = galleryCopy.catalog;

const selectClass =
  "h-11 w-full appearance-none rounded-full border border-border bg-background pr-10 pl-4 text-sm outline-none transition-colors hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function NativeSelect({
  name,
  label,
  defaultValue,
  children,
  className,
}: {
  name: string;
  label: string;
  defaultValue: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("relative block", className)}>
      <span className="sr-only">{label}</span>
      <select name={name} defaultValue={defaultValue} className={selectClass}>
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </label>
  );
}

/**
 * Filter katalog sebagai form GET biasa (tetap jalan tanpa JS: tombol "Cari" mengirim semuanya).
 * Dengan JS: pilihan medium/ketersediaan/tahun/urutan langsung diterapkan, URL dirapikan
 * (`catalogHrefFromForm`), dan hasil diredupkan selama memuat.
 */
export function CatalogFilterForm({
  filters,
  years,
  total,
  children,
}: {
  filters: CatalogFilters;
  years: number[];
  total: number;
  /** Hasil katalog (dirender server). */
  children: React.ReactNode;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const { q, medium, status, year, sort } = filters;

  // Isian form tidak dikontrol React (supaya jalan tanpa JS dan fokus keyboard tidak hilang saat
  // filter diterapkan). Jika URL berubah dari luar form (tautan "Hapus filter", tombol Kembali),
  // nilai DOM disamakan dengan filter di URL.
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const values: Record<string, string> = {
      q,
      medium: medium ?? "",
      status: status ?? "",
      tahun: year ? String(year) : "",
      urut: sort,
    };
    for (const [name, value] of Object.entries(values)) {
      const field = form.elements.namedItem(name);
      if (field instanceof RadioNodeList || field instanceof HTMLSelectElement) field.value = value;
      else if (field instanceof HTMLInputElement && document.activeElement !== field) field.value = value;
    }
  }, [q, medium, status, year, sort]);
  const active = hasActiveFilters(filters);
  // Tahun yang sedang difilter tetap ada di pilihan walau karyanya sudah tidak terbit.
  const yearOptions = filters.year && !years.includes(filters.year) ? [filters.year, ...years] : years;

  function submit(form: HTMLFormElement) {
    const href = catalogHrefFromForm(new FormData(form).entries());
    startTransition(() => router.push(href, { scroll: false }));
  }

  return (
    <>
      <form
        ref={formRef}
        action={routes.gallery.catalog}
        method="get"
        role="search"
        aria-label={copy.filterLabel}
        onSubmit={(event) => {
          event.preventDefault();
          submit(event.currentTarget);
        }}
        onChange={(event) => {
          // Teks pencarian dikirim dengan Enter/tombol Cari; pilihan lain langsung diterapkan.
          if (event.target instanceof HTMLInputElement && event.target.type === "search") return;
          submit(event.currentTarget);
        }}
        className="grid gap-4"
      >
        <div className="flex gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">{copy.searchLabel}</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              name="q"
              defaultValue={filters.q}
              placeholder={copy.searchPlaceholder}
              maxLength={100}
              enterKeyHint="search"
              className="h-11 w-full rounded-full border border-border bg-background pr-4 pl-10 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:text-sm"
            />
          </label>
          <button
            type="submit"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
          >
            {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
            {copy.searchSubmit}
          </button>
        </div>

        <fieldset className="min-w-0">
          <legend className="sr-only">{copy.mediumLegend}</legend>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
            {[{ value: "", label: copy.allMediums }, ...MEDIUMS.map((m) => ({ value: m, label: galleryCopy.medium[m] }))].map(
              (option) => (
                <label
                  key={option.value || "semua"}
                  className="inline-flex h-11 shrink-0 cursor-pointer items-center rounded-full border border-border px-4 text-sm transition-colors select-none hover:bg-muted has-checked:border-foreground has-checked:bg-foreground has-checked:text-background has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
                >
                  <input
                    type="radio"
                    name="medium"
                    value={option.value}
                    defaultChecked={(filters.medium ?? "") === option.value}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ),
            )}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <NativeSelect name="status" label={copy.statusLabel} defaultValue={filters.status ?? ""} className="sm:w-52">
            <option value="">{copy.statusAll}</option>
            {CATALOG_STATUSES.map((s) => (
              <option key={s} value={s}>
                {copy.status[s]}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect name="tahun" label={copy.yearLabel} defaultValue={filters.year ? String(filters.year) : ""} className="sm:w-40">
            <option value="">{copy.yearAll}</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </NativeSelect>
          <div className="col-span-2 flex items-center justify-end gap-3 sm:ml-auto">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{copy.sortLabel}</span>
              <span className="relative block">
                <select name="urut" defaultValue={filters.sort} className={cn(selectClass, "w-36")}>
                  {CATALOG_SORTS.map((s) => (
                    <option key={s} value={s}>
                      {copy.sort[s]}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-muted-foreground"
                />
              </span>
            </label>
          </div>
        </div>
      </form>

      <div className="mt-6 flex min-h-11 flex-wrap items-center gap-x-4 border-t border-border pt-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {copy.resultCount(total)}
          {filters.q && <span> {copy.searchingFor(filters.q)}</span>}
        </p>
        {active && (
          <Link
            href={catalogHref({ sort: filters.sort })}
            scroll={false}
            className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4 hover:no-underline"
          >
            {copy.clearFilters}
          </Link>
        )}
      </div>

      <div
        aria-busy={pending}
        className={cn("mt-6 transition-opacity duration-200", pending && "pointer-events-none opacity-50")}
      >
        {children}
      </div>
    </>
  );
}
