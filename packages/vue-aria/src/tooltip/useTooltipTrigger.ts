import {onBeforeUnmount, reactive, watch, toValue, type Ref} from 'vue'
import type {TooltipTriggerProps, TooltipTriggerState} from 'vue-stately/useTooltipTriggerState'
import {mergeProps} from '../utils/mergeProps'
import {useHover} from '../interactions/hover'
import {useId} from '../utils/useId'

export interface TooltipTriggerAria {
  /** Props for the trigger element. Plain object, not a ComputedRef. */
  triggerProps: Record<string, unknown>
  /** Props for the tooltip element. Plain object, not a ComputedRef. */
  tooltipProps: {id: string}
}

/**
 * Behavior and accessibility for a tooltip trigger: `aria-describedby` while
 * open, opens on hover/focus, closes on leave/Escape. No focus trap.
 *
 * Port of official `useTooltipTrigger`
 * (`packages/react-aria/src/tooltip/useTooltipTrigger.ts`).
 */
export function useTooltipTrigger(
  props: TooltipTriggerProps,
  state: TooltipTriggerState,
  _ref?: Ref<Element | null | undefined>,
): TooltipTriggerAria {
  const tooltipId = useId('vue-aria-tooltip')
  const flags = {isHovered: false, isFocused: false}

  function handleShow() {
    if (flags.isHovered || flags.isFocused) {
      state.open(flags.isFocused)
    }
  }

  function handleHide(immediate?: boolean) {
    if (!flags.isHovered && !flags.isFocused) {
      state.close(immediate)
    }
  }

  const {hoverProps} = useHover({
    isDisabled: () => Boolean(toValue(props.isDisabled)),
    onHoverStart: () => {
      if (toValue(props.trigger) === 'focus') return
      flags.isHovered = true
      handleShow()
    },
    onHoverEnd: () => {
      if (toValue(props.trigger) === 'focus') return
      flags.isFocused = false
      flags.isHovered = false
      handleHide()
    },
  })

  function onPressStart() {
    if (toValue(props.shouldCloseOnPress) === false) return
    flags.isFocused = false
    flags.isHovered = false
    handleHide(true)
  }

  function onFocus() {
    flags.isFocused = true
    handleShow()
  }

  function onBlur() {
    flags.isFocused = false
    flags.isHovered = false
    handleHide(true)
  }

  const triggerProps = reactive<Record<string, unknown>>({})
  const tooltipProps = reactive({id: tooltipId.value})

  watch(
    () => [state.isOpen.value, tooltipId.value] as const,
    ([isOpen, id]) => {
      tooltipProps.id = id
      Object.assign(
        triggerProps,
        mergeProps(hoverProps, {
          onFocus,
          onBlur,
          onPointerdown: onPressStart,
          onKeydown: (event: KeyboardEvent) => {
            if (event.key === 'Enter' || event.key === ' ') {
              onPressStart()
            }
          },
        }),
      )
      if (isOpen) {
        triggerProps['aria-describedby'] = id
      } else {
        delete triggerProps['aria-describedby']
      }
    },
    {immediate: true},
  )

  let attached: Document | null = null
  watch(
    () => state.isOpen.value,
    (isOpen, _prev, onCleanup) => {
      if (!isOpen) return
      const doc = document
      function onKeyDown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
          event.stopPropagation()
          state.close(true)
        }
      }
      doc.addEventListener('keydown', onKeyDown, true)
      attached = doc
      onCleanup(() => {
        doc.removeEventListener('keydown', onKeyDown, true)
        if (attached === doc) attached = null
      })
    },
    {immediate: true},
  )

  onBeforeUnmount(() => {
    if (!attached) return
    // listener is removed by the watch cleanup; this is a safety net
  })

  return {triggerProps, tooltipProps}
}
