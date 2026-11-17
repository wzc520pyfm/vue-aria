import {Fragment, isVNode, type VNode, type VNodeChild} from 'vue'
import {filterDOMProps} from '../../vue-aria/src/utils/filterDOMProps'

export function defineLive(target: object, key: string, get: () => unknown) {
  Object.defineProperty(target, key, {get, enumerable: true, configurable: true})
}

export function assignRef(target: unknown, el: unknown) {
  if (typeof target === 'function') {
    target(el)
    return
  }
  if (target && typeof target === 'object' && 'value' in (target as object)) {
    ;(target as {value: unknown}).value = el
  }
}

/** Clear a shared ref only while it still points at this instance's element. */
export function assignRefIfCurrent(target: unknown, el: unknown, current: unknown) {
  if (el == null && target && typeof target === 'object' && 'value' in (target as object)) {
    if ((target as {value: unknown}).value !== current) return
  }
  assignRef(target, el)
}

function vnodeChildren(vnode: VNode): VNodeChild {
  const children = vnode.children as any
  if (children == null || typeof children === 'string' || typeof children === 'number') return null
  if (typeof children === 'function') return children()
  if (Array.isArray(children)) return children
  if (typeof children === 'object' && children && 'default' in children) {
    const slot = children.default
    return typeof slot === 'function' ? slot() : slot
  }
  return children as VNodeChild
}

function flatten(input: VNodeChild): VNode[] {
  if (input == null || typeof input === 'boolean' || typeof input === 'string' || typeof input === 'number') return []
  if (Array.isArray(input)) return input.flatMap((child) => flatten(child as VNodeChild))
  if (!isVNode(input)) return []
  if (input.type === Fragment || typeof input.type === 'string') return flatten(vnodeChildren(input))
  return [input]
}

function componentName(vnode: VNode) {
  const type = vnode.type as {name?: string; __name?: string} | string
  if (!type || typeof type === 'string') return null
  return type.name || type.__name || null
}

export function hasLabelNode(input: VNodeChild): boolean {
  return flatten(input).some((node) => componentName(node) === 'Label')
}

function resolveClass(source: unknown, values: unknown) {
  return typeof source === 'function' ? (source as (value: unknown) => unknown)(values) : source
}

function isStyleObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export function mergeRenderStyle(contextStyle: unknown, localStyle: unknown, values: Record<string, unknown>) {
  const renderValues = {...values, defaultStyle: (values.defaultStyle as Record<string, unknown> | undefined) ?? {}}
  if (contextStyle == null && localStyle == null) return undefined
  if (contextStyle != null && localStyle != null) {
    if (typeof contextStyle === 'function' || typeof localStyle === 'function') {
      const contextResolved = typeof contextStyle === 'function' ? contextStyle(renderValues) : contextStyle
      if (typeof contextResolved === 'string') {
        const localResolved = typeof localStyle === 'function'
          ? localStyle({...renderValues, defaultStyle: {}})
          : localStyle
        if (localResolved == null || localResolved === '') return contextResolved
        return [contextResolved, localResolved]
      }
      const defaultStyle = isStyleObject(contextResolved) ? {...contextResolved} : {}
      const localResolved = typeof localStyle === 'function' ? localStyle({...renderValues, defaultStyle}) : localStyle
      if (typeof localResolved === 'string') return [defaultStyle, localResolved]
      if (isStyleObject(localResolved)) return {...defaultStyle, ...localResolved}
      return defaultStyle
    }
    if (typeof contextStyle === 'string' || typeof localStyle === 'string') {
      return [contextStyle, localStyle].filter((item) => item != null && item !== '')
    }
    if (isStyleObject(contextStyle) && isStyleObject(localStyle)) return {...contextStyle, ...localStyle}
  }
  const only = localStyle != null ? localStyle : contextStyle
  return typeof only === 'function' ? only(renderValues) : only
}

export function mergeClassNames(contextClass: unknown, localClass: unknown, values: unknown, defaultClassName: string) {
  const renderValues = {...(values as object), defaultClassName}
  if (typeof contextClass === 'string' && typeof localClass === 'string') {
    return [contextClass, localClass].filter(Boolean).join(' ')
  }
  const chosen = localClass !== undefined ? localClass : contextClass
  const resolved = resolveClass(chosen, renderValues)
  return resolved === '' || resolved == null ? undefined : resolved
}

export function localClassValue(props: {className?: unknown}, attrs: Record<string, any>) {
  if (props.className !== undefined) return props.className
  if (attrs.className !== undefined) return attrs.className
  if (typeof attrs.class === 'string' && attrs.class !== '') return attrs.class
  if (typeof attrs.class === 'function') return attrs.class
  return undefined
}

export function readSlotContext(ctx: Record<string, any> | null | undefined, slot?: string | null) {
  if (!ctx) return null
  if (slot && ctx.slots && ctx.slots[slot]) return ctx.slots[slot] as Record<string, any>
  return ctx
}

export function pick<T>(local: T | undefined, ctx: Record<string, any> | null, key: string): T | undefined {
  if (local !== undefined) return local
  if (ctx && ctx[key] !== undefined) return ctx[key] as T
  return undefined
}

export function domFrom(source: Record<string, any> | null | undefined) {
  if (!source) return {}
  const copy: Record<string, any> = {}
  for (const key of Object.keys(source)) {
    if (key === 'class' || key === 'style' || key === 'className' || key === 'id' || key === 'ref' || key === 'slots' || key === 'render') continue
    copy[key] = source[key]
  }
  return filterDOMProps(copy, {global: true, labelable: true, events: true})
}

/**
 * Copy a prop bag into a plain object. Hook objects keep live getters, but a
 * native vnode must store the values read during this render. If both the
 * previous and next vnodes share those getters, Vue's patch reads the current
 * value from both sides and skips aria updates.
 */
export function bindDom(props: Record<string, any>) {
  const out: Record<string, any> = {}
  for (const key of Object.keys(props)) {
    const value = props[key]
    if (value !== undefined) out[key] = value
  }
  return out
}

export function clamp(value: number, min = -Infinity, max = Infinity) {
  return Math.min(Math.max(value, min), max)
}

export function readNumber(value: unknown, fallback: number) {
  if (value == null || value === '') return fallback
  const number = Number(value)
  return Number.isNaN(number) ? fallback : number
}
