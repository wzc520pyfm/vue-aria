export const iconShortcuts: Record<string, string> = {
  'icon-base-layout': 'w-[1em] h-[1em] line-height-[1em]',
  'icon-base-svg': '[&>svg]:w-[1em] [&>svg]:h-[1em]',
  'icon-base-display': 'inline-flex justify-center items-center relative',
  'icon-base-paint': 'fill-current color-inherit font-size-inherit',
  'icon-base': 'icon-base-layout icon-base-svg icon-base-display icon-base-paint',
  icon: 'icon-base',

  'icon-sm': 'font-size-xs',
  'icon-md': 'font-size-sm',
  'icon-lg': 'font-size-base',

  'icon-default': 'text-default',
  'icon-primary': 'text-primary',
  'icon-secondary': 'text-secondary',
  'icon-success': 'text-success',
  'icon-warning': 'text-warning',
  'icon-danger': 'text-danger',
}

export function getIconSafeList() {
  return Object.keys(iconShortcuts)
}
