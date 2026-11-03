import { http, HttpResponse } from 'msw'
import {
  ALLOWED_TRANSITIONS, ASSETS, NOW, REASON_CODES, SITES, TECHNICIANS, TERMINAL_STATUSES, USERS,
  apiUrl, dashboardSummary, db, queryWorkOrders, slaPreview, slaSnapshot, createdEntry,
} from './data.js'

// Spring-style Problem Details body.
export function problem(status, detail, extra = {}) {
  return HttpResponse.json({ type: 'about:blank', title: 'Request failed', status, detail, ...extra }, { status })
}

export const versionConflict = () =>
  problem(409, 'This work order was modified by another user.', { code: 'VERSION_CONFLICT' })

// Every endpoint except login requires the Bearer token the real client attaches.
const secured = (resolver) => (info) =>
  info.request.headers.get('Authorization')?.startsWith('Bearer ')
    ? resolver(info)
    : problem(401, 'Authentication required.')

const findOrder = (id) => db.workOrders.find((o) => o.id === id)
const versionMatches = (request, order) => request.headers.get('If-Match') === `"${order.version}"`

function addHistory(order, entry) {
  const list = db.history[order.id]
  list.push({
    id: `h-${order.id}-${list.length + 1}`, note: null, reasonCode: null, reasonLabel: null,
    changedByDisplayName: 'Pat Planner', changedAt: NOW, ...entry,
  })
}

export const handlers = [
  // --- auth ---
  http.post(apiUrl('/auth/login'), async ({ request }) => {
    const { email, password } = await request.json()
    const match = Object.entries(USERS).find(([, u]) => u.email === email && u.password === password)
    if (!match) return problem(401, 'Invalid email or password.')
    const [role, user] = match
    return HttpResponse.json({ token: `test-token-${role}`, email: user.email, roles: user.roles })
  }),

  // --- dashboard ---
  http.get(apiUrl('/dashboard/summary'), secured(() => HttpResponse.json(dashboardSummary()))),

  // --- work orders ---
  http.get(apiUrl('/work-orders'), secured(({ request }) =>
    HttpResponse.json(queryWorkOrders(new URL(request.url).searchParams)))),

  http.post(apiUrl('/work-orders'), secured(async ({ request }) => {
    const body = await request.json()
    const errors = {}
    if (!body.title?.trim()) errors.title = 'Title is required.'
    if (!body.description?.trim()) errors.description = 'Description is required.'
    const site = SITES.find((s) => s.id === body.siteId)
    if (!site) errors.siteId = 'Select a valid site.'
    if (Object.keys(errors).length > 0) return problem(400, 'One or more request fields are invalid.', { errors })

    const asset = ASSETS.find((a) => a.id === body.assetId)
    const n = db.nextId++
    const order = {
      id: `wo-${n}`, referenceNumber: `WO-${1000 + n}`, title: body.title, description: body.description,
      priority: body.priority, status: 'NEW', site: { ...site },
      asset: asset ? { name: asset.name, tag: asset.tag, category: asset.category } : null,
      assignedTechnician: null, targetResolutionAt: slaPreview(body.priority).resolutionDueAt,
      createdAt: NOW, updatedAt: NOW, version: 1,
      sla: slaSnapshot('ON_TRACK', { policyName: slaPreview(body.priority).policyName }),
    }
    db.workOrders.push(order)
    db.history[order.id] = [createdEntry(order)]
    return HttpResponse.json(order, { status: 201 })
  })),

  http.get(apiUrl('/work-orders/:id'), secured(({ params }) => {
    const order = findOrder(params.id)
    return order ? HttpResponse.json(order) : problem(404, 'Work order not found.')
  })),

  http.get(apiUrl('/work-orders/:id/history'), secured(({ params }) =>
    db.history[params.id] ? HttpResponse.json(db.history[params.id]) : problem(404, 'Work order not found.'))),

  http.patch(apiUrl('/work-orders/:id/assignment'), secured(async ({ request, params }) => {
    const order = findOrder(params.id)
    if (!order) return problem(404, 'Work order not found.')
    if (!versionMatches(request, order)) return versionConflict()

    const { technicianId } = await request.json()
    const technician = TECHNICIANS.find((t) => t.id === technicianId)
    if (!technician) return problem(400, 'The technician is not active.')

    order.assignedTechnician = { id: technician.id, name: technician.label }
    if (order.status === 'NEW') {
      order.status = 'ASSIGNED'
      addHistory(order, { fromStatus: 'NEW', toStatus: 'ASSIGNED' })
    }
    order.version += 1
    order.updatedAt = NOW
    return HttpResponse.json(order)
  })),

  http.patch(apiUrl('/work-orders/:id/status'), secured(async ({ request, params }) => {
    const order = findOrder(params.id)
    if (!order) return problem(404, 'Work order not found.')
    if (!versionMatches(request, order)) return versionConflict()

    const body = await request.json()
    if (!ALLOWED_TRANSITIONS[order.status].includes(body.status)) {
      return problem(400, `A work order cannot move from ${order.status} to ${body.status}.`)
    }
    if (TERMINAL_STATUSES.includes(body.status)) {
      const errors = {}
      if (!REASON_CODES[body.status].some((c) => c.code === body.reasonCode)) errors.reasonCode = 'Select a valid reason code.'
      if ((body.note ?? '').trim().length < 10) errors.note = 'The note must be at least 10 characters.'
      if (Object.keys(errors).length > 0) return problem(400, 'One or more request fields are invalid.', { errors })
    }

    const reason = REASON_CODES[body.status]?.find((c) => c.code === body.reasonCode)
    addHistory(order, {
      fromStatus: order.status, toStatus: body.status, note: body.note ?? null,
      reasonCode: body.reasonCode ?? null, reasonLabel: reason?.label ?? null,
    })
    order.status = body.status
    order.version += 1
    order.updatedAt = NOW
    return HttpResponse.json(order)
  })),

  // --- reference data ---
  http.get(apiUrl('/reference/sites'), secured(() =>
    HttpResponse.json(SITES.map((s) => ({ id: s.id, label: s.name, secondaryText: s.customerName }))))),

  http.get(apiUrl('/reference/assets'), secured(({ request }) => {
    const siteId = new URL(request.url).searchParams.get('siteId')
    return HttpResponse.json(ASSETS.filter((a) => a.siteId === siteId).map((a) => ({ id: a.id, code: a.tag, label: a.name })))
  })),

  http.get(apiUrl('/reference/technicians'), secured(() => HttpResponse.json(TECHNICIANS))),

  http.get(apiUrl('/reference/reason-codes'), secured(({ request }) =>
    HttpResponse.json(REASON_CODES[new URL(request.url).searchParams.get('status')] ?? []))),

  // --- SLA ---
  http.get(apiUrl('/sla-policies/preview'), secured(({ request }) =>
    HttpResponse.json(slaPreview(new URL(request.url).searchParams.get('priority'))))),

  http.get(apiUrl('/sla-policies'), secured(() => HttpResponse.json([]))),
]