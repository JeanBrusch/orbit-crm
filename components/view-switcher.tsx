"use client"

import { motion } from "framer-motion"
import { Orbit, Waves } from "lucide-react"
import type { ViewMode } from "@/hooks/use-leads"

interface ViewSwitcherProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

export function ViewSwitcher({ viewMode, onViewModeChange }: ViewSwitcherProps) {
  return (
    <div className="relative flex items-center gap-0.5 rounded-full border border-[var(--orbit-glass-border)] bg-[var(--orbit-glass)] p-1 backdrop-blur-xl">
      {/* Animated background pill */}
      <motion.div
        className="absolute inset-y-1 rounded-full bg-[var(--orbit-glow)]/15 border border-[var(--orbit-glow)]/30"
        layout
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        style={{
          left: viewMode === "orbit" ? 4 : "50%",
          right: viewMode === "stream" ? 4 : "50%",
          width: "calc(50% - 4px)",
        }}
        animate={{
          x: viewMode === "orbit" ? 0 : 0,
          left: viewMode === "orbit" ? 4 : "calc(50%)",
        }}
      />

      <button
        onClick={() => onViewModeChange("orbit")}
        className={`relative z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors duration-200 ${
          viewMode === "orbit"
            ? "text-[var(--orbit-glow)]"
            : "text-[var(--orbit-text-muted)] hover:text-[var(--orbit-text)]"
        }`}
        aria-label="Visualizacao Orbit"
        aria-pressed={viewMode === "orbit"}
      >
        <Orbit className="h-3.5 w-3.5" />
        <span>Orbit</span>
      </button>

      <button
        onClick={() => onViewModeChange("stream")}
        className={`relative z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors duration-200 ${
          viewMode === "stream"
            ? "text-[var(--orbit-glow)]"
            : "text-[var(--orbit-text-muted)] hover:text-[var(--orbit-text)]"
        }`}
        aria-label="Visualizacao Stream"
        aria-pressed={viewMode === "stream"}
      >
        <Waves className="h-3.5 w-3.5" />
        <span>Stream</span>
      </button>
    </div>
  )
}
