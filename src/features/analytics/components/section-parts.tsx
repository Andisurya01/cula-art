import Link from "next/link";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

/** Judul satu bagian halaman + penjelasan satu kalimat. */
export function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mt-2">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

/** Empty state kecil di dalam kartu: apa yang perlu diisi, tanpa grafik kosong. */
export function SectionEmpty({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="grid justify-items-start gap-2 text-sm text-muted-foreground">
      <p>{children}</p>
      {action}
    </div>
  );
}

export function PostsLink() {
  return (
    <Button asChild variant="outline" size="sm">
      <Link href={routes.studio.posts}>Buka Postingan</Link>
    </Button>
  );
}
