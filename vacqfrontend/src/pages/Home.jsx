import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { FaArrowRight, FaShieldAlt, FaQrcode, FaRobot, FaBed, FaMapMarkerAlt } from 'react-icons/fa'
import api from '../app/api'
import Reveal from '../components/Reveal'
import ScrollHero from '../components/ScrollHero'
import { baht } from '../utils/format'
import { hotelImage, roomImage } from '../utils/images'

const STEPS = [
  ['01', 'Choose a hotel', 'Browse the hotels, compare prices and pick the one you like.'],
  ['02', 'Pick your dates', 'Choose a check-in date and stay 1 to 3 nights. Check-out is worked out for you.'],
  ['03', 'Pay securely', 'Confirm with a card. Card numbers are never stored.'],
  ['04', 'Check in with a QR', 'Your receipt email carries a signed QR code. Show it at the front desk.'],
]

const PERKS = [
  [FaBed, 'No double bookings', 'Rooms are locked while you book, so two guests can never take the last room.'],
  [FaShieldAlt, 'Private by design', 'Only you can see and change your bookings. Sessions are protected and expire on their own.'],
  [FaQrcode, 'Tamper-proof QR', 'Check-in codes are digitally signed, work once and stop working if a payment is undone.'],
  [FaRobot, 'AI concierge', 'Ask the chat assistant about hotels, prices or your bookings at any time.'],
]

const FAQ = [
  ['How long can I stay?', 'Each booking covers 1 to 3 nights. The check-in date cannot be in the past.'],
  ['Can I change or cancel a booking?', 'Yes. In My bookings you can change the dates of a booking or delete it.'],
  ['When is my booking confirmed?', 'A new booking is pending until you pay. After payment you get a receipt email with your QR code.'],
  ['What if a hotel is full?', 'If every room is taken for your dates you will see a message and can try other dates or another hotel.'],
]

function Home() {
  const { user } = useSelector((state) => state.auth)
  const [featured, setFeatured] = useState([])

  useEffect(() => {
    api.get('/hotels', { params: { limit: 3, sort: 'name' } })
      .then((res) => setFeatured(res.data.data))
      .catch(() => {}) // the section simply stays hidden if the API is unreachable
  }, [])

  return (
    <>
      <ScrollHero />

      {featured.length > 0 && (
        <section className='section'>
          <Reveal className='section-head'>
            <span className='eyebrow'>Featured stays // 01</span>
            <h2>Where will you stay?</h2>
            <p>A few places our guests book the most.</p>
          </Reveal>
          <div className='featured'>
            {featured.map((h, i) => (
              <Reveal key={h._id} delay={i * 120}>
                <Link to={user ? `/hotels/${h._id}/book` : '/login'} className='feature-card'>
                  <img src={hotelImage(h, 900)} alt='' loading='lazy' />
                  <div className='feature-body'>
                    <span className='eyebrow'>{baht(h.pricePerNight)} / night</span>
                    <h3>{h.name}</h3>
                    <p><FaMapMarkerAlt aria-hidden /> {h.address}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
          <div className='center'>
            <Link to='/hotels' className='btn btn-reverse'>View all hotels <FaArrowRight /></Link>
          </div>
        </section>
      )}

      <section className='section section-dark'>
        <Reveal className='section-head'>
          <span className='eyebrow'>How it works // 02</span>
          <h2>Book in four steps</h2>
        </Reveal>
        <ol className='steps'>
          {STEPS.map(([n, title, text], i) => (
            <Reveal as='li' key={n} delay={i * 100}>
              <span className='step-no'>{n}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className='section'>
        <Reveal className='section-head'>
          <span className='eyebrow'>Why book here // 03</span>
          <h2>Simple, safe, quick</h2>
        </Reveal>
        <div className='perks'>
          {PERKS.map(([Icon, title, text], i) => (
            <Reveal key={title} delay={i * 100} className='perk'>
              <Icon aria-hidden />
              <h3>{title}</h3>
              <p>{text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className='section faq'>
        <Reveal className='section-head'>
          <span className='eyebrow'>Questions // 04</span>
          <h2>Good to know</h2>
        </Reveal>
        <Reveal>
          {FAQ.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </Reveal>
      </section>

      <section className='cta' style={{ backgroundImage: `url(${roomImage})` }}>
        <Reveal className='cta-inner'>
          <h2>Ready for your next stay?</h2>
          <p>Pick a hotel, pick your nights, and you are done.</p>
          <Link to='/hotels' className='btn btn-gold'>Book a hotel <FaArrowRight /></Link>
        </Reveal>
      </section>
    </>
  )
}

export default Home
