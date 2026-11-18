import type { GroupStat } from "../prompts/analysis-common";
import type { PostWhyContext } from "../prompts/post-why";
import type { ReviewDraftContext, ReviewPlatformContext } from "../prompts/review-draft";

// Kasus set uji AI analisis (10 per fitur). Angka contoh tetap, bervariasi: minggu bagus, minggu sepi,
// grup "data belum cukup", followers belum bisa dihitung, snapshot H+1, Instagram (reach), views 0.

type Case<C> = { id: string; title: string; context: C };

const g = (dimension: string, label: string, postCount: number, median: number | null): GroupStat => ({
  dimension,
  label,
  postCount,
  median: postCount >= 3 ? median : null,
  enoughData: postCount >= 3,
});

const why = (overrides: Partial<PostWhyContext> & Pick<PostWhyContext, "title" | "relativeScore">): PostWhyContext => ({
  platform: "TikTok",
  viewsLabel: "Views",
  postedAt: "Sabtu, 7 Nov 2026 19.10 WIB",
  pillar: "Proses Clay",
  format: "Time-lapse",
  hookType: "Hasil di depan",
  hookText: null,
  durationSec: 32,
  snapshot: "H+7",
  metrics: { views: 12300, likes: 980, comments: 41, shares: 120, saves: 146, follows: 22 },
  er: 10.5,
  saveRate: 1.2,
  shareRate: 1.0,
  followRate: 1.8,
  score: 118.4,
  baselineMedian: 81.7,
  baselineCount: 10,
  comparisons: [
    g("Pilar", "Proses Clay", 8, 1.21),
    g("Format", "Time-lapse", 6, 1.12),
    g("Tipe hook", "Hasil di depan", 5, 1.3),
    g("Hari", "Sabtu", 7, 1.15),
    g("Jam", "19.00", 9, 1.05),
    g("Durasi", "30-59 dtk", 4, 1.08),
  ],
  comparablePostCount: 24,
  ...overrides,
});

export const POST_WHY_CASES: Case<PostWhyContext>[] = [
  { id: "w01", title: "Jauh di atas biasanya", context: why({ title: "Time-lapse kepala naga", relativeScore: 1.45 }) },
  {
    id: "w02",
    title: "Di bawah biasanya, hook lemah",
    context: why({
      title: "Meja kerja kecil di kamar",
      relativeScore: 0.62,
      pillar: "Behind the Scenes",
      format: "Voice-over cerita",
      hookType: "Pertanyaan",
      score: 50.6,
      saveRate: 0.3,
      shareRate: 0.2,
      comparisons: [
        g("Pilar", "Behind the Scenes", 5, 0.8),
        g("Format", "Voice-over cerita", 3, 0.9),
        g("Tipe hook", "Pertanyaan", 4, 0.75),
        g("Hari", "Selasa", 6, 0.98),
        g("Jam", "19.00", 9, 1.05),
      ],
    }),
  },
  {
    id: "w03",
    title: "Grup kecil (data belum cukup)",
    context: why({
      title: "Tutorial tekstur sisik",
      relativeScore: 1.3,
      pillar: "Tips dan Tutorial",
      format: "Tutorial singkat",
      comparisons: [
        g("Pilar", "Tips dan Tutorial", 2, null),
        g("Format", "Tutorial singkat", 1, null),
        g("Tipe hook", "Hasil di depan", 5, 1.3),
        g("Hari", "Kamis", 2, null),
        g("Jam", "20.00", 0, null),
      ],
    }),
  },
  { id: "w04", title: "Snapshot H+1", context: why({ title: "Reveal 360 derajat", relativeScore: 1.9, snapshot: "H+1" }) },
  {
    id: "w05",
    title: "Instagram reach",
    context: why({
      title: "Carousel 5 sketsa tangan",
      relativeScore: 1.15,
      platform: "Instagram",
      viewsLabel: "Reach",
      format: "Carousel foto (IG)",
      durationSec: null,
      metrics: { views: 3400, likes: 410, comments: 12, shares: 30, saves: 95, follows: 6 },
      er: 16.1,
      saveRate: 2.8,
      comparisons: [g("Pilar", "Showcase", 4, 1.1), g("Format", "Carousel foto (IG)", 3, 1.25), g("Hari", "Kamis", 5, 1.0), g("Jam", "19.00", 8, 1.02)],
    }),
  },
  { id: "w06", title: "Sekitar biasanya", context: why({ title: "Gambar tangan hari ke-30", relativeScore: 1.02, pillar: "Progres Gambar" }) },
  {
    id: "w07",
    title: "Tanpa format dan hook",
    context: why({
      title: "Clay retak setelah dipanggang",
      relativeScore: 0.85,
      format: null,
      hookType: null,
      comparisons: [g("Pilar", "Proses Clay", 8, 1.21), g("Hari", "Minggu", 3, 0.9), g("Jam", "21.00", 1, null)],
    }),
  },
  {
    id: "w08",
    title: "Views 0",
    context: why({
      title: "Story uji coba",
      relativeScore: 0,
      metrics: { views: 0, likes: 0, comments: 0, shares: 0, saves: 0, follows: 0 },
      er: 0,
      saveRate: 0,
      shareRate: 0,
      followRate: 0,
      score: 0,
    }),
  },
  {
    id: "w09",
    title: "Teks hook ada",
    context: why({ title: "Sisik naga pakai tutup pulpen", relativeScore: 1.6, hookText: "Sisik naga ini dibuat pakai tutup pulpen." }),
  },
  {
    id: "w10",
    title: "Pembanding baru 3 post",
    context: why({
      title: "Hari ke-1 gambar tangan",
      relativeScore: 1.25,
      baselineCount: 3,
      comparablePostCount: 3,
      comparisons: [g("Pilar", "Progres Gambar", 3, 1.0), g("Hari", "Selasa", 1, null), g("Jam", "19.00", 2, null)],
    }),
  },
];

