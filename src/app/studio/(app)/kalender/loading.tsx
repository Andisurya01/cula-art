import { LoadingRegion, PageHeaderSkeleton, SkeletonText } from "@/components/layout/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

const DAYS = 7;

/**
 * Kerangka Kalender (tampilan Minggu, bawaan menu): toolbar, keterangan, kartu kalender berisi sel hari
 * (daftar hari sampai `lg`, 7 kolom mulai `lg`), dan panel konten siap jadwal (di atas kalender pada
 * `md`-`xl`, di kanan mulai `xl`, sama dengan `CalendarBoard`). Pindah minggu/bulan memakai URL di
 * route yang sama, jadi tidak memakai kerangka ini.
 */
export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton title="Kalender" />
      <LoadingRegion label="kalender">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Skeleton className="size-9 rounded-button" />
            <Skeleton className="h-9 w-24 rounded-button" />
            <Skeleton className="size-9 rounded-button" />
            <SkeletonText className="ml-2 w-36 text-h5" />
          </div>
          <Skeleton className="h-10 w-44 rounded-button" />
        </div>
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
          {["kosong", "dekat", "lewat"].map((key) => (
            <SkeletonText key={key} className="w-24 text-xs" />
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="order-1 min-w-0 rounded-card bg-card p-2 ring-1 ring-border/70 sm:p-4 md:order-2 xl:order-1">
            <div className="grid gap-2 lg:hidden">
              {Array.from({ length: DAYS }, (_, i) => (
                <div key={i} className="grid gap-2 rounded-card-nested bg-background p-3">
                  <SkeletonText className="w-32 text-sm" />
                  <Skeleton className="h-9 rounded-card-nested" />
                </div>
              ))}
            </div>
            <div className="hidden grid-cols-7 gap-1.5 lg:grid">
              {Array.from({ length: DAYS }, (_, i) => (
                <div key={i} className="flex min-h-48 min-w-0 flex-col gap-2 rounded-card-nested bg-background p-1.5">
                  <SkeletonText className="mx-auto mt-1 w-12 text-xs" />
                  <Skeleton className="h-12 rounded-card-nested" />
                </div>
              ))}
            </div>
          </div>

          <div className="order-2 md:order-1 xl:order-2 xl:self-start">
            <div className="rounded-card bg-card p-4 ring-1 ring-border/70">
              <div className="mb-3 flex items-center justify-between gap-2">
                <SkeletonText className="w-28 text-h6" />
                <Skeleton className="h-6 w-8 rounded-full" />
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                <Skeleton className="h-16 rounded-card-nested" />
                <Skeleton className="h-16 rounded-card-nested" />
              </div>
            </div>
          </div>
        </div>
      </LoadingRegion>
    </>
  );
}
