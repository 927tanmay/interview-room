// A row of short choices as one radio group: arrow keys move between them,
// Tab moves past the group, and the focus ring shows on the chip.
export type Chip<T extends string | number> = { value: T; label: string; disabled?: boolean }

export function ChoiceChips<T extends string | number>({
  name,
  legend,
  options,
  value,
  onChange,
  hint,
}: {
  name: string
  legend: string
  options: Chip<T>[]
  value: T
  onChange: (value: T) => void
  hint?: string
}) {
  return (
    <fieldset className="chip-field">
      <legend>{legend}</legend>
      <div className="chips">
        {options.map((o) => (
          <label key={String(o.value)} className={o.disabled ? 'chip chip-disabled' : 'chip'}>
            <input
              type="radio"
              name={name}
              id={`${name}-${o.value}`}
              value={String(o.value)}
              checked={value === o.value}
              disabled={o.disabled}
              onChange={() => onChange(o.value)}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      {hint && <p className="chip-hint">{hint}</p>}
    </fieldset>
  )
}
