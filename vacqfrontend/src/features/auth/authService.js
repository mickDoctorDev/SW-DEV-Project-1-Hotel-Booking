import api from '../../app/api'

// Only non-sensitive profile fields are kept in localStorage; the tokens stay in HttpOnly cookies.
const KEY = 'user'
const toProfile = (d) => ({ _id: d._id, name: d.name, email: d.email, role: d.role })

export const loadUser = () => {
  try {
    const u = JSON.parse(localStorage.getItem(KEY))
    return u && typeof u === 'object' && u.role ? u : null
  } catch {
    return null
  }
}
export const clearUser = () => localStorage.removeItem(KEY)

const save = (data) => {
  const profile = toProfile(data)
  localStorage.setItem(KEY, JSON.stringify(profile))
  return profile
}

const register = async (userData) => save((await api.post('/auth/register', userData)).data)

const login = async (userData) => save((await api.post('/auth/login', userData)).data)

const logout = async () => {
  try { await api.post('/auth/logout') } catch { /* clear local state even if the call fails */ }
  clearUser()
}

const authService = { register, login, logout }
export default authService
