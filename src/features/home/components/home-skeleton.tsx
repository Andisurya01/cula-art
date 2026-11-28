import { CardSkeleton, LoadingRegion, PageHeaderSkeleton, RowSkeleton, SkeletonText } from "@/components/layout/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Kerangka Beranda saat data dimuat (`(beranda)/loading.tsx`): grid bento yang sama dengan halaman
 * (container query 1/2/3 kolom), kartu dengan urutan dan rentang kolom yang sama. Pengingat dan banner
 * bersyarat tidak ditiru (sering tidak tampil). Kartu bento berwarna ditiru sebagai kartu netral,
 * supaya warna yang salah tidak sempat berkedip.
 */
export function HomeSkeleton() {
  return (
    <>
      <PageHeaderSkeleton title="Beranda" />
      <LoadingRegion label="Beranda" className="@container">
        <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2 @4xl:grid-cols-3">
          {/* Post minggu ini: angka besar, bilah progres, daftar konten. */}
          <CardSkeleton titleClassName="w-36" className="@xl:col-span-2" contentClassName="space-y-4">
            <div className="space-y-3">
              <SkeletonText className="w-40 font-heading text-h1" />
              <Skeleton className="h-2 rounded-full" />
              <SkeletonText className="w-56 max-w-full text-sm" />
            </div>
            <div className="grid gap-2">
              <RowSkeleton className="h-14" />
              <RowSkeleton className="h-14" />
            </div>
          </CardSkeleton>

          {/* Streak: label, angka, keterangan. */}
          <CardSkeleton titleClassName="w-20" contentClassName="space-y-1">
            <SkeletonText className="w-16 font-heading text-h2" />
            <SkeletonText className="w-4/5 text-sm" />
          </CardSkeleton>

          {/* Tugas hari ini. */}
          <CardSkeleton titleClassName="w-28" contentClassName="grid gap-2">
            <RowSkeleton />
            <RowSkeleton />
          </CardSkeleton>

          {/* Saran. */}
          <CardSkeleton titleClassName="w-16" description className="@xl:col-span-2" contentClassName="grid gap-2">
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </CardSkeleton>

          {/* Metrik tertunda. */}
          <CardSkeleton titleClassName="w-36" className="col-span-full" contentClassName="grid gap-2 @3xl:grid-cols-2">
            <RowSkeleton />
            <RowSkeleton />
          </CardSkeleton>

          {/* Followers per platform: angka + grafik mini. */}
          {["tiktok", "instagram"].map((key) => (
            <CardSkeleton key={key} titleClassName="w-36" className="min-w-0" contentClassName="space-y-2">
              <SkeletonText className="w-28 font-heading text-h3" />
              <Skeleton className="h-24 rounded-card-nested" />
            </CardSkeleton>
          ))}

          {/* Pipeline: satu ubin per stage. */}
          <CardSkeleton titleClassName="w-24">
            <div className="grid grid-cols-2 gap-2 @lg:grid-cols-3 @xl:grid-cols-2">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-18 rounded-card-nested" />
              ))}
            </div>
          </CardSkeleton>
        </div>
      </LoadingRegion>
    </>
  );
}
