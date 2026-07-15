import type { Simulation } from '../../types/Simulation'

/**
 * Fixed timestep (ms) used for every Simulation.update() call, independent
 * of how often the render callback actually fires (see Engine.md,
 * Determinism — "Simulation updates run on a fixed timestep, independent
 * of rendering FPS"). This constant lives here rather than in
 * /shared/Constants.ts because it is part of the tick loop itself (see
 * Architecture.md: "/engine only if it is part of the tick loop... or
 * physics/rendering pipeline itself").
 *
 * 60 updates per second is a reasonable engine-level default. No
 * simulation chooses its own timestep — see Architecture.md's
 * one-canonical-location rule.
 */
const FIXED_TIMESTEP_MS = 1000 / 60

/**
 * Owns the simulation lifecycle and drives the engine's single tick loop
 * (see Architecture.md, Engine — "There is no separate SimulationManager
 * class"; Engine.md, Main Loop).
 *
 * Phase 2 added the requestAnimationFrame tick loop itself: startLoop() /
 * stopLoop(), driving a caller-supplied per-frame callback with the
 * elapsed time since the previous frame. That tick is still the only loop
 * in the engine (see Engine.md, Main Loop) — Phase 3 below hooks
 * Simulation.update() into this same loop instead of adding a second one
 * (see Roadmap.md, Phase 3 — "hooked into the Phase 2 engine tick, not a
 * second loop").
 *
 * Phase 3 adds:
 * - start() / stop() / restart() / reset(): the run lifecycle, living
 *   directly on this class (see Architecture.md — no separate
 *   SimulationManager).
 * - advanceSimulationStep(): a fixed-timestep accumulator that calls
 *   Simulation.update() a deterministic number of times per tick,
 *   regardless of the render callback's actual frame rate, and stops the
 *   run as soon as Simulation.isComplete() reports true.
 *
 * Still not implemented:
 * - Any real simulation to load — Color Expansion and Weapon Clash arrive
 *   in Phase 6 and Phase 8.
 * - Any UI wiring (Menu, live stats, intro/winner screens — Phase 5+).
 */
export class SimulationEngine<TState = unknown> {
  private simulation: Simulation<TState> | null = null
  private state: TState | null = null
  private seed: number | null = null

  private rafHandle: number | null = null
  private lastTimestampMs: number | null = null
  private onFrame: ((deltaTimeMs: number) => void) | null = null

  /**
   * The render callback passed to the most recent start(), kept around
   * (unlike `onFrame`, which stopLoop() clears) so restart() can re-drive
   * the same rendering without the caller having to supply it again.
   */
  private lastOnFrame: ((deltaTimeMs: number) => void) | null = null

  /** Accumulated real time (ms) not yet paid out as a fixed timestep. */
  private accumulatorMs = 0

  /**
   * Loads a simulation, ready to be started. Any in-progress run of a
   * previously loaded simulation is stopped and cleared first (see
   * reset()) — loading a new simulation must never leave a stale tick
   * loop calling update() on the old one.
   */
  load(simulation: Simulation<TState>): void {
    this.reset()
    this.simulation = simulation
  }

  /** The currently loaded simulation, if any. */
  getSimulation(): Simulation<TState> | null {
    return this.simulation
  }

  /** The current simulation state, if a run has been created. */
  getState(): TState | null {
    return this.state
  }

  /** Whether a run is currently active: state exists and the tick loop is driving it. */
  isRunning(): boolean {
    return this.state !== null && this.rafHandle !== null
  }

  /**
   * Starts the engine's requestAnimationFrame loop, calling `onFrame`
   * once per frame with the elapsed time (ms) since the previous frame
   * (0 on the very first frame). React only starts and stops this loop —
   * it never drives it directly (see Engine.md, Main Loop).
   *
   * Safe to call again while already running: it restarts timing cleanly
   * instead of stacking a second loop.
   *
   * This is the engine's single low-level tick driver. start() below
   * calls it internally once a simulation run begins, but it can also
   * drive rendering on its own with no simulation loaded at all (see the
   * Phase 2 demo in components/Arena/Arena.tsx, which never calls
   * load()/start() and so never triggers a simulation update).
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
   * Starts a new run of the loaded simulation from `seed`: builds the
   * initial state via Simulation.createInitialState(seed) (see
   * Engine.md, Determinism — "the same seed must always produce the same
   * result") and begins driving Simulation.update() on a fixed timestep
   * from the shared tick loop, with `onFrame` invoked every frame
   * afterward for rendering.
   *
   * Throws if no simulation has been loaded via load().
   */
  start(seed: number, onFrame: (deltaTimeMs: number) => void): void {
    if (!this.simulation) {
      throw new Error(
        'SimulationEngine.start() called before a simulation was loaded via load().',
      )
    }

    this.seed = seed
    this.lastOnFrame = onFrame
    this.state = this.simulation.createInitialState(seed)
    this.accumulatorMs = 0
    this.startLoop(onFrame)
  }

