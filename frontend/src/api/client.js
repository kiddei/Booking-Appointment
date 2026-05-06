import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  withCredentials: true,           // send httpOnly JWT cookie with every request
  headers: { 'Content-Type': 'application/json' },
})

// Global response interceptor — surface error messages cleanly
client.interceptors.response.use(
  res => res,
  err => {
    const message =
      err.response?.data?.message ||
      err.response?.data?.error ||
      'Something went wrong'
    return Promise.reject(new Error(message))
  }
)

export default client
