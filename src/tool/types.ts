export type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'hsv';

export interface HistoryEntry {
  /** CSS string of the saved color, e.g. "rgb(255 87 51)". */
  text: string;
  /** ISO timestamp when the entry was saved. */
  createdAt: string;
}

export interface ToolState {
  /** Currently edited format driving the state. */
  mode: ColorFormat;
  /** Raw text inputs per format, kept as typed for round-trip editing. */
  hexInput: string;
  rgbInput: string;
  hslInput: string;
  hsvInput: string;
  /** Alpha value 0–1. */
  alpha: number;
  /** Recently saved colors, newest first. */
  history: HistoryEntry[];
}

export const DEFAULT_STATE: ToolState = {
  mode: 'hex',
  hexInput: '#FF5733',
  rgbInput: 'rgb(255 87 51)',
  hslInput: 'hsl(10.6 100% 60%)',
  hsvInput: 'hsv(10.6 80% 100%)',
  alpha: 1,
  history: [],
};

export const MAX_HISTORY = 20;
