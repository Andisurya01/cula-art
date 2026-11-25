"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { hexFieldError, isHexColor, normalizeHexInput, numberFieldError } from "../editor-state";

// Kontrol form menu Tampilan. Semua isian punya <label>; `context` menambah konteks tersembunyi
// untuk pembaca layar (mis. "H1, Desktop (px)") saat label yang terlihat hanya judul kolom.

function FieldLabel({
  htmlFor,
  label,
  context,
  className,
}: {
  htmlFor: string;
  label: string;
  context?: string;
  className?: string;
}) {
  return (
    <Label htmlFor={htmlFor} className={cn("leading-snug", className)}>
      <span>
        {context ? <span className="sr-only">{context}, </span> : null}
        {label}
      </span>
    </Label>
  );
}

export function FieldMessage({ id, children, tone = "error" }: { id: string; children: React.ReactNode; tone?: "error" | "hint" }) {
  return (
    <p id={id} className={cn("text-caption", tone === "error" ? "text-destructive" : "text-muted-foreground")}>
      {children}
    </p>
  );
}

export function NumberField({
  id,
  label,
  context,
  value,
  range,
  integer = false,
  allowNegative = false,
  invalid,
  disabled,
  hint,
  onChange,
  className,
  labelClassName,
  inputClassName,
}: {
  id: string;
  label: string;
  context?: string;
  value: number;
  range: { min: number; max: number; step: number };
  integer?: boolean;
  /** Nilai negatif (tracking): tanpa `inputMode`, supaya keyboard HP punya tanda minus. */
  allowNegative?: boolean;
  invalid: boolean;
  disabled?: boolean;
  hint?: string;
  onChange: (value: number) => void;
  className?: string;
  labelClassName?: string;
  inputClassName?: string;
}) {
  const message = invalid ? (numberFieldError(value, range, { integer }) ?? "Nilai tidak valid.") : null;
  const describedBy = message ? `${id}-pesan` : hint ? `${id}-petunjuk` : undefined;
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <FieldLabel htmlFor={id} label={label} context={context} className={labelClassName} />
      <Input
        id={id}
        type="number"
        inputMode={allowNegative ? undefined : integer ? "numeric" : "decimal"}
        min={range.min}
        max={range.max}
        step={range.step}
        value={Number.isFinite(value) ? value : ""}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn(
          "tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          inputClassName,
        )}
      />
      {message ? (
        <FieldMessage id={`${id}-pesan`}>{message}</FieldMessage>
      ) : hint ? (
        <FieldMessage id={`${id}-petunjuk`} tone="hint">
          {hint}
        </FieldMessage>
      ) : null}
    </div>
  );
}

/** Pemilih warna native + input hex. `fallback` = warna valid terakhir untuk pemilih saat hex belum lengkap. */
export function ColorField({
  id,
  label,
  value,
  fallback,
  invalid,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  fallback: string;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  const message = invalid ? (hexFieldError(value) ?? "Warna tidak valid.") : null;
  const swatch = (isHexColor(value) ? value : fallback).toLowerCase();
  return (
    <div className="min-w-0 space-y-1.5">
      <FieldLabel htmlFor={id} label={label} />
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={swatch}
          onChange={(event) => onChange(normalizeHexInput(event.currentTarget.value))}
          aria-label={`Pilih warna ${label}`}
          className="size-10 shrink-0 cursor-pointer appearance-none overflow-hidden rounded-full border border-input bg-transparent p-0 outline-hidden focus-visible:ring-3 focus-visible:ring-ring [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
        />
        <Input
          id={id}
          value={value}
          onChange={(event) => onChange(normalizeHexInput(event.currentTarget.value))}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="#RRGGBB"
          aria-invalid={invalid || undefined}
          aria-describedby={message ? `${id}-pesan` : undefined}
          className="font-mono uppercase tabular-nums"
        />
      </div>
      {message ? <FieldMessage id={`${id}-pesan`}>{message}</FieldMessage> : null}
    </div>
  );
}

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  style?: React.CSSProperties;
}

export function SelectField<T extends string>({
  id,
  label,
  context,
  value,
  options,
  onChange,
  valueText,
  triggerStyle,
  hint,
  className,
  labelClassName,
  triggerClassName,
}: {
  id: string;
  label: string;
  context?: string;
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  /** Teks singkat di tombol (mis. "500" di tabel); daftar tetap memakai label lengkap. */
  valueText?: string;
  triggerStyle?: React.CSSProperties;
  hint?: string;
  className?: string;
  labelClassName?: string;
  triggerClassName?: string;
}) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <FieldLabel htmlFor={id} label={label} context={context} className={labelClassName} />
      <Select
        value={value}
        onValueChange={(next) => {
          const option = options.find((o) => o.value === next);
          if (option) onChange(option.value);
        }}
      >
        <SelectTrigger
          id={id}
          className={cn("w-full", triggerClassName)}
          style={triggerStyle}
          aria-describedby={hint ? `${id}-petunjuk` : undefined}
        >
          <SelectValue>{valueText}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} style={option.style}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hint ? (
        <FieldMessage id={`${id}-petunjuk`} tone="hint">
          {hint}
        </FieldMessage>
      ) : null}
    </div>
  );
}

export function SwitchField({
  id,
  label,
  description,
  checked,
  onChange,
  className,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-14 items-center justify-between gap-4 rounded-card-nested bg-card px-4 py-3 ring-1 ring-border/60",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <Label htmlFor={id} className="leading-snug">
          {label}
        </Label>
        {description ? (
          <p id={`${id}-keterangan`} className="text-caption text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        aria-describedby={description ? `${id}-keterangan` : undefined}
      />
    </div>
  );
}

export interface PillOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

/** Pilihan tunggal berbentuk pil di lintasan abu (radio native: panah keyboard berfungsi). */
export function PillRadioGroup<T extends string>({
  legend,
  hideLegend = false,
  value,
  options,
  onChange,
  className,
  fullWidth = false,
}: {
  legend: string;
  hideLegend?: boolean;
  value: T;
  options: readonly PillOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  fullWidth?: boolean;
}) {
  const name = useId();
  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className={hideLegend ? "sr-only" : "mb-2 text-sm font-medium"}>{legend}</legend>
      <div
        className={cn(
          "h-10 max-w-full items-center rounded-button bg-muted p-1",
          fullWidth ? "flex w-full" : "inline-flex",
        )}
      >
        {options.map((option) => (
          <label key={option.value} className="relative h-full min-w-0 flex-1">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span
              className={cn(
                "flex h-full cursor-pointer items-center justify-center gap-1.5 rounded-button px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-[color,background-color,box-shadow] duration-fast ease-standard peer-checked:bg-card peer-checked:text-foreground peer-checked:shadow-sm peer-focus-visible:ring-3 peer-focus-visible:ring-ring hover:text-foreground sm:px-3.5 [&_svg]:size-4 [&_svg]:shrink-0",
                // Tiga pilihan atau lebih di HP: tanpa ikon, supaya muat di lebar 375 px.
                options.length > 2 && "max-sm:[&_svg]:hidden",
              )}
            >
              {option.icon}
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
