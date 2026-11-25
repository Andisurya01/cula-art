import { CalendarDays, Flame, Sparkles, TrendingUp } from "lucide-react";
import { ArrowLink } from "@/components/design/arrow-link";
import { BentoCard } from "@/components/design/bento-card";
import { MetaLabel, SectionLabel } from "@/components/design/section-label";
import { StatPill } from "@/components/design/stat-pill";
import { TwoToneHeading } from "@/components/design/two-tone-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * Contoh komponen dengan token tema (Fase 6 langkah 4). Acuan visual untuk Galeri (gaya Euronium)
 * dan Studio (gaya AKA), sekaligus isi pratinjau langsung di menu Tampilan. Tanpa data asli, tanpa
 * kode server, jadi aman dipakai di dalam komponen client.
 *
 * Tata letak memakai container query (`@container` + `@xl:` dsb.), bukan breakpoint layar, supaya
 * pratinjau lebar HP (kontainer 375 px) di layar lebar tetap tersusun seperti di HP.
 * `idPrefix`: awalan id elemen, supaya dua pratinjau di satu halaman tidak berbagi id.
 */
export function ThemeShowcase({ className, idPrefix = "contoh" }: { className?: string; idPrefix?: string }) {
  return (
    <div className={cn("@container space-y-12", className)}>
      <GalleryHeroSample id={idPrefix} />
      <GalleryCardsSample id={idPrefix} />
      <StudioBentoSample id={idPrefix} />
      <ControlsSample id={idPrefix} />
      <TypeScaleSample id={idPrefix} />
    </div>
  );
}

function ArtPlaceholder({ className, label }: { className?: string; label: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "rounded-image bg-linear-to-br from-accent/35 via-bento-blue/15 to-bento-lime/35 ring-1 ring-border/60",
        className,
      )}
    />
  );
}

function GalleryHeroSample({ id }: { id: string }) {
  return (
    <section aria-labelledby={`${id}-hero`} className="space-y-6">
      <SectionLabel index={1}>Contoh hero Galeri</SectionLabel>
      <div className="grid gap-6 @2xl:grid-cols-[1.4fr_1fr] @2xl:items-end">
        <TwoToneHeading as="h2" level="display" first="Karya tangan" second="dari meja kecil" id={`${id}-hero`} />
        <ArtPlaceholder label="Contoh foto karya unggulan" className="aspect-[4/5] w-full max-w-sm justify-self-end" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <MetaLabel>Karya gambar &amp; clay · Sejak 2024</MetaLabel>
        <MetaLabel>(Galeri)</MetaLabel>
        <MetaLabel>Gulir untuk melihat ↓</MetaLabel>
      </div>
      <div className="flex flex-wrap gap-2">
        <ArrowLink href={`#${id}-kartu`}>Lihat karya</ArrowLink>
        <Button variant="secondary">Tentang saya</Button>
      </div>
      <div className="grid gap-4 @xl:grid-cols-[1.6fr_1fr]">
        <StatPill value="48" label="Karya sudah dibuat, semuanya dengan tangan." hint="Gambar · Clay" />
        <StatPill shape="circle" value="3" label="Tahun berkarya" className="mx-auto @xl:mx-0" />
      </div>
    </section>
  );
}

