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

/** Kontrol berbentuk pil: permukaan putih bergaris tipis; pilihan aktif = pil primer. */
const pillClass =
  "inline-flex h-11 shrink-0 cursor-pointer items-center rounded-button bg-card px-4 text-body-sm font-medium text-card-foreground ring-1 ring-border/70 transition-colors select-none hover:bg-muted has-checked:bg-primary has-checked:text-primary-foreground has-checked:ring-primary has-focus-visible:ring-3 has-focus-visible:ring-ring";

const selectClass =
  "h-11 w-full appearance-none rounded-button bg-card pr-10 pl-4 text-body-sm font-medium text-card-foreground ring-1 ring-border/70 outline-hidden transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring";

/** Baris pil yang bisa digeser di HP (tanpa scrollbar), membungkus di layar lebar. */
const pillRowClass =
  "-mx-4 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden";

function PillRadioGroup({
  name,
  legend,
  options,
  value,
}: {
  name: string;
  legend: string;
  options: { value: string; label: string }[];
  value: string;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">{legend}</legend>
      <div className={pillRowClass}>
        {options.map((option) => (
          <label key={option.value || "semua"} className={pillClass}>
            <input type="radio" name={name} value={option.value} defaultChecked={value === option.value} className="sr-only" />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

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
        className="grid gap-3"
      >
        <div className="flex gap-2">
          <label className="relative min-w-0 flex-1 sm:max-w-md">
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
              className="h-11 w-full rounded-button bg-card pr-4 pl-10 text-base text-card-foreground ring-1 ring-border/70 outline-hidden placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring sm:text-body-sm"
            />
          </label>
          <button
            type="submit"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-button bg-primary px-5 text-body-sm font-medium text-primary-foreground transition-colors outline-hidden hover:bg-primary/85 focus-visible:ring-3 focus-visible:ring-ring"
          >
            {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
            {copy.searchSubmit}
          </button>
        </div>

        <PillRadioGroup
          name="medium"
          legend={copy.mediumLegend}
          value={filters.medium ?? ""}
          options={[{ value: "", label: copy.allMediums }, ...MEDIUMS.map((m) => ({ value: m, label: galleryCopy.medium[m] }))]}
        />

        <div className="grid gap-3 lg:flex lg:items-center lg:justify-between">
          <PillRadioGroup
            name="status"
            legend={copy.statusLabel}
            value={filters.status ?? ""}
            options={[{ value: "", label: copy.statusAll }, ...CATALOG_STATUSES.map((s) => ({ value: s, label: copy.status[s] }))]}
          />
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <NativeSelect name="tahun" label={copy.yearLabel} defaultValue={filters.year ? String(filters.year) : ""} className="sm:w-40">
              <option value="">{copy.yearAll}</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect name="urut" label={copy.sortLabel} defaultValue={filters.sort} className="sm:w-44">
              {CATALOG_SORTS.map((s) => (
                <option key={s} value={s}>
                  {`${copy.sortLabel}: ${copy.sort[s]}`}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
      </form>

      <div className="mt-6 flex min-h-11 flex-wrap items-center gap-x-4 border-t border-border pt-3">
        <p className="text-body-sm text-muted-foreground" aria-live="polite">
          {copy.resultCount(total)}
          {filters.q && <span> {copy.searchingFor(filters.q)}</span>}
        </p>
        {active && (
          <Link
            href={catalogHref({ sort: filters.sort })}
            scroll={false}
            className="inline-flex min-h-11 items-center rounded-button text-body-sm font-medium underline underline-offset-4 outline-hidden hover:no-underline focus-visible:ring-3 focus-visible:ring-ring"
          >
            {copy.clearFilters}
          </Link>
        )}
      </div>

      <div
        aria-busy={pending}
        className={cn("mt-8 transition-opacity duration-base", pending && "pointer-events-none opacity-50")}
      >
        {children}
      </div>
    </>
  );
}
