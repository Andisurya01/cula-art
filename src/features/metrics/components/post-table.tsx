import Link from "next/link";
import { PillarBadge } from "@/components/pillar-badge";
import { PlatformBadge } from "@/features/contents/components/platform-badge";
import { isMetricDue, nextMetricKind } from "@/lib/analytics/snapshots";
import { formatWib } from "@/lib/date";
import { VIEWS_LABELS } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { formatCount, formatPercent, formatRelative } from "../format";
import type { ScoredPost } from "../queries";
import { METRIC_KIND_LABELS } from "../schema";
import { MetricFormButton } from "./metric-form-dialog";
import { MetricStatusBadge, SnapshotKindMark } from "./metric-status-badge";

const CELL = "min-w-0 lg:px-3 lg:py-2.5 lg:align-top";
const HEAD = "px-3 py-2 font-medium";

/**
 * Daftar post: kartu sampai `lg`, tabel mulai `lg` (sidebar Studio memakan lebar di `md`).
 * Satu DOM untuk keduanya, supaya tombol dan dialog metrik tidak dirender dua kali.
 * Angka per baris dan per platform; tidak ada total lintas platform.
 */
export function PostTable({ posts }: { posts: readonly ScoredPost[] }) {
  return (
    <div className="grid gap-3">
      <div className="lg:overflow-x-auto lg:rounded-xl lg:bg-card lg:ring-1 lg:ring-foreground/10">
        <table className="block w-full text-sm lg:table">
          <thead className="hidden text-left text-xs text-muted-foreground lg:table-header-group">
            <tr className="border-b">
              <th scope="col" className={HEAD}>Post</th>
              <th scope="col" className={HEAD}>Status</th>
              <th scope="col" className={`${HEAD} text-right`}>Views / Reach</th>
              <th scope="col" className={`${HEAD} text-right`}>ER</th>
              <th scope="col" className={`${HEAD} text-right`}>Skor relatif</th>
              <th scope="col" className={HEAD}>
                <span className="sr-only">Aksi</span>
              </th>
            </tr>
          </thead>
          <tbody className="grid gap-3 lg:table-row-group lg:divide-y">
            {posts.map((post) => (
              <PostRow key={post.id} post={post} />
            ))}
          </tbody>
        </table>
      </div>

      {posts.some((post) => post.best?.kind === "H1") && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <SnapshotKindMark kind="H1" />
          Angka di baris itu masih dari snapshot H+1, karena H+7 belum diisi.
        </p>
      )}
    </div>
  );
}

function PostRow({ post }: { post: ScoredPost }) {
  const kind = nextMetricKind(post.status);
  const actionLabel = post.status === "COMPLETE" ? "Ubah" : `Isi ${METRIC_KIND_LABELS[kind]}`;

  return (
    <tr className="grid grid-cols-3 gap-x-3 gap-y-2.5 rounded-xl bg-card p-3 ring-1 ring-foreground/10 lg:table-row lg:rounded-none lg:bg-transparent lg:p-0 lg:ring-0">
      <td className={`${CELL} order-1 col-span-3`}>
        <Link
          href={routes.studio.post(post.id)}
          className="font-medium [overflow-wrap:anywhere] hover:underline"
        >
          {post.title}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <PlatformBadge platform={post.platform} />
          <PillarBadge name={post.pillar.name} color={post.pillar.color} className="max-w-full min-w-0" />
          <span>{formatWib(post.postedAt, "d MMM yyyy, HH.mm")} WIB</span>
        </div>
      </td>

      <td className={`${CELL} order-2 col-span-2 self-center`}>
        <MetricStatusBadge status={post.status} />
      </td>

      <NumberCell label={VIEWS_LABELS[post.platform]} alwaysLabel>
        <span className="inline-flex items-center gap-1">
          {formatCount(post.best?.views)}
          {post.best && <SnapshotKindMark kind={post.best.kind} />}
        </span>
      </NumberCell>
      <NumberCell label="ER">{formatPercent(post.er)}</NumberCell>
      <NumberCell label="Skor relatif">{formatRelative(post.relativeScore)}</NumberCell>

      <td className={`${CELL} order-3 justify-self-end lg:text-right`}>
        <MetricFormButton
          post={{ id: post.id, title: post.title, platform: post.platform }}
          kind={kind}
          snapshots={post.snapshots}
          variant={isMetricDue(post.status) ? "default" : "outline"}
          className="h-8 whitespace-nowrap lg:h-7"
          aria-label={`${actionLabel} untuk ${post.title}`}
        >
          {actionLabel}
        </MetricFormButton>
      </td>
    </tr>
  );
}

/** Di kartu label selalu tampil. Di tabel cukup judul kolom, kecuali Views/Reach yang beda per platform. */
function NumberCell({
  label,
  alwaysLabel = false,
  children,
}: {
  label: string;
  alwaysLabel?: boolean;
  children: React.ReactNode;
}) {
  return (
    <td className={`${CELL} order-4 lg:text-right lg:whitespace-nowrap`}>
      <span className={`block text-xs text-muted-foreground ${alwaysLabel ? "" : "lg:hidden"}`}>{label}</span>
      <span className="tabular-nums">{children}</span>
    </td>
  );
}