const platform = (overrides: Partial<ReviewPlatformContext> & Pick<ReviewPlatformContext, "platform">): ReviewPlatformContext => ({
  viewsLabel: overrides.platform === "Instagram" ? "Reach" : "Views",
  postCount: 2,
  followersGained: 85,
  followersEnd: 1420,
  best: { title: "Time-lapse kepala naga", relativeScore: 1.45 },
  worst: { title: "Meja kerja kecil", relativeScore: 0.7 },
  posts: [
    { title: "Time-lapse kepala naga", relativeScore: 1.45, pillar: "Proses Clay", format: "Time-lapse", hookType: "Hasil di depan", postedAt: "Selasa 19.05" },
    { title: "Meja kerja kecil", relativeScore: 0.7, pillar: "Behind the Scenes", format: "Voice-over cerita", hookType: "Pertanyaan", postedAt: "Sabtu 19.00" },
  ],
  groups: [
    g("Pilar", "Proses Clay", 8, 1.21),
    g("Pilar", "Behind the Scenes", 4, 0.82),
    g("Pilar", "Tips dan Tutorial", 2, null),
    g("Format", "Time-lapse", 6, 1.12),
    g("Tipe hook", "Hasil di depan", 5, 1.3),
    g("Jam", "19.00", 12, 1.02),
  ],
  scoredTotal: 22,
  ...overrides,
});

const review = (overrides: Partial<ReviewDraftContext> = {}): ReviewDraftContext => ({
  weekLabel: "2-8 November 2026",
  target: 3,
  postedCount: 2,
  platforms: [platform({ platform: "TikTok" }), platform({ platform: "Instagram", followersGained: 12, followersEnd: 640 })],
  suggestions: ["Pilar terbaik di TikTok: Proses Clay: median skor relatif 1,21x dari 8 post. Jadwalkan 1 lagi."],
  current: { wins: null, repeat: null, stop: null, focusNext: null },
  ...overrides,
});

const empty = (name: "TikTok" | "Instagram") =>
  platform({
    platform: name,
    postCount: 0,
    followersGained: null,
    followersEnd: null,
    best: null,
    worst: null,
    posts: [],
    groups: [],
    scoredTotal: 0,
  });

export const REVIEW_DRAFT_CASES: Case<ReviewDraftContext>[] = [
  { id: "r01", title: "Minggu normal", context: review() },
  { id: "r02", title: "Target tercapai", context: review({ postedCount: 3, weekLabel: "26 Oktober-1 November 2026" }) },
  {
    id: "r03",
    title: "Tanpa post",
    context: review({
      postedCount: 0,
      platforms: [empty("TikTok"), empty("Instagram")],
      suggestions: ["Ritme terancam: Masih kurang 3 post minggu ini (0 dari 3 tayang atau terjadwal)."],
    }),
  },
  {
    id: "r04",
    title: "Akun baru, semua grup kecil",
    context: review({
      platforms: [
        platform({
          platform: "TikTok",
          groups: [g("Pilar", "Proses Clay", 2, null), g("Jam", "19.00", 2, null)],
          scoredTotal: 2,
          best: { title: "Part 1 armature", relativeScore: 1.1 },
          worst: null,
        }),
        empty("Instagram"),
      ],
      suggestions: [],
    }),
  },
  {
    id: "r05",
    title: "Followers belum bisa dihitung",
    context: review({
      platforms: [platform({ platform: "TikTok", followersGained: null }), platform({ platform: "Instagram", followersGained: null, followersEnd: null })],
    }),
  },
  {
    id: "r06",
    title: "Form sudah diisi",
    context: review({ current: { wins: "Time-lapse naga ramai komentar.", repeat: null, stop: "Posting jam 22.00.", focusNext: null } }),
  },
  { id: "r07", title: "Hanya Instagram", context: review({ platforms: [empty("TikTok"), platform({ platform: "Instagram" })] }) },
  {
    id: "r08",
    title: "Banyak saran aktif",
    context: review({
      suggestions: [
        "Metrik tertunda di TikTok: Isi metrik H+7 untuk 2 post.",
        "Pipeline macet: Reveal patung naga tertahan di Editing 9 hari.",
        "Crosspost tertinggal: Time-lapse kepala naga 1,45x di TikTok, belum tayang atau terjadwal di Instagram.",
        "Ide menipis: Bank ide tinggal 3 ide Baru.",
      ],
    }),
  },
  {
    id: "r09",
    title: "Followers turun",
    context: review({ platforms: [platform({ platform: "TikTok", followersGained: -14 }), platform({ platform: "Instagram", followersGained: 0 })] }),
  },
  {
    id: "r10",
    title: "Minggu lemah",
    context: review({
      postedCount: 1,
      platforms: [
        platform({
          platform: "TikTok",
          postCount: 1,
          best: { title: "Clay retak", relativeScore: 0.55 },
          worst: null,
          posts: [{ title: "Clay retak", relativeScore: 0.55, pillar: "Behind the Scenes", format: null, hookType: null, postedAt: "Kamis 21.30" }],
        }),
        empty("Instagram"),
      ],
    }),
  },
];
