// src/services/auth.js
import { api } from './api'

export async function login(usuario, senha) {
  const { data } = await api.post('/auth/login', { usuario, senha })
  return data
}
