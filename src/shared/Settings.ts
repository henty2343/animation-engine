/**
 * A small generic key-value settings store with change notification.
 *
 * This intentionally holds no interfaces or fixed settings shape (see
 * Architecture.md: "/src/shared — No interfaces live here"). The shared,
 * simulation-agnostic values chosen in the Menu (selected simulation,
 * selected characters, aspect ratio — see Engine.md, Menu) are read and
 * written through this store by the Menu itself in a later phase.
 * Simulation-specific settings belong in that simulation's own Config.ts,
 * not here.
 */

type Listener = () => void

const settings = new Map<string, unknown>()
const listeners = new Set<Listener>()

/** Reads a setting, falling back to defaultValue if it hasn't been set. */
export function getSetting<T>(key: string, defaultValue: T): T {
  return settings.has(key) ? (settings.get(key) as T) : defaultValue
}

/** Writes a setting and notifies subscribers. */
export function setSetting<T>(key: string, value: T): void {
  settings.set(key, value)
  for (const listener of listeners) {
    listener()
  }
}

/** Subscribes to any settings change. Returns an unsubscribe function. */
export function onSettingsChange(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Clears every stored setting. Intended for tests and simulation resets. */
export function resetSettings(): void {
  settings.clear()
}
