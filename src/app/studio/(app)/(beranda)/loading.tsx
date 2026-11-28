import { HomeSkeleton } from "@/features/home/components/home-skeleton";

// Beranda ada di route group `(beranda)` (URL tetap /studio) supaya kerangka ini hanya berlaku untuk
// Beranda: `loading.tsx` di `(app)/` akan ikut tampil di semua menu Studio yang tidak punya sendiri.
export default function Loading() {
  return <HomeSkeleton />;
}
