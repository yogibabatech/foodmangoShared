/** One place for colours, spacing and type, so every screen looks like the same app. */

export const colors = {
  primary: '#C2410C', // warm burnt orange
  primaryPressed: '#9A3412',
  primarySoft: '#FFEDD5',
  onPrimary: '#FFFFFF',

  background: '#FFF8F1', // warm cream
  surface: '#FFFFFF',
  border: '#E8D9CB',

  text: '#2B1D14',
  textMuted: '#7A6658',

  danger: '#B91C1C',
  dangerSoft: '#FEE2E2',
  success: '#15803D',
  successSoft: '#DCFCE7',
  info: '#92400E',
  infoSoft: '#FEF3C7',

  disabled: '#D6C7B8',
  disabledText: '#8A7B6D',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const fontSize = {
  caption: 13,
  body: 16,
  large: 18,
  title: 24,
  headline: 30,
} as const;

/** The smallest comfortable thing to tap, per Android and iOS guidance. */
export const MIN_TOUCH = 48;

/** On wide screens (web, tablets) content stays phone-width and centred. */
export const MAX_CONTENT_WIDTH = 480;

export const theme = { colors, spacing, radius, fontSize };
export type Theme = typeof theme;
