/**
 * Deterministic pseudo-random number generator (mulberry32).
 *
 * The same seed always produces the same sequence of values. Every
 * simulation must use an instance of this — never `Math.random()` —
 * to satisfy the engine's determinism guarantee: the same seed must
 * always produce the same winner and statistics (see Engine.md,
 * Determinism).
 *
 * Each run should construct its own instance from that run's seed so
 * restarting or replaying never carries state over from a previous run.
 */
export class Random {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  /** Returns a float in the range [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0
    let t = this.state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /** Returns an integer in the range [min, max], inclusive. */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  /** Returns a float in the range [min, max). */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min
  }

  /** Returns true with the given probability, in the range [0, 1]. */
  chance(probability: number): boolean {
    return this.next() < probability
  }

  /** Returns a random element from a non-empty array. */
  pick<T>(items: readonly T[]): T {
    return items[this.nextInt(0, items.length - 1)]
  }
}
