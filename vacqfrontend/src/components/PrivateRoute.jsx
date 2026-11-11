import { Navigate, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'

// Hides pages from logged-out visitors. Real access control is on the API; this only improves the UX.
function PrivateRoute({ children }) {
  const { user } = useSelector((state) => state.auth)
  const location = useLocation()
  if (!user) return <Navigate to='/login' replace state={{ from: location.pathname }} />
  return children
}

export default PrivateRoute
