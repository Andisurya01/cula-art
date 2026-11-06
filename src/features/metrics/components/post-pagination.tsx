import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { postFiltersToQuery, type PostFilters } from "../post-filters";

/** Tautan halaman sebelumnya/berikutnya; filter ikut di URL. Satu halaman saja: tidak tampil. */
export function PostPagination({
  filters,
  page,
  pageCount,
}: {
  filters: PostFilters;
  page: number;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;

  function href(target: number) {
    const query = postFiltersToQuery(filters, target);
    return query ? `${routes.studio.posts}?${query}` : routes.studio.posts;
  }

  const previous = (
    <>
      <ChevronLeft />
      Sebelumnya
    </>
  );
  const next = (
    <>
      Berikutnya
      <ChevronRight />
    </>
  );

  return (
    <nav aria-label="Halaman daftar post" className="flex items-center justify-between gap-2">
      {page > 1 ? (
        <Button asChild variant="outline" size="sm">
          <Link href={href(page - 1)} rel="prev">
            {previous}
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          {previous}
        </Button>
      )}
      <span className="text-xs text-muted-foreground">
        Halaman {page} dari {pageCount}
      </span>
      {page < pageCount ? (
        <Button asChild variant="outline" size="sm">
          <Link href={href(page + 1)} rel="next">
            {next}
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          {next}
        </Button>
      )}
    </nav>
  );
}
