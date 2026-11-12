import { todayISO, addDays, MAX_NIGHTS, showDate } from '../utils/format'

// Check-in date + number of nights (1-3). The check-out date is derived, so a stay can never exceed 3 nights.
function StayPicker({ checkIn, nights, onChange }) {
  return (
    <div className='stay-picker'>
      <div className='form-group'>
        <label htmlFor='checkIn'>Check-in</label>
        <input
          type='date'
          id='checkIn'
          className='form-control'
          min={todayISO()}
          value={checkIn}
          onChange={(e) => onChange({ checkIn: e.target.value, nights })}
          required
        />
      </div>
      <div className='form-group'>
        <label htmlFor='nights'>Nights</label>
        <select
          id='nights'
          value={nights}
          onChange={(e) => onChange({ checkIn, nights: Number(e.target.value) })}
        >
          {Array.from({ length: MAX_NIGHTS }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>{n} night{n > 1 ? 's' : ''}</option>
          ))}
        </select>
      </div>
      {checkIn && (
        <p className='muted'>Check-out: <strong>{showDate(addDays(checkIn, nights))}</strong></p>
      )}
    </div>
  )
}

export default StayPicker
