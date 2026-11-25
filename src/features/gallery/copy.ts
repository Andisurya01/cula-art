// Semua teks UI Galeri di satu tempat (bahasa Indonesia), supaya bahasa Inggris mudah ditambah nanti.
// Komponen Galeri mengambil teks dari sini, bukan menulis string langsung.
// Label kecil (`MetaLabel`, `SectionLabel`) ditulis huruf biasa; huruf kapital diatur token label.

import type { Availability, Medium } from "@prisma/client";

/** "a", "a & b", "a, b & c". */
function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} & ${items[items.length - 1]}`;
}

/** Nama medium pendek huruf kecil untuk kalimat ("Karya gambar & clay"). */
const MEDIUM_SHORT = {
  DRAWING: "gambar",
  CLAY: "clay",
  MIXED: "campuran",
} as const satisfies Record<Medium, string>;

export const galleryCopy = {
  nav: {
    home: "Beranda",
    catalog: "Karya",
    about: "Tentang",
    menu: "Menu",
    close: "Tutup menu",
    skipToContent: "Langsung ke konten",
    mainLabel: "Menu utama",
    footerLabel: "Menu bawah",
  },
  footer: {
    contact: "Kontak",
    social: "Ikuti proses berkarya",
    explore: "Jelajahi",
    follow: "Ikuti",
    ctaFirst: "Tertarik dengan karya?",
    ctaSecond: "Tanya langsung saja.",
    ctaWhatsapp: "Kirim pesan",
    ctaEmail: "Kirim email",
    ctaCatalog: "Lihat karya",
    backToTop: "Kembali ke atas",
    rights: (year: number, name: string) => `© ${year} ${name}`,
  },
  social: {
    instagram: "Instagram",
    tiktok: "TikTok",
    whatsapp: "WhatsApp",
    email: "Email",
  },
  notFound: {
    label: "404",
    title: "Halaman tidak ditemukan",
    titleFirst: "Halaman ini",
    titleSecond: "tidak ditemukan",
    description: "Karya ini mungkin sudah dipindahkan, belum diterbitkan, atau tautannya salah ketik.",
    backToCatalog: "Lihat semua karya",
    backHome: "Ke Beranda",
  },
  price: {
    onRequest: "Harga atas permintaan",
  },
  /** Label medium untuk pengunjung ("Patung clay", bukan "Clay"). */
  medium: {
    DRAWING: "Gambar",
    CLAY: "Patung clay",
    MIXED: "Campuran",
  } satisfies Record<Medium, string>,
  availability: {
    NOT_FOR_SALE: "Koleksi pribadi",
    AVAILABLE: "Tersedia",
    RESERVED: "Dipesan",
    SOLD: "Terjual",
  } satisfies Record<Availability, string>,
  inquiry: {
    button: "Tanya karya ini",
    /** Pesan otomatis WhatsApp/email berisi judul + tautan karya. */
    message: (title: string, url: string) =>
      `Halo, saya tertarik dengan karya "${title}". Apakah boleh tanya lebih lanjut?\n${url}`,
    emailSubject: (title: string) => `Tentang karya "${title}"`,
  },
  share: {
    button: "Bagikan",
    /** Tambahan untuk pembaca layar: tombol Bagikan menyalin tautan. */
    buttonHint: "(salin tautan)",
    copyLink: "Salin tautan",
    copied: "Tautan disalin",
    copyFailed: "Gagal menyalin tautan",
  },
  meta: {
    defaultDescription: "Karya gambar dan patung clay, lengkap dengan cerita prosesnya.",
    catalogTitle: "Karya",
    catalogDescription: "Katalog karya gambar dan patung clay: foto, ukuran, ketersediaan, dan cerita prosesnya.",
    catalogMediumDescription: (medium: string) => `Katalog karya ${medium.toLowerCase()}: foto, ukuran, ketersediaan, dan cerita prosesnya.`,
    aboutTitle: "Tentang",
    aboutDescription: (name: string) => `Profil, perjalanan berkarya, dan kontak ${name}.`,
  },
  card: {
    noPhoto: "Belum ada foto",
  },
  home: {
    eyebrow: "Galeri karya",
    eyebrowCity: (city: string) => `Berkarya dari ${city}`,
    /** Baris kedua judul hero jika tagline kosong atau terlalu panjang untuk judul. */
    heroSecond: "dibuat dengan tangan",
    /** Label meta hero: "Karya gambar & clay · Sejak 2024" (dari karya Terbit). */
    metaLine: (mediums: readonly Medium[], since: number | null) =>
      [mediums.length > 0 ? `Karya ${joinList(mediums.map((m) => MEDIUM_SHORT[m]))}` : "Galeri karya", since ? `Sejak ${since}` : null]
        .filter(Boolean)
        .join(" · "),
    scrollHint: "Gulir untuk melihat ↓",
    viewWorks: "Lihat karya",
    about: "Tentang",
    heroCaptionLabel: "Karya unggulan",
    statsLabel: "Sekilas",
    statsTitle: "Karya tangan,",
    statsSecond: "satu per satu.",
    statsCountLabel: (n: number) => (n === 1 ? "Karya terbit, dibuat dengan tangan." : "Karya terbit, semuanya dibuat dengan tangan."),
    statsMediumLabel: (n: number) => (n === 1 ? "Medium" : "Medium berbeda"),
    statsYearsLabel: "Tahun berkarya",
    yearsRange: (first: number, last: number) => (first === last ? String(first) : `${first}–${last}`),
    featuredEyebrow: "Pilihan",
    featuredTitle: "Karya unggulan",
    featuredSecond: "pilihan dari meja kerja",
    latestEyebrow: "Baru terbit",
    latestTitle: "Karya terbaru",
    latestSecond: "langsung dari studio",
    seeAll: "Lihat semua karya",
    mediumEyebrow: "Jelajahi",
    mediumTitle: "Pilih medium",
    mediumSecond: "lalu lihat semuanya",
    mediumCount: (n: number) => `${n} karya`,
    profileEyebrow: "Di balik karya",
    profileMore: "Kenali lebih dekat",
    emptyTitle: "Karya sedang disiapkan",
    emptyDescription: "Belum ada karya yang terbit. Sementara itu, ikuti proses berkaryanya di media sosial.",
  },
  catalog: {
    title: "Karya",
    titleSecond: "buatan tangan",
    intro: "Gambar dan patung clay buatan tangan. Ketuk karya untuk melihat foto, ukuran, dan cerita prosesnya.",
    filterLabel: "Saring karya",
    searchLabel: "Cari judul karya",
    searchPlaceholder: "Cari judul…",
    searchSubmit: "Cari",
    mediumLegend: "Medium",
    allMediums: "Semua",
    statusLabel: "Ketersediaan",
    statusAll: "Semua status",
    status: { AVAILABLE: "Tersedia", UNAVAILABLE: "Terjual/koleksi" },
    yearLabel: "Tahun",
    yearAll: "Semua tahun",
    sortLabel: "Urutkan",
    sort: { terbaru: "Terbaru", unggulan: "Unggulan" },
    resultCount: (n: number) => (n === 0 ? "Tidak ada karya" : `${n} karya`),
    searchingFor: (q: string) => `untuk "${q}"`,
    clearFilters: "Hapus filter",
    loadMore: "Muat lagi",
    loading: "Memuat…",
    showing: (shown: number, total: number) => `Menampilkan ${shown} dari ${total} karya`,
    emptyFilteredTitle: "Tidak ada karya yang cocok",
    emptyFilteredDescription: "Coba kata lain atau hapus beberapa filter.",
    emptyTitle: "Belum ada karya terbit",
    emptyDescription: "Karya baru akan muncul di sini setelah diterbitkan.",
  },
  detail: {
    breadcrumb: "Navigasi",
    infoLabel: "Info karya",
    specs: {
      medium: "Medium",
      dimensions: "Ukuran",
      materials: "Bahan",
      year: "Tahun",
    },
    statusNote: {
      NOT_FOR_SALE: "Karya ini koleksi pribadi dan tidak dijual.",
      SOLD: "Karya ini sudah terjual.",
    },
    inquiryVia: { whatsapp: "Lewat WhatsApp", email: "Lewat email" },
    inquiryNote: "Pesan otomatis berisi judul dan tautan karya ini.",
    previewDisabled: "Tombol kontak dan bagikan nonaktif di pratinjau.",
    previewNoContact: "Isi WhatsApp atau email di Pengaturan supaya tombol Tanya karya ini muncul.",
    storyEyebrow: "Di balik karya",
    storyTitle: "Cerita karya",
    processEyebrow: "Dari meja kerja",
    processTitle: "Proses",
    processIntro: "Foto dari meja kerja selama karya ini dibuat.",
    watchProcess: (platform: string) => `Tonton prosesnya di ${platform}`,
    relatedEyebrow: "Jelajahi",
    relatedTitle: "Karya lain",
    relatedMore: (medium: string) => `Semua ${medium.toLowerCase()}`,
    noPhotos: "Belum ada foto",
    photoLabel: (i: number, total: number) => `Foto ${i} dari ${total}`,
    thumbnails: "Pilih foto",
    openPhoto: (i: number, total: number) => `Perbesar foto ${i} dari ${total}`,
    prevPhoto: "Foto sebelumnya",
    nextPhoto: "Foto berikutnya",
  },
  lightbox: {
    close: "Tutup",
    zoomIn: "Perbesar",
    zoomOut: "Perkecil",
    prev: "Sebelumnya",
    next: "Berikutnya",
    hint: "Ketuk atau cubit untuk zoom",
    counter: (i: number, total: number) => `${i} / ${total}`,
  },
  about: {
    eyebrow: "Tentang",
    lead: "Profil",
    titleSecond: "di balik karya",
    titleSecondCity: (city: string) => `berkarya dari ${city}`,
    journeyEyebrow: "Cerita",
    journeyTitle: "Perjalanan berkarya",
    contactEyebrow: "Hubungi",
    contactTitle: "Kontak",
    contactIntro: "Untuk pertanyaan karya, pesanan, atau kolaborasi:",
    whatsappButton: "Kirim pesan WhatsApp",
    whatsappMessage: "Halo, saya melihat galeri karyamu dan ingin bertanya.",
    socialEyebrow: "Media sosial",
    socialTitle: "Ikuti prosesnya",
    viewWorks: "Lihat karya",
    empty: "Profil sedang dilengkapi. Sementara itu, lihat karya yang sudah terbit.",
  },
} as const;
