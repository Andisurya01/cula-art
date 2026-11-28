import { CardSkeleton, LoadingRegion, PageHeaderSkeleton, SkeletonText } from "@/components/layout/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Kerangka Review Mingguan: navigasi minggu, kartu ringkasan (angka besar + dua platform), kartu
 * followers, dan form refleksi. Pindah minggu memakai URL di route yang sama, jadi tidak memakai
 * kerangka ini.
 */
export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton title="Review Mingguan" actionClassName="h-6 w-32 rounded-badge" />
      <LoadingRegion label="review mingguan" className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-8 w-28 rounded-button" />
          <Skeleton className="h-8 w-28 rounded-button" />
        </div>

        <CardSkeleton titleClassName="w-40" description contentClassName="space-y-4">
          <SkeletonText className="w-48 font-heading text-h2" />
          <div className="grid gap-3 md:grid-cols-2">
            <Skeleton className="h-40 rounded-card-nested" />
            <Skeleton className="h-40 rounded-card-nested" />
          </div>
        </CardSkeleton>

        <CardSkeleton titleClassName="w-28" description />

        <CardSkeleton titleClassName="w-24" description contentClassName="grid gap-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="grid gap-2">
              <SkeletonText className="w-36 text-sm" />
              <Skeleton className="h-20" />
            </div>
          ))}
        </CardSkeleton>
      </LoadingRegion>
    </>
  );
}
