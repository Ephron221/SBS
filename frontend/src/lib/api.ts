import axios from 'axios'

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export function getToken() { return localStorage.getItem('sbs-token') || '' }
export function authHeader() { return { Authorization: `Bearer ${getToken()}` } }

export const api = {
  get: (path: string) => axios.get(`${API_URL}${path}`, { headers: authHeader() }),
  post: (path: string, data: unknown) => axios.post(`${API_URL}${path}`, data, { headers: authHeader() }),
  put: (path: string, data: unknown) => axios.put(`${API_URL}${path}`, data, { headers: authHeader() }),
  patch: (path: string, data: unknown) => axios.patch(`${API_URL}${path}`, data, { headers: authHeader() }),
  delete: (path: string) => axios.delete(`${API_URL}${path}`, { headers: authHeader() }),
}
