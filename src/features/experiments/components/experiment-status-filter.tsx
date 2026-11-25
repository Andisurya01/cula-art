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
      <ul className="flex flex-wrap gap-2">
        {options.map((o) => {
          const isActive = o.value === active;
          return (
            <li key={o.label}>
              <Link
                href={href(o.value)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center rounded-button px-3.5 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-hidden",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:text-foreground",
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
