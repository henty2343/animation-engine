/**
 * Every simulation runs inside the same universal square arena (see
 * Engine.md, Arena). The exact size is still undecided (see Todo.md,
 * Balance) — this type only describes its shape, not the final numbers.
 */
export interface Arena {
  /** Width and height of the square arena, in simulation units. */
  size: number
}
