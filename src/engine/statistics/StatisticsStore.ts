/**
 * Generic engine-side statistics store (see Roadmap.md, Phase 4 —
 * "Statistics System").
 *
 * Holds one record of type TStats per player, keyed by player id. This
 * class has no idea what fields TStats contains — each simulation defines
 * its own statistics shape in its own folder (see Architecture.md,
 * one-canonical-location rule: a type used by exactly one simulation
 * belongs inside that simulation's own folder, not in /src/types). For
 * example, Color Expansion's stats might look like
 * `{ rank: number; character: Character; territoryPercent: number; skill: string }`
 * and Weapon Clash's `{ hp: number; damage: number; rotationSpeed: number; skill: string }`
 * (see ColorExpansion.md / WeaponClash.md, Statistics) — but neither shape
 * is defined here, and none is invented by this phase. The engine only
 * stores, updates, sorts, and exposes statistics; it never defines what a
 * "statistic" is (see Roadmap.md, Phase 4 — "The engine never defines
 * what statistics exist").
 *
 * Ranking/sorting itself is delegated to the comparator helpers in
 * Ranking.ts — this class only applies whatever comparator it's given.
 */
export class StatisticsStore<TStats> {
  private readonly stats = new Map<string, TStats>()

  /** Creates or fully replaces a player's stats record. */
  set(playerId: string, stats: TStats): void {
    this.stats.set(playerId, stats)
  }

  /**
   * Merges a partial update into a player's existing stats record.
   * Throws if no record exists yet for that player — call set() first
   * (e.g. when a player spawns) to establish the initial record.
   */
  update(playerId: string, patch: Partial<TStats>): void {
    const existing = this.stats.get(playerId)
    if (!existing) {
      throw new Error(
        `StatisticsStore.update: no stats recorded yet for player "${playerId}". Call set() first.`,
      )
    }
    this.stats.set(playerId, { ...existing, ...patch })
  }

  /** Reads a single player's current stats, or undefined if none recorded. */
  get(playerId: string): TStats | undefined {
    return this.stats.get(playerId)
  }

  /** Whether any stats record exists yet for this player. */
  has(playerId: string): boolean {
    return this.stats.has(playerId)
  }

  /**
   * Removes a player's stats record entirely. Most simulations should
   * prefer leaving an eliminated player's final stats in place instead
   * (both ColorExpansion.md and WeaponClash.md keep eliminated players in
   * the final ranking) — this exists for callers that explicitly want a
   * player gone, not as the default elimination path.
   */
  delete(playerId: string): void {
    this.stats.delete(playerId)
  }

  /** Every player id currently tracked, in insertion order. */
  playerIds(): string[] {
    return [...this.stats.keys()]
  }

  /**
   * Returns every tracked player's stats sorted by `comparator`, without
   * mutating the store or the order stats were originally inserted in.
   * This is the "live stats remain sorted by X" behaviour both simulation
   * docs call for (Color Expansion: territory %; Weapon Clash: highest
   * HP — see each doc's Statistics section) — the caller supplies the
   * comparator (see Ranking.ts) since the engine doesn't know which field
   * to rank by.
   */
  getRanked(comparator: (a: TStats, b: TStats) => number): RankedEntry<TStats>[] {
    return [...this.stats.entries()]
      .map(([playerId, stats]) => ({ playerId, stats }))
      .sort((a, b) => comparator(a.stats, b.stats))
  }

  /**
   * Removes every tracked player's stats. Intended for simulation
   * restarts (see SimulationEngine.reset() / restart()) so a fresh run
   * never inherits a previous run's statistics.
   */
  clear(): void {
    this.stats.clear()
  }
}

/**
 * One player's stats paired with their id, as returned by getRanked().
 * An engine/statistics-only concept — mirrors RenderableCharacter in
 * engine/rendering/Renderer.ts, which is likewise not a simulation state
 * type and so isn't declared in /src/types.
 */
export interface RankedEntry<TStats> {
  playerId: string
  stats: TStats
}
