/** Restricts a value to the inclusive range [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Linearly interpolates between start and end by t (typically 0–1). */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

/** Euclidean distance between two points. */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1)
}

/** Angle in radians from point 1 to point 2. */
export function angleBetween(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1)
}

/** Normalizes an angle in radians to the range [0, 2π). */
export function normalizeAngle(angle: number): number {
  const twoPi = Math.PI * 2
  return ((angle % twoPi) + twoPi) % twoPi
}

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI
}
