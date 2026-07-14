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
 * Simulation-specific balance values (arena size, movement speed, damage,
 * rotation speed, weapon lengths, etc.) are intentionally NOT defined here.
 * They are still undecided — see the "Balance" section of Todo.md — and
 * once decided they belong in each simulation's own Config.ts, not here,
 * per Architecture.md's one-canonical-location rule.
 */
