import axios from 'axios'
import { toast } from 'react-toastify'

// Set VITE_API_URL (e.g. in vacqfrontend/.env.local or the hosting dashboard) when the API is not on localhost:5001
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1'

// Tokens live in HttpOnly cookies set by the API, so every request must send credentials.
const api = axios.create({ baseURL: API_BASE, withCredentials: true })

// Lets the auth slice clear the logged-in user when the session can no longer be refreshed.
let onSessionExpired = () => {}
export const setSessionExpiredHandler = (fn) => { onSessionExpired = fn }

let refreshing = null

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error

    // Additional Req 1: 5 booking attempts per minute -> tell the user how long to wait
    if (response?.status === 429) {
      const wait = Number(response.headers['retry-after']) || 60
      toast.warn(`Too many attempts. Please try again in ${wait} seconds.`, { toastId: 'rate-limit' })
    }

    // The access token lives 15 minutes: on 401, rotate it once with the refresh cookie and retry
    const isAuthCall = config?.url?.startsWith('/auth/')
    if (response?.status === 401 && config && !config._retried && !isAuthCall) {
      config._retried = true
      try {
        refreshing = refreshing || api.post('/auth/refresh').finally(() => { refreshing = null })
        await refreshing
        return api(config)
      } catch {
        onSessionExpired()
        toast.info('Your session expired. Please log in again.', { toastId: 'session' })
      }
    }
    return Promise.reject(error)
  }
)

// Message to show for a failed request
export const errorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Something went wrong'

export default api
