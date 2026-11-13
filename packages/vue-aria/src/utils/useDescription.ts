/*
 * Port of `react-aria@3.53.1` `useDescription`
 * (`packages/react-aria/src/utils/useDescription.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue with live getters. Internal — not part of the public surface.
 */

import {onScopeDispose, ref, toValue, watch, type Ref, type MaybeRefOrGetter} from 'vue'

let descriptionId = 0
const descriptionNodes = new Map<string, {refCount: number; element: Element}>()

export interface DescriptionProps {
  'aria-describedby'?: string | undefined
}

/**
 * Associates a hidden description element with an `aria-describedby` id, shared
 * across all consumers rendering the same description text.
 */
export function useDescription(
  description: MaybeRefOrGetter<string | undefined>,
): DescriptionProps {
  const id = ref<string | undefined>(undefined)
  let cleanup: (() => void) | null = null
  let lastDescription: string | undefined

  const attach = (desc: string) => {
    let entry = descriptionNodes.get(desc)
    if (!entry) {
      const generatedId = `react-aria-description-${descriptionId++}`
      const node = document.createElement('div')
      node.id = generatedId
      node.style.display = 'none'
      node.textContent = desc
      document.body.appendChild(node)
      entry = {refCount: 0, element: node}
      descriptionNodes.set(desc, entry)
    }
    entry.refCount++
    ;(id as Ref<string | undefined>).value = entry.element.id
    cleanup = () => {
      if (entry && --entry.refCount === 0) {
        entry.element.remove()
        descriptionNodes.delete(desc)
      }
    }
  }

  const detach = () => {
    if (cleanup) {
      cleanup()
      cleanup = null
    }
  }

  const out: DescriptionProps = {
    get 'aria-describedby'() {
      return (toValue(description) ? id.value : undefined) ?? undefined
    },
  }

  watch(
    () => toValue(description),
    (desc) => {
      if (desc === lastDescription) return
      detach()
      if (desc) {
        attach(desc)
      }
      lastDescription = desc
    },
    {immediate: true, flush: 'post'},
  )

  onScopeDispose(detach)

  return out
}
