import { LoadingRegion, PageHeaderSkeleton, SkeletonText } from "@/components/layout/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/** Jumlah kartu tiruan per kolom kanban (berbeda supaya tidak terlihat seperti tabel). */
const COLUMN_CARDS = [3, 2, 2, 1, 2];

function ContentCardSkeleton() {
  return (
    <div className="grid gap-1.5 rounded-card-nested bg-card py-3.5 pr-3.5 pl-5 ring-1 ring-border/70">
      <SkeletonText className="w-4/5 text-sm" />
      <SkeletonText className="w-1/2 text-xs" />
    </div>
  );
}

/**
 * Kerangka Pipeline: kanban 5 kolom mulai `md` (kolom kartu putih berisi kartu konten abu, sama dengan
 * `KanbanBoard`; kolom yang tidak muat terpotong seperti papan aslinya yang bisa digeser), tab stage +
 * daftar kartu di HP (`MobileBoard`). Detail konten punya kerangka sendiri (`[id]/loading.tsx`).
 */
export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton title="Pipeline" actionClassName="w-36" />
      <LoadingRegion label="pipeline">
        <div className="-mx-1 -mt-1 hidden overflow-hidden px-1 pt-1 pb-3 md:block">
          <div className="grid grid-cols-[repeat(5,minmax(15rem,1fr))] gap-4">
            {COLUMN_CARDS.map((count, column) => (
              <div
                key={column}
                className="flex min-h-64 flex-col rounded-card bg-card p-2.5 ring-1 ring-border/70"
              >
                <div className="flex items-center justify-between gap-2 px-2 pt-1.5 pb-3">
                  <SkeletonText className="w-24 text-h6" />
                  <Skeleton className="size-6 rounded-full" />
                </div>
                <div className="flex flex-col gap-2">
                  {Array.from({ length: count }, (_, i) => (
                    <Skeleton key={i} className="h-20 rounded-card-nested" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:hidden">
          <Skeleton className="h-10 w-full rounded-button" />
          {Array.from({ length: 4 }, (_, i) => (
            <ContentCardSkeleton key={i} />
          ))}
        </div>
      </LoadingRegion>
    </>
  );
}
