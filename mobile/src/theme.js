/**
 * UtsavX dark theme — colours sampled from the brand splash and icon
 * (navy-black night sky, orange → magenta → purple logo gradient).
 */
export const colors = {
  primary: '#FA13DB',
  orange: '#FD8701',
  purple: '#9B1BF2',
  yellow: '#FFC000',
  gradient: ['#FD8701', '#FA13DB', '#9B1BF2'],
  primarySoft: 'rgba(250,19,219,0.14)',

  bg: '#05041A',
  bgDeep: '#00011D',
  surface: '#110F2B',
  surfaceAlt: '#1B1839',
  border: '#272350',
  text: '#FFFFFF',
  textMuted: '#B6B2D1',
  textFaint: '#7D799E',
  white: '#FFFFFF',
  black: '#000000',

  success: '#34D399',
  successSoft: 'rgba(52,211,153,0.14)',
  danger: '#FB7185',
  dangerSoft: 'rgba(251,113,133,0.14)',
  warn: '#FBBF24',
  warnSoft: 'rgba(251,191,36,0.14)',

  glass: 'rgba(255,255,255,0.12)',
  whiteMuted: 'rgba(255,255,255,0.78)',
};

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };

export const shadow = {
  card: {
    elevation: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  glow: {
    elevation: 8,
    shadowColor: '#FA13DB',
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
};

export const fonts = { mono: 'monospace' };

export const text = {
  h1: { fontSize: 28, lineHeight: 34, fontWeight: '800', color: colors.text },
  h2: { fontSize: 22, lineHeight: 28, fontWeight: '800', color: colors.text },
  h3: { fontSize: 18, lineHeight: 24, fontWeight: '700', color: colors.text },
  body: { fontSize: 15, lineHeight: 22, color: colors.textMuted },
  small: { fontSize: 13, lineHeight: 18, color: colors.textMuted },
  caption: { fontSize: 12, fontWeight: '600', color: colors.textFaint },
  label: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
};
