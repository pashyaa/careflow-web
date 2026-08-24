const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'

export class ApiError extends Error {
  constructor(message, status, details = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })

  if (!response.ok) {
    const problem = await response.json().catch(() => ({}))
    throw new ApiError(problem.detail || `Request failed with status ${response.status}`, response.status, problem)
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

