import type { AiContext } from "../prompts";
import type { ContentContext } from "../prompts/content-common";

// Kasus set uji per fitur (10 per fitur). "Karya dari foto" memakai karya berfoto di database (runner.ts),
// karena butuh foto asli. Kasus sengaja bervariasi: data lengkap, data minim, dan data yang kurang (AI harus
// menyebutnya di notes, bukan mengarang).

export type EvalCase<C> = { id: string; title: string; context: C };

type TextFeature = "idea-expand" | "project-ideas" | "hook" | "script" | "caption";

const content = (overrides: Partial<ContentContext> & { title: string }): ContentContext => ({
  pillar: null,
  format: null,
  hookType: null,
  hookText: null,
  script: null,
  shotList: null,
  targetDurationSec: null,
  project: null,
  seriesPart: null,
  ideaNotes: null,
  ...overrides,
});

const NAGA = { title: "Patung kepala naga", medium: "Clay", stage: "Sedang dikerjakan" };
const TANGAN = { title: "30 hari gambar tangan", medium: "Gambar", stage: "Sedang dikerjakan" };

const CONTENT_CASES: EvalCase<ContentContext>[] = [
  {
    id: "c01",
    title: "Hari ke-N lengkap",
    context: content({
      title: "Time-lapse gambar tangan hari ke-30",
      pillar: "Progres Gambar",
      format: "Time-lapse",
      hookType: "Hari ke-N",
      project: TANGAN,
      seriesPart: 30,
    }),
  },
  {
    id: "c02",
    title: "Kesalahan armature",
    context: content({
      title: "Armature naga ambruk di tengah jalan",
      pillar: "Behind the Scenes",
      format: "Voice-over cerita",
      hookType: "Kesalahan atau gagal",
      project: NAGA,
      seriesPart: 2,
    }),
  },
  {
    id: "c03",
    title: "Reveal hasil di depan",
    context: content({ title: "Reveal 360 derajat kepala naga", pillar: "Showcase", format: "Reveal", hookType: "Hasil di depan", project: NAGA, seriesPart: 4 }),
  },
  {
    id: "c04",
    title: "Tutorial pertanyaan",
    context: content({
      title: "3 kesalahan pemula saat pakai clay polimer",
      pillar: "Tips dan Tutorial",
      format: "Tutorial singkat",
      hookType: "Pertanyaan",
      ideaNotes: "Clay retak karena terlalu tipis, sidik jari, suhu oven terlalu tinggi.",
    }),
  },
  {
    id: "c05",
    title: "Tanpa tipe hook dan format",
    context: content({ title: "Meja kerja kecil di kamar", pillar: "Behind the Scenes" }),
  },
  {
    id: "c06",
    title: "Before/after transformasi",
    context: content({
      title: "Gambar tangan bulan 1 vs bulan 3",
      pillar: "Progres Gambar",
      format: "Before/After",
      hookType: "Transformasi",
      targetDurationSec: 20,
    }),
  },
  {
    id: "c07",
    title: "Tantangan",
    context: content({ title: "Gambar tangan dalam 60 detik", pillar: "Progres Gambar", format: "Time-lapse", hookType: "Tantangan" }),
  },
  {
    id: "c08",
    title: "Hook dan script sudah ada",
    context: content({
      title: "Tekstur sisik naga pakai tutup pulpen",
      pillar: "Tips dan Tutorial",
      format: "Tutorial singkat",
      hookType: "Hasil di depan",
      hookText: "Sisik naga ini dibuat pakai tutup pulpen.",
      script: "0-3 dtk: close-up sisik. 3-15 dtk: tekan tutup pulpen ke clay berulang. 15-20 dtk: hasil.",
      project: NAGA,
    }),
  },
  {
    id: "c09",
    title: "Carousel IG",
    context: content({ title: "5 sketsa tangan favorit bulan ini", pillar: "Showcase", format: "Carousel foto (IG)", hookType: "Pertanyaan" }),
  },
  {
    id: "c10",
    title: "Data minim",
    context: content({ title: "Clay retak setelah dipanggang" }),
  },
];

