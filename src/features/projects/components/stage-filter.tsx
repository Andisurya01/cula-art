import Link from "next/link";
import type { ProjectStage } from "@prisma/client";
import { PROJECT_STAGES, PROJECT_STAGE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";

/** Filter tahap lewat query `?tahap=` (tanpa state client). */
export function StageFilter({ active }: { active?: ProjectStage }) {
  const options: { value?: ProjectStage; label: string }[] = [
    { label: "Semua" },
    ...PROJECT_STAGES.map((s) => ({ value: s, label: PROJECT_STAGE_LABELS[s] })),
  ];

  return (
    <nav aria-label="Filter tahap" className="-mx-4 mb-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex w-max gap-1.5">
        {options.map((o) => {
          const isActive = o.value === active;
          return (
            <li key={o.label}>
              <Link
                href={o.value ? `${routes.studio.projects}?tahap=${o.value}` : routes.studio.projects}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1 text-xs transition-colors",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted",
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
