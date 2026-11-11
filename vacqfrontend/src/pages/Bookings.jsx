import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { toast } from 'react-toastify'
import { FaEdit, FaTrash, FaCreditCard, FaReceipt, FaSearch } from 'react-icons/fa'
import api, { errorMessage } from '../app/api'
import Spinner from '../components/Spinner'
import StayPicker from '../components/StayPicker'
import { addDays, baht, nightsBetween, showDate, toISODate } from '../utils/format'
import { openReceipt } from '../utils/receipt'

// Users see their own bookings; admins see every booking (the API decides, based on the session).
function Bookings() {
  const { user } = useSelector((state) => state.auth)
  const isAdmin = user?.role === 'admin'
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [editing, setEditing] = useState(null) // { id, checkIn, nights }

  const load = useCallback(() => {
    return api.get('/bookings')
      .then((res) => setBookings(res.data.data))
      .catch((e) => toast.error(errorMessage(e)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return bookings.filter((b) =>
      (status === 'all' || b.status === status) &&
      (!q || `${b.hotel?.name} ${b._id} ${b.user}`.toLowerCase().includes(q)))
  }, [bookings, query, status])

  const startEdit = (b) =>
    setEditing({ id: b._id, checkIn: toISODate(b.checkIn), nights: nightsBetween(b.checkIn, b.checkOut) })

  const saveEdit = async (e) => {
    e.preventDefault()
    try {
      await api.put(`/bookings/${editing.id}`, {
        checkIn: editing.checkIn,
        checkOut: addDays(editing.checkIn, editing.nights),
      })
      toast.success('Booking updated')
      setEditing(null)
      load()
    } catch (err) {
      if (err.response?.status !== 429) toast.error(errorMessage(err))
    }
  }

  const remove = async (b) => {
    if (!window.confirm(`Delete the booking at ${b.hotel?.name} on ${showDate(b.checkIn)}?`)) return
    try {
      await api.delete(`/bookings/${b._id}`)
      toast.success('Booking deleted')
      setBookings((list) => list.filter((x) => x._id !== b._id))
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  if (loading) return <Spinner />

  return (
    <>
      <section className='heading'>
        <h1>{isAdmin ? 'All bookings' : 'My bookings'}</h1>
        <p>{isAdmin ? 'Admin view: every booking in the system.' : 'View, change or cancel your stays.'}</p>
      </section>

      <div className='toolbar'>
        <div className='search'>
          <FaSearch />
          <input
            type='search'
            placeholder={isAdmin ? 'Search hotel, booking ID or user ID' : 'Search by hotel'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label='Search bookings'
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label='Filter by status'>
          <option value='all'>All statuses</option>
          <option value='pending'>Waiting for payment</option>
          <option value='paid'>Paid</option>
        </select>
      </div>

      {shown.length === 0 && (
        <p className='muted'>
          No bookings{bookings.length ? ' match the filter' : ' yet'}. <Link to='/'>Find a hotel</Link>
        </p>
      )}

      <div className='booking-list'>
        {shown.map((b) => {
          const own = b.user === user._id
          const nights = nightsBetween(b.checkIn, b.checkOut)
          const canEdit = isAdmin || b.status !== 'paid' // users cannot change a paid booking
          return (
            <article key={b._id} className='card booking-card'>
              <div className='booking-main'>
                <h3>{b.hotel?.name || 'Hotel removed'}</h3>
                <p>{showDate(b.checkIn)} → {showDate(b.checkOut)} · {nights} night{nights > 1 ? 's' : ''}</p>
                <p className='muted small'>
                  Booking {b._id}{isAdmin && <> · {own ? 'your booking' : `user ${b.user}`}</>}
                </p>
              </div>
              <div className='booking-side'>
                <span className={`status status-${b.status}`}>{b.status === 'paid' ? 'Paid' : 'Waiting for payment'}</span>
                <p className='price'>{baht(b.payment?.amount ?? nights * (b.hotel?.pricePerNight || 0))}</p>
              </div>

              {editing?.id === b._id ? (
                <form className='edit-form' onSubmit={saveEdit}>
                  <StayPicker checkIn={editing.checkIn} nights={editing.nights}
                    onChange={(s) => setEditing({ ...editing, ...s })} />
                  <div className='actions'>
                    <button className='btn btn-sm'>Save</button>
                    <button type='button' className='btn btn-sm btn-reverse' onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <div className='actions'>
                  {own && b.status === 'pending' && (
                    <Link className='btn btn-sm' to={`/bookings/${b._id}/pay`}><FaCreditCard /> Pay</Link>
                  )}
                  {b.status === 'paid' && (
                    <button className='btn btn-sm btn-reverse' onClick={() => openReceipt(b._id)}><FaReceipt /> Receipt</button>
                  )}
                  {canEdit && (
                    <button className='btn btn-sm btn-reverse' onClick={() => startEdit(b)}><FaEdit /> Edit dates</button>
                  )}
                  <button className='btn btn-sm btn-danger' onClick={() => remove(b)}><FaTrash /> Delete</button>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </>
  )
}

export default Bookings
