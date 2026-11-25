import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Tombol pilihan berbentuk pil (toggle): aktif = pil primer, lainnya = pil abu (gaya Tabs pill). */
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
        buttonVariants({ variant: active ? "default" : "secondary", size: "sm" }),
        "h-9 gap-1.5 px-3.5",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
