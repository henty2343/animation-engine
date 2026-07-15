/**
 * Generic reusable configuration container (see Roadmap.md, Phase 4 —
 * "Configuration System").
 *
 * Holds one immutable "current config" object of type T, built by
 * layering caller-supplied overrides on top of caller-supplied defaults.
 * This class carries no interfaces and no simulation-specific fields of
 * its own (see Architecture.md: "/src/shared — No interfaces live here")
 * — T is entirely supplied by the caller, so the engine never defines
 * simulation settings (see Roadmap.md, Phase 4).
 *
 * Two callers are expected to build on this:
 *
 * - Engine-wide configuration: a single instance covering values shared
 *   by every simulation. None exist yet — every currently-undecided
 *   engine-level number (e.g. final arena dimensions, see Engine.md,
 *   TODO) is still an open item in Todo.md, not a value this phase
 *   invents. `FIXED_TIMESTEP_MS` in engine/core/SimulationEngine.ts
 *   deliberately stays a private constant there rather than moving here
 *   — see Progress.md's Phase 3 decisions for why it's tick-loop-specific
 *   rather than a general engine-wide setting.
 * - Simulation-specific configuration: each simulation's own Config.ts
 *   (src/simulations/ColorExpansion/Config.ts,
 *   src/simulations/WeaponClash/Config.ts — currently empty placeholders)
 *   will construct its own `Config<ThatSimulationsShape>` once that
 *   simulation's balance values are decided (see Todo.md, Balance — grid
 *   dimensions, movement speed, damage, rotation speed, weapon lengths
 *   are all still TODO). This phase only builds the reusable container;
 *   it does not decide or guess any of those values (see docs/CLAUDE.md,
 *   "If Requirements Are Missing").
 */
export class Config<T extends object> {
  private readonly values: Readonly<T>

  constructor(defaults: T, overrides: Partial<T> = {}) {
    this.values = Object.freeze({ ...defaults, ...overrides })
  }

  /** Reads a single config value by key. */
  get<K extends keyof T>(key: K): T[K] {
    return this.values[key]
  }

  /** Reads every config value at once, as a frozen snapshot. */
  getAll(): Readonly<T> {
    return this.values
  }

  /**
   * Returns a new Config with the given overrides layered on top of this
   * instance's current values. Does not mutate this instance — deriving
   * a variant config (e.g. a future difficulty setting) never affects any
   * other run holding the original.
   */
  withOverrides(overrides: Partial<T>): Config<T> {
    return new Config(this.values, overrides)
  }
}
