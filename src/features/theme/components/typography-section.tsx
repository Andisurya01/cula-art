"use client";

import { FONT_IDS, FONT_OPTIONS, fontStack, type FontId } from "@/lib/theme/fonts";
import { TYPE_LEVEL_LABELS, WEIGHT_LABELS } from "@/lib/theme/meta";
import { FONT_WEIGHTS, RANGES, TYPE_LEVELS, type FontWeight, type TypeLevel } from "@/lib/theme/schema";
import { setBody, setFonts, setLabel, setTypeLevel } from "../editor-state";
import { useThemeEditor } from "./editor-context";
import { NumberField, SelectField, SwitchField, type SelectOption } from "./editor-fields";

const FONT_SELECT_OPTIONS: readonly SelectOption<FontId>[] = FONT_IDS.map((id) => ({
  value: id,
  label: FONT_OPTIONS[id].label,
  style: { fontFamily: fontStack(id) },
}));

const WEIGHT_OPTIONS: readonly SelectOption<`${FontWeight}`>[] = FONT_WEIGHTS.map((weight) => ({
  value: `${weight}`,
  label: WEIGHT_LABELS[weight] ?? `${weight}`,
}));

const toWeight = (value: string): FontWeight => {
  const n = Number(value);
  return (FONT_WEIGHTS as readonly number[]).includes(n) ? (n as FontWeight) : 400;
};

/** Font dengan ketebalan terbatas (mis. Instrument Serif hanya 400): ketebalan lain disimulasikan browser. */
function weightHint(id: FontId): string | undefined {
  const weights = FONT_OPTIONS[id].weights;
  if (weights.length >= FONT_WEIGHTS.length) return undefined;
  return `${FONT_OPTIONS[id].label} hanya tersedia ${weights.join(", ")}; ketebalan lain disimulasikan browser.`;
}

/** Kolom tabel ukuran judul: grid yang sama untuk judul kolom dan baris (lebar ≥ 32rem). */
const LEVEL_GRID = "@lg/levels:grid-cols-[minmax(5.5rem,1fr)_repeat(5,minmax(4.5rem,1fr))]";

