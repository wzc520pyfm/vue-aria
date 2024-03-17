import type {ButtonProps} from './button'

export interface UseButtonUno extends Pick<ButtonProps, 'size' | 'color' | 'radius'> {}

export function useButtonUno(props: UseButtonUno) {
  const {size, color, radius} = props
  return {
    buttonCls: [
      'btn', // base
      `btn-${size}`, // size
      `btn-${color}`, // color
      `btn-rounded-${radius}`, // radius
    ],
  }
}
