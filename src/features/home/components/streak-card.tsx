import { Flame } from "lucide-react";
import { BentoCard } from "@/components/design/bento-card";

/** Streak (D9): minggu berturut-turut dengan post tayang memenuhi target. Kartu bento lime. */
export function StreakCard({ streak, className }: { streak: number; className?: string }) {
  return (
    <BentoCard
      tone="lime"
      icon={<Flame aria-hidden />}
      label="Streak"
      value={streak}
      description={`${streak === 1 ? "minggu" : "minggu berturut-turut"} dengan post tayang memenuhi target`}
      className={className}
    />
  );
}
