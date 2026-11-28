import { LoadingRegion, PageHeaderSkeleton, SkeletonText } from "@/components/layout/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

const ROWS = 6;

/**
 * Kerangka Postingan: filter, lalu daftar post (kartu sampai `lg`, tabel mulai `lg`, sama dengan
 * `PostTable`). Detail post punya kerangka sendiri (`[id]/loading.tsx`).
 */
export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton title="Postingan" actionClassName="w-44" />
      <LoadingRegion label="postingan" className="grid gap-4">
        {/* Filter: platform, pilar, status, rentang tanggal. */}
        <div className="grid grid-cols-2 items-end gap-2 sm:flex sm:flex-wrap">
          <Skeleton className="h-10 sm:w-40" />
          <Skeleton className="h-10 sm:w-44" />
          <Skeleton className="col-span-2 h-10 sm:w-40" />
          {["dari", "sampai"].map((key) => (
            <div key={key} className="grid gap-1">
              <SkeletonText className="w-16 text-xs" />
              <Skeleton className="h-10 sm:w-38" />
            </div>
          ))}
        </div>

        {/* HP/tablet: kartu per post. */}
        <div className="grid gap-3 lg:hidden">
          {Array.from({ length: ROWS }, (_, i) => (
            <div key={i} className="grid grid-cols-3 gap-3 rounded-card-nested bg-card p-4 ring-1 ring-border/70">
              <div className="col-span-3">
                <SkeletonText className="w-3/4 text-sm" />
                <SkeletonText className="mt-1 w-1/2 text-xs" />
              </div>
              <Skeleton className="col-span-2 h-6 w-24 self-center rounded-badge" />
              <Skeleton className="h-10 w-20 justify-self-end rounded-button" />
              {["views", "er", "skor"].map((key) => (
                <div key={key}>
                  <SkeletonText className="w-12 text-xs" />
                  <SkeletonText className="w-16 text-sm" />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Desktop: tabel dalam kartu. */}
        <div className="hidden rounded-card bg-card ring-1 ring-border/70 lg:block">
          <div className="flex gap-6 border-b px-5 py-3.5">
            <SkeletonText className="w-12 text-xs" />
            <SkeletonText className="ml-auto w-16 text-xs" />
            <SkeletonText className="w-10 text-xs" />
            <SkeletonText className="w-20 text-xs" />
            <div className="w-20" />
          </div>
          <div className="divide-y">
            {Array.from({ length: ROWS }, (_, i) => (
              <div key={i} className="flex items-start gap-6 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <SkeletonText className="w-2/3 text-sm" />
                  <SkeletonText className="mt-1 w-1/3 text-xs" />
                </div>
                <Skeleton className="mt-0.5 h-6 w-24 rounded-badge" />
                <SkeletonText className="w-16 text-sm" />
                <SkeletonText className="w-10 text-sm" />
                <SkeletonText className="w-20 text-sm" />
                <Skeleton className="h-8 w-20 rounded-button" />
              </div>
            ))}
          </div>
        </div>
      </LoadingRegion>
    </>
  );
}
