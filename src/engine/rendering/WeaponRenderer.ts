import type { RenderableWeapon } from './Renderer'

/**
 * Draws a single weapon as a line segment (see docs/WeaponClash.md,
 * Weapons — "Procedurally drawn... Attached to player edge. Rotates
 * around player."). Purely a drawing function, like every other file in
 * engine/rendering: it holds no state of its own and knows nothing about
 * players, damage, or rotation — mirrors ArenaRenderer.ts,
 * CharacterRenderer.ts, and GridRenderer.ts.
 *
 * Weapon Variant (Sword/Axe/Bow/Spear — see WeaponClash.md, Weapons) is
 * not yet selectable (see docs/WeaponClash.md's own TODO and
 * docs/Progress.md, Phase 8 judgment calls), so every weapon is drawn
 * identically: a single line in the wielding character's color.
 */
export function drawWeapon(ctx: CanvasRenderingContext2D, weapon: RenderableWeapon): void {
  ctx.strokeStyle = weapon.color
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(weapon.start.x, weapon.start.y)
  ctx.lineTo(weapon.end.x, weapon.end.y)
  ctx.stroke()
}
