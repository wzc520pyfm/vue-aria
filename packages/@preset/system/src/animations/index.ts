export const animation = {
  keyframes: {
    'spinner-spin': `{0%{ transform: rotate(0deg); } 100%{ transform: rotate(360deg); }}`,
  },
}

export const commonAnimationShortcuts = {
  'animation-spinner-ease-spin':
    'animate-spinner-spin animate-duration-0.8s animate-count-infinite animate-ease',
  'animation-spinner-linear-spin':
    'animate-spinner-spin animate-duration-0.8s animate-count-infinite animate-ease-linear',
}
