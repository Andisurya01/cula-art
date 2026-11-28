import { CardSkeleton, LoadingRegion, SkeletonText } from "@/components/layout/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Kerangka detail konten: tautan kembali, judul + pilar, kontrol stage, lalu form detail dan versi
 * platform di kiri dengan checklist di kanan (mulai `md`). Sendiri, supaya detail tidak memakai
 * kerangka kanban (`pipeline/loading.tsx` berlaku juga untuk route turunan tanpa kerangka sendiri).
 */
export default function Loading() {
  return (
    <LoadingRegion label="detail konten" className="grid gap-4">
      <Skeleton className="h-8 w-24 rounded-button" />

      <div className="grid gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <SkeletonText className="w-full max-w-md font-heading text-h3" />
            <Skeleton className="mt-1.5 h-5 w-28 rounded-badge" />
          </div>
          <Skeleton className="h-8 w-20 rounded-button" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-10 w-40 rounded-button" />
          <SkeletonText className="w-28 text-xs" />
        </div>
      </div>

      <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_20rem]">
        <CardSkeleton titleClassName="w-32" className="md:col-start-1" contentClassName="grid gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="grid gap-2">
              <SkeletonText className="w-24 text-sm" />
              <Skeleton className={i === 3 ? "h-24" : "h-10"} />
            </div>
          ))}
        </CardSkeleton>
        <CardSkeleton
          titleClassName="w-24"
          className="md:col-start-2 md:row-span-2 md:row-start-1"
          contentClassName="grid gap-3"
        >
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-4 shrink-0 rounded-sm" />
              <SkeletonText className="w-3/4 text-sm" />
            </div>
          ))}
        </CardSkeleton>
        <CardSkeleton titleClassName="w-36" description className="md:col-start-1">
          <Skeleton className="h-10 w-40 rounded-button" />
        </CardSkeleton>
      </div>
    </LoadingRegion>
  );
}
