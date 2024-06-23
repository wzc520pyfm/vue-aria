import type {UseButtonEmits, UseButtonProps} from '@nev-ui/use-aria-button'

// Vue build error when interface implementation is empty.
// The Vue official solution is to use `@vue-ignore` comment.
export interface ButtonProps extends /* @vue-ignore */ UseButtonProps {}

export interface ButtonEmits extends /* @vue-ignore */ UseButtonEmits {}
