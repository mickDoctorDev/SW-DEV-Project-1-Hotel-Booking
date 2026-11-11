import { FaSignInAlt, FaSignOutAlt, FaUser, FaHotel, FaClipboardList } from 'react-icons/fa'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { logout, reset } from '../features/auth/authSlice'

function Header() {
  const navigate = useNavigate();
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)

  const onLogout = async () => {
    await dispatch(logout())
    dispatch(reset())
    navigate('/')
  }

  return (
    <header className='header'>
      <div className='logo'>
        <Link to='/'><FaHotel /> Hotel Booking</Link>
      </div>
      <ul>
        <li><NavLink to='/' end>Hotels</NavLink></li>
        {user ? (
          <>
            <li>
              <NavLink to='/bookings'>
                <FaClipboardList /> {user.role === 'admin' ? 'All bookings' : 'My bookings'}
              </NavLink>
            </li>
            <li className='who'>
              {user.name}{user.role === 'admin' && <span className='role-badge'>admin</span>}
            </li>
            <li>
              <button className='btn btn-sm' onClick={onLogout}>
                <FaSignOutAlt /> Logout
              </button>
            </li>
          </>
        ) : (
          <>
            <li>
              <NavLink to='/login'>
                <FaSignInAlt /> Login
              </NavLink>
            </li>
            <li>
              <NavLink to='/register'>
                <FaUser /> Register
              </NavLink>
            </li>
          </>
        )}
      </ul>
    </header>
  )
}

export default Header;
