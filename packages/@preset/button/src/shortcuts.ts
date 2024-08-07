export const buttonShortcuts: Record<string, string> = {
  'btn-base':
    'border-0 z-0 relative inline-flex items-center justify-center box-border appearance-none outline-none select-none whitespace-nowrap min-w-max font-normal subpixel-antialiased overflow-hidden',
  btn: 'btn-base btn-md btn-default btn-rounded-md',
  'btn-sm': 'px-3 min-w-16 h-8 text-xs gap-2 rounded-sm',
  'btn-md': 'px-4 min-w-20 h-10 text-sm gap-2 rounded-md',
  'btn-lg': 'px-6 min-w-24 h-12 text-base gap-3 rounded-lg',
  // color and hover should has a system, should extends opacity-hover from preset system to instead opacity-90
  'btn-default': 'bg-default text-default-foreground data-[hover=true]:opacity-90',
  'btn-primary': 'bg-primary text-primary-foreground data-[hover=true]:opacity-90',
  'btn-secondary': 'bg-secondary text-secondary-foreground data-[hover=true]:opacity-90',
  'btn-success': 'bg-success text-success-foreground data-[hover=true]:opacity-90',
  'btn-warning': 'bg-warning text-warning-foreground data-[hover=true]:opacity-90',
  'btn-danger': 'bg-danger text-danger-foreground data-[hover=true]:opacity-90',
  // ...
  // rounded sm/md/lg should be provider by theme
  'btn-rounded-none': 'rounded-none',
  'btn-rounded-sm': 'rounded-sm',
  'btn-rounded-md': 'rounded-md',
  'btn-rounded-lg': 'rounded-lg',
  'btn-rounded-full': 'rounded-full',
  'btn-full': 'w-full',
  // should extends opacity-disabled from preset system to instead opacity-50
  'btn-disabled': 'opacity-50 pointer-events-none',
  // duration should be provider by theme
  'btn-animation':
    'data-[pressed=true]:scale-[0.97] transition duration-250 motion-reduce:transition-none',
  // should be provider as common option
  'non-animation': '!transition-none',
  'is-icon-only': 'px-0 !gap-0',
  'is-icon-only-sm': 'min-w-8 w-8 h-8',
  'is-icon-only-md': 'min-w-10 w-10 h-10',
  'is-icon-only-lg': 'min-w-12 w-12 h-12',
  // 2em should be provider as theme (spacing)
  'with-icon': '[&>svg]:max-w-[2em]',
}

export function getButtonSafeList() {
  return Object.keys(buttonShortcuts)
}
