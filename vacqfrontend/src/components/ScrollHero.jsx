import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { FaArrowRight, FaSearch } from 'react-icons/fa'
import { unsplash } from '../utils/images'

// A pinned hero: scrolling "walks" through six scenes, from the hotel entrance to the bed.
// Images cross-fade and push in with scroll position; each scene has its own copy.
const FRAMES = 135
const STATS = [['1–3', 'Nights per stay'], ['0', 'Double bookings'], ['QR', 'Signed check-in'], ['24/7', 'AI concierge']]
const SCENES = [
  { img: '1564501049412-61c2a3083791' },
  { img: '1571896349842-33c89424de2d', eyebrow: '01 // Arrival', title: 'Step Into Calm', text: 'Pools, gardens and quiet courtyards, chosen for stays that feel unhurried.' },
  { img: '1584132967334-10e028bd69f7', eyebrow: '02 // Relax', title: 'Designed For Rest', text: 'Pick a hotel, pick up to three nights, and everything else is taken care of.', stats: true },
  { img: '1578683010236-d716f9a3f461', eyebrow: '03 // Suite', title: 'Space To Breathe', text: 'Bright rooms, natural materials and soft light, with the price shown before you book.' },
  { img: '1618773928121-c32242e63f39', eyebrow: '04 // Booking', title: 'Booked In A Minute', text: 'Your room is held the moment you book. Pay securely and get your QR code by email.' },
  { img: '1496417263034-38ec4f0b665a', eyebrow: 'Your stay awaits', title: 'Your Stay Starts Here', text: 'Find the hotel that suits you and reserve your nights today.', cta: true },
]
const N = SCENES.length
const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n))

function ScrollHero() {
  const wrap = useRef(null)
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)
  const [s, setS] = useState(0) // scroll position in scenes, 0..N
  const [query, setQuery] = useState('')
  const [still] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    if (still) return
    let raf = 0
    const update = () => {
      raf = 0
      const el = wrap.current
      if (el) setS(clamp(-el.getBoundingClientRect().top / (el.offsetHeight - window.innerHeight)) * N)
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [still])

  const onSearch = (e) => {
    e.preventDefault()
    navigate(query.trim() ? `/hotels?q=${encodeURIComponent(query.trim())}` : '/hotels')
  }

  const progress = s / N
  const scene = Math.min(N, Math.floor(s) + 1)

  return (
    <section ref={wrap} className='scroll-hero' style={{ height: still ? '100svh' : `${N * 100}svh` }}>
      <div className='sh-stage'>
        {SCENES.map((sc, i) => (
          <div
            key={sc.img}
            className='sh-img'
            style={{
              backgroundImage: `url(${unsplash(sc.img, 1800)})`,
              opacity: i === 0 ? 1 : clamp((s - (i - 0.25)) / 0.5),
              transform: `scale(${1 + 0.16 * clamp((s - (i - 0.4)) / 1.8)})`,
            }}
          />
        ))}
        <div className='sh-shade' />

        {SCENES.map((sc, i) => {
          // the first scene is fully visible at the top and the last stays at the end
          const d = i === 0 ? Math.max(0, s - 0.5) : i === N - 1 ? Math.max(0, N - 0.5 - s) : Math.abs(s - (i + 0.5))
          const o = clamp((0.42 - d) / 0.14)
          const shift = clamp((i + 0.5 - s) * 40, -40, 40)
          return (
            <div
              key={i}
              className='sh-scene'
              aria-hidden={o < 0.5}
              style={{ opacity: o, transform: `translateY(${shift}px)`, pointerEvents: o > 0.6 ? 'auto' : 'none' }}
            >
              {i === 0 ? (
                <>
                  <span className='pill'>Hotel reservations</span>
                  <h1>Stays That Feel Like Home</h1>
                  <p>Find a hotel, choose up to three nights and book in under a minute. Your room is held the moment you book.</p>
                  <form className='hero-search' onSubmit={onSearch} role='search'>
                    <FaSearch aria-hidden />
                    <input type='search' placeholder='Search by hotel name or city' value={query} onChange={(e) => setQuery(e.target.value)} aria-label='Search hotels' tabIndex={o > 0.6 ? 0 : -1} />
                    <button className='btn btn-gold' tabIndex={o > 0.6 ? 0 : -1}>Search</button>
                  </form>
                  <div className='hero-links'>
                    <Link to='/hotels' className='btn btn-gold' tabIndex={o > 0.6 ? 0 : -1}>Explore hotels <FaArrowRight /></Link>
                    <Link to={user ? '/bookings' : '/register'} className='btn btn-glass' tabIndex={o > 0.6 ? 0 : -1}>{user ? 'My bookings' : 'Create account'}</Link>
                  </div>
                  <span className='sh-hint'>Scroll to enter the hotel<i aria-hidden>↓</i></span>
                </>
              ) : (
                <>
                  <span className='sh-eyebrow'>{sc.eyebrow}</span>
                  <h2>{sc.title}</h2>
                  <p>{sc.text}</p>
                  {sc.stats && (
                    <div className='sh-stats'>
                      {STATS.map(([big, small]) => <div key={small}><strong>{big}</strong><span>{small}</span></div>)}
                    </div>
                  )}
                  {sc.cta && <Link to='/hotels' className='btn btn-gold' tabIndex={o > 0.6 ? 0 : -1}>Explore hotels <FaArrowRight /></Link>}
                </>
              )}
            </div>
          )
        })}

        <div className='sh-hud' aria-hidden>
          <span>Scene {scene} / {N}</span>
          <span className='sh-frame'>Frame {String(Math.round(progress * (FRAMES - 1)) + 1).padStart(3, '0')}<i><b style={{ width: `${progress * 100}%` }} /></i></span>
        </div>
      </div>
    </section>
  )
}

export default ScrollHero