function GalleryCardsSample({ id }: { id: string }) {
  return (
    <section aria-labelledby={`${id}-kartu`} className="space-y-6">
      <SectionLabel index={2}>Kartu karya</SectionLabel>
      <TwoToneHeading id={`${id}-kartu`} level="h2" first="Karya terbaru" second="langsung dari studio" />
      <div className="grid grid-cols-2 gap-4 @2xl:grid-cols-4">
        {["Naga merah", "Kucing tidur", "Rumah lumut", "Burung kertas"].map((title, i) => (
          <article key={title} className="group space-y-2">
            <div className="relative">
              <ArtPlaceholder label={`Foto ${title}`} className="aspect-[4/5]" />
              <Badge variant={i === 1 ? "warning" : i === 2 ? "secondary" : "success"} className="absolute top-3 left-3">
                {i === 1 ? "Dipesan" : i === 2 ? "Koleksi pribadi" : "Tersedia"}
              </Badge>
            </div>
            <h3 className="font-heading text-h6">{title}</h3>
            <p className="text-sm text-muted-foreground">Clay · 2026</p>
          </article>
        ))}
      </div>
      <Card className="max-w-md">
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <ArtPlaceholder label="Thumbnail karya" className="size-16 shrink-0 rounded-full" />
            <div className="min-w-0">
              <p className="font-heading text-h5">Naga merah</p>
              <p className="text-sm text-muted-foreground">Clay · 2026 · 12 × 20 cm</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button arrow="start">Tanya karya ini</Button>
            <Button variant="secondary">Bagikan</Button>
          </div>
          <p className="rounded-card-nested bg-muted px-4 py-3 text-sm text-muted-foreground">
            Setiap karya dibuat satu per satu.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}

function StudioBentoSample({ id }: { id: string }) {
  return (
    <section aria-labelledby={`${id}-bento`} className="space-y-6">
      <SectionLabel index={3}>Kartu bento Studio</SectionLabel>
      <h2 id={`${id}-bento`} className="font-heading text-h3">
        Beranda
      </h2>
      <div className="grid gap-4 @md:grid-cols-2 @4xl:grid-cols-4">
        <BentoCard tone="blue" icon={<TrendingUp />} label="Minggu ini" value="2/3" description="post tayang">
          <div className="flex h-2 gap-1" aria-hidden>
            <span className="flex-1 rounded-full bg-current" />
            <span className="flex-1 rounded-full bg-current" />
            <span className="flex-1 rounded-full bg-current/30" />
          </div>
        </BentoCard>
        <BentoCard tone="lime" icon={<Flame />} label="Streak" value="4" description="minggu berturut-turut" />
        <BentoCard tone="purple" icon={<Sparkles />} label="Saran" value="3" description="saran baru dari data" />
        <BentoCard tone="dark" icon={<CalendarDays />} label="Hari ini" value="2" description="tugas menunggu" />
      </div>
      <div className="grid gap-4 @xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tugas hari ini</CardTitle>
            <CardDescription>Kartu permukaan biasa dengan kartu bertingkat di dalamnya.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Card nested variant="muted" size="sm">
              <CardContent className="flex items-center justify-between gap-3 text-sm">
                <span>Rekam proses Naga merah</span>
                <Badge variant="warning">Lewat jadwal</Badge>
              </CardContent>
            </Card>
            <Card nested variant="muted" size="sm">
              <CardContent className="flex items-center justify-between gap-3 text-sm">
                <span>Isi metrik H+1</span>
                <Badge variant="outline">Hari ini</Badge>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
        <BentoCard tone="muted" label="Kartu abu" value="12,3K" description="views 7 hari terakhir" />
      </div>
    </section>
  );
}

function ControlsSample({ id }: { id: string }) {
  return (
    <section aria-labelledby={`${id}-kontrol`} className="space-y-6">
      <SectionLabel index={4}>Tombol dan form</SectionLabel>
      <h2 id={`${id}-kontrol`} className="font-heading text-h3">
        Kontrol
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        <Button>Primer</Button>
        <Button variant="secondary">Sekunder</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="accent">Aksen</Button>
        <Button variant="destructive">Hapus</Button>
        <Button arrow>Dengan panah</Button>
        <Button size="sm">Kecil</Button>
        <Button size="lg" arrow>
          Besar
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge>Default</Badge>
        <Badge variant="secondary">Sekunder</Badge>
        <Badge variant="accent">Aksen</Badge>
        <Badge variant="success">Sukses</Badge>
        <Badge variant="warning">Peringatan</Badge>
        <Badge variant="destructive">Destruktif</Badge>
        <Badge variant="outline">Outline</Badge>
      </div>
      <div className="grid gap-4 @xl:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${id}-judul`}>Judul ide</Label>
          <Input id={`${id}-judul`} placeholder="Mis. timelapse naga clay" />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${id}-catatan`}>Catatan</Label>
          <Textarea id={`${id}-catatan`} placeholder="Hook, referensi, catatan proses…" />
        </div>
        <div className="flex items-center gap-3">
          <Switch id={`${id}-switch`} defaultChecked />
          <Label htmlFor={`${id}-switch`}>Tampilkan harga</Label>
        </div>
        <div className="flex items-center gap-3">
          <Checkbox id={`${id}-check`} defaultChecked />
          <Label htmlFor={`${id}-check`}>Sudah direkam</Label>
        </div>
      </div>
      <Tabs defaultValue="semua">
        <TabsList>
          <TabsTrigger value="semua">Semua</TabsTrigger>
          <TabsTrigger value="tiktok">TikTok</TabsTrigger>
          <TabsTrigger value="instagram">Instagram</TabsTrigger>
        </TabsList>
        <TabsContent value="semua" className="text-muted-foreground">
          Tab pil dengan lintasan abu.
        </TabsContent>
        <TabsContent value="tiktok" className="text-muted-foreground">
          Isi tab TikTok.
        </TabsContent>
        <TabsContent value="instagram" className="text-muted-foreground">
          Isi tab Instagram.
        </TabsContent>
      </Tabs>
      <Tabs defaultValue="gambar">
        <TabsList variant="pill">
          <TabsTrigger value="gambar">Gambar</TabsTrigger>
          <TabsTrigger value="clay">Clay</TabsTrigger>
          <TabsTrigger value="campuran">Campuran</TabsTrigger>
        </TabsList>
      </Tabs>
    </section>
  );
}

function TypeScaleSample({ id }: { id: string }) {
  const levels = [
    ["text-display", "Display"],
    ["text-h1", "Judul H1"],
    ["text-h2", "Judul H2"],
    ["text-h3", "Judul H3"],
    ["text-h4", "Judul H4"],
    ["text-h5", "Judul H5"],
    ["text-h6", "Judul H6"],
  ] as const;
  return (
    <section aria-labelledby={`${id}-tipografi`} className="space-y-6">
      <SectionLabel index={5}>Tipografi</SectionLabel>
      <h2 id={`${id}-tipografi`} className="sr-only">
        Skala tipografi
      </h2>
      <div className="space-y-3">
        {levels.map(([cls, label]) => (
          <p key={cls} className={cn("font-heading truncate", cls)}>
            {label}
          </p>
        ))}
      </div>
      <div className="max-w-2xl space-y-2">
        <p className="text-body-lg">Isi besar: pengantar halaman dan cerita karya.</p>
        <p className="text-body">Isi dasar: paragraf biasa di Galeri dan Studio.</p>
        <p className="text-body-sm text-muted-foreground">Isi kecil: keterangan form dan meta kartu.</p>
        <p className="text-caption text-muted-foreground">Keterangan: catatan kecil dan waktu.</p>
        <p className="type-label">Label kapital · (01)</p>
        <p className="font-mono text-sm tabular-nums">12.345 · 10,5% · 00:42</p>
      </div>
    </section>
  );
}