export function TypographySection() {
  const { draft, invalidPaths, edit } = useThemeEditor();
  const type = draft.typography;
  const body = type.body;
  const label = type.label;
  const invalid = (path: string) => invalidPaths.has(`typography.${path}`);

  return (
    <>
      <div className="space-y-2">
        <div className="grid gap-4 @md/editor:grid-cols-2">
          <SelectField
            id="tipografi-font-judul"
            label="Font judul"
            value={type.headingFont}
            options={FONT_SELECT_OPTIONS}
            onChange={(headingFont) => edit((d) => setFonts(d, { headingFont }))}
            triggerStyle={{ fontFamily: fontStack(type.headingFont) }}
            hint={weightHint(type.headingFont)}
          />
          <SelectField
            id="tipografi-font-isi"
            label="Font isi"
            value={type.bodyFont}
            options={FONT_SELECT_OPTIONS}
            onChange={(bodyFont) => edit((d) => setFonts(d, { bodyFont }))}
            triggerStyle={{ fontFamily: fontStack(type.bodyFont) }}
            hint={weightHint(type.bodyFont)}
          />
        </div>
        <p className="text-caption text-muted-foreground">
          Font di-host sendiri. Browser pengunjung hanya mengunduh font yang benar-benar dipakai.
        </p>
      </div>

      <section aria-labelledby="tipografi-judul" className="space-y-3">
        <div className="space-y-1">
          <h3 id="tipografi-judul" className="font-heading text-h6">
            Judul
          </h3>
          <p className="text-body-sm text-muted-foreground">
            Ukuran mengecil mulus dari desktop (lebar 1280 px) ke HP (375 px). Galeri memakai Display sampai H2, judul
            halaman Studio memakai H3.
          </p>
        </div>
        <div className="@container/levels">
          <div
            aria-hidden
            className={`type-label hidden gap-2 px-3 pb-2 text-muted-foreground @lg/levels:grid ${LEVEL_GRID}`}
          >
            <span>Level</span>
            <span>Desktop (px)</span>
            <span>HP (px)</span>
            <span>Ketebalan</span>
            <span>Tinggi baris</span>
            <span>Jarak huruf (em)</span>
          </div>
          <ul className="space-y-2">
            {TYPE_LEVELS.map((level) => (
              <LevelRow key={level} level={level} />
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="tipografi-isi" className="space-y-3">
        <h3 id="tipografi-isi" className="font-heading text-h6">
          Teks isi
        </h3>
        <div className="grid grid-cols-2 gap-3 @md/editor:grid-cols-4">
          <NumberField
            id="tipografi-isi-besar"
            label="Besar (px)"
            value={body.sizeLg}
            range={RANGES.bodySize}
            integer
            invalid={invalid("body.sizeLg")}
            onChange={(sizeLg) => edit((d) => setBody(d, { sizeLg }))}
          />
          <NumberField
            id="tipografi-isi-dasar"
            label="Dasar (px)"
            value={body.sizeBase}
            range={RANGES.bodySize}
            integer
            invalid={invalid("body.sizeBase")}
            onChange={(sizeBase) => edit((d) => setBody(d, { sizeBase }))}
          />
          <NumberField
            id="tipografi-isi-kecil"
            label="Kecil (px)"
            value={body.sizeSm}
            range={RANGES.bodySize}
            integer
            invalid={invalid("body.sizeSm")}
            onChange={(sizeSm) => edit((d) => setBody(d, { sizeSm }))}
          />
          <NumberField
            id="tipografi-isi-keterangan"
            label="Keterangan (px)"
            value={body.sizeCaption}
            range={RANGES.bodySize}
            integer
            invalid={invalid("body.sizeCaption")}
            onChange={(sizeCaption) => edit((d) => setBody(d, { sizeCaption }))}
          />
          <SelectField
            id="tipografi-isi-ketebalan"
            label="Ketebalan"
            value={`${body.weight}`}
            options={WEIGHT_OPTIONS}
            onChange={(weight) => edit((d) => setBody(d, { weight: toWeight(weight) }))}
            className="col-span-2"
          />
          <NumberField
            id="tipografi-isi-tinggi-baris"
            label="Tinggi baris"
            value={body.lineHeight}
            range={RANGES.lineHeight}
            invalid={invalid("body.lineHeight")}
            onChange={(lineHeight) => edit((d) => setBody(d, { lineHeight }))}
          />
          <NumberField
            id="tipografi-isi-jarak-huruf"
            label="Jarak huruf (em)"
            value={body.letterSpacing}
            range={RANGES.letterSpacing}
            allowNegative
            invalid={invalid("body.letterSpacing")}
            onChange={(letterSpacing) => edit((d) => setBody(d, { letterSpacing }))}
          />
        </div>
      </section>

      <section aria-labelledby="tipografi-label" className="space-y-3">
        <div className="space-y-1">
          <h3 id="tipografi-label" className="font-heading text-h6">
            Label
          </h3>
          <p className="text-body-sm text-muted-foreground">
            Label kecil di atas bagian dan baris meta, mis. &ldquo;KARYA GAMBAR &amp; CLAY · (01)&rdquo;.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 @md/editor:grid-cols-4">
          <NumberField
            id="tipografi-label-ukuran"
            label="Ukuran (px)"
            value={label.size}
            range={RANGES.labelSize}
            integer
            invalid={invalid("label.size")}
            onChange={(size) => edit((d) => setLabel(d, { size }))}
          />
          <SelectField
            id="tipografi-label-ketebalan"
            label="Ketebalan"
            value={`${label.weight}`}
            options={WEIGHT_OPTIONS}
            onChange={(weight) => edit((d) => setLabel(d, { weight: toWeight(weight) }))}
            valueText={`${label.weight}`}
          />
          <NumberField
            id="tipografi-label-tinggi-baris"
            label="Tinggi baris"
            value={label.lineHeight}
            range={RANGES.lineHeight}
            invalid={invalid("label.lineHeight")}
            onChange={(lineHeight) => edit((d) => setLabel(d, { lineHeight }))}
          />
          <NumberField
            id="tipografi-label-jarak-huruf"
            label="Jarak huruf (em)"
            value={label.letterSpacing}
            range={RANGES.letterSpacing}
            allowNegative
            invalid={invalid("label.letterSpacing")}
            onChange={(letterSpacing) => edit((d) => setLabel(d, { letterSpacing }))}
          />
        </div>
        <SwitchField
          id="tipografi-label-kapital"
          label="Huruf kapital"
          description="Label ditulis dengan huruf besar semua."
          checked={label.uppercase}
          onChange={(uppercase) => edit((d) => setLabel(d, { uppercase }))}
        />
      </section>
    </>
  );
}

function LevelRow({ level }: { level: TypeLevel }) {
  const { draft, invalidPaths, edit } = useThemeEditor();
  const t = draft.typography.levels[level];
  const name = TYPE_LEVEL_LABELS[level];
  const id = (field: string) => `tipografi-${level}-${field}`;
  const invalid = (field: string) => invalidPaths.has(`typography.levels.${level}.${field}`);
  // Di tabel (≥ 32rem) label terlihat diganti judul kolom; label tetap ada untuk pembaca layar.
  const labelClassName = "@lg/levels:sr-only";
  const inputClassName = "@lg/levels:px-2.5";

  return (
    <li
      className={`grid grid-cols-2 gap-3 rounded-card-nested bg-muted/60 p-3 @sm/levels:grid-cols-3 @lg/levels:items-center @lg/levels:gap-2 ${LEVEL_GRID}`}
    >
      <p className="col-span-full font-heading text-h6 @lg/levels:col-span-1 @lg/levels:text-body-sm">{name}</p>
      <NumberField
        id={id("desktop")}
        label="Desktop (px)"
        context={name}
        value={t.sizeDesktop}
        range={RANGES.headingSize}
        integer
        invalid={invalid("sizeDesktop")}
        onChange={(sizeDesktop) => edit((d) => setTypeLevel(d, level, { sizeDesktop }))}
        labelClassName={labelClassName}
        inputClassName={inputClassName}
      />
      <NumberField
        id={id("hp")}
        label="HP (px)"
        context={name}
        value={t.sizeMobile}
        range={RANGES.headingSize}
        integer
        invalid={invalid("sizeMobile")}
        onChange={(sizeMobile) => edit((d) => setTypeLevel(d, level, { sizeMobile }))}
        labelClassName={labelClassName}
        inputClassName={inputClassName}
      />
      <SelectField
        id={id("ketebalan")}
        label="Ketebalan"
        context={name}
        value={`${t.weight}`}
        options={WEIGHT_OPTIONS}
        onChange={(weight) => edit((d) => setTypeLevel(d, level, { weight: toWeight(weight) }))}
        valueText={`${t.weight}`}
        labelClassName={labelClassName}
        triggerClassName="@lg/levels:pl-2.5"
      />
      <NumberField
        id={id("tinggi-baris")}
        label="Tinggi baris"
        context={name}
        value={t.lineHeight}
        range={RANGES.lineHeight}
        invalid={invalid("lineHeight")}
        onChange={(lineHeight) => edit((d) => setTypeLevel(d, level, { lineHeight }))}
        labelClassName={labelClassName}
        inputClassName={inputClassName}
      />
      <NumberField
        id={id("jarak-huruf")}
        label="Jarak huruf (em)"
        context={name}
        value={t.letterSpacing}
        range={RANGES.letterSpacing}
        allowNegative
        invalid={invalid("letterSpacing")}
        onChange={(letterSpacing) => edit((d) => setTypeLevel(d, level, { letterSpacing }))}
        labelClassName={labelClassName}
        inputClassName={inputClassName}
      />
    </li>
  );
}
