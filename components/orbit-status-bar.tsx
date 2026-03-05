"use client";

import {
  isSilent,
  followUpRemainingDays,
  type Lead,
} from "@/types/orbit-types";

export function OrbitStatusBar({ leads }: { leads: Lead[] }) {
  const activeCount = leads.filter((l) => l.pipelineStage !== "closed").length;
  const followUpTodayCount = leads.filter((l) => {
    const remaining = followUpRemainingDays(l);
    return remaining !== null && remaining <= 1;
  }).length;
  const silentCount = leads.filter((l) => isSilent(l)).length;

  return (
    <div className="pointer-events-none absolute left-0 right-0 top-0 z-30 flex items-center justify-center px-6 pt-3 pb-1 gap-3 text-[10px] font-light tracking-widest text-[var(--orbit-text-muted)]/50">
      <span>{activeCount} ativos</span>
      <span className="opacity-30">&bull;</span>
      <span
        className={followUpTodayCount > 0 ? "text-[var(--orbit-glow)]/70" : ""}
      >
        {followUpTodayCount} follow-up
      </span>
      <span className="opacity-30">&bull;</span>
      <span>{silentCount} silenciosos</span>
    </div>
  );
}
