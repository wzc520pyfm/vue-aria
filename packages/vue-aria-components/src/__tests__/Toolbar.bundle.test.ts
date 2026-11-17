/**
 * Imports the built package root and the built Toolbar, ToggleButton, and
 * ToggleButtonGroup entries from one clean `pnpm build`. Vitest aliases point
 * at source, so this runs in a separate Node process against `dist/*.js`.
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
const {createApp, h, nextTick, provide} = await import('vue')
const rootMod = await import(root)
const {DEFAULT_SLOT, ToggleButtonContext, ToggleGroupStateContext, ToggleButton: RootButton} = rootMod
const {Toolbar, ToolbarContext} = await import(sub)
const buttonEntry = pathToFileURL(process.cwd() + '/packages/vue-aria-components/dist/ToggleButton.js').href
const groupEntry = pathToFileURL(process.cwd() + '/packages/vue-aria-components/dist/ToggleButtonGroup.js').href
const buttonMod = await import(buttonEntry)
const groupMod = await import(groupEntry)
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
const tokenHost = document.createElement('div')
document.body.appendChild(tokenHost)
let tokenError = ''
createApp({
  setup() {
    provide(ToggleButtonContext, {
      slots: {
        [DEFAULT_SLOT]: {'aria-label': 'Token', className: 'from-token'},
      },
    })
    return () => h(buttonMod.ToggleButton, {}, () => 'Tok')
  },
  errorCaptured(err) {
    tokenError = err instanceof Error ? err.message : String(err)
    return false
  },
}).mount(tokenHost)
const tokenButton = tokenHost.querySelector('button')
let groupState = null
let buttonState = null
const pickHost = document.createElement('div')
document.body.appendChild(pickHost)
createApp({
  setup() {
    return () => h(groupMod.ToggleButtonGroup, {'aria-label': 'Pick'}, {
      default: (groupValues) => {
        groupState = groupValues.state
        return [
          h(RootButton, {id: 'a'}, {
            default: (buttonValues) => {
              buttonState = buttonValues.state
              return 'A'
            },
          }),
          h(groupMod.ToggleButton, {id: 'b'}, () => 'B'),
        ]
      },
    })
  },
}).mount(pickHost)
const choice = pickHost.querySelector('button')
choice.click()
await nextTick()
const choices = [...pickHost.querySelectorAll('button')]
console.log(JSON.stringify({
  ariaLabel: el && el.getAttribute('aria-label'),
  orientation: el && el.getAttribute('aria-orientation'),
  dataOrientation: el && el.getAttribute('data-orientation'),
  className: el && el.className,
  text: el && el.textContent,
  error: message,
  missing,
  tokenError,
  tokenLabel: tokenButton && tokenButton.getAttribute('aria-label'),
  tokenClass: tokenButton && tokenButton.className,
  stateSame: ToggleGroupStateContext === groupMod.ToggleGroupStateContext,
  buttonCtxSame: ToggleButtonContext === buttonMod.ToggleButtonContext,
  groupOmitsContext: groupMod.ToggleButtonContext === undefined,
  groupOmitsIndicator: groupMod.SelectionIndicator === undefined,
  choiceRole: choice && choice.getAttribute('role'),
  choiceChecked: choice && choice.getAttribute('aria-checked'),
  otherChecked: choices[1] && choices[1].getAttribute('aria-checked'),
  groupHasA: !!(groupState && groupState.selectedKeys.has('a')),
  buttonSelected: !!(buttonState && buttonState.isSelected),
  sameSelectionObject: !!(groupState && buttonState && groupState.selectedKeys === buttonState),
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
      tokenError: string
      tokenLabel: string | null
      tokenClass: string | null
      stateSame: boolean
      buttonCtxSame: boolean
      groupOmitsContext: boolean
      groupOmitsIndicator: boolean
      choiceRole: string | null
      choiceChecked: string | null
      otherChecked: string | null
      groupHasA: boolean
      buttonSelected: boolean
      sameSelectionObject: boolean
    }
    expect(result.error).toBe('')
    expect(result.ariaLabel).toBe('From default')
    expect(result.orientation).toBe('vertical')
    expect(result.dataOrientation).toBe('vertical')
    expect(result.className).toContain('from-default')
    expect(result.text).toContain('child')
    expect(result.missing).toMatch(/Invalid slot "absent"/)
    expect(result.tokenError).toBe('')
    expect(result.tokenLabel).toBe('Token')
    expect(result.tokenClass).toContain('from-token')
    expect(result.stateSame).toBe(true)
    expect(result.buttonCtxSame).toBe(true)
    expect(result.groupOmitsContext).toBe(true)
    expect(result.groupOmitsIndicator).toBe(true)
    expect(result.choiceRole).toBe('radio')
    expect(result.choiceChecked).toBe('true')
    expect(result.otherChecked).toBe('false')
    expect(result.groupHasA).toBe(true)
    expect(result.buttonSelected).toBe(true)
    expect(result.sameSelectionObject).toBe(false)
  }, 180000)
})
