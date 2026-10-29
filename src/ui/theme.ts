// Colours from the reference screenshots (docs/structure.md §7).
export const colors = {
  text: '#1f2937',
  muted: '#6b7280',
  faint: '#9ca3af',
  border: '#e5e7eb',
  bg: '#ffffff',
  subtle: '#f3f4f6',

  blue: '#1d5cff',
  green: '#16a34a',
  red: '#ef4444',
  purple: '#9333ea',
  orange: '#f97316',

  morningBg: '#eaf2ff',
  morningText: '#1d4ed8',
  morningSub: '#3b82f6',
  nightBg: '#f8f0ff',
  nightText: '#7e22ce',
  nightSub: '#a855f7',
  unavailableBg: '#fef2f2',
  unavailableText: '#dc2626',
  avatarBg: '#dbeafe',
};

export const periodColors = {
  morning: { bg: colors.morningBg, text: colors.morningText, sub: colors.morningSub },
  night: { bg: colors.nightBg, text: colors.nightText, sub: colors.nightSub },
};

export const MAX_WIDTH = 960;
/** Below this width the app uses the phone layout (bottom tabs, stacked forms). */
export const PHONE_WIDTH = 700;
