/** Minimum number of players supported by any simulation (see Engine.md, Menu). */
export const MIN_PLAYERS = 2

/** Maximum number of players supported by any simulation (see Engine.md, Menu). */
export const MAX_PLAYERS = 4

/** Supported output aspect ratios (see Engine.md, Menu; Blueprint.md). */
export const ASPECT_RATIOS = {
  WIDESCREEN: '16:9',
  VERTICAL: '9:16',
} as const

export type AspectRatio = (typeof ASPECT_RATIOS)[keyof typeof ASPECT_RATIOS]

/**
 * Intro screen duration, in milliseconds (see Engine.md, Timeline and both
 * simulation docs' Intro Screen sections: "~1–2 seconds").
 */
export const INTRO_SCREEN_DURATION_MS = 1500

/**
 * Universal square arena size, in pixels (see Engine.md, Arena — "Same
 * dimensions for every simulation"). This is a TEMPORARY placeholder —
 * Engine.md's own TODO still lists "Final arena dimensions" as an open
 * item, and Todo.md's Balance section doesn't cover it either. It exists
 * here, rather than duplicated as a local constant in every Arena
 * component, so every simulation's on-screen arena reads the exact same
 * value (see docs/CLAUDE.md, General Principles — "Never duplicate
 * logic"). Previously this lived only as a local `DEMO_ARENA` size in
 * components/Arena/Arena.tsx; that component now reads this constant
 * too, and ColorExpansionArena.tsx (Color Expansion's real, non-demo
 * Arena component) reads it as well.
 */
export const UNIVERSAL_ARENA_SIZE = 480

/**
 * Simulation-specific balance values (arena size, movement speed, damage,
 * rotation speed, weapon lengths, etc.) are intentionally NOT defined here.
 * They are still undecided — see the "Balance" section of Todo.md — and
 * once decided they belong in each simulation's own Config.ts, not here,
 * per Architecture.md's one-canonical-location rule.
 */
