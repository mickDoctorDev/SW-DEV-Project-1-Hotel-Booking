import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { FaMapMarkerAlt, FaPhone, FaArrowLeft } from 'react-icons/fa'
import api, { errorMessage } from '../app/api'
import Spinner from '../components/Spinner'
import StayPicker from '../components/StayPicker'
import { addDays, baht, todayISO } from '../utils/format'

function BookHotel() {
  const { hotelId } = useParams()
  const navigate = useNavigate()
  const [hotel, setHotel] = useState(null)
  const [stay, setStay] = useState({ checkIn: addDays(todayISO(), 1), nights: 1 })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get(`/hotels/${hotelId}`)
      .then((res) => setHotel(res.data.data))
      .catch((e) => { toast.error(errorMessage(e)); navigate('/hotels') })
  }, [hotelId, navigate])

  const onSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await api.post(`/hotels/${hotelId}/bookings`, {
        checkIn: stay.checkIn,
        checkOut: addDays(stay.checkIn, stay.nights),
      })
      toast.success('Booking created. Complete the payment to confirm it.')
      navigate(`/bookings/${res.data.data._id}/pay`)
    } catch (err) {
      if (err.response?.status !== 429) toast.error(errorMessage(err)) // 429 already shows its own toast
    } finally {
      setSaving(false)
    }
  }

  if (!hotel) return <Spinner />

  return (
    <>
      <Link to='/hotels' className='btn btn-reverse btn-back'><FaArrowLeft /> Back</Link>
      <section className='heading'>
        <h1>{hotel.name}</h1>
        <p><FaMapMarkerAlt /> {hotel.address} · <FaPhone /> {hotel.tel}</p>
      </section>

      <section className='form'>
        <form onSubmit={onSubmit}>
          <StayPicker checkIn={stay.checkIn} nights={stay.nights} onChange={setStay} />
          <p className='total'>
            {stay.nights} × {baht(hotel.pricePerNight)} = <strong>{baht(stay.nights * hotel.pricePerNight)}</strong>
          </p>
          <button className='btn btn-block' disabled={saving}>{saving ? 'Booking…' : 'Book'}</button>
        </form>
      </section>
    </>
  )
}

export default BookHotel
