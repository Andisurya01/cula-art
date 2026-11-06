import Link from "next/link";
import type { Platform } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatWib } from "@/lib/date";
import { PLATFORM_LABELS, VIEWS_LABELS } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { SnapshotKindMark } from "@/features/metrics/components/metric-status-badge";
import { formatCount, formatPercent, formatRelative, formatScore } from "@/features/metrics/format";
import type { ScoredPost } from "@/features/metrics/queries";
import { PostsLink, SectionEmpty, SectionHeading } from "./section-parts";

const HEADING = "Top dan bottom menurut skor relatif";

function PostTitle({ post }: { post: ScoredPost }) {
  return (
    <>
      <Link href={routes.studio.post(post.id)} className="font-medium break-words hover:underline">
        {post.title}
      </Link>
      {post.best && <SnapshotKindMark kind={post.best.kind} className="ml-1.5 inline-block align-middle" />}
    </>
  );
}

function MobileRow({ post, viewsLabel }: { post: ScoredPost; viewsLabel: string }) {
  const metrics = [
    { label: viewsLabel, value: formatCount(post.best?.views) },
    { label: "ER", value: formatPercent(post.er) },
    { label: "Skor", value: formatScore(post.score) },
    { label: "Skor relatif", value: formatRelative(post.relativeScore) },
  ];
  return (
    <li className="grid gap-2 rounded-lg border p-3">
      <div className="min-w-0">
        <PostTitle post={post} />
        <p className="mt-0.5 text-xs text-muted-foreground">{formatWib(post.postedAt, "d MMM yyyy")} WIB</p>
      </div>
      <dl className="grid grid-cols-4 gap-2">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0">
            <dt className="text-[11px] text-muted-foreground">{metric.label}</dt>
            <dd className="text-sm break-all tabular-nums">{metric.value}</dd>
          </div>
        ))}
      </dl>
    </li>
  );
}

function DesktopTable({ posts, caption, viewsLabel }: { posts: readonly ScoredPost[]; caption: string; viewsLabel: string }) {
  const numeric = "py-2 pl-3 text-right whitespace-nowrap tabular-nums";
  const numericHead = "py-2 pl-3 text-right font-medium whitespace-nowrap";
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b text-left text-xs text-muted-foreground">
          <th scope="col" className="py-2 pr-3 font-medium">
            Judul
          </th>
          <th scope="col" className="py-2 pl-3 font-medium whitespace-nowrap">
            Tanggal (WIB)
          </th>
          <th scope="col" className={numericHead}>
            {viewsLabel}
          </th>
          <th scope="col" className={numericHead}>
            ER
          </th>
          <th scope="col" className={numericHead}>
            Skor
          </th>
          <th scope="col" className={numericHead}>
            Skor relatif
          </th>
        </tr>
      </thead>
      <tbody>
        {posts.map((post) => (
          <tr key={post.id} className="border-b last:border-0">
            <td className="py-2 pr-3 align-top">
              <PostTitle post={post} />
            </td>
            <td className="py-2 pl-3 align-top whitespace-nowrap text-muted-foreground">
              {formatWib(post.postedAt, "d MMM yyyy")}
            </td>
            <td className={`${numeric} align-top`}>{formatCount(post.best?.views)}</td>
            <td className={`${numeric} align-top`}>{formatPercent(post.er)}</td>
            <td className={`${numeric} align-top`}>{formatScore(post.score)}</td>
            <td className={`${numeric} align-top font-medium`}>{formatRelative(post.relativeScore)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RankingCard({
  title,
  posts,
  platform,
  empty,
}: {
  title: string;
  posts: readonly ScoredPost[];
  platform: Platform;
  empty?: string;
}) {
  const viewsLabel = VIEWS_LABELS[platform];
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {posts.length === 0 ? (
          <SectionEmpty>{empty}</SectionEmpty>
        ) : (
          <>
            <ul className="grid gap-2 md:hidden">
              {posts.map((post) => (
                <MobileRow key={post.id} post={post} viewsLabel={viewsLabel} />
              ))}
            </ul>
            <div className="hidden md:block">
              <DesktopTable
                posts={posts}
                viewsLabel={viewsLabel}
                caption={`${title} ${PLATFORM_LABELS[platform]} menurut skor relatif`}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Top 5 dan bottom 5 platform aktif. Post tanpa skor relatif tidak masuk (D4). */
export function RankingSection({
  platform,
  top,
  bottom,
}: {
  platform: Platform;
  top: readonly ScoredPost[];
  bottom: readonly ScoredPost[];
}) {
  const label = PLATFORM_LABELS[platform];

  if (top.length === 0) {
    return (
      <section className="grid grid-cols-1 gap-3">
        <SectionHeading title={HEADING} />
        <Card>
          <CardContent>
            <SectionEmpty action={<PostsLink />}>
              Belum ada post dengan skor relatif di rentang ini. Skor relatif muncul setelah ada minimal 3 post {label}{" "}
              sebelumnya yang metriknya sudah diisi.
            </SectionEmpty>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="grid grid-cols-1 gap-3">
      <SectionHeading
        title={HEADING}
        description={`Skor relatif membandingkan skor post dengan median sampai 10 post ${label} sebelumnya: 1,50x berarti 50% di atas biasanya.`}
      />
      <div className="grid grid-cols-1 gap-4">
        <RankingCard title="Top 5" posts={top} platform={platform} />
        <RankingCard
          title="Bottom 5"
          posts={bottom}
          platform={platform}
          empty="Belum cukup post. Satu post tidak tampil di dua daftar."
        />
      </div>
    </section>
  );
}
