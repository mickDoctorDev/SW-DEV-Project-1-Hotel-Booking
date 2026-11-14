import { useState } from 'react'
import { FaSignOutAlt, FaBars, FaTimes } from 'react-icons/fa'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { logout, reset } from '../features/auth/authSlice'

function Header() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const [open, setOpen] = useState(false)

  const onLogout = async () => {
    await dispatch(logout())
    dispatch(reset())
    navigate('/')
  }

  return (
    <header className={`header ${open ? 'open' : ''}`} onClick={(e) => e.target.closest('a, .btn') && setOpen(false)}>
      <Link to='/' className='wordmark'>HOTEL BOOKING</Link>
      <button className='nav-toggle' onClick={() => setOpen(!open)} aria-expanded={open} aria-label='Menu'>
        {open ? <FaTimes /> : <FaBars />}
      </button>
      <nav className='nav' aria-label='Main'>
        <NavLink to='/' end>Home</NavLink>
        <NavLink to='/hotels'>Hotels</NavLink>
        {user && <NavLink to='/bookings'>{user.role === 'admin' ? 'All bookings' : 'My bookings'}</NavLink>}
        {user?.role === 'admin' && <NavLink to='/checkin'>Check-in</NavLink>}
      </nav>
      <div className='nav-actions'>
        {user ? (
          <>
            <span className='who'>
              {user.name}{user.role === 'admin' && <span className='role-badge'>admin</span>}
            </span>
            <button className='btn btn-sm btn-gold' onClick={onLogout}><FaSignOutAlt /> Log out</button>
          </>
        ) : (
          <>
            <NavLink to='/login' className='nav-link'>Log in</NavLink>
            <Link to='/register' className='btn btn-sm btn-gold'>Create account</Link>
          </>
        )}
      </div>
    </header>
  )
}

export default Header
