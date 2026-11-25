import { SectionLabel } from "@/components/design/section-label";

/**
 * Judul halaman Studio (skala h3, T1) + deskripsi singkat + slot aksi di kanan.
 * `label`: label kecil di atas judul (mis. nama grup menu), opsional.
 */
export function PageHeader({
  title,
  description,
  actions,
  label,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  label?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        {label && <SectionLabel className="mb-2">{label}</SectionLabel>}
        <h1 className="font-heading text-h3 break-words">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
