/**
 * Part of this code is taken from @element-plus/element-plus package ❤️
 */

import {useGetDerivedNamespace} from '@nev-ui/core'
import type {Ref} from 'vue'

/**
 * BEM: namespace-block-blockSuffix__element--modifier
 * @example nv-button-group__item--horizontal
 */
const _bem = (
  namespace: string,
  block: string,
  blockSuffix: string,
  element: string,
  modifier: string,
) => {
  let cls = `${namespace}-${block}`
  if (blockSuffix) {
    cls += `-${blockSuffix}`
  }
  if (element) {
    cls += `__${element}`
  }
  if (modifier) {
    cls += `--${modifier}`
  }
  return cls
}

export const useBEM = (block: string, namespaceOverrides?: Ref<string | undefined>) => {
  const namespace = useGetDerivedNamespace(namespaceOverrides)
  const b = (blockSuffix = '') => _bem(namespace.value, block, blockSuffix, '', '')
  const e = (element?: string) => (element ? _bem(namespace.value, block, '', element, '') : '')
  const m = (modifier?: string) => (modifier ? _bem(namespace.value, block, '', '', modifier) : '')
  const be = (blockSuffix?: string, element?: string) =>
    blockSuffix && element ? _bem(namespace.value, block, blockSuffix, element, '') : ''
  const em = (element?: string, modifier?: string) =>
    element && modifier ? _bem(namespace.value, block, '', element, modifier) : ''
  const bm = (blockSuffix?: string, modifier?: string) =>
    blockSuffix && modifier ? _bem(namespace.value, block, blockSuffix, '', modifier) : ''
  const bem = (blockSuffix?: string, element?: string, modifier?: string) =>
    blockSuffix && element && modifier
      ? _bem(namespace.value, block, blockSuffix, element, modifier)
      : ''

  return {
    namespace,
    b, // nv-button or nv-button-group
    e, // nv-button__wrapper
    m, // nv-button--right
    be, // nv-button-group__wrapper
    em, // nv-button__wrapper--right
    bm, // nv-button-group--right
    bem, // nv-button-group__item--horizontal
  }
}

export type UseBEMReturn = ReturnType<typeof useBEM>
