import wasmUrl from '@rive-app/canvas-lite/rive.wasm?url'

type RiveModule = typeof import('@rive-app/canvas-lite')

let loading: Promise<RiveModule> | null = null

/**
 * The Rive runtime, loaded on first use and shared by everything that
 * animates with it. The WASM is served from our own origin rather than the
 * runtime's default CDN, so nothing third-party loads at runtime.
 */
export function loadRive(): Promise<RiveModule> {
  loading ??= import('@rive-app/canvas-lite').then((mod) => {
    mod.RuntimeLoader.setWasmUrl(wasmUrl)
    return mod
  })
  return loading
}
