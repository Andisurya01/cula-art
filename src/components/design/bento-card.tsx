import { Card, type CardVariant } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Kartu bento untuk angka penting (referensi Studio): label kecil, angka besar, keterangan, dan
 * slot isi tambahan (bilah progres, grafik mini, tombol). Warna dari varian kartu (token bento).
 */
export function BentoCard({
  tone = "default",
  label,
  value,
  description,
  icon,
  action,
  children,
  className,
}: {
  tone?: CardVariant;
  label?: React.ReactNode;
  value?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  /** Elemen di pojok kanan atas (mis. tautan "Lihat"). */
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card variant={tone} className={cn("justify-between", className)}>
      {(label || icon || action) && (
        <div className="flex items-start justify-between gap-3 px-(--card-spacing)">
          <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
            {icon ? <span className="shrink-0 [&_svg]:size-4">{icon}</span> : null}
            {label ? <span className="min-w-0">{label}</span> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      )}
      {(value !== undefined || description) && (
        <div className="px-(--card-spacing)">
          {value !== undefined ? <p className="font-heading text-h2">{value}</p> : null}
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground group-data-[tone=bento]/card:text-current">
              {description}
            </p>
          ) : null}
        </div>
      )}
      {children ? <div className="px-(--card-spacing)">{children}</div> : null}
    </Card>
  );
}
