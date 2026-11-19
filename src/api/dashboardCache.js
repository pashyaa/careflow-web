// Shared freshness tracking for the dashboard snapshot (BUG-302).
//
// The dashboard used to fetch once on mount and forget. Now the last result is kept here so
// it can be shown instantly (stale-while-revalidate), and every successful mutation marks it
// invalid so the next visit refetches instead of showing numbers we know are wrong.

export const DASHBOARD_MAX_AGE_MS = 30_000

let snapshot = null // { data, fetchedAt, invalidated }

export function saveDashboardSnapshot(data) {
  snapshot = { data, fetchedAt: Date.now(), invalidated: false }
}

// Called by every mutation in apiClient.js once the server has confirmed the change.
export function invalidateDashboard() {
  if (snapshot) snapshot = { ...snapshot, invalidated: true }
}

// Called on sign-in / sign-out / 401 so one user's numbers are never shown to the next user.
export function clearDashboardCache() {
  snapshot = null
}

// Old but not known to be wrong -> safe to show while a refetch runs.
// Known to be wrong (invalidated) or missing -> nothing to show, so the page waits for fresh data.
export function getShowableDashboardData() {
  return snapshot && !snapshot.invalidated ? snapshot.data : null
}

export function isDashboardStale() {
  return !snapshot || snapshot.invalidated || Date.now() - snapshot.fetchedAt > DASHBOARD_MAX_AGE_MS
}