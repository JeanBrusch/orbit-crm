"use client"

interface ArcMeterProps {
  value: number // 0-100
  size?: number
  strokeWidth?: number
  accentColor?: string // zone-inherited color
  className?: string
}

export function ArcMeter({
  value,
  size = 48,
  strokeWidth = 4,
  accentColor,
  className = "",
}: ArcMeterProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = Math.PI * radius // semi-circle
  const progress = Math.max(0, Math.min(100, value))
  const offset = circumference - (progress / 100) * circumference

  // Use accent color if provided, otherwise fall back to value-based
  const getColor = () => {
    if (accentColor) return accentColor
    if (value >= 70) return "var(--orbit-glow)"
    if (value >= 40) return "var(--orbit-accent)"
    return "var(--orbit-text-muted)"
  }

  const color = getColor()

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size / 2 + 8 }}
    >
      <svg
        width={size}
        height={size / 2 + strokeWidth}
        viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`}
        className="overflow-visible"
      >
        {/* Background arc */}
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          stroke="var(--orbit-glass-border)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
          style={{
            filter: value >= 60 ? `drop-shadow(0 0 4px ${color})` : undefined,
          }}
        />
      </svg>
      {/* Center value */}
      <span
        className="absolute text-[10px] font-semibold"
        style={{
          color,
          bottom: 0,
        }}
      >
        {Math.round(value)}
      </span>
    </div>
  )
}