export const EVAL_CASES: { [F in TextFeature]: EvalCase<AiContext<F>>[] } = {
  "idea-expand": [
    { id: "i01", title: "Ide gambar lengkap", context: { title: "Gambar tangan dari 5 sudut", notes: null, medium: "Gambar", pillar: "Progres Gambar" } },
    { id: "i02", title: "Tips clay", context: { title: "Kesalahan saat membuat armature", notes: null, medium: "Clay", pillar: "Tips dan Tutorial" } },
    { id: "i03", title: "BTS dengan catatan", context: { title: "Meja kerja kecil di kamar", notes: "Banyak yang tanya setup meja.", medium: null, pillar: "Behind the Scenes" } },
    { id: "i04", title: "Showcase", context: { title: "Reveal patung kepala naga", notes: null, medium: "Clay", pillar: "Showcase" } },
    { id: "i05", title: "Tanpa pilar", context: { title: "Latihan gesture 30 detik", notes: "Pakai referensi foto gratis.", medium: "Gambar", pillar: null } },
    { id: "i06", title: "Kegagalan", context: { title: "Clay retak setelah dipanggang", notes: "Kejadian minggu lalu.", medium: "Clay", pillar: "Behind the Scenes" } },
    { id: "i07", title: "Before/after", context: { title: "Gambar tangan bulan 1 vs bulan 3", notes: null, medium: "Gambar", pillar: "Progres Gambar" } },
    { id: "i08", title: "Tutorial tekstur", context: { title: "Cara bikin tekstur sisik", notes: null, medium: "Clay", pillar: "Tips dan Tutorial" } },
    { id: "i09", title: "Campuran", context: { title: "Gambar karakter dari patung sendiri", notes: "Gabungan gambar dan clay.", medium: "Campuran", pillar: null } },
    { id: "i10", title: "Judul saja", context: { title: "Alat yang tidak perlu dibeli pemula", notes: null, medium: null, pillar: null } },
  ],
  "project-ideas": [
    {
      id: "p01",
      title: "Naga, part 1 sudah",
      context: {
        ...NAGA,
        startDate: "2026-10-04",
        notes: "Armature selesai, mulai bulk bentuk kepala.",
        photoLog: [
          { date: "2026-10-11", caption: "Bulk rahang" },
          { date: "2026-10-05", caption: "Armature kawat" },
        ],
        contents: [{ title: "Part 1: armature kawat", seriesPart: 1, stage: "Posted" }],
        photos: [],
      },
    },
    {
      id: "p02",
      title: "30 hari tangan, hari ke-12",
      context: {
        ...TANGAN,
        startDate: "2026-10-01",
        notes: "Hari ke-12. Jempol masih susah.",
        photoLog: [
          { date: "2026-10-12", caption: "Hari 12: jempol" },
          { date: "2026-10-07", caption: "Hari 7: kepalan" },
          { date: "2026-10-01", caption: "Hari 1" },
        ],
        contents: [
          { title: "Hari ke-1 gambar tangan", seriesPart: 1, stage: "Posted" },
          { title: "Hari ke-7 gambar tangan", seriesPart: 2, stage: "Posted" },
        ],
        photos: [],
      },
    },
    {
      id: "p03",
      title: "Perencanaan tanpa data",
      context: { title: "Figur kucing tidur", medium: "Clay", stage: "Perencanaan", startDate: null, notes: null, photoLog: [], contents: [], photos: [] },
    },
    {
      id: "p04",
      title: "Proyek selesai",
      context: {
        title: "Potret diri dengan arsiran",
        medium: "Gambar",
        stage: "Selesai",
        startDate: "2026-09-01",
        notes: "Butuh 8 malam.",
        photoLog: [
          { date: "2026-09-09", caption: "Selesai" },
          { date: "2026-09-05", caption: "Arsiran rambut" },
          { date: "2026-09-02", caption: "Sketsa garis" },
        ],
        contents: [
          { title: "Part 1: sketsa garis", seriesPart: 1, stage: "Posted" },
          { title: "Part 2: arsiran", seriesPart: 2, stage: "Editing" },
        ],
        photos: [],
      },
    },
    {
      id: "p05",
      title: "Proyek ditunda",
      context: {
        title: "Diorama meja kerja mini",
        medium: "Campuran",
        stage: "Ditunda",
        startDate: "2026-08-15",
        notes: "Berhenti karena lem habis.",
        photoLog: [{ date: "2026-08-20", caption: "Kursi mini" }],
        contents: [],
        photos: [],
      },
    },
    {
      id: "p06",
      title: "Studi anatomi",
      context: {
        title: "Studi anatomi lengan",
        medium: "Gambar",
        stage: "Sedang dikerjakan",
        startDate: "2026-10-15",
        notes: "Fokus otot lengan bawah.",
        photoLog: [{ date: null, caption: null }],
        contents: [],
        photos: [],
      },
    },
    {
      id: "p07",
      title: "Burung hantu, 3 part",
      context: {
        title: "Patung burung hantu",
        medium: "Clay",
        stage: "Sedang dikerjakan",
        startDate: "2026-09-20",
        notes: "Sedang membuat tekstur bulu.",
        photoLog: [{ date: "2026-10-18", caption: "Tekstur bulu sayap" }],
        contents: [
          { title: "Part 1: armature", seriesPart: 1, stage: "Posted" },
          { title: "Part 2: bentuk badan", seriesPart: 2, stage: "Posted" },
          { title: "Part 3: mata", seriesPart: 3, stage: "Siap Posting" },
        ],
        photos: [],
      },
    },
    {
      id: "p08",
      title: "Sketsa harian",
      context: {
        title: "Sketsa harian di kereta",
        medium: "Gambar",
        stage: "Sedang dikerjakan",
        startDate: null,
        notes: "Gambar penumpang tanpa wajah jelas.",
        photoLog: [],
        contents: [{ title: "Sketsa di KRL", seriesPart: null, stage: "Posted" }],
        photos: [],
      },
    },
    {
      id: "p09",
      title: "Gantungan kunci",
      context: {
        title: "Set gantungan kunci clay",
        medium: "Clay",
        stage: "Perencanaan",
        startDate: null,
        notes: "Untuk hadiah teman.",
        photoLog: [],
        contents: [],
        photos: [],
      },
    },
    {
      id: "p10",
      title: "Campuran gambar + clay",
      context: {
        title: "Tangan memegang kuas",
        medium: "Campuran",
        stage: "Sedang dikerjakan",
        startDate: "2026-10-20",
        notes: "Gambar dulu, lalu dibuat versi clay.",
        photoLog: [{ date: "2026-10-22", caption: "Sketsa tangan" }],
        contents: [],
        photos: [],
      },
    },
  ],
  hook: CONTENT_CASES,
  script: CONTENT_CASES,
  caption: CONTENT_CASES.map((c, i) => ({
    ...c,
    context: {
      ...c.context,
      platform: i % 2 === 0 ? "TikTok" : "Instagram",
      postType: i % 2 === 0 ? "Video" : c.context.format === "Carousel foto (IG)" ? "Carousel" : "Reel",
      caption: null,
      hashtags: null,
    },
  })),
};
