import { Button } from "@/components/ui/button";

const SUFFIX_CHIPS = [
  { suffix: "K", label: "K (ribu)" },
  { suffix: "jt", label: "jt (juta)" },
] as const;

/**
 * Keyboard angka di HP tidak punya huruf, jadi akhiran `12,3K` ditambahkan lewat tombol ini.
 * Hanya tampil di layar kecil; di desktop akhiran bisa diketik.
 */
export function CountSuffixChips({ disabled = false, onPick }: { disabled?: boolean; onPick: (suffix: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:hidden">
      <span className="text-xs text-muted-foreground">Akhiran:</span>
      {SUFFIX_CHIPS.map(({ suffix, label }) => (
        <Button
          key={suffix}
          type="button"
          variant="outline"
          size="xs"
          disabled={disabled}
          // preventDefault supaya fokus (dan keyboard HP) tidak pindah ke tombol.
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => onPick(suffix)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
