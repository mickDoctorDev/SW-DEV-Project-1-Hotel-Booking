import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import Header from './components/Header'
import PrivateRoute from './components/PrivateRoute'
import Hotels from './pages/Hotels'
import BookHotel from './pages/BookHotel'
import Bookings from './pages/Bookings'
import Pay from './pages/Pay'
import Login from './pages/Login'
import Register from './pages/Register'

function App() {
  return (
    <>
      <Router>
        <div className="container">
          <Header />
          <Routes>
            <Route path='/' element={<Hotels />} />
            <Route path='/login' element={<Login />} />
            <Route path='/register' element={<Register />} />
            <Route path='/hotels/:hotelId/book' element={<PrivateRoute><BookHotel /></PrivateRoute>} />
            <Route path='/bookings' element={<PrivateRoute><Bookings /></PrivateRoute>} />
            <Route path='/bookings/:id/pay' element={<PrivateRoute><Pay /></PrivateRoute>} />
            <Route path='*' element={<Navigate to='/' replace />} />
          </Routes>
        </div>
      </Router>
      <ToastContainer position='top-right' autoClose={4000} />
    </>
  );
}

export default App;
