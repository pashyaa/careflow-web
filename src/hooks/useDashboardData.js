import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api/apiClient.js'
import { getShowableDashboardData, isDashboardStale, saveDashboardSnapshot } from '../api/dashboardCache.js'

// Dashboard data with three guarantees (BUG-302):
//  1. A mutation anywhere in the app invalidates the shared snapshot, so the next visit refetches.
//  2. A snapshot older than DASHBOARD_MAX_AGE_MS is refetched on visit, on tab focus and on
//     back/forward-cache restore.
//  3. Stale-while-revalidate: an old-but-valid snapshot is shown immediately while fresh data loads.
export function useDashboardData() {
  const [state, setState] = useState(() => {
    const cached = getShowableDashboardData()
    return { data: cached, loading: cached === null, refreshing: false, error: null }
  })
  const controllerRef = useRef(null)

  const refetch = useCallback(async () => {
    // A newer request supersedes the previous one: cancel it so its response can never render.
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    // Keep whatever is on screen while the new numbers load (no blank flash).
    setState((current) => ({
      ...current,
      loading: current.data === null,
      refreshing: current.data !== null,
      error: null,
    }))
    try {
      const [summary, recent] = await Promise.all([
        api.dashboard(),
        api.workOrders({ page: 0, size: 6, sortBy: 'createdAt', direction: 'DESC' }, { signal: controller.signal }),
      ])
      if (controller.signal.aborted) return null
      const data = { summary, recent }
      saveDashboardSnapshot(data)
      setState({ data, loading: false, refreshing: false, error: null })
      return data
    } catch (error) {
      if (controller.signal.aborted) return null
      // Keep any numbers already on screen; the page shows a small "could not refresh" notice.
      setState((current) => ({ ...current, loading: false, refreshing: false, error }))
      return null
    }
  }, [])

  // On mount: refetch unless the snapshot is both valid and younger than the max age.
  useEffect(() => {
    if (isDashboardStale()) refetch()
    return () => controllerRef.current?.abort()
  }, [refetch])

  // While mounted: coming back to the tab, or restoring the page from the back/forward cache,
  // refetches if the snapshot has aged out.
  useEffect(() => {
    const refetchIfStale = () => {
      if (isDashboardStale()) refetch()
    }
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'hidden') refetchIfStale()
    }
    const onPageShow = (event) => {
      if (event.persisted) refetchIfStale()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [refetch])

  return { ...state, refetch }
}