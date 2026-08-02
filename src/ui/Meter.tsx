export function Meter({
  icon,
  label,
  value,
  kind,
}: {
  icon: string
  label: string
  value: number
  kind: 'water' | 'nutrition' | 'health' | 'growth' | 'barrel'
}) {
  const pct = Math.round(value)
  return (
    <div
      className="meter"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <span className="meter-icon" aria-hidden="true">
        {icon}
      </span>
      <div className="bar">
        <div className={`fill ${kind}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
