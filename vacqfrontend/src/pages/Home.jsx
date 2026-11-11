import { Link } from 'react-router-dom'
import { FaQuestionCircle, FaTicketAlt } from 'react-icons/fa'

function Home() {
  return (
    <>
      <section className='heading'>
        <h1>Hotel Booking</h1>
        <p>Please choose from an option below</p>
      </section>

      <Link to='/new-ticket' className='btn btn-reverse btn-block'>
        <FaQuestionCircle /> Book a Hotel
      </Link>

      <Link to='/tickets' className='btn btn-block'>
        <FaTicketAlt /> View My Bookings
      </Link>
    </>
  )
}

export default Home;
