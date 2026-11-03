// Same expression as apiClient.js, so handlers always match the URL the app calls.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'
export const apiUrl = (path) => `${API_BASE_URL}${path}`

// Fixed "now": nothing in the suite depends on the real clock.
export const NOW = '2026-11-02T09:00:00Z'

export const USERS = {
  planner: { email: 'planner.pat@careflow.local', password: 'planner-pass', roles: ['ROLE_PLANNER'] },
  technician: { email: 'tech.jamie@careflow.local', password: 'tech-pass', roles: ['ROLE_TECHNICIAN'] },
  viewer: { email: 'viewer.vic@careflow.local', password: 'viewer-pass', roles: ['ROLE_CUSTOMER_VIEWER'] },
  admin: { email: 'admin.ada@careflow.local', password: 'admin-pass', roles: ['ROLE_ADMIN'] },
}

export function sessionFor(role) {
  const user = USERS[role]
  return { token: `test-token-${role}`, email: user.email, roles: user.roles }
}

export const SITES = [
  { id: 'site-1', name: 'Pune DC', code: 'PUN', city: 'Pune', customerName: 'Acme Health', timeZone: 'Asia/Kolkata' },
  { id: 'site-2', name: 'Nagpur Clinic', code: 'NAG', city: 'Nagpur', customerName: 'Acme Health', timeZone: 'Asia/Kolkata' },
]

export const ASSETS = [
  { id: 'asset-1', siteId: 'site-1', name: 'Chiller 1', tag: 'CHL-01', category: 'HVAC' },
  { id: 'asset-2', siteId: 'site-1', name: 'Generator A', tag: 'GEN-01', category: 'Power' },
  { id: 'asset-3', siteId: 'site-2', name: 'Lift 2', tag: 'LFT-02', category: 'Lift' },
]

export const TECHNICIANS = [
  { id: 'tech-1', label: 'Jamie Fernandes', secondaryText: 'HVAC' },
  { id: 'tech-2', label: 'Ananya Rao', secondaryText: 'Electrical' },
]

export const REASON_CODES = {
  CANCELLED: [
    { id: 'c1', code: 'DUPLICATE', label: 'Duplicate work order' },
    { id: 'c2', code: 'RAISED_IN_ERROR', label: 'Raised in error' },
  ],
  RESOLVED: [
    { id: 'r1', code: 'FIXED', label: 'Fault repaired' },
    { id: 'r2', code: 'PART_REPLACED', label: 'Part replaced' },
  ],
}

export const ALLOWED_TRANSITIONS = {
  NEW: ['CANCELLED'],
  ASSIGNED: ['IN_PROGRESS', 'ON_HOLD', 'CANCELLED'],
  IN_PROGRESS: ['ON_HOLD', 'RESOLVED'],
  ON_HOLD: ['IN_PROGRESS', 'CANCELLED'],
  RESOLVED: [],
  CANCELLED: [],
}

export const TERMINAL_STATUSES = ['RESOLVED', 'CANCELLED']
const ALL_STATUSES = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CANCELLED']

export function slaSnapshot(state, overrides = {}) {
  return {
    policyName: 'Standard business hours',
    policyScope: 'SITE',
    timeZone: 'Asia/Kolkata',
    businessHoursOnly: true,
    responseMinutes: 60,
    resolutionMinutes: 480,
    responseDueAt: '2026-10-29T10:00:00Z',
    resolutionDueAt: '2026-10-30T10:00:00Z',
    responseState: 'MET',
    resolutionState: state,
    overallState: state,
    ...overrides,
  }
}

export function slaPreview(priority) {
  const critical = priority === 'CRITICAL'
  return {
    policyName: critical ? 'Critical 24x7' : 'Standard business hours',
    responseMinutes: critical ? 30 : 60,
    resolutionMinutes: critical ? 240 : 480,
    businessHoursOnly: !critical,
    responseDueAt: '2026-11-02T10:00:00Z',
    resolutionDueAt: '2026-11-02T18:00:00Z',
    timeZone: 'Asia/Kolkata',
  }
}

