import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'

export function usePersistentState<T>(loader: () => T, save: (value: T) => void): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(loader)
  // oxlint-disable react-hooks/exhaustive-deps
  useEffect(() => {
    try {
      save(state)
    } catch {
      // Persistence can fail under quota limits or in private browsing.
    }
  }, [state])
  // oxlint-enable react-hooks/exhaustive-deps
  return [state, setState]
}
