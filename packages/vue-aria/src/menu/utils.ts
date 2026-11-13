import type {ListState} from 'vue-stately/useListState'
import type {Key} from 'vue-stately/useListState'

export interface MenuData {
  onClose?: () => void
  onAction?: (key: Key) => void
  shouldCloseOnSelect?: boolean
  shouldUseVirtualFocus?: boolean
  closeOnSelect?: boolean
}

export const menuData = new WeakMap<object, MenuData>()

export function getMenuData(state: object): MenuData {
  let data = menuData.get(state)
  if (!data) {
    data = {}
    menuData.set(state, data)
  }
  return data
}
