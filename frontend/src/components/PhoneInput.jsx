/**
 * Controlled phone input with an ISD code prefix dropdown.
 *
 * Props:
 *   value          – full phone string, e.g. "+27 821234567"
 *   onChange(v)    – called with the new full phone string
 *   countries      – array from /api/countries
 *   defaultPrefix  – ISD prefix to use when value is empty, e.g. "+27"
 *   placeholder    – input placeholder text
 *   style          – optional style object for the wrapper div
 */
export default function PhoneInput({ value = '', onChange, countries = [], defaultPrefix = '+27', placeholder = 'Phone number', style }) {
  function parse(v) {
    if (!v) return { prefix: defaultPrefix, rest: '' }
    const m = v.match(/^(\+\d{1,4})\s*(.*)$/)
    return m ? { prefix: m[1], rest: m[2] } : { prefix: defaultPrefix, rest: v }
  }

  const { prefix, rest } = parse(value)

  function handlePrefix(e) {
    const p = e.target.value
    onChange(rest ? `${p} ${rest}` : p)
  }

  function handleNumber(e) {
    const n = e.target.value
    onChange(n ? `${prefix} ${n}` : prefix)
  }

  return (
    <div className="phoneInput" style={style}>
      <select value={prefix} onChange={handlePrefix} className="phonePrefix">
        {countries.map(c => (
          <option key={c.iso2} value={`+${c.isdCode}`}>+{c.isdCode} {c.name}</option>
        ))}
        {/* Fallback if countries haven't loaded yet */}
        {countries.length === 0 && <option value={prefix}>{prefix}</option>}
      </select>
      <input
        type="tel"
        value={rest}
        onChange={handleNumber}
        placeholder={placeholder}
        className="phoneNumber"
      />
    </div>
  )
}
