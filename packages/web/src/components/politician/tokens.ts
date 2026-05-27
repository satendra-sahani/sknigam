// POLLSTICS · Insight design tokens — Civic palette (Ink/Indigo/Brass on Cream).
// Lifted faithfully from the prototype at
//   claude-design/sknigam-handoff/sknigam/project/politician-app/tokens.jsx
// so the politician-only `/politician/*` chrome reads identical to the
// design canvas.  Kept as a `.ts` constants module (no JSX) so it can be
// imported from server and client components alike.

export const T = {
  // surfaces
  ink: '#0F1B2D',
  inkSoft: '#1C2A41',
  cream: '#F8F6F1',
  paper: '#FFFFFF',
  hairline: '#E6E1D6',
  hairlineSoft: '#EFEAE0',
  muted: '#6B7383',
  mutedDeep: '#3D4756',

  // brand
  indigo: '#1F3A8A',
  indigoDeep: '#162C6E',
  indigoSoft: '#E8ECF8',
  brass: '#B7873A',
  brassSoft: '#F4EBD6',

  // semantic
  success: '#1F7A4E',
  successSoft: '#DDEFE4',
  warning: '#C6850D',
  warningSoft: '#FBEFD2',
  danger: '#B8331F',
  dangerSoft: '#F7DCD5',
  info: '#205B9C',
  infoSoft: '#DCE7F3',

  // type
  fontUI: '"IBM Plex Sans","IBM Plex Sans Devanagari",system-ui,sans-serif',
  fontHi: '"IBM Plex Sans Devanagari","IBM Plex Sans",system-ui,sans-serif',
  fontMono: '"IBM Plex Mono",ui-monospace,monospace',
} as const;

// Sentiment ramp.  Used for sentiment heatmaps, sentiment dots,
// caste donuts, and the stacked sentiment bar on the insights page.
export const C_PALETTE = {
  pos2: '#1F7A4E',
  pos1: '#5BA37E',
  neu: '#B7873A',
  neg1: '#D67E62',
  neg2: '#B8331F',
  // caste tones
  GEN: '#1F3A8A',
  OBC: '#B7873A',
  SC: '#1F7A4E',
  ST: '#205B9C',
  MIN: '#B8331F',
  // gender tones
  M: '#1F3A8A',
  F: '#B7873A',
} as const;

// Party lean colors for hex cartogram + lean badges + AC list margins.
export const PARTY: Record<string, { fg: string; soft: string }> = {
  BJP: { fg: '#E8731C', soft: '#FDE8D6' },
  INC: { fg: '#1B66C9', soft: '#DCEAF7' },
  SP: { fg: '#C8232C', soft: '#F7DDDF' },
  TMC: { fg: '#1D8A5B', soft: '#DDF1E6' },
  DMK: { fg: '#1A1A1A', soft: '#E1E1E1' },
  TDP: { fg: '#E7B32A', soft: '#FBF1D2' },
  MIX: { fg: '#B8331F', soft: '#F7DCD5' },
};

export type PartyKey = keyof typeof PARTY | string;

// Tone → background/foreground for chips, alert kickers, KPI accents.
export const CHIP_TONE: Record<
  'neutral' | 'indigo' | 'brass' | 'success' | 'warning' | 'danger' | 'info',
  { bg: string; fg: string }
> = {
  neutral: { bg: '#EEEAE0', fg: T.mutedDeep },
  indigo: { bg: T.indigoSoft, fg: T.indigoDeep },
  brass: { bg: T.brassSoft, fg: '#7A5818' },
  success: { bg: T.successSoft, fg: '#0F4A2D' },
  warning: { bg: T.warningSoft, fg: '#7A5008' },
  danger: { bg: T.dangerSoft, fg: '#7A2014' },
  info: { bg: T.infoSoft, fg: '#143A66' },
};
