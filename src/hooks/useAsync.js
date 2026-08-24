import { useCallback, useEffect, useState } from 'react'

export function useAsync(factory, dependencies = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })

  const execute = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }))
    try {
      const data = await factory()
      setState({ data, loading: false, error: null })
      return data
    } catch (error) {
      setState({ data: null, loading: false, error })
      return null
    }
    // Dependencies are controlled by each page so callers can explicitly choose when to refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo
  }, dependencies)

  useEffect(() => {
    execute()
  }, [execute])

  return { ...state, refetch: execute }
}
