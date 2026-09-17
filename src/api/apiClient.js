const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'
const TOKEN_STORAGE_KEY = 'careflow.session'

export class ApiError extends Error {
  constructor(message, status, details = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

// --- Session storage -------------------------------------------------------
// The API has no /auth/me endpoint, so the login response (token + email + roles) is the
// only place this data ever comes from. We persist all three together so a page reload
// doesn't lose the signed-in user's roles (needed to gate the UI) along with the token.

function readSession() {
  try {
    const raw = window.localStorage.getItem(TOKEN_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeSession(session) {
  if (session) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(session))
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY)
  }
}

// Listeners the AuthContext subscribes to so a 401 from *any* request (not just login)
// can immediately clear the session and redirect, without apiClient needing to know
// anything about React or routing.
const unauthorizedListeners = new Set()

export function onUnauthorized(handler) {
  unauthorizedListeners.add(handler)
  return () => unauthorizedListeners.delete(handler)
}

export function getSession() {
  return readSession()
}

export function getToken() {
  return readSession()?.token ?? null
}

// --- Request plumbing --------------------------------------------------------

async function request(path, options = {}) {
  const token = getToken()
  const isLoginRequest = path === '/auth/login'

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const problem = await response.json().catch(() => ({}))
    const message = problem.detail || `Request failed with status ${response.status}`

    // A 401 on the login endpoint just means "wrong password" — don't treat that as an
    // expired session. A 401 on anything else means the stored token is no longer valid
    // (expired, tampered, or the account was disabled) — clear it and tell the app to
    // send the user back to /login.
    if (response.status === 401 && !isLoginRequest) {
      writeSession(null)
      unauthorizedListeners.forEach((handler) => handler())
    }

    throw new ApiError(message, response.status, problem)
  }

  if (response.status === 204) return null
  return response.json()
}

function queryString(params) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value)
  })
  const serialized = query.toString()
  return serialized ? `?${serialized}` : ''
}

export const api = {
  login: async (email, password) => {
    const response = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    // response: { token, email, roles }
    writeSession({ token: response.token, email: response.email, roles: response.roles || [] })
    return response
  },
  logout: () => writeSession(null),

  dashboard: () => request('/dashboard/summary'),
  workOrders: (filters = {}) => request(`/work-orders${queryString(filters)}`),
  workOrder: (id) => request(`/work-orders/${id}`),
  workOrderHistory: (id) => request(`/work-orders/${id}/history`),
  createWorkOrder: (payload) => request('/work-orders', { method: 'POST', body: JSON.stringify(payload) }),
  assignTechnician: (id, payload) => request(`/work-orders/${id}/assignment`, {
    method: 'PATCH', body: JSON.stringify(payload),
  }),
  transitionWorkOrder: (id, payload) => request(`/work-orders/${id}/status`, {
    method: 'PATCH', body: JSON.stringify(payload),
  }),
  sites: () => request('/reference/sites'),
  assets: (siteId) => request(`/reference/assets${queryString({ siteId })}`),
  technicians: () => request('/reference/technicians'),
}