  /**
   * Stops the current run. The tick loop halts and Simulation.update() is
   * no longer called. The last computed state is preserved (readable via
   * getState()) rather than cleared — restart() or reset() decide what
   * happens to it next.
   */
  stop(): void {
    this.stopLoop()
  }

  /**
   * Re-runs the loaded simulation from the beginning, using the same seed
   * and render callback as the last start() call. This is how determinism
   * gets verified: the same seed must produce the same winner and
   * statistics on repeated runs (see Roadmap.md, Phase 3 and the
   * Definition of Done in ColorExpansion.md / WeaponClash.md).
   *
   * Throws if start() has never been called, or the run was cleared via
   * reset() — there is no seed to restart from.
   */
  restart(): void {
    if (this.seed === null || this.lastOnFrame === null) {
      throw new Error('SimulationEngine.restart() called before start().')
    }

    this.start(this.seed, this.lastOnFrame)
  }

  /**
   * Clears the current run entirely: stops the tick loop and discards
   * state, seed, the remembered render callback, and the fixed-timestep
   * accumulator. The loaded simulation itself is untouched — call start()
   * again with a (possibly new) seed to begin a fresh run.
   */
  reset(): void {
    this.stopLoop()
    this.state = null
    this.seed = null
    this.lastOnFrame = null
    this.accumulatorMs = 0
  }

  /**
   * One frame of the engine tick: computes elapsed time, advances the
   * simulation on its fixed timestep, then invokes the render callback —
   * matching Engine.md's Main Loop order (Engine Tick → Simulation Update
   * → Rendering) — before scheduling the next frame.
   *
   * The render callback is captured before advanceSimulationStep() runs
   * so that the frame on which a run completes (advanceSimulationStep
   * calls stop() internally, which clears `onFrame`) still renders once
   * with the final state — matching "Simulation freezes immediately" in
   * the Winner Screen sections of ColorExpansion.md and WeaponClash.md.
   */
  private tick = (timestampMs: number): void => {
    const deltaTimeMs =
      this.lastTimestampMs === null ? 0 : timestampMs - this.lastTimestampMs
    this.lastTimestampMs = timestampMs

    const onFrame = this.onFrame

    this.advanceSimulationStep(deltaTimeMs)

    onFrame?.(deltaTimeMs)

    if (this.rafHandle !== null) {
      this.rafHandle = requestAnimationFrame(this.tick)
    }
  }

  /**
   * Advances the loaded simulation by zero or more fixed timesteps,
   * accumulating real elapsed time until it can pay for a full step (see
   * Engine.md, Determinism). Every call to Simulation.update() always
   * receives exactly FIXED_TIMESTEP_MS, regardless of the actual
   * deltaTimeMs passed in here — this is what makes the eventual outcome
   * independent of rendering FPS or machine performance.
   *
   * Does nothing if no run is active (no simulation loaded, or state not
   * yet created by start()). Stops the run via stop() as soon as
   * Simulation.isComplete() reports true, without processing any further
   * steps that tick.
   */
  private advanceSimulationStep(deltaTimeMs: number): void {
    if (!this.simulation || this.state === null) {
      return
    }

    this.accumulatorMs += deltaTimeMs

    while (this.accumulatorMs >= FIXED_TIMESTEP_MS) {
      this.state = this.simulation.update(this.state, FIXED_TIMESTEP_MS)
      this.accumulatorMs -= FIXED_TIMESTEP_MS

      if (this.simulation.isComplete(this.state)) {
        this.stop()
        return
      }
    }
  }
}
