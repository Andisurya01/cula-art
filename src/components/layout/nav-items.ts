import {
  BarChart3,
  CalendarDays,
  FlaskConical,
  FolderKanban,
  Frame,
  Home,
  Layers,
  Lightbulb,
  ListChecks,
  NotebookPen,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { routes } from "@/lib/routes";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { href: routes.studio.home, label: "Beranda", icon: Home },
  { href: routes.studio.ideas, label: "Bank Ide", icon: Lightbulb },
  { href: routes.studio.pipeline, label: "Pipeline", icon: FolderKanban },
  { href: routes.studio.calendar, label: "Kalender", icon: CalendarDays },
  { href: routes.studio.projects, label: "Proyek & Seri", icon: Layers },
  { href: routes.studio.artworks, label: "Karya", icon: Frame },
  { href: routes.studio.posts, label: "Postingan", icon: ListChecks },
  { href: routes.studio.analytics, label: "Analitik", icon: BarChart3 },
  { href: routes.studio.experiments, label: "Eksperimen", icon: FlaskConical },
  { href: routes.studio.review, label: "Review Mingguan", icon: NotebookPen },
  { href: routes.studio.settings, label: "Pengaturan", icon: Settings },
];

/** Bottom nav HP: Beranda, Pipeline, [+ Ide], Kalender, Lainnya. */
export const BOTTOM_NAV_HREFS = [routes.studio.home, routes.studio.pipeline, routes.studio.calendar] as const;

/** Beranda Studio (`/studio`) adalah awalan semua menu, jadi hanya aktif jika path-nya persis sama. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === routes.studio.home) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