// [title, priority, status, technicianId, slaState]
const SEED = [
  ['Chiller pressure alarm', 'HIGH', 'ASSIGNED', 'tech-1', 'ON_TRACK'],
  ['Generator fails load test', 'CRITICAL', 'NEW', null, 'BREACHED'],
  ['Lift door sensor fault', 'MEDIUM', 'IN_PROGRESS', 'tech-2', 'AT_RISK'],
  ['Badge reader offline', 'LOW', 'ON_HOLD', 'tech-1', 'ON_TRACK'],
  ...Array.from({ length: 8 }, (_, i) => [`Routine inspection ${i + 1}`, 'LOW', 'RESOLVED', 'tech-2', 'MET']),
]

function buildWorkOrder(n, [title, priority, status, technicianId, slaState]) {
  const technician = TECHNICIANS.find((t) => t.id === technicianId)
  const asset = n === 1 ? ASSETS[0] : null
  const createdAt = new Date(Date.UTC(2026, 9, 28, 8) - n * 86_400_000).toISOString() // WO-1001 is newest
  return {
    id: `wo-${n}`,
    referenceNumber: `WO-${1000 + n}`,
    title,
    description: `${title}: details recorded by the service desk.`,
    priority,
    status,
    site: { ...SITES[0] },
    asset: asset && { name: asset.name, tag: asset.tag, category: asset.category },
    assignedTechnician: technician ? { id: technician.id, name: technician.label } : null,
    targetResolutionAt: '2026-10-30T10:00:00Z',
    createdAt,
    updatedAt: createdAt,
    version: n === 1 ? 3 : 1,
    sla: slaSnapshot(slaState),
  }
}

export function createdEntry(order) {
  return {
    id: `h-${order.id}-1`, fromStatus: null, toStatus: 'NEW', note: null, reasonCode: null, reasonLabel: null,
    changedByDisplayName: 'Pat Planner', changedAt: order.createdAt,
  }
}

// --- In-memory "database" the handlers read and mutate. resetDb() runs before every test. ---
export const db = { workOrders: [], history: {}, nextId: 1 }

export function resetDb() {
  db.workOrders = SEED.map((spec, index) => buildWorkOrder(index + 1, spec))
  db.history = Object.fromEntries(db.workOrders.map((order) => [order.id, [createdEntry(order)]]))
  db.nextId = db.workOrders.length + 1
}
resetDb()

export function queryWorkOrders(params) {
  const query = (params.get('query') || '').toLowerCase()
  const status = params.get('status')
  const priority = params.get('priority')
  const page = Number(params.get('page') ?? 0)
  const size = Number(params.get('size') ?? 10)

  const matches = db.workOrders
    .filter((o) => !status || o.status === status)
    .filter((o) => !priority || o.priority === priority)
    .filter((o) => !query || [o.referenceNumber, o.title, o.description].some((t) => t.toLowerCase().includes(query)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const totalPages = Math.ceil(matches.length / size)
  return {
    content: matches.slice(page * size, (page + 1) * size),
    page,
    size,
    totalElements: matches.length,
    totalPages,
    first: page === 0,
    last: page >= totalPages - 1,
  }
}

export function dashboardSummary() {
  const open = db.workOrders.filter((o) => !TERMINAL_STATUSES.includes(o.status))
  return {
    openWorkOrders: open.length,
    overdueWorkOrders: open.filter((o) => o.sla.resolutionState === 'BREACHED').length,
    unassignedWorkOrders: open.filter((o) => !o.assignedTechnician).length,
    criticalOpenWorkOrders: open.filter((o) => o.priority === 'CRITICAL').length,
    atRiskWorkOrders: open.filter((o) => o.sla.overallState === 'AT_RISK').length,
    breachedWorkOrders: open.filter((o) => o.sla.overallState === 'BREACHED').length,
    statusBreakdown: Object.fromEntries(ALL_STATUSES.map((s) => [s, db.workOrders.filter((o) => o.status === s).length])),
    generatedAt: NOW,
  }
}