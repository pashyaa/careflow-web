import { useCallback, useEffect, useRef, useState } from 'react'

export function useAsync(factory, dependencies = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const controllerRef = useRef(null)

  const execute = useCallback(async () => {
    // A newer request supersedes the previous one: cancel it so its response can never render.
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setState((current) => ({ ...current, loading: true, error: null }))
    try {
      const data = await factory({ signal: controller.signal })
      // Even if the factory ignored the signal, a superseded or unmounted request is discarded.
      if (controller.signal.aborted) return null
      setState({ data, loading: false, error: null })
      return data
    } catch (error) {
      // An aborted request is not a failure: the newer request owns the loading/error state.
      if (controller.signal.aborted) return null
      setState({ data: null, loading: false, error })
      return null
    }
    // Dependencies are controlled by each page so callers can explicitly choose when to refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo
  }, dependencies)

  useEffect(() => {
    execute()
    // Cancel the in-flight request when dependencies change or the component unmounts.
    return () => controllerRef.current?.abort()
  }, [execute])

  return { ...state, refetch: execute }
}