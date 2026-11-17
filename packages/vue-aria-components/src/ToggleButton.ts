/**
 * Port of `react-aria-components` `ToggleButton`
 * (`packages/react-aria-components/src/ToggleButton.tsx` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. A button joins the surrounding group only when that group
 * exists and `id != null`. `slot={null}` opts out of `ToggleButtonContext`
 * and does not opt out of group state. SelectionIndicator is not rendered.
 */

import {
  defineComponent,
  getCurrentInstance,
  h,
  inject,
  isRef,
  onMounted,
  onUnmounted,
  onUpdated,
  ref,
  type PropType,
} from 'vue'
import {mergeProps, useFocusVisible, useHover, useToggleButton, type HoverEvent, type PressEvent} from 'vue-aria'
import {useToggleState, type ToggleState} from 'vue-stately/useToggleState'
import type {Key} from 'vue-stately/useListState'
import type {ButtonRenderProps} from './Button'
import {ToggleButtonContextKey, ToggleGroupStateContextKey} from './toggleContext'
import {
  assignRef,
  assignRefIfCurrent,
  bindDom,
  domFrom,
  localClassValue,
  mergeClassNames,
  mergeRenderStyle,
  pick,
  readAriaProp,
  readContextRef,
  readSlotContext,
} from './toolbarDom'

export {ToggleButtonContextKey as ToggleButtonContext}

export interface ToggleButtonRenderProps extends Omit<ButtonRenderProps, 'isPending'> {
  /**
   * Whether the button is currently selected.
   * @selector [data-selected]
   */
  isSelected: boolean
  /** State of the toggle button. */
  state: ToggleState
}

export type ToggleButtonStyle =
  | string
  | Record<string, any>
  | ((values: ToggleButtonRenderProps & {defaultStyle: Record<string, any>}) => string | Record<string, any> | null | undefined)

export interface ToggleButtonProps {
  /**
   * When used in a ToggleButtonGroup, an identifier for the item in `selectedKeys`.
   * When used standalone, a DOM id. `null` stays standalone. This is not a group DOM id.
   */
  id?: Key | null
  isSelected?: boolean
  defaultSelected?: boolean
  isDisabled?: boolean
  autoFocus?: boolean
  /** Pointer press does not move focus. A local `false` wins over context. */
  preventFocusOnPress?: boolean
  /** Removes the button from the tab order. A local `false` wins over context. */
  excludeFromTabOrder?: boolean
  slot?: string | null
  className?: string | ((values: ToggleButtonRenderProps & {defaultClassName?: string}) => string)
  style?: ToggleButtonStyle
  'aria-label'?: string | null
  'aria-labelledby'?: string | null
  'aria-describedby'?: string | null
  'aria-details'?: string | null
  'aria-haspopup'?: boolean | string | null
  'aria-expanded'?: boolean | 'true' | 'false' | null
  'aria-controls'?: string | null
  'aria-disabled'?: boolean | 'true' | 'false' | null
  /** Vue listener for the lowercase `change` emit. */
  onChange?: (isSelected: boolean) => void
  onPress?: (event: PressEvent) => void
  /** Vue listener for the lowercase `pressstart` emit. */
  onPressstart?: (event: PressEvent) => void
  onPressend?: (event: PressEvent) => void
  onPressup?: (event: PressEvent) => void
  onPresschange?: (isPressed: boolean) => void
  onFocus?: (event: FocusEvent) => void
  onBlur?: (event: FocusEvent) => void
  onFocusChange?: (isFocused: boolean) => void
  onKeyDown?: (event: KeyboardEvent) => void
  onKeyUp?: (event: KeyboardEvent) => void
  onClick?: (event: MouseEvent) => void
  /** Vue listener for the lowercase `hoverstart` emit. */
  onHoverstart?: (event: HoverEvent) => void
  /** Vue listener for the lowercase `hoverend` emit. */
  onHoverend?: (event: HoverEvent) => void
  /** Vue listener for the lowercase `hoverchange` emit. */
  onHoverchange?: (isHovered: boolean) => void
}

function readDesc(desc: PropertyDescriptor | undefined) {
  if (!desc) return undefined
  return typeof desc.get === 'function' ? desc.get() : desc.value
}

