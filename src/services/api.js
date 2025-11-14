// src/services/api.js
import axios from 'axios'

const isDev = import.meta.env.DEV
const base = import.meta.env.VITE_API_BASE || 'http://localhost:3001'
const prefix = import.meta.env.VITE_API_PREFIX || '/api'

// Em DEV use o proxy do Vite; em PROD use a base/url do .env
const baseURL = isDev ? prefix : (base + prefix)

export const api = axios.create({ baseURL })

api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem('accessToken') ||
    localStorage.getItem('token') ||
    ''
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
