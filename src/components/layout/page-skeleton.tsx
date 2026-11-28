import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Bahan status memuat Studio (Fase 7): `loading.tsx` per menu menyusun kerangka yang meniru bentuk
// halamannya dari potongan di sini. Semua `Skeleton` dekoratif (`aria-hidden`, shimmer dari token, diam
// saat animasi Mati / kurangi gerakan / tanpa JS); pembaca layar mendengar satu teks "Memuat …".
// Tanpa animasi masuk: kerangka harus langsung tampil, dan langsung hilang saat data tiba.

/**
 * Wadah isi yang sedang dimuat: `aria-busy` + teks status sr-only. `className` = tata letak isi
 * (grid/gap) seperti halaman aslinya.
 */
export function LoadingRegion({
  label,
  className,
  children,
}: {
  /** Mis. "postingan" → "Memuat postingan…". */
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  // Status di luar wadah aria-busy: sebagian pembaca layar menahan pengumuman di dalam wilayah yang sibuk.
  return (
    <>
      <p role="status" className="sr-only">
        Memuat {label}…
      </p>
      <div aria-busy="true" className={className}>
        {children}
      </div>
    </>
  );
}

/**
 * Satu baris teks. Tinggi wadah = tinggi baris teks aslinya (`1lh` dari kelas ukuran teks di
 * `className`, mis. `text-h3`), bilahnya sedikit lebih tipis, jadi isi asli menggantikannya tanpa
 * lompatan. Lebar di `className` (mis. `w-40`).
 */
export function SkeletonText({ className, barClassName }: { className?: string; barClassName?: string }) {
  return (
    <div aria-hidden="true" className={cn("py-[0.15lh]", className)}>
      <Skeleton className={cn("h-[0.7lh] w-full", barClassName)} />
    </div>
  );
}

/**
 * Judul halaman Studio seperti `PageHeader`: judul asli (statis, jadi langsung terbaca), deskripsi dan
 * tombol aksi sebagai bilah. `actionClassName` = lebar tombol aksi, boleh menimpa tinggi/radius (mis.
 * badge); tanpa = tanpa tombol.
 */
export function PageHeaderSkeleton({
  title,
  actionClassName,
  description = true,
}: {
  title: string;
  actionClassName?: string;
  description?: boolean;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0 flex-1">
        <h1 className="font-heading text-h3 break-words">{title}</h1>
        {description && <SkeletonText className="mt-1.5 w-full max-w-md text-sm" />}
      </div>
      {actionClassName && <Skeleton className={cn("h-9 rounded-button", actionClassName)} />}
    </div>
  );
}

/**
 * Kartu permukaan (komponen `Card` asli, jadi radius/padding/garis sama) dengan bilah judul,
 * deskripsi opsional, dan isi bebas.
 */
export function CardSkeleton({
  titleClassName = "w-32",
  description = false,
  className,
  contentClassName,
  children,
}: {
  titleClassName?: string;
  description?: boolean;
  className?: string;
  contentClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card aria-hidden="true" className={className}>
      <CardHeader>
        <SkeletonText className={cn("text-base", titleClassName)} />
        {description && <SkeletonText className="w-full max-w-sm text-sm" />}
      </CardHeader>
      {children ? <CardContent className={contentClassName}>{children}</CardContent> : null}
    </Card>
  );
}

/** Baris kartu bertingkat abu (daftar di dalam kartu) atau kartu daftar di halaman. */
export function RowSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-16 rounded-card-nested", className)} />;
}
