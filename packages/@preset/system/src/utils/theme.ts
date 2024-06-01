/**
 * Determines if the theme is a base theme
 *
 * @param theme string
 * @returns "light" | "dark"
 */
export const isBaseTheme = (theme: string): theme is 'light' | 'dark' =>
  theme === 'light' || theme === 'dark'
