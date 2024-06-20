interface Props {
  [key: string]: any
}

type PropsArg = Props | null | undefined

// TODO: improve typing
export function mergeProps<T extends PropsArg[]>(...args: T) {
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

  return result
}
