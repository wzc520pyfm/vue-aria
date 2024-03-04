import fs from 'fs-extra'

export function getSubDirNames(dir: string) {
  return fs
    .readdirSync(dir, {withFileTypes: true})
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
}
