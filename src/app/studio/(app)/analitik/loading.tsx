import { CardSkeleton, LoadingRegion, PageHeaderSkeleton, SkeletonText } from "@/components/layout/page-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Kerangka Analitik: baris filter, empat kartu KPI, grafik followers, dan dua kartu grup skor (sama
 * dengan `AnalyticsFrame` + isi halaman). Ganti filter tidak memakai kerangka ini (isi lama diredupkan).
 */
export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton title="Analitik" actionClassName="w-36" />
      <LoadingRegion label="analitik" className="grid grid-cols-1 gap-4">
        {/* Filter: platform, rentang, medium. */}
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-10 w-full rounded-button sm:w-52" />
          <Skeleton className="h-10 w-60 max-w-full rounded-button" />
          <Skeleton className="h-10 min-w-0 flex-1 sm:w-40 sm:flex-none" />
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={i} size="sm" aria-hidden="true" className="min-w-0">
              <CardContent className="flex flex-1 flex-col gap-1">
                <SkeletonText className="w-3/4 text-sm" />
                <div className="mt-auto pt-3">
                  <SkeletonText className="w-1/2 font-heading text-h3" />
                </div>
                <SkeletonText className="w-full text-xs" />
              </CardContent>
            </Card>
          ))}
        </div>

        <CardSkeleton titleClassName="w-40" description>
          <Skeleton className="h-55 rounded-card-nested" />
        </CardSkeleton>

        <div className="mt-2">
          <SkeletonText className="w-48 font-heading text-h5" />
          <SkeletonText className="mt-1 w-full max-w-lg text-sm" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
          {["pilar", "format"].map((key) => (
            <CardSkeleton key={key} titleClassName="w-28" description contentClassName="grid gap-3">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-8 rounded-button" />
              ))}
            </CardSkeleton>
          ))}
        </div>
      </LoadingRegion>
    </>
  );
}
