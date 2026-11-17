import {toRaw} from 'vue'
import {filterDOMProps} from '../../vue-aria/src/utils/filterDOMProps'

/**
 * Private stand-in for official `DEFAULT_SLOT`. Vue has no public context-slot
 * symbol, and this one is not part of the package surface. A `slots` object
 * resolves `slots[slot || TOOLBAR_DEFAULT_SLOT]`; a missing entry throws.
 * A context with no `slots` object stays a flat context. `slot === null` opts out.
 */
export const TOOLBAR_DEFAULT_SLOT: unique symbol = Symbol('vue-aria.Toolbar.default')

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
  return resolveClass(chosen, renderValues)
}

const ARIA_CAMEL: Record<string, string> = {
  'aria-label': 'ariaLabel',
  'aria-labelledby': 'ariaLabelledby',
  'aria-describedby': 'ariaDescribedby',
  'aria-details': 'ariaDetails',
}

export function readAriaProp(
  props: Record<string, any>,
  attrs: Record<string, any>,
  ctx: Record<string, any> | null | undefined,
  key: string,
) {
  const camel = ARIA_CAMEL[key]
  if (props[camel] !== undefined) return props[camel]
  if (props[key] !== undefined) return props[key]
  if (attrs[camel] !== undefined) return attrs[camel]
  if (attrs[key] !== undefined) return attrs[key]
  if (ctx) {
    if (ctx[camel] !== undefined) return ctx[camel]
    if (ctx[key] !== undefined) return ctx[key]
  }
  return undefined
}

export function localClassValue(props: {className?: unknown}, attrs: Record<string, any>) {
  if (props.className !== undefined) return props.className
  if (attrs.className !== undefined) return attrs.className
  if (typeof attrs.class === 'string' && attrs.class !== '') return attrs.class
  if (typeof attrs.class === 'function') return attrs.class
  return undefined
}

export function readSlotContext(ctx: Record<string, any> | null | undefined, slot?: string | null) {
  if (slot === null) return null
  if (!ctx) return null
  const raw = toRaw(ctx) as Record<string, any>
  if (raw && typeof raw === 'object' && raw.slots) {
    const slots = toRaw(raw.slots) as Record<PropertyKey, Record<string, any> | undefined>
    const slotKey: PropertyKey = slot ? slot : TOOLBAR_DEFAULT_SLOT
    const selected = slots[slotKey]
    if (!selected) {
      const available = new Intl.ListFormat().format(Object.keys(slots).map((name) => `"${name}"`))
      const errorMessage = slot ? `Invalid slot "${slot}".` : 'A slot prop is required.'
      throw new Error(`${errorMessage} Valid slot names are ${available}.`)
    }
    return selected
  }
  return raw
}

/** Read `ref` without Vue's reactive proxy unwrapping a nested ref. */
export function readContextRef(ctx: Record<string, any> | null | undefined) {
  if (!ctx) return undefined
  return (toRaw(ctx) as Record<string, any>).ref
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

export function bindDom(props: Record<string, any>) {
  const out: Record<string, any> = {}
  for (const key of Object.keys(props)) {
    const value = props[key]
    if (value !== undefined) out[key] = value
  }
  return out
}
