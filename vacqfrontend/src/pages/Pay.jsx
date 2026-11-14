import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { FaCreditCard, FaQrcode, FaCheckCircle, FaEnvelopeOpenText, FaReceipt } from 'react-icons/fa'
import api, { errorMessage } from '../app/api'
import Spinner from '../components/Spinner'
import { baht, nightsBetween, showDate } from '../utils/format'
import { openReceipt } from '../utils/receipt'

// Demo checkout: nothing is typed or charged. The card path sends this fixed test number (any 16 digits succeed).
const DEMO_CARD = '4111111111111111'

function Pay() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [booking, setBooking] = useState(null)
  const [method, setMethod] = useState('card')
  const [paying, setPaying] = useState(false)
  const [email, setEmail] = useState(null) // result of the confirmation email after paying
  const [checkinCode, setCheckinCode] = useState(null) // signed code inside the QR (also on the receipt)

  useEffect(() => {
    api.get(`/bookings/${id}`)
      .then((res) => setBooking(res.data.data))
      .catch((e) => { toast.error(errorMessage(e)); navigate('/bookings') })
  }, [id, navigate])

  const onPay = async (e) => {
    e.preventDefault()
    setPaying(true)
    try {
      const body = method === 'card' ? { method, cardNumber: DEMO_CARD } : { method }
      const res = await api.post(`/bookings/${id}/pay`, body)
      setBooking(res.data.data)
      setEmail(res.data.email)
      setCheckinCode(res.data.checkinToken)
      toast.success('Payment successful')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setPaying(false)
    }
  }

  if (!booking) return <Spinner />

  const hotel = booking.hotel || {}
  const nights = nightsBetween(booking.checkIn, booking.checkOut)
  const amount = booking.payment?.amount ?? nights * (hotel.pricePerNight || 0)

  const summary = (
    <div className='card summary'>
      <h3>{hotel.name}</h3>
      <p className='muted'>{hotel.address}</p>
      <p>{showDate(booking.checkIn)} → {showDate(booking.checkOut)} · {nights} night{nights > 1 ? 's' : ''}</p>
      <p className='total'>Total <strong>{baht(amount)}</strong></p>
    </div>
  )

  if (booking.status === 'paid') {
    return (
      <>
        <section className='heading'>
          <h1 className='success-text'><FaCheckCircle /> Booking confirmed</h1>
          <p>Reference <strong>{booking.payment?.reference}</strong></p>
        </section>
        {summary}
        {checkinCode && (
          <div className="card summary">
            <p className="small"><strong>Check-in code</strong> (the same code is inside the QR in your email and receipt)</p>
            <p className="mono small code-box">{checkinCode}</p>
          </div>
        )}
        {email && (
          <p className={email.sent ? 'muted' : 'error-text'}>
            {email.sent
              ? 'A confirmation email with your QR code and receipt has been sent.'
              : 'Payment saved, but the confirmation email could not be sent.'}
          </p>
        )}
        <div className='actions'>
          {email?.previewUrl && (
            <a className='btn' href={email.previewUrl} target='_blank' rel='noreferrer'>
              <FaEnvelopeOpenText /> Open confirmation email
            </a>
          )}
          <button className='btn btn-reverse' onClick={() => openReceipt(booking._id)}>
            <FaReceipt /> View receipt
          </button>
          <Link className='btn btn-reverse' to='/bookings'>My bookings</Link>
        </div>
      </>
    )
  }

  return (
    <>
      <section className='heading'>
        <h1>Payment</h1>
        <p>Demo payment: choose a method and confirm. No details are needed and no real money is charged.</p>
      </section>
      {summary}

      <section className='form'>
        <form onSubmit={onPay}>
          <div className='method-tabs' role='radiogroup' aria-label='Payment method'>
            <button type='button' role='radio' aria-checked={method === 'card'}
              className={method === 'card' ? 'active' : ''} onClick={() => setMethod('card')}>
              <FaCreditCard /> Credit card
            </button>
            <button type='button' role='radio' aria-checked={method === 'promptpay'}
              className={method === 'promptpay' ? 'active' : ''} onClick={() => setMethod('promptpay')}>
              <FaQrcode /> PromptPay
            </button>
          </div>

          <p className='hint'>
            {method === 'card'
              ? 'Demo checkout: no card details needed and nothing is charged.'
              : 'Demo checkout: PromptPay is simulated, no QR to scan and nothing is charged.'}
          </p>

          <button className='btn btn-block' disabled={paying}>
            {paying ? 'Processing…' : `Pay ${baht(amount)}`}
          </button>
        </form>
      </section>
    </>
  )
}

export default Pay
