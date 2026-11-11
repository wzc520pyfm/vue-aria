export const getOwnerDocument = (el: Element | null | undefined): Document => {
  return el?.ownerDocument ?? document
}

export * from './data-attr'
