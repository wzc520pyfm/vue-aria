import type {VueClass} from '@nev-ui/types-shared'

/**
 * Format vue class to array
 */
export function toClassName(className?: VueClass) {
  if (Array.isArray(className)) {
    return className
  }
  return className ? [className] : []
}
