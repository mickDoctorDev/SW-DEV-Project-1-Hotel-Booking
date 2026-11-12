import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { FaCreditCard, FaQrcode, FaCheckCircle, FaEnvelopeOpenText, FaReceipt } from 'react-icons/fa'
import api, { errorMessage } from '../app/api'
import Spinner from '../components/Spinner'
import { baht, nightsBetween, showDate } from '../utils/format'
import { openReceipt } from '../utils/receipt'

// groups the digits as "4111 1111 1111 1111" while typing
const formatCard = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ')

function Pay() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [booking, setBooking] = useState(null)
  const [method, setMethod] = useState('card')
  const [card, setCard] = useState('')
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
      const body = method === 'card' ? { method, cardNumber: card } : { method }
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
        <p>Mock payment for this project. No real money is charged.</p>
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

          {method === 'card' ? (
            <div className='form-group'>
              <label htmlFor='card'>Card number</label>
              <input
                id='card'
                className='form-control'
                inputMode='numeric'
                autoComplete='off'
                placeholder='4111 1111 1111 1111'
                value={card}
                onChange={(e) => setCard(formatCard(e.target.value))}
                pattern='(\d{4} ){3}\d{4}'
                required
              />
              <p className='hint'>Test cards: any 16 digits succeeds, a card ending in 0000 is declined.</p>
            </div>
          ) : (
            <p className='hint'>PromptPay is simulated and succeeds immediately.</p>
          )}

          <button className='btn btn-block' disabled={paying}>
            {paying ? 'Processing…' : `Pay ${baht(amount)}`}
          </button>
        </form>
      </section>
    </>
  )
}

export default Pay
