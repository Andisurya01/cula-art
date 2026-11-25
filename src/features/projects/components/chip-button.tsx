import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Tombol pilihan berbentuk pil (pilih satu): aktif = pil primer, lainnya = pil abu. */
export function ChipButton({
  active,
  onClick,
  children,
  invalid,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  invalid?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        buttonVariants({ variant: active ? "default" : "secondary", size: "sm" }),
        "h-9 gap-1.5 px-3.5",
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
