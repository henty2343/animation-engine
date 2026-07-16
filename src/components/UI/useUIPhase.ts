import { useEffect, useState } from 'react'
import type { UIManager, UIPhase } from '../../engine/ui/UIManager'

/**
 * Small React bridge subscribing to a UIManager instance (see
 * engine/ui/UIManager.ts). Mirrors how Arena.tsx subscribes to the engine
 * tick via a useEffect — this hook contains no phase-transition logic of
 * its own, it only re-renders when UIManager's phase changes.
 */
export function useUIPhase(uiManager: UIManager): UIPhase {
  const [phase, setPhase] = useState<UIPhase>(uiManager.getPhase())

  useEffect(() => {
    setPhase(uiManager.getPhase())
    return uiManager.subscribe(() => setPhase(uiManager.getPhase()))
  }, [uiManager])

  return phase
}
