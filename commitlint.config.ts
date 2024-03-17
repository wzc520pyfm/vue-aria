/* eslint-disable prettier/prettier */
import {execSync} from 'child_process'
import fg from 'fast-glob'

const getPackages = (packagePath) => fg.sync('*', {cwd: packagePath, onlyDirectories: true})

const scopes = [
  ...getPackages('packages').filter((name) => !name.startsWith('@')),
  ...getPackages('internal'),
  'playground',
  'doc',
  'project',
  'core',
  'ci',
  'lib',
  'types',
  'dev',
  'vscode',
  'other',
]

// @tip: git branch name = feature/issue_33   =>    auto get defaultIssues = #33
const issue = execSync('git rev-parse --abbrev-ref HEAD').toString().trim().split('_')[1]

// @see: https://cz-git.qbb.sh/zh/config/
export default {
  rules: {
    /**
     * type[scope]: [function] description
     *      ^^^^^
     */
    'scope-enum': [2, 'always', scopes],
    /**
     * type[scope]: [function] description
     *
     * ^^^^^^^^^^^^^^ empty line.
     * - Something here
     */
    'body-leading-blank': [1, 'always'],
    /**
     * type[scope]: [function] description
     *
     * - something here
     *
     * ^^^^^^^^^^^^^^
     */
    'footer-leading-blank': [1, 'always'],
    /**
     * type[scope]: [function] description [No more than 72 characters]
     *      ^^^^^
     */
    'header-max-length': [2, 'always', 72],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-case': [1, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    /**
     * type[scope]: [function] description
     * ^^^^
     */
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'release',
        'style',
        'test',
      ],
    ],
  },
  prompt: {
    customIssuePrefixAlign: !issue ? 'top' : 'bottom',
    defaultIssues: !issue ? '' : `#${issue}`,
    types: [
      {value: 'feat', name: 'feat:     ✨  A new feature', emoji: ':sparkles:'},
      {value: 'fix', name: 'fix:      🐛  A bug fix', emoji: ':bug:'},
      {value: 'docs', name: 'docs:     📝  Documentation only changes', emoji: ':memo:'},
      {
        value: 'style',
        name: 'style:    🎨  Changes that do not affect the meaning of the code',
        emoji: ':art:',
      },
      {
        value: 'refactor',
        name: 'refactor: ♻️   A code change that neither fixes a bug nor adds a feature',
        emoji: ':recycle:',
      },
      {
        value: 'perf',
        name: 'perf:     ⚡️  A code change that improves performance',
        emoji: ':zap:',
      },
      {
        value: 'test',
        name: 'test:     ✅  Adding missing tests or correcting existing tests',
        emoji: ':white_check_mark:',
      },
      {
        value: 'build',
        name: 'build:    📦️   Changes that affect the build system or external dependencies',
        emoji: ':package:',
      },
      {
        value: 'ci',
        name: 'ci:       👷  Changes to our CI configuration files and scripts',
        emoji: ':construction_worker:',
      },
      {
        value: 'chore',
        name: "chore:    🔨  Other changes that don't modify src or test files",
        emoji: ':hammer:',
      },
      {value: 'revert', name: 'revert:   ⏪️  Reverts a previous commit', emoji: ':rewind:'},
      {value: 'release', name: 'release:  🔖  Release a version', emoji: ':bookmark:'},
    ],
    useEmoji: true, // emoji should be followed: @see: https://gitmoji.dev/
    allowCustomIssuePrefixs: false,
    allowEmptyIssuePrefixs: false,
  },
}