function presentGroupItem(
  buttonProps: Record<string, any>,
  mode: () => 'single' | 'multiple',
  selected: () => boolean,
) {
  const roleDesc = Object.getOwnPropertyDescriptor(buttonProps, 'role')
  const pressedDesc = Object.getOwnPropertyDescriptor(buttonProps, 'aria-pressed')
  Object.defineProperty(buttonProps, 'role', {
    configurable: true,
    enumerable: true,
    get() {
      return mode() === 'single' ? 'radio' : readDesc(roleDesc)
    },
  })
  Object.defineProperty(buttonProps, 'aria-checked', {
    configurable: true,
    enumerable: true,
    get() {
      return mode() === 'single' ? selected() : undefined
    },
  })
  Object.defineProperty(buttonProps, 'aria-pressed', {
    configurable: true,
    enumerable: true,
    get() {
      return mode() === 'single' ? undefined : readDesc(pressedDesc)
    },
  })
}

function callDistinct(fns: unknown[], ...args: unknown[]) {
  const seen = new Set<unknown>()
  for (const fn of fns) {
    if (typeof fn !== 'function' || seen.has(fn)) continue
    seen.add(fn)
    fn(...args)
  }
}

const propDefs = {
  id: {type: null as unknown as PropType<Key | null | undefined>, default: undefined},
  isSelected: {type: Boolean, default: undefined},
  defaultSelected: {type: Boolean, default: undefined},
  isDisabled: {type: Boolean, default: undefined},
  autoFocus: {type: Boolean, default: undefined},
  preventFocusOnPress: {type: Boolean, default: undefined},
  excludeFromTabOrder: {type: Boolean, default: undefined},
  slot: {type: String as PropType<string | null | undefined>, default: undefined},
  className: {type: null as unknown as PropType<ToggleButtonProps['className']>, default: undefined},
  style: {type: null as unknown as PropType<ToggleButtonStyle>, default: undefined},
  'aria-label': {type: String as PropType<string | null | undefined>, default: undefined},
  'aria-labelledby': {type: String as PropType<string | null | undefined>, default: undefined},
  'aria-describedby': {type: String as PropType<string | null | undefined>, default: undefined},
  'aria-details': {type: String as PropType<string | null | undefined>, default: undefined},
  'aria-haspopup': {type: null as unknown as PropType<boolean | string | null | undefined>, default: undefined},
  'aria-expanded': {type: null as unknown as PropType<boolean | 'true' | 'false' | null | undefined>, default: undefined},
  'aria-controls': {type: String as PropType<string | null | undefined>, default: undefined},
  'aria-disabled': {type: null as unknown as PropType<boolean | 'true' | 'false' | null | undefined>, default: undefined},
}

