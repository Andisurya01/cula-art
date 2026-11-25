"use client";

import { useMemo, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Palette, RotateCcw, Shapes, SunMoon, Timer, Type, Undo2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { callAction } from "@/lib/action-client";
import { defaultThemeTokens, matchingPreset, THEME_PRESETS, themeTokensEqual } from "@/lib/theme/defaults";
import { themeTokensSchema, type ThemeTokens } from "@/lib/theme/schema";
import { cn } from "@/lib/utils";
import { resetTheme, saveTheme } from "../actions";
import type { PreviewMode, PreviewWidth } from "../editor-preview";
import { countInvalid, editorReducer, initEditorState, validateDraft, type ColorMode } from "../editor-state";
import { ColorSection, failingContrastCount } from "./color-section";
import { ThemeEditorContext, type ThemeEditorContextValue } from "./editor-context";
import { EditorSection, SectionStatus, SectionStatusDot } from "./editor-section";
import { ModePresetSection } from "./mode-preset-section";
import { MotionSection } from "./motion-section";
import { ShapeSection } from "./shape-section";
import { ThemePreview } from "./theme-preview";
import { TypographySection } from "./typography-section";
import { UnsavedChangesGuard } from "./unsaved-changes-guard";

const DEFAULT_TOKENS = defaultThemeTokens();

type SectionId = "mode" | "colors" | "typography" | "shape" | "motion";

/** Awalan path token per bagian (untuk menghitung isian tidak valid). */
const SECTION_PATHS: Record<SectionId, string> = {
  mode: "defaultMode",
  colors: "colors",
  typography: "typography",
  shape: "shape",
  motion: "motion",
};
const SECTION_ORDER = Object.keys(SECTION_PATHS) as SectionId[];

type Pending = "save" | "reset" | null;
type StatusTone = "error" | "warning" | "success" | "muted";

const STATUS_DOT: Record<StatusTone, string> = {
  error: "bg-destructive",
  warning: "bg-warning",
  success: "bg-success",
  muted: "bg-muted-foreground",
};

/**
 * Editor menu Tampilan: draf token di state client, pratinjau langsung di kontainer terpisah,
 * Simpan/Batalkan/Reset. Situs baru berubah setelah Simpan (server me-revalidate root layout,
 * lalu `router.refresh()` memuat `<style>` tema yang baru).
 */
export function ThemeEditor({ initialTokens, isCustomized }: { initialTokens: ThemeTokens; isCustomized: boolean }) {
  const router = useRouter();
  const [state, dispatch] = useReducer(
    editorReducer,
    { tokens: initialTokens, customized: isCustomized },
    ({ tokens, customized }) => initEditorState(tokens, customized),
  );
  const [pending, setPending] = useState<Pending>(null);
  const [open, setOpen] = useState<Record<SectionId, boolean>>({
    mode: true,
    colors: false,
    typography: false,
    shape: false,
    motion: false,
  });
  const [colorMode, setColorMode] = useState<ColorMode>("light");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("light");
  const [previewWidth, setPreviewWidth] = useState<PreviewWidth>("desktop");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const editorRef = useRef<HTMLFieldSetElement>(null);

  const validation = useMemo(() => validateDraft(state.draft), [state.draft]);
  const invalidCount = validation.invalidPaths.size;
  const dirty = !themeTokensEqual(state.draft, state.saved);
  const canReset = state.customized || !themeTokensEqual(state.draft, DEFAULT_TOKENS);
  const busy = pending !== null;

  const context: ThemeEditorContextValue = {
    draft: state.draft,
    preview: state.preview,
    invalidPaths: validation.invalidPaths,
    edit: (recipe) => dispatch({ type: "edit", recipe }),
    applyPreset: (preset) => dispatch({ type: "preset", preset }),
  };

  const errorsIn = (section: SectionId) => countInvalid(validation.invalidPaths, SECTION_PATHS[section]);
  const contrastFails =
    failingContrastCount(state.preview.colors.light, state.preview.typography) +
    failingContrastCount(state.preview.colors.dark, state.preview.typography);
  const preset = matchingPreset(state.draft);

  function changeColorMode(mode: ColorMode) {
    setColorMode(mode);
    // Mengedit warna gelap paling enak sambil melihat pratinjau gelap.
    setPreviewMode(mode);
  }

  /** Buka bagian yang berisi isian salah, pindah ke tab warnanya, lalu fokus ke isian pertama. */
  function revealInvalid() {
    setOpen((prev) => {
      const next = { ...prev };
      for (const id of SECTION_ORDER) if (errorsIn(id) > 0) next[id] = true;
      return next;
    });
    const lightErrors = countInvalid(validation.invalidPaths, "colors.light");
    const darkErrors = countInvalid(validation.invalidPaths, "colors.dark");
    if (lightErrors === 0 && darkErrors > 0) changeColorMode("dark");
    else if (lightErrors > 0) changeColorMode("light");
    requestAnimationFrame(() => {
      editorRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    });
  }

  async function save() {
    const parsed = themeTokensSchema.safeParse(state.draft);
    if (!parsed.success) {
      revealInvalid();
      toast.error(`${invalidCount} isian perlu diperbaiki sebelum disimpan.`);
      return;
    }
    setPending("save");
    const result = await callAction(() => saveTheme(parsed.data));
    setPending(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    dispatch({ type: "saved", tokens: result.data.tokens });
    toast.success("Tampilan disimpan. Galeri dan Studio sudah memakai tema baru.");
    router.refresh();
  }

  function discard() {
    dispatch({ type: "discard" });
    toast("Perubahan dibatalkan. Kembali ke versi tersimpan.");
  }

  async function reset() {
    setPending("reset");
    const result = await callAction(() => resetTheme());
    setPending(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    dispatch({ type: "reset", tokens: result.data.tokens });
    setResetOpen(false);
    toast.success("Tampilan kembali ke awal.");
    router.refresh();
  }

  const status: { tone: StatusTone; text: string } =
    pending === "save"
      ? { tone: "muted", text: "Menyimpan…" }
      : pending === "reset"
        ? { tone: "muted", text: "Mengembalikan tampilan awal…" }
        : invalidCount > 0
          ? { tone: "error", text: `${invalidCount} isian perlu diperbaiki` }
          : dirty
            ? { tone: "warning", text: "Belum disimpan" }
            : state.customized
              ? { tone: "success", text: "Tersimpan" }
              : { tone: "muted", text: "Tampilan awal" };

  const previewProps = {
    tokens: state.preview,
    mode: previewMode,
    width: previewWidth,
    onModeChange: setPreviewMode,
    onWidthChange: setPreviewWidth,
  };

  return (
    <ThemeEditorContext value={context}>
      <UnsavedChangesGuard when={dirty} />

      <div className="space-y-4">
        {/* Bar aksi: menempel di atas (bottom nav HP dan tombol + Ide ada di bawah). */}
        <div className="sticky top-0 z-30 -mx-4 bg-background/90 px-4 py-3 backdrop-blur md:-mr-8 md:-ml-6 md:pr-8 md:pl-6 lg:-ml-8 lg:pl-8">
          <div className="flex items-center gap-1.5 rounded-button bg-card p-1.5 pl-4 shadow-sm ring-1 ring-border/70">
            <p role="status" className="flex min-w-0 flex-1 items-center gap-2 text-body-sm">
              <span aria-hidden className={cn("size-2 shrink-0 rounded-full", STATUS_DOT[status.tone])} />
              <span className="truncate">{status.text}</span>
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                // Di layar HP, kanvas desktop (1280 px) jadi terlalu kecil: mulai dari lebar HP.
                if (window.matchMedia("(max-width: 639px)").matches) setPreviewWidth("mobile");
                setPreviewOpen(true);
              }}
              className="size-10 px-0 sm:w-auto sm:px-4 xl:hidden"
            >
              <Eye aria-hidden />
              <span className="sr-only sm:not-sr-only">Pratinjau</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={discard}
              disabled={!dirty || busy}
              className="size-10 px-0 sm:w-auto sm:px-4"
            >
              <Undo2 aria-hidden />
              <span className="sr-only sm:not-sr-only">Batalkan</span>
            </Button>
            <Button type="button" onClick={save} disabled={!dirty || busy} className="h-10 px-5">
              {pending === "save" ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        </div>

        <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-start xl:gap-6">
          <div className="@container/editor min-w-0 space-y-4">
            {/* Dikunci selama menyimpan/reset, supaya hasil server tidak menimpa ketikan baru. */}
            <fieldset ref={editorRef} disabled={busy} className="min-w-0 space-y-4">
              <legend className="sr-only">Pengaturan tampilan</legend>
              <EditorSection
                id="bagian-mode"
                title="Mode & preset"
                description="Mode default pengunjung dan titik awal tema."
                icon={<SunMoon />}
                status={<Status info={preset ? `Preset ${THEME_PRESETS[preset].label}` : "Diubah"} />}
                open={open.mode}
                onOpenChange={(value) => setOpen((prev) => ({ ...prev, mode: value }))}
              >
                <ModePresetSection />
              </EditorSection>
              <EditorSection
                id="bagian-warna"
                title="Warna"
                description="Terang dan gelap: dasar, aksi, bento, judul dua warna."
                icon={<Palette />}
                status={<Status errors={errorsIn("colors")} warnings={contrastFails} warningLabel="kontras kurang" />}
                open={open.colors}
                onOpenChange={(value) => setOpen((prev) => ({ ...prev, colors: value }))}
              >
                <ColorSection mode={colorMode} onModeChange={changeColorMode} />
              </EditorSection>
              <EditorSection
                id="bagian-tipografi"
                title="Tipografi"
                description="Font, ukuran judul Display sampai H6, teks isi, label."
                icon={<Type />}
                status={<Status errors={errorsIn("typography")} />}
                open={open.typography}
                onOpenChange={(value) => setOpen((prev) => ({ ...prev, typography: value }))}
              >
                <TypographySection />
              </EditorSection>
              <EditorSection
                id="bagian-bentuk"
                title="Bentuk"
                description="Radius kartu, tombol, input, badge, gambar, dialog."
                icon={<Shapes />}
                status={<Status errors={errorsIn("shape")} />}
                open={open.shape}
                onOpenChange={(value) => setOpen((prev) => ({ ...prev, shape: value }))}
              >
                <ShapeSection />
              </EditorSection>
              <EditorSection
                id="bagian-animasi"
                title="Animasi"
                description="Durasi transisi dan easing."
                icon={<Timer />}
                status={<Status errors={errorsIn("motion")} />}
                open={open.motion}
                onOpenChange={(value) => setOpen((prev) => ({ ...prev, motion: value }))}
              >
                <MotionSection />
              </EditorSection>
            </fieldset>

            <section
              aria-labelledby="reset-judul"
              className="flex flex-col gap-4 rounded-card bg-muted p-5 @md/editor:flex-row @md/editor:items-center @md/editor:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <h2 id="reset-judul" className="font-heading text-h5">
                  Reset ke tampilan awal
                </h2>
                <p className="text-body-sm text-muted-foreground">
                  {canReset
                    ? "Kembali ke preset Monokrom bawaan, termasuk mode default pengunjung. Tema tersimpan dihapus."
                    : "Situs sudah memakai tampilan awal."}
                </p>
              </div>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setResetOpen(true)}
                disabled={!canReset || busy}
                className="h-10 shrink-0"
              >
                <RotateCcw aria-hidden />
                Reset ke tampilan awal
              </Button>
            </section>
          </div>

          <aside aria-labelledby="pratinjau-judul" className="hidden min-w-0 xl:sticky xl:top-24 xl:block">
            <h2 id="pratinjau-judul" className="sr-only">
              Pratinjau
            </h2>
            <ThemePreview {...previewProps} idPrefix="pratinjau" frameClassName="max-h-[calc(100svh-13rem)]" />
          </aside>
        </div>
      </div>

      {/* Pratinjau di HP dan layar sedang: Sheet dari bawah. */}
      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent side="bottom" className="gap-0 data-[side=bottom]:h-[92svh]">
          <SheetHeader className="pr-14">
            <SheetTitle>Pratinjau</SheetTitle>
            <SheetDescription>Geser untuk melihat semua contoh, lalu tutup untuk lanjut mengubah.</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            <ThemePreview {...previewProps} idPrefix="pratinjau-hp" />
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={resetOpen} onOpenChange={(value) => !busy && setResetOpen(value)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset ke tampilan awal?</AlertDialogTitle>
            <AlertDialogDescription>
              Semua warna, font, ukuran teks, bentuk, animasi, dan mode default pengunjung kembali ke preset Monokrom
              bawaan. Tema tersimpan dihapus dan Galeri serta Studio langsung berubah. Perubahan yang belum disimpan
              juga hilang.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busy}
              onClick={(event) => {
                // Dialog tetap terbuka sampai server selesai.
                event.preventDefault();
                void reset();
              }}
            >
              {pending === "reset" ? "Mengembalikan…" : "Reset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ThemeEditorContext>
  );
}

function Status({
  errors = 0,
  warnings = 0,
  warningLabel = "peringatan",
  info,
}: {
  errors?: number;
  warnings?: number;
  warningLabel?: string;
  info?: string;
}) {
  if (errors > 0) {
    return (
      <>
        <SectionStatus tone="error">{errors} perlu diperbaiki</SectionStatus>
        <SectionStatusDot tone="error" count={errors} label={`${errors} isian perlu diperbaiki`} />
      </>
    );
  }
  if (warnings > 0) {
    return (
      <>
        <SectionStatus tone="warning">
          {warnings} {warningLabel}
        </SectionStatus>
        <SectionStatusDot tone="warning" count={warnings} label={`${warnings} ${warningLabel}`} />
      </>
    );
  }
  return info ? <SectionStatus tone="info">{info}</SectionStatus> : null;
}
