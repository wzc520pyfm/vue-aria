/* eslint-disable no-undef */
// commitlint uses `ts-node` to load typescript config, it's too slow. This pkg replace it with `esbuild`.
require('@esbuild-kit/cjs-loader')
module.exports = require('./commitlint.config.ts').default
