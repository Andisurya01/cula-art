import { CardSkeleton, LoadingRegion, SkeletonText } from "@/components/layout/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Kerangka detail post: tautan kembali, judul + badge, dua kartu snapshot (H+1, H+7), dan kartu hitungan
 * (kartu eksperimen bersyarat, tidak ditiru). Sendiri, supaya detail tidak memakai kerangka daftar
 * Postingan (`postingan/loading.tsx` berlaku juga untuk route turunan tanpa kerangka sendiri).
 */
export default function Loading() {
  return (
    <LoadingRegion label="detail post" className="grid gap-4">
      <SkeletonText className="w-24 text-sm" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <SkeletonText className="w-full max-w-md font-heading text-h3" />
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <Skeleton className="h-5 w-20 rounded-badge" />
            <Skeleton className="h-5 w-24 rounded-badge" />
            <Skeleton className="h-6 w-20 rounded-badge" />
            <SkeletonText className="w-40 text-xs" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-32 rounded-button" />
          <Skeleton className="h-8 w-28 rounded-button" />
        </div>
      </div>

      <div className="grid items-start gap-4 md:grid-cols-2">
        {["h1", "h7"].map((key) => (
          <CardSkeleton key={key} titleClassName="w-28" description contentClassName="grid gap-3">
            <div className="grid gap-1.5">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex justify-between gap-3">
                  <SkeletonText className="w-20 text-sm" />
                  <SkeletonText className="w-12 text-sm" />
                </div>
              ))}
            </div>
            <Skeleton className="h-8 w-24 rounded-button" />
          </CardSkeleton>
        ))}
      </div>

      <CardSkeleton titleClassName="w-40" contentClassName="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-18 rounded-card-nested" />
        ))}
      </CardSkeleton>
    </LoadingRegion>
  );
}
