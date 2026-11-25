import type { DeserializeResult, Tool } from '@itsjust/core';
import toolConfig from './tool.config';
import {
  clamp,
  formatHex,
  formatHsl,
  formatHsv,
  formatRgb,
  hslToRgb,
  hsvToRgb,
  parseHex,
  parseHsl,
  parseHsv,
  parseRgb,
  round1,
  rgbToHsl,
  rgbToHsv,
} from './color';
import type { Rgb } from './color-types';
import {
  DEFAULT_STATE,
  MAX_HISTORY,
  type ColorFormat,
  type HistoryEntry,
  type ToolState,
} from './types';

const VALID_MODES: ColorFormat[] = ['hex', 'rgb', 'hsl', 'hsv'];

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function validHistory(value: unknown): HistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is HistoryEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as HistoryEntry).text === 'string' &&
        typeof (entry as HistoryEntry).createdAt === 'string'
    )
    .slice(0, MAX_HISTORY);
}

/** Parse a format input into canonical RGB, or null when invalid. */
function parseMode(mode: ColorFormat, input: string): Rgb | null {
  switch (mode) {
    case 'hex':
      return parseHex(input);
    case 'rgb':
      return parseRgb(input);
    case 'hsl': {
      const hsl = parseHsl(input);
      return hsl ? hslToRgb(hsl) : null;
    }
    case 'hsv': {
      const hsv = parseHsv(input);
      return hsv ? hsvToRgb(hsv) : null;
    }
  }
}

/** The canonical colors derived from the current edited input, or null when invalid. */
export function deriveColor(
  state: ToolState
): { rgbHex: string; rgb: string; hsl: string; hsv: string } | null {
  const parsed = parseMode(
    state.mode,
    state.mode === 'hex'
      ? state.hexInput
      : state.mode === 'rgb'
        ? state.rgbInput
        : state.mode === 'hsl'
          ? state.hslInput
          : state.hsvInput
  );
  if (!parsed) return null;
  const alpha = parsed.a ?? state.alpha;
  const rgb = { ...parsed, a: undefined };
  const hsl = rgbToHsl(rgb);
  const hsv = rgbToHsv(rgb);
  const withAlpha = { ...rgb, a: clamp(alpha, 0, 1) };
  return {
    rgbHex: formatHex(withAlpha),
    rgb: formatRgb(withAlpha),
    hsl: formatHsl({ ...hsl, a: alpha }),
    hsv: formatHsv({ ...hsv, a: alpha }),
  };
}

/** Serialize tool state into a compact JSON string for share/import. */
export function serializeState(state: ToolState): string {
  return JSON.stringify({
    mode: state.mode,
    hexInput: state.hexInput,
    rgbInput: state.rgbInput,
    hslInput: state.hslInput,
    hsvInput: state.hsvInput,
    alpha: state.alpha,
    history: state.history,
  });
}

/** Validate and recover tool state from an arbitrary payload. */
export function deserializeState(data: unknown): DeserializeResult<ToolState> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { success: false, error: 'Invalid data format: expected color converter state object' };
  }
  const v = data as Record<string, unknown>;
  const alphaRaw =
    typeof v.alpha === 'number' && Number.isFinite(v.alpha) ? v.alpha : DEFAULT_STATE.alpha;
  const state: ToolState = {
    mode: VALID_MODES.includes(v.mode as ColorFormat)
      ? (v.mode as ColorFormat)
      : DEFAULT_STATE.mode,
    hexInput: stringOr(v.hexInput, DEFAULT_STATE.hexInput),
    rgbInput: stringOr(v.rgbInput, DEFAULT_STATE.rgbInput),
    hslInput: stringOr(v.hslInput, DEFAULT_STATE.hslInput),
    hsvInput: stringOr(v.hsvInput, DEFAULT_STATE.hsvInput),
    alpha: clamp(alphaRaw, 0, 1),
    history: validHistory(v.history),
  };
  return { success: true, data: state };
}

/** True when a serialized string round-trips back to the same state. */
export function roundTrips(state: ToolState): boolean {
  try {
    const restored = deserializeState(JSON.parse(serializeState(state)));
    return restored.success && JSON.stringify(restored.data) === JSON.stringify(state);
  } catch {
    return false;
  }
}

/**
 * Round-trip sync: type in any field, all other format inputs re-derive.
 * Returns the next state with sibling inputs updated from the edited format.
 */
export function syncFromMode(state: ToolState): ToolState {
  const derived = parseMode(
    state.mode,
    state.mode === 'hex'
      ? state.hexInput
      : state.mode === 'rgb'
        ? state.rgbInput
        : state.mode === 'hsl'
          ? state.hslInput
          : state.hsvInput
  );
  if (!derived) return state;
  const alpha = derived.a ?? state.alpha;
  const hsl = rgbToHsl(derived);
  const hsv = rgbToHsv(derived);
  const next = { ...state, alpha: clamp(alpha, 0, 1) };
  if (state.mode !== 'hex') next.hexInput = formatHex(derived);
  if (state.mode !== 'rgb') next.rgbInput = formatRgb(derived);
  if (state.mode !== 'hsl') next.hslInput = formatHsl({ ...hsl, a: undefined });
  if (state.mode !== 'hsv') next.hsvInput = formatHsv({ ...hsv, a: undefined });
  return next;
}

/** Default inputs for a mode derived from an rgb color. */
export function inputsForRgb(
  mode: ColorFormat,
  rgb: import('./color-types').Rgb,
  alpha: number
): Partial<ToolState> {
  const hsl = rgbToHsl(rgb);
  const hsv = rgbToHsv(rgb);
  switch (mode) {
    case 'hex':
      return { hexInput: formatHex({ ...rgb, a: alpha }) };
    case 'rgb':
      return { rgbInput: formatRgb({ ...rgb, a: alpha }) };
    case 'hsl':
      return { hslInput: formatHsl({ ...hsl, a: alpha }) };
    case 'hsv':
      return { hsvInput: formatHsv({ ...hsv, a: alpha }) };
  }
}

/** Build a history entry text for the current state. */
export function historyText(state: ToolState): string | null {
  const derived = deriveColor(state);
  return derived ? derived.rgb : null;
}

export const rgbHslColorConverterTool: Tool<ToolState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: { ...DEFAULT_STATE },
  serialize: serializeState,
  deserialize: deserializeState,
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'jpeg', loader: () => import('./exporters/jpeg') },
    { format: 'webp', loader: () => import('./exporters/webp') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};

export { round1 };
