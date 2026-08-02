export function Meter({
  icon,
  label,
  value,
  kind,
  onInfo,
}: {
  icon: string
  label: string
  value: number
  kind: 'water' | 'nutrition' | 'health' | 'growth' | 'barrel' | 'humidity'
  /** Tapping a meter opens its explainer dialog. */
  onInfo: () => void
}) {
  const pct = Math.round(value)
  return (
    <button type="button" className="meter" aria-label={label} title={label} onClick={onInfo}>
      <span className="meter-icon" aria-hidden="true">
        {icon}
      </span>
      <span
        className="bar"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <span className={`fill ${kind}`} style={{ width: `${pct}%` }} />
      </span>
    </button>
  )
}
