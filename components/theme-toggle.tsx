"use client"

import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card backdrop-blur-xl" />
    )
  }

  const isDark = theme === "dark"

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--orbit-glass-border)] bg-[var(--orbit-glass)] backdrop-blur-xl shadow-[var(--orbit-shadow)] transition-all duration-300 hover:border-[var(--orbit-glow)]/50 hover:shadow-[var(--orbit-shadow-hover)]"
      aria-label={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-[var(--orbit-accent)]" />
      ) : (
        <Moon className="h-4 w-4 text-[var(--orbit-glow)]" />
      )}
    </button>
  )
}
