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
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted",
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
