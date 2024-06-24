import type {UseButtonEmits, UseButtonProps} from '@nev-ui/use-aria-button'

export interface ButtonProps extends UseButtonProps {}

// Vue build error when interface implementation is empty.
// The Vue official solution is to use `@vue-ignore` comment.
export interface ButtonEmits extends /* @vue-ignore */ UseButtonEmits {}
