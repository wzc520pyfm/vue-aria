export interface Props {
  [key: string]: any
}

type PropsArg = Props | null | undefined

export function mergeProps<T extends PropsArg[], R = MergeRightAll<T>>(...args: T): R {
  // Start with a base clone of the first argument. This is a lot faster than starting
  // with an empty object and adding properties as we go.
  const result: Props = {...args[0]}
  for (let i = 1; i < args.length; i++) {
    const props = args[i]
    for (const key in props) {
      const a = result[key]
      const b = props[key]

      result[key] = b !== undefined ? b : a
    }
  }

  return result as R
}

// TODO: remove to shared
type Keys<T> = keyof T
type Duplicate<T> = {[P in keyof T]: T[P]}
type MergeRight<F, S> = Duplicate<Omit<F, Keys<S>> & S>
// eslint-disable-next-line @typescript-eslint/ban-types
type MergeRightAll<XS, Prev = {}> = XS extends [infer First, ...infer Rest]
  ? MergeRightAll<Rest, MergeRight<Prev, First>>
  : Prev
