/**
 * Generic ranking/sorting helpers for use with
 * StatisticsStore.getRanked() (see Roadmap.md, Phase 4 — "Generic ranking
 * and sorting helpers").
 *
 * These only know how to compare two numbers pulled out of a stats record
 * via a caller-supplied selector — they have no idea which field that is
 * for any given simulation (territory %, HP, etc.), keeping with "the
 * engine never defines what statistics exist" (see Roadmap.md, Phase 4).
 */

/**
 * Comparator ranking the highest selected value first — e.g.
 * `descendingBy<WeaponClashStats>((s) => s.hp)` for Weapon Clash's
 * "Sorted by Highest HP", or territory % for Color Expansion (see each
 * doc's Statistics section).
 */
export function descendingBy<TStats>(
  selectValue: (stats: TStats) => number,
): (a: TStats, b: TStats) => number {
  return (a, b) => selectValue(b) - selectValue(a)
}

/** Comparator ranking the lowest selected value first. */
export function ascendingBy<TStats>(
  selectValue: (stats: TStats) => number,
): (a: TStats, b: TStats) => number {
  return (a, b) => selectValue(a) - selectValue(b)
}
