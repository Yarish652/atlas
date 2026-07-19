/**
 * The entity.
 *
 * Phase 1: a placeholder circle that behaves — notices the cursor after a
 * beat, squashes awake, walks to hovered hero buttons with real acceleration,
 * observes, loses interest, goes home, breathes.
 *
 * The contract: the homepage does not know this exists; this knows the
 * homepage exists, and only inside `interaction/map.ts`. The circle is
 * disposable — a future Rive cat replaces `renderer/` and nothing else.
 */
export { mountEntity } from './entity'
export { DRIVE_PARAMS } from './drives/params'
export type { Entity } from './entity'
export type { StateId } from './stateMachine/states'
export type { TargetId } from './interaction/map'
export type { DriveId } from './drives/drives'
export type { DocPoint, Vec } from './types'
