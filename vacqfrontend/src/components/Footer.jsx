import { Link } from 'react-router-dom'

function Footer() {
  return (
    <footer className='footer'>
      <div className='footer-inner'>
        <div>
          <span className='wordmark'>HOTEL BOOKING</span>
          <p>Stays of up to 3 nights, booked in a minute.</p>
        </div>
        <nav aria-label='Footer'>
          <Link to='/hotels'>Hotels</Link>
          <Link to='/bookings'>My bookings</Link>
          <Link to='/login'>Log in</Link>
        </nav>
      </div>
      <p className='footer-note'>Computer Engineering · Chulalongkorn University</p>
    </footer>
  )
}

export default Footer
