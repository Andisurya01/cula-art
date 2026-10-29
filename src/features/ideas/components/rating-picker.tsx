import { ChipButton } from "./chip-button";

const VALUES = [1, 2, 3, 4, 5] as const;

/** Pilih angka 1-5; klik angka yang sama untuk mengosongkan. */
export function RatingPicker({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-1.5">
      {VALUES.map((n) => (
        <ChipButton
          key={n}
          active={value === n}
          onClick={() => onChange(value === n ? null : n)}
          className="w-9 justify-center px-0"
          aria-label={`${label} ${n}`}
          title={hint}
        >
          {n}
        </ChipButton>
      ))}
    </div>
  );
}
