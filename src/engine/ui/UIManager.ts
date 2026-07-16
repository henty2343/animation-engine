import { INTRO_SCREEN_DURATION_MS } from '../../shared/Constants'

/**
 * Owns the shared UI phase lifecycle for a run (see Engine.md, UI —
 * "Owned by the engine (engine/ui), not by React's Menu. The Menu only
 * handles setup before a simulation starts."), and Engine.md's Timeline:
 * Intro -> Simulation -> Winner.
 *
 * This class only tracks *which* phase is active and when to move to the
 * next one — it renders nothing itself. React components in
 * /src/components/UI (IntroScreen, StatsPanel, WinnerScreen) subscribe to
 * it and render whatever the current phase calls for, the same way
 * Arena.tsx contains no drawing logic of its own (see Architecture.md,
 * Rendering).
 *
 * The intro -> running transition is time-based (see Engine.md, and each
 * simulation doc's Intro Screen section: "~1-2 seconds", backed by
 * INTRO_SCREEN_DURATION_MS in shared/Constants.ts). The running -> winner
 * transition is NOT time-based: it happens whenever the caller invokes
 * showWinner(), which is intended to happen once
 * Simulation.isComplete() reports true. No simulation exists yet to
 * drive that call automatically — Color Expansion and Weapon Clash are
 * still Phase 6/8 (see Progress.md) — so showWinner() currently has no
 * caller. It's ready for whichever of those phases reaches completion
 * first.
 */

export type UIPhase = 'intro' | 'running' | 'winner'

type Listener = () => void

export class UIManager {
  private phase: UIPhase = 'intro'
  private readonly listeners = new Set<Listener>()
  private introTimeoutHandle: ReturnType<typeof setTimeout> | null = null

  /**
   * Begins a new run: enters the 'intro' phase immediately and schedules
   * an automatic transition to 'running' after `durationMs` (defaults to
   * INTRO_SCREEN_DURATION_MS). Safe to call again mid-run (e.g. restart)
   * — any previously scheduled transition is cleared first.
   */
  startRun(durationMs: number = INTRO_SCREEN_DURATION_MS): void {
    this.clearIntroTimer()
    this.setPhase('intro')
    this.introTimeoutHandle = setTimeout(() => {
      this.introTimeoutHandle = null
      this.setPhase('running')
    }, durationMs)
  }

  /**
   * Moves to the 'winner' phase. Intended to be called once
   * Simulation.isComplete() reports true — see the class doc above for
   * why nothing calls this yet.
   */
  showWinner(): void {
    this.clearIntroTimer()
    this.setPhase('winner')
  }

  /** Resets back to the beginning of the timeline. Does not restart the intro timer on its own — call startRun() for that. */
  reset(): void {
    this.clearIntroTimer()
    this.setPhase('intro')
  }

  getPhase(): UIPhase {
    return this.phase
  }

  /** Subscribes to phase changes. Returns an unsubscribe function. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private setPhase(phase: UIPhase): void {
    this.phase = phase
    for (const listener of this.listeners) {
      listener()
    }
  }

  private clearIntroTimer(): void {
    if (this.introTimeoutHandle !== null) {
      clearTimeout(this.introTimeoutHandle)
      this.introTimeoutHandle = null
    }
  }
}
