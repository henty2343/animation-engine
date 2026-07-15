import type { Simulation } from '../../types/Simulation'

/**
 * Owns the simulation lifecycle and drives the engine's single tick loop
 * (see Architecture.md, Engine — "There is no separate SimulationManager
 * class"; Engine.md, Main Loop).
 *
 * Phase 2 adds the requestAnimationFrame tick loop itself: startLoop() /
 * stopLoop() below, driving a caller-supplied per-frame callback with the
 * elapsed time since the previous frame (see Roadmap.md, Phase 2 —
 * "Engine tick", "Basic animation timing"). This tick is the only loop in
 * the engine (see Engine.md, Main Loop) — Phase 3 hooks the simulation's
 * fixed-timestep update into this same loop, it does not add a second
 * one.
 *
 * Still not implemented (Phase 3):
 * - start()/stop()/restart()/reset() of a loaded simulation. startLoop()/
 *   stopLoop() below only control the tick's timing, not a simulation's
 *   lifecycle — deliberately different names so Phase 3 can add its own
 *   start/stop/restart/reset without a collision.
 * - Calling Simulation.update() on a fixed timestep independent of render
 *   FPS. No simulation logic runs from this class yet — tick() below only
 *   tracks elapsed time and invokes the caller's render callback (see
 *   Roadmap.md, Phase 2 — "No simulation logic").
 */
export class SimulationEngine<TState = unknown> {
  private simulation: Simulation<TState> | null = null
  private state: TState | null = null

  private rafHandle: number | null = null
  private lastTimestampMs: number | null = null
  private onFrame: ((deltaTimeMs: number) => void) | null = null

  /** Loads a simulation, ready to be started in a later phase. */
  load(simulation: Simulation<TState>): void {
    this.simulation = simulation
    this.state = null
  }

  /** The currently loaded simulation, if any. */
  getSimulation(): Simulation<TState> | null {
    return this.simulation
  }

  /** The current simulation state, if a run has been created. */
  getState(): TState | null {
    return this.state
  }

  /**
   * Starts the engine's requestAnimationFrame loop, calling `onFrame`
   * once per frame with the elapsed time (ms) since the previous frame
   * (0 on the very first frame). React only starts and stops this loop —
   * it never drives it directly (see Engine.md, Main Loop).
   *
   * Safe to call again while already running: it restarts timing cleanly
   * instead of stacking a second loop.
   */
  startLoop(onFrame: (deltaTimeMs: number) => void): void {
    this.stopLoop()
    this.onFrame = onFrame
    this.rafHandle = requestAnimationFrame(this.tick)
  }

  /** Stops the engine's tick loop. Safe to call even if it isn't running. */
  stopLoop(): void {
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle)
    }
    this.rafHandle = null
    this.lastTimestampMs = null
    this.onFrame = null
  }

  /**
   * One frame of the engine tick: computes elapsed time and invokes the
   * render callback, then schedules the next frame. Deliberately does not
   * call Simulation.update() — the fixed-timestep hook into this same
   * loop is Phase 3 (see Engine.md, Main Loop and Determinism).
   */
  private tick = (timestampMs: number): void => {
    const deltaTimeMs =
      this.lastTimestampMs === null ? 0 : timestampMs - this.lastTimestampMs
    this.lastTimestampMs = timestampMs

    this.onFrame?.(deltaTimeMs)

    this.rafHandle = requestAnimationFrame(this.tick)
  }
}
