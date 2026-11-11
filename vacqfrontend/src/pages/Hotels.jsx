import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { FaHotel, FaMapMarkerAlt, FaPhone, FaSearch } from 'react-icons/fa'
import api, { errorMessage } from '../app/api'
import Spinner from '../components/Spinner'
import { baht } from '../utils/format'

function Hotels() {
  const { user } = useSelector((state) => state.auth)
  const [hotels, setHotels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    api.get('/hotels', { params: { limit: 100, sort: 'name' } })
      .then((res) => setHotels(res.data.data))
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false))
  }, [])

  // search by hotel name or address
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? hotels.filter((h) => `${h.name} ${h.address}`.toLowerCase().includes(q)) : hotels
  }, [hotels, query])

  if (loading) return <Spinner />

  return (
    <>
      <section className='heading'>
        <h1><FaHotel /> Find a hotel</h1>
        <p>Book up to 3 nights{user ? `, ${user.name}` : ''}.</p>
      </section>

      <div className='search'>
        <FaSearch />
        <input
          type='search'
          placeholder='Search by hotel name or address'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label='Search hotels'
        />
      </div>

      {error && <p className='error-text'>{error}</p>}
      {!error && shown.length === 0 && <p className='muted'>No hotels match “{query}”.</p>}

      <div className='hotel-grid'>
        {shown.map((h) => (
          <article key={h._id} className='card hotel-card'>
            <h3>{h.name}</h3>
            <p><FaMapMarkerAlt /> {h.address}</p>
            <p><FaPhone /> {h.tel}</p>
            <p className='price'>{baht(h.pricePerNight)} <span className='muted'>/ night</span></p>
            <Link className='btn btn-block' to={user ? `/hotels/${h._id}/book` : '/login'}>
              {user ? 'Book now' : 'Log in to book'}
            </Link>
          </article>
        ))}
      </div>
    </>
  )
}

export default Hotels
