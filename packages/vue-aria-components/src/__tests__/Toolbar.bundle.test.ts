/**
 * Imports the built package root and the built Toolbar entry from a clean
 * `pnpm build`. Vitest aliases point at source, so this runs in a separate
 * Node process against `dist/*.js`.
 */
import {describe, expect, it} from 'vitest'

const nodeChild = 'node:child_process'
const nodeFs = 'node:fs'
const nodePath = 'node:path'
const [{execFileSync}, {rmSync}, {join}] = await Promise.all([
  import(nodeChild) as Promise<{execFileSync: (file: string, args: string[], options: Record<string, unknown>) => string}>,
  import(nodeFs) as Promise<{rmSync: (path: string, options: {recursive: boolean; force: boolean}) => void}>,
  import(nodePath) as Promise<{join: (...parts: string[]) => string}>,
])
const proc = (globalThis as unknown as {process: {cwd: () => string; execPath: string}}).process
const repoRoot = proc.cwd()

const consumer = `
import {JSDOM} from 'jsdom'
import {pathToFileURL} from 'node:url'
const dom = new JSDOM('<!doctype html><html><body></body></html>', {url: 'http://localhost/'})
const w = dom.window
globalThis.window = w
globalThis.document = w.document
globalThis.HTMLElement = w.HTMLElement
globalThis.Element = w.Element
globalThis.Node = w.Node
globalThis.SVGElement = w.SVGElement
globalThis.MutationObserver = w.MutationObserver
globalThis.getComputedStyle = w.getComputedStyle.bind(w)
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0)
globalThis.cancelAnimationFrame = (id) => clearTimeout(id)
const root = pathToFileURL(process.cwd() + '/packages/vue-aria-components/dist/index.js').href
const sub = pathToFileURL(process.cwd() + '/packages/vue-aria-components/dist/Toolbar.js').href
const {createApp, h, provide} = await import('vue')
const {DEFAULT_SLOT} = await import(root)
const {Toolbar, ToolbarContext} = await import(sub)
let message = ''
const host = document.createElement('div')
document.body.appendChild(host)
createApp({
  setup() {
    provide(ToolbarContext, {
      slots: {
        [DEFAULT_SLOT]: {
          'aria-label': 'From default',
          orientation: 'vertical',
          className: 'from-default',
        },
      },
      'aria-label': 'Flat should not apply',
    })
    return () => h(Toolbar, {}, () => 'child')
  },
  errorCaptured(err) {
    message = err instanceof Error ? err.message : String(err)
    return false
  },
}).mount(host)
const el = host.querySelector('[role="toolbar"]')
let missing = ''
const host2 = document.createElement('div')
document.body.appendChild(host2)
createApp({
  setup() {
    provide(ToolbarContext, {slots: {test: {'aria-label': 'Named'}}})
    return () => h(Toolbar, {slot: 'absent'})
  },
  errorCaptured(err) {
    missing = err instanceof Error ? err.message : String(err)
    return false
  },
}).mount(host2)
console.log(JSON.stringify({
  ariaLabel: el && el.getAttribute('aria-label'),
  orientation: el && el.getAttribute('aria-orientation'),
  dataOrientation: el && el.getAttribute('data-orientation'),
  className: el && el.className,
  text: el && el.textContent,
  error: message,
  missing,
}))
`

describe('built vue-aria-components entries', () => {
  it('uses the root DEFAULT_SLOT with Toolbar from the subpath bundle', () => {
    for (const pkg of ['vue-stately', 'vue-aria', 'vue-aria-components']) {
      rmSync(join(repoRoot, 'packages', pkg, 'dist'), {recursive: true, force: true})
    }
    execFileSync('pnpm', ['build'], {cwd: repoRoot, stdio: 'inherit'})
    const output = execFileSync(proc.execPath, ['--input-type=module'], {
      cwd: repoRoot,
      input: consumer,
      encoding: 'utf8',
    })
    const result = JSON.parse(output.trim().split('\n').at(-1)!) as {
      ariaLabel: string | null
      orientation: string | null
      dataOrientation: string | null
      className: string | null
      text: string | null
      error: string
      missing: string
    }
    expect(result.error).toBe('')
    expect(result.ariaLabel).toBe('From default')
    expect(result.orientation).toBe('vertical')
    expect(result.dataOrientation).toBe('vertical')
    expect(result.className).toContain('from-default')
    expect(result.text).toContain('child')
    expect(result.missing).toMatch(/Invalid slot "absent"/)
  }, 180000)
})
