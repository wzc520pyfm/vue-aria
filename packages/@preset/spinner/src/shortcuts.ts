export const spinnerShortcuts: Record<string, string> = {
  'spinner-base': 'relative inline-flex flex-col gap-2 items-center justify-center',
  spinner: 'spinner-base',

  'spinner-wrapper': 'absolute flex flex-col items-center',

  'spinner-circle-wrapper-base': 'relative flex',
  'spinner-circle-wrapper': 'spinner-circle-wrapper-base spinner-circle-wrapper-md',
  'spinner-circle-wrapper-sm': 'w-5 h-5',
  'spinner-circle-wrapper-md': 'w-8 h-8',
  'spinner-circle-wrapper-lg': 'w-10 h-10',

  'spinner-circle1-base':
    'absolute w-full h-full rounded-full animation-spinner-ease-spin border-solid border-t-transparent border-l-transparent border-r-transparent',
  'spinner-circle1': 'spinner-circle1-base spinner-circle1-md spinner-circle1-primary',
  'spinner-circle1-sm': 'border-2',
  'spinner-circle1-md': 'border-3',
  'spinner-circle1-lg': 'border-3',
  'spinner-circle1-current': 'border-b-current',
  'spinner-circle1-white': 'border-b-white',
  'spinner-circle1-default': 'border-b-default',
  'spinner-circle1-primary': 'border-b-primary',
  'spinner-circle1-secondary': 'border-b-secondary',
  'spinner-circle1-success': 'border-b-success',
  'spinner-circle1-warning': 'border-b-warning',
  'spinner-circle1-danger': 'border-b-danger',

  'spinner-circle2-base':
    'absolute w-full h-full rounded-full opacity-75 animation-spinner-linear-spin border-2 border-dotted border-t-transparent border-l-transparent border-r-transparent',
  'spinner-circle2': 'spinner-circle2-base spinner-circle2-md spinner-circle2-primary',
  'spinner-circle2-sm': 'border-2',
  'spinner-circle2-md': 'border-3',
  'spinner-circle2-lg': 'border-3',
  'spinner-circle2-current': 'border-b-current',
  'spinner-circle2-white': 'border-b-white',
  'spinner-circle2-default': 'border-b-default',
  'spinner-circle2-primary': 'border-b-primary',
  'spinner-circle2-secondary': 'border-b-secondary',
  'spinner-circle2-success': 'border-b-success',
  'spinner-circle2-warning': 'border-b-warning',
  'spinner-circle2-danger': 'border-b-danger',

  'spinner-label-base': 'text-foreground',
  'spinner-label': 'spinner-label-base spinner-label-md spinner-label-foreground',
  'spinner-label-sm': 'text-sm',
  'spinner-label-md': 'text-base',
  'spinner-label-lg': 'text-lg',
  'spinner-label-foreground': 'text-foreground',
  'spinner-label-primary': 'text-primary',
  'spinner-label-secondary': 'text-secondary',
  'spinner-label-success': 'text-success',
  'spinner-label-warning': 'text-warning',
  'spinner-label-danger': 'text-danger',
}

export function getSpinnerSafeList() {
  return Object.keys(spinnerShortcuts)
}
