import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import PrivateRoute from './components/PrivateRoute'
import ChatWidget from './components/ChatWidget'
import Hotels from './pages/Hotels'
import BookHotel from './pages/BookHotel'
import Bookings from './pages/Bookings'
import Pay from './pages/Pay'
import CheckIn from './pages/CheckIn'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

// Inner pages share a padded container below the floating header; the home page runs full width.
function Shell() {
  return <main className='container'><Outlet /></main>
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Header />
        <Routes>
          <Route path='/' element={<Home />} />
          <Route element={<Shell />}>
            <Route path='/hotels' element={<Hotels />} />
            <Route path='/login' element={<Login />} />
            <Route path='/register' element={<Register />} />
            <Route path='/forgot-password' element={<ForgotPassword />} />
            <Route path='/reset-password/:token' element={<ResetPassword />} />
            <Route path='/hotels/:hotelId/book' element={<PrivateRoute><BookHotel /></PrivateRoute>} />
            <Route path='/bookings' element={<PrivateRoute><Bookings /></PrivateRoute>} />
            <Route path='/bookings/:id/pay' element={<PrivateRoute><Pay /></PrivateRoute>} />
            <Route path='/checkin' element={<PrivateRoute role='admin'><CheckIn /></PrivateRoute>} />
          </Route>
          <Route path='*' element={<Navigate to='/' replace />} />
        </Routes>
        <Footer />
      </Router>
      <ChatWidget />
      <ToastContainer position='top-right' autoClose={4000} />
    </>
  );
}

export default App;
