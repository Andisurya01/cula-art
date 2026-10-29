import { cn } from "@/lib/utils";

/** Tombol pilihan bulat (toggle). */
export function ChipButton({
  active,
  onClick,
  children,
  className,
  ...props
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
} & Omit<React.ComponentProps<"button">, "onClick" | "children" | "className">) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border hover:bg-muted",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
