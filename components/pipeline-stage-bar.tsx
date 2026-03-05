"use client"

import { useCallback } from "react"
import { Check } from "lucide-react"

import { PIPELINE_STAGES } from "@/types/orbit-types"
import type { PipelineStage } from "@/types/orbit-types"

interface PipelineStageBarProps {
  currentStage: PipelineStage
  onStageChange: (stage: PipelineStage) => void
}

export function PipelineStageBar({ currentStage, onStageChange }: PipelineStageBarProps) {
  const currentIndex = PIPELINE_STAGES.findIndex((s) => s.key === currentStage)

  const handleStageClick = useCallback(
    (stage: PipelineStage) => {
      onStageChange(stage)
    },
    [onStageChange]
  )

  return (
    <div className="w-full px-2 py-6">
      {/* Stage nodes connected by lines */}
      <div className="relative flex items-center justify-between">
        {/* Connection line (background) */}
        <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-[var(--orbit-glass-border)]" />

        {/* Progress line (filled) */}
        <div
          className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-[var(--orbit-glow)] transition-all duration-500"
          style={{
            width:
              currentIndex === 0
                ? "0%"
                : `${(currentIndex / (PIPELINE_STAGES.length - 1)) * 100}%`,
          }}
        />

        {PIPELINE_STAGES.map((stage, index) => {
          const isCompleted = index < currentIndex
          const isCurrent = index === currentIndex
          const isFuture = index > currentIndex

          return (
            <button
              key={stage.key}
              onClick={() => handleStageClick(stage.key)}
              className="group relative z-10 flex flex-col items-center gap-2"
              aria-label={`${stage.label}${isCurrent ? " (etapa atual)" : ""}`}
              aria-current={isCurrent ? "step" : undefined}
            >
              {/* Node circle */}
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                  isCurrent
                    ? "border-[var(--orbit-glow)] bg-[var(--orbit-glow)] text-[var(--orbit-bg)] shadow-[0_0_20px_rgba(var(--orbit-glow-rgb),0.4)]"
                    : isCompleted
                      ? "border-[var(--orbit-glow)] bg-[var(--orbit-glow)]/20 text-[var(--orbit-glow)]"
                      : "border-[var(--orbit-glass-border)] bg-[var(--orbit-glass)] text-[var(--orbit-text-muted)] group-hover:border-[var(--orbit-glow)]/50 group-hover:bg-[var(--orbit-glow)]/10 group-hover:text-[var(--orbit-text)]"
                }`}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="text-xs font-semibold">{index + 1}</span>
                )}
              </div>

              {/* Label */}
              <span
                className={`absolute -bottom-6 whitespace-nowrap text-[10px] font-medium transition-colors duration-300 ${
                  isCurrent
                    ? "text-[var(--orbit-glow)]"
                    : isCompleted
                      ? "text-[var(--orbit-text)]"
                      : "text-[var(--orbit-text-muted)] group-hover:text-[var(--orbit-text)]"
                }`}
              >
                {stage.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