export const ToggleButton = defineComponent({
  name: 'ToggleButton',
  inheritAttrs: false,
  props: propDefs,
  emits: {
    change: (_isSelected: boolean) => true,
    press: (_event: PressEvent) => true,
    pressstart: (_event: PressEvent) => true,
    pressend: (_event: PressEvent) => true,
    pressup: (_event: PressEvent) => true,
    presschange: (_isPressed: boolean) => true,
    hoverstart: (_event: HoverEvent) => true,
    hoverend: (_event: HoverEvent) => true,
    hoverchange: (_isHovered: boolean) => true,
  },
  setup(props, {slots, attrs, emit}) {
    const instance = getCurrentInstance()
    const injected = inject(ToggleButtonContextKey, null)
    const groupState = inject(ToggleGroupStateContextKey, null)
    const slotValue = () => {
      if (props.slot !== undefined) return props.slot
      return (attrs.slot as string | null | undefined)
    }
    const resolved = () => {
      const source = (isRef(injected) ? injected.value : injected) as Record<string, any> | null
      return readSlotContext(source, slotValue())
    }
    const itemId = (): Key | null | undefined => {
      if (props.id !== undefined) return props.id
      const ctx = resolved()
      if (ctx && ctx.id !== undefined) return ctx.id as Key
      return undefined
    }
    const inGroup = () => groupState != null && itemId() != null
    const localDisabled = () => pick(props.isDisabled, resolved(), 'isDisabled')

    const standalone = useToggleState({
      isSelected: () => (inGroup() ? undefined : pick(props.isSelected, resolved(), 'isSelected')),
      defaultSelected: () => (inGroup() ? undefined : pick(props.defaultSelected, resolved(), 'defaultSelected')),
      onChange: (value) => {
        if (inGroup()) return
        callDistinct([resolved()?.onChange], value)
        emit('change', value)
      },
    })
    // Official `useToggleState` does `useState(isSelected)` once. Capture the
    // group's initial membership here, not on the first getter read and not
    // again when `id` later changes.
    const initialGroupId = itemId()
    const initialGroupDefault = groupState != null && initialGroupId != null
      ? groupState.selectedKeys.has(initialGroupId)
      : undefined
    const viewState: ToggleState = {
      get isSelected() {
        const id = itemId()
        if (groupState && id != null) return groupState.selectedKeys.has(id)
        return standalone.isSelected
      },
      get defaultSelected() {
        // Official ToggleButton gives useToggleState only the group
        // selection. The button's own defaultSelected is not an input, so
        // the setup snapshot stays for this instance, including after the
        // id leaves the group. An explicit value applies only on the
        // standalone state below.
        if (initialGroupDefault !== undefined) return initialGroupDefault
        return standalone.defaultSelected
      },
      setSelected(value) {
        const id = itemId()
        if (groupState && id != null) groupState.setSelected(id, value)
        else standalone.setSelected(value)
      },
      toggle() {
        const id = itemId()
        if (groupState && id != null) groupState.toggleKey(id)
        else standalone.toggle()
      },
    }

    const rootEl = ref<HTMLButtonElement | null>(null)
    let mountedEl: Element | null = null
    let boundContextRef: unknown
    let boundContextEl: Element | null = null
    const aria = (name: 'aria-label' | 'aria-labelledby' | 'aria-describedby' | 'aria-details') =>
      readAriaProp(props, attrs as Record<string, any>, resolved(), name)
    const extraAria = (name: 'aria-haspopup' | 'aria-expanded' | 'aria-controls' | 'aria-disabled') => {
      const camel = name === 'aria-haspopup'
        ? 'ariaHaspopup'
        : name === 'aria-expanded'
          ? 'ariaExpanded'
          : name === 'aria-controls'
            ? 'ariaControls'
            : 'ariaDisabled'
      const sources = [props as Record<string, any>, attrs as Record<string, any>, resolved()]
      for (const source of sources) {
        if (!source) continue
        if (source[camel] !== undefined) return source[camel]
        if (source[name] !== undefined) return source[name]
      }
      return undefined
    }

    const button = useToggleButton({
      id: () => {
        if (inGroup()) return undefined
        const id = itemId()
        return id == null ? undefined : String(id)
      },
      isDisabled: () => Boolean(localDisabled() || (inGroup() && groupState!.isDisabled)),
      autoFocus: () => Boolean(pick(props.autoFocus, resolved(), 'autoFocus')),
      preventFocusOnPress: () => pick(props.preventFocusOnPress, resolved(), 'preventFocusOnPress'),
      excludeFromTabOrder: () => pick(props.excludeFromTabOrder, resolved(), 'excludeFromTabOrder'),
      'aria-haspopup': () => extraAria('aria-haspopup'),
      'aria-expanded': () => extraAria('aria-expanded'),
      'aria-controls': () => extraAria('aria-controls'),
      'aria-disabled': () => extraAria('aria-disabled'),
      'aria-label': () => aria('aria-label'),
      'aria-labelledby': () => aria('aria-labelledby'),
      'aria-describedby': () => aria('aria-describedby'),
      'aria-details': () => aria('aria-details'),
      onPress: (event) => {
        callDistinct([resolved()?.onPress], event)
        emit('press', event)
      },
      onPressStart: (event) => {
        callDistinct([resolved()?.onPressStart, resolved()?.onPressstart], event)
        emit('pressstart', event)
      },
      onPressEnd: (event) => {
        callDistinct([resolved()?.onPressEnd, resolved()?.onPressend], event)
        emit('pressend', event)
      },
      onPressUp: (event) => {
        callDistinct([resolved()?.onPressUp, resolved()?.onPressup], event)
        emit('pressup', event)
      },
      onPressChange: (value) => {
        callDistinct([resolved()?.onPressChange, resolved()?.onPresschange], value)
        emit('presschange', value)
      },
      onFocus: (event) => callDistinct([resolved()?.onFocus, (attrs as any).onFocus], event),
      onBlur: (event) => callDistinct([resolved()?.onBlur, (attrs as any).onBlur], event),
      onFocusChange: (value) => callDistinct([resolved()?.onFocusChange, (attrs as any).onFocusChange], value),
      onKeyDown: (event) => callDistinct([
        resolved()?.onKeyDown,
        resolved()?.onKeydown,
        (attrs as any).onKeyDown,
        (attrs as any).onKeydown,
      ], event),
      onKeyUp: (event) => callDistinct([
        resolved()?.onKeyUp,
        resolved()?.onKeyup,
        (attrs as any).onKeyUp,
        (attrs as any).onKeyup,
      ], event),
    }, viewState, rootEl)
    presentGroupItem(
      button.buttonProps,
      () => (inGroup() ? groupState!.selectionMode : 'multiple'),
      () => viewState.isSelected,
    )

    const hover = useHover({
      isDisabled: () => button.isDisabled,
      onHoverStart: (event) => {
        callDistinct([resolved()?.onHoverStart, resolved()?.onHoverstart], event)
        emit('hoverstart', event)
      },
      onHoverEnd: (event) => {
        callDistinct([resolved()?.onHoverEnd, resolved()?.onHoverend], event)
        emit('hoverend', event)
      },
      onHoverChange: (value) => {
        callDistinct([resolved()?.onHoverChange, resolved()?.onHoverchange], value)
        emit('hoverchange', value)
      },
    })
    const focusVisible = useFocusVisible({isDisabled: () => button.isDisabled})

    function externalRef() {
      const raw = instance?.vnode.ref as {r?: unknown} | null | undefined
      return raw && typeof raw === 'object' && 'r' in raw ? raw.r : (attrs as any).ref
    }
    function syncExternal() {
      assignRef(externalRef(), rootEl.value)
    }
    function releaseContextRef() {
      if (boundContextRef == null) return
      assignRefIfCurrent(boundContextRef, null, boundContextEl)
      boundContextRef = undefined
      boundContextEl = null
    }
    function syncContextRef(el: Element | null) {
      const next = readContextRef(resolved())
      if (next !== boundContextRef) {
        releaseContextRef()
        boundContextRef = next
      }
      if (next != null) {
        assignRef(next, el)
        boundContextEl = el
      }
    }
    onMounted(() => {
      syncExternal()
      syncContextRef(rootEl.value)
    })
    onUpdated(() => {
      syncExternal()
      syncContextRef(rootEl.value)
    })
    onUnmounted(() => {
      releaseContextRef()
      assignRefIfCurrent(externalRef(), null, mountedEl)
      rootEl.value = null
      mountedEl = null
    })

    return () => {
      const ctx = resolved()
      readContextRef(ctx)
      const values: ToggleButtonRenderProps = {
        isHovered: hover.isHovered.value,
        isPressed: button.isPressed,
        isFocused: focusVisible.isFocused.value,
        isFocusVisible: focusVisible.isFocusVisible.value,
        isDisabled: button.isDisabled,
        isSelected: viewState.isSelected,
        state: viewState,
      }
      const children = slots.default?.(values)
      const className = mergeClassNames(
        ctx?.className,
        localClassValue(props, attrs as Record<string, any>),
        values,
        'react-aria-ToggleButton',
      )
      const style = mergeRenderStyle(
        ctx?.style,
        props.style ?? (attrs as any).style,
        values as unknown as Record<string, unknown>,
      )
      const merged = mergeProps(
        domFrom(ctx),
        domFrom(attrs as Record<string, any>),
        button.buttonProps,
        focusVisible.focusProps,
        hover.hoverProps,
        {
          ref: (el: Element | null) => {
            rootEl.value = el as HTMLButtonElement | null
            if (el) mountedEl = el
            syncContextRef(el)
          },
          slot: props.slot || undefined,
          class: className ?? 'react-aria-ToggleButton',
          style,
          'data-focused': values.isFocused || undefined,
          'data-disabled': values.isDisabled || undefined,
          'data-pressed': values.isPressed || undefined,
          'data-selected': values.isSelected || undefined,
          'data-hovered': values.isHovered || undefined,
          'data-focus-visible': values.isFocusVisible || undefined,
        },
      )
      return h('button', bindDom(merged), children)
    }
  },
})
