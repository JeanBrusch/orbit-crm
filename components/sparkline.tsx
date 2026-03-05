"use client"

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  strokeColor?: string
  className?: string
}

export function Sparkline({
  data,
  width = 64,
  height = 20,
  strokeColor,
  className = "",
}: SparklineProps) {
  if (!data || data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const padding = 2

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2)
    const y = height - padding - ((val - min) / range) * (height - padding * 2)
    return { x, y }
  })

  // Build smooth path using quadratic curves
  let path = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const cpx = (prev.x + curr.x) / 2
    path += ` Q ${prev.x + (curr.x - prev.x) * 0.5} ${prev.y} ${cpx} ${(prev.y + curr.y) / 2}`
  }
  // final segment
  const last = points[points.length - 1]
  path += ` L ${last.x} ${last.y}`

  // Area fill path
  const areaPath = `${path} L ${last.x} ${height} L ${points[0].x} ${height} Z`

  const color = strokeColor || "var(--orbit-glow)"

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`overflow-visible ${className}`}
    >
      <defs>
        <linearGradient id={`sparkFill-${data.length}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <path
        d={areaPath}
        fill={`url(#sparkFill-${data.length})`}
      />
      {/* Line */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point dot */}
      <circle
        cx={last.x}
        cy={last.y}
        r="2"
        fill={color}
        className="animate-activity-pulse"
      />
    </svg>
  )
}
