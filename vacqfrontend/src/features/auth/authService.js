import axios from 'axios'

// tokens live in HttpOnly cookies set by the API, so requests must send credentials
axios.defaults.withCredentials = true

const API_URL = 'http://localhost:5001/api/v1/auth/'

//Register user
const register = async (userData) => {
  const response = await axios.post(API_URL + 'register/', userData)
  if (response.data) {
    //localStorage.setItem('user',JSON.stringify(response.data))
    localStorage.setItem('user', response.data.name)
  }
  console.log(response.data);
  return response.data
}

//Login user
const login = async (userData) => {
  const response = await axios.post(API_URL + 'login', userData)
  if (response.data) {
    //localStorage.setItem('user',JSON.stringify(response.data))
    localStorage.setItem('user', response.data.name)
  }
  console.log(response.data);
  return response.data
}

//Logout user
const logout = async () => {
  try { await axios.post(API_URL + 'logout') } catch { /* clear local state even if the call fails */ }
  localStorage.setItem('user', null);
  localStorage.removeItem('user');
}

const authService = {
  register,
  logout,
  login,
}

export default authService;
