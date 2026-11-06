import type { Platform } from "@prisma/client";
import { SERIES_COLORS } from "@/components/charts/chart-theme";
import { GroupBarChart } from "@/components/charts/group-bar-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { GroupedScores } from "@/lib/analytics/grouping";
import { PLATFORM_LABELS } from "@/lib/labels";
import { PostsLink, SectionEmpty, SectionHeading } from "./section-parts";

const DIMENSIONS: {
  key: keyof GroupedScores;
  title: string;
  description?: string;
  empty?: string;
}[] = [
  { key: "pillar", title: "Pilar" },
  {
    key: "format",
    title: "Format",
    empty: "Post bermetrik di rentang ini belum punya format. Isi format di detail konten.",
  },
  {
    key: "hookType",
    title: "Tipe hook",
    empty: "Post bermetrik di rentang ini belum punya tipe hook. Isi tipe hook di detail konten.",
  },
  { key: "day", title: "Hari posting", description: "Hari dihitung dalam WIB." },
  { key: "hour", title: "Jam posting", description: "Jam dihitung dalam WIB." },
];

const HEADING = "Median skor per grup";
const NO_SCORED_POSTS = "Belum ada post bermetrik di rentang ini.";

/** Satu kartu per dimensi, warna platform aktif. Grup < 3 post redup lewat `GroupBarChart`. */
export function ScoreGroups({
  platform,
  groups,
  scoredCount,
}: {
  platform: Platform;
  groups: GroupedScores;
  scoredCount: number;
}) {
  const label = PLATFORM_LABELS[platform];

  if (scoredCount === 0) {
    return (
      <section className="grid grid-cols-1 gap-3">
        <SectionHeading title={HEADING} />
        <Card>
          <CardContent>
            <SectionEmpty action={<PostsLink />}>
              Grafik ini butuh metrik. Isi H+1 atau H+7 untuk post {label} di rentang ini lewat menu Postingan.
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
        description={`Hanya post ${label} yang sudah punya metrik. Grup kurang dari 3 post redup dan belum bisa disimpulkan.`}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        {DIMENSIONS.map(({ key, title, description, empty }) => {
          const rows = groups[key];
          return (
            <Card key={key} className="min-w-0">
              <CardHeader>
                <CardTitle>{title}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
              </CardHeader>
              <CardContent>
                {rows.length === 0 ? (
                  <SectionEmpty>{empty ?? NO_SCORED_POSTS}</SectionEmpty>
                ) : (
                  <GroupBarChart
                    rows={rows.map((row) => ({
                      key: row.key,
                      label: row.label,
                      value: row.medianScore,
                      postCount: row.postCount,
                      enoughData: row.enoughData,
                    }))}
                    color={SERIES_COLORS[platform]}
                    ariaLabel={`Median skor ${label} per ${title.toLowerCase()}`}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
