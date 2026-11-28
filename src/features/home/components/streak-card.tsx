import { Flame } from "lucide-react";
import { BentoCard } from "@/components/design/bento-card";
import { CountUp } from "@/components/motion/count-up";

/**
 * Streak (D9): minggu berturut-turut dengan post tayang memenuhi target. Kartu bento lime. Angka
 * menghitung naik sekali saat terlihat (nilai akhir sudah ada di HTML; diam saat Mati/kurangi gerakan).
 */
export function StreakCard({
  streak,
  className,
  style,
}: {
  streak: number;
  className?: string;
  /** Mis. `motionIndex(i)` untuk masuk berjeda (Fase 7). */
  style?: React.CSSProperties;
}) {
  return (
    <BentoCard
      tone="lime"
      icon={<Flame aria-hidden />}
      label="Streak"
      value={<CountUp value={streak} />}
      description={`${streak === 1 ? "minggu" : "minggu berturut-turut"} dengan post tayang memenuhi target`}
      className={className}
      style={style}
    />
  );
}
