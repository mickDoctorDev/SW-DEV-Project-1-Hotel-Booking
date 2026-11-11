import api, { errorMessage } from '../app/api'
import { toast } from 'react-toastify'

// Opens the HTML receipt in a new tab. It is fetched through the API client (so an expired access
// token is refreshed first) and shown from a blob URL.
export const openReceipt = async (bookingId) => {
  const tab = window.open('', '_blank') // open synchronously so the browser does not block the popup
  try {
    const res = await api.get(`/bookings/${bookingId}/receipt`, { responseType: 'text' })
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/html' }))
    if (tab) tab.location.href = url
    else window.location.href = url
  } catch (e) {
    if (tab) tab.close()
    toast.error(errorMessage(e))
  }
}
