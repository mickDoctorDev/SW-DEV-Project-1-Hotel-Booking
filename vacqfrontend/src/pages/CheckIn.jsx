import { useState } from 'react'
import { FaCamera, FaQrcode, FaCheckCircle, FaTimesCircle, FaExclamationTriangle } from 'react-icons/fa'
import api from '../app/api'
import QrScanner from '../components/QrScanner'
import { baht, nightsBetween, showDate } from '../utils/format'

// Hotel staff (admin) verify the code from the guest's QR / receipt. The server checks the HMAC signature,
// that the booking is still paid with the same payment, and records the check-in only once.
function CheckIn() {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null) // { kind: 'ok' | 'already' | 'invalid', message, data }

  const submit = async (token) => {
    if (!token.trim()) return
    setBusy(true)
    setResult(null)
    try {
      const res = await api.post('/bookings/checkin', { token: token.trim() })
      setResult({ kind: 'ok', message: res.data.message, data: res.data.data })
    } catch (err) {
      const body = err.response?.data || {}
      setResult({
        kind: body.alreadyCheckedIn ? 'already' : 'invalid',
        message: body.message || 'Could not verify the code',
        data: body.data,
      })
    } finally {
      setBusy(false)
    }
  }

  const verify = (e) => { e.preventDefault(); submit(code) }

  // a scanned code is submitted straight away; the server checks the guest in only once
  const onScan = (text) => { setScanning(false); setCode(text); submit(text) }

  const Icon = { ok: FaCheckCircle, already: FaExclamationTriangle, invalid: FaTimesCircle }[result?.kind]
  const d = result?.data

  return (
    <>
      <section className='heading'>
        <h1><FaQrcode /> Guest check-in</h1>
        <p>Scan the QR code on the guest&apos;s confirmation email, or paste the check-in code printed under it.</p>
      </section>

      <section className='form'>
        {scanning ? (
          <>
            <QrScanner onScan={onScan} />
            <button type='button' className='btn btn-reverse btn-block' onClick={() => setScanning(false)}>Cancel scanning</button>
          </>
        ) : (
          <button type='button' className='btn btn-gold btn-block' onClick={() => { setResult(null); setScanning(true) }} disabled={busy}>
            <FaCamera /> Scan QR code with camera
          </button>
        )}
        <p className='or-line'>or paste the code</p>
        <form onSubmit={verify}>
          <div className='form-group'>
            <label htmlFor='code'>Check-in code</label>
            <textarea
              id='code'
              rows={3}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder='HB1.…'
              spellCheck={false}
              className='mono'
              required
            />
          </div>
          <button className='btn btn-block' disabled={busy}>{busy ? 'Verifying…' : 'Verify and check in'}</button>
        </form>

        {result && (
          <div className={`card checkin-result ${result.kind}`} role='status'>
            <h3><Icon /> {result.message}</h3>
            {d && (
              <>
                <p><strong>{d.guest?.name}</strong>{d.guest?.tel ? ` · ${d.guest.tel}` : ''}</p>
                <p>{d.hotel}</p>
                <p>{showDate(d.checkIn)} → {showDate(d.checkOut)} · {nightsBetween(d.checkIn, d.checkOut)} night(s) · {baht(d.amount)}</p>
                <p className='muted small'>Ref {d.reference} · checked in {new Date(d.checkedInAt).toLocaleString('en-GB')}</p>
              </>
            )}
          </div>
        )}
      </section>
    </>
  )
}

export default CheckIn
