import { cn } from "cn";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Label + isi + error (atau petunjuk). `aside` tampil di kanan label, mis. penghitung. */
export function GuideField({
  id,
  label,
  hint,
  error,
  aside,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: React.ReactNode;
  error?: string | null;
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid content-start gap-2", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {aside}
      </div>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

export function SectionTitle({ id, title, description }: { id: string; title: string; description?: string }) {
  return (
    <div className="grid gap-1">
      <h3 id={id} className="text-sm font-medium">
        {title}
      </h3>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

const NONE = "__none__";

/**
 * Select pilihan tetap yang boleh kosong: `null` ditampilkan sebagai `emptyLabel` (Radix Select tidak
 * menerima value "", jadi dipakai sentinel).
 */
export function NullableSelect<T extends string>({
  id,
  value,
  onChange,
  onBlur,
  options,
  emptyLabel,
  invalid,
  ariaLabel,
  className,
}: {
  id: string;
  value: T | null;
  onChange: (value: T | null) => void;
  onBlur?: () => void;
  options: Record<T, string>;
  emptyLabel: string;
  invalid?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  const entries = Object.entries(options) as [T, string][];
  return (
    <Select value={value ?? NONE} onValueChange={(next) => onChange(next === NONE ? null : (next as T))}>
      <SelectTrigger
        id={id}
        className={cn("w-full", className)}
        aria-label={ariaLabel}
        aria-invalid={invalid}
        onBlur={onBlur}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{emptyLabel}</SelectItem>
        {entries.map(([key, label]) => (
          <SelectItem key={key} value={key}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
