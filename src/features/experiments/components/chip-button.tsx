import { cn } from "@/lib/utils";

/** Tombol pilihan bulat (pilih satu) untuk form Eksperimen. */
export function ChipButton({
  active,
  onClick,
  children,
  invalid,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  invalid?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-button border border-transparent px-3.5 py-1 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-60",
        active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:border-border",
        invalid && !active && "border-destructive",
      )}
    >
      {children}
    </button>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}
