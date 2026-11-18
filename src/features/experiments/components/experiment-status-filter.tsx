import Link from "next/link";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  EXPERIMENT_STATUS_FILTERS,
  EXPERIMENT_STATUS_FILTER_LABELS,
  type ExperimentStatusFilter as Filter,
} from "../schema";

function href(status: Filter | null): string {
  return status ? `${routes.studio.experiments}?status=${status}` : routes.studio.experiments;
}

/** Filter Semua / Berjalan / Selesai lewat `?status=` (tanpa state client). */
export function ExperimentStatusFilter({ active }: { active: Filter | null }) {
  const options: { value: Filter | null; label: string }[] = [
    { value: null, label: "Semua" },
    ...EXPERIMENT_STATUS_FILTERS.map((s) => ({ value: s, label: EXPERIMENT_STATUS_FILTER_LABELS[s] })),
  ];

  return (
    <nav aria-label="Filter status eksperimen" className="mb-4">
      <ul className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const isActive = o.value === active;
          return (
            <li key={o.label}>
              <Link
                href={href(o.value)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1 text-xs transition-colors",
                  isActive ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted",
                )}
              >
                {o.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
