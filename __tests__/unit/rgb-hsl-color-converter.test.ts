import { describe, it, expect } from 'vitest';
import {
  clamp,
  round1,
  parseHex,
  formatHex,
  parseRgb,
  formatRgb,
  parseHsl,
  formatHsl,
  parseHsv,
  formatHsv,
  rgbToHsl,
  hslToRgb,
  rgbToHsv,
  hsvToRgb,
  parseColorInput,
  toHex8,
  relativeLuminance,
  contrastRatio,
  shadeTint,
} from '@/tool/color';
import { DEFAULT_STATE, MAX_HISTORY, type ToolState } from '@/tool/types';
import {
  deriveColor,
  deserializeState,
  serializeState,
  syncFromMode,
  roundTrips,
  rgbHslColorConverterTool,
} from '@/tool/tool-definition';

const state = (patch: Partial<ToolState> = {}): ToolState => ({ ...DEFAULT_STATE, ...patch });

describe('hex parsing and formatting', () => {
  it('converts #FF5733 to exact RGB and HSL', () => {
    const rgb = parseHex('#FF5733');
    expect(rgb).toEqual({ r: 255, g: 87, b: 51, a: undefined });
    const hsl = rgbToHsl({ ...rgb!, a: undefined });
    expect(hsl.h).toBeCloseTo(10.6, 5);
    expect(hsl.s).toBe(100);
    expect(hsl.l).toBe(60);
  });

  it('expands shorthand #0AF to #00AAFF', () => {
    expect(formatHex(parseHex('#0AF')!)).toBe('#00aaff');
  });

  it('accepts uppercase and 8-digit hex with alpha', () => {
    expect(parseHex('#FF5733CC')).toEqual({ r: 255, g: 87, b: 51, a: 0.8 });
    expect(parseHex('#ffaabb')).toEqual({ r: 255, g: 170, b: 187, a: undefined });
  });

  it('supports 4-digit shorthand with alpha', () => {
    expect(parseHex('#0AF8')).toEqual({ r: 0, g: 170, b: 255, a: 0x88 / 255 });
  });

  it('rejects invalid hex', () => {
    expect(parseHex('#FF573')).toBeNull();
    expect(parseHex('#GGG')).toBeNull();
    expect(parseHex('FF5733')).toBeNull();
    expect(parseHex('#')).toBeNull();
    expect(parseHex('')).toBeNull();
  });

  it('formats alpha bytes into HEX8', () => {
    expect(formatHex({ r: 255, g: 87, b: 51, a: 0.5 })).toBe('#ff573380');
    expect(formatHex({ r: 0, g: 170, b: 255 })).toBe('#00aaff');
  });
});

describe('rgb parsing and formatting', () => {
  it('parses space and comma syntax', () => {
    expect(parseRgb('rgb(255 87 51)')).toEqual({ r: 255, g: 87, b: 51, a: undefined });
    expect(parseRgb('rgb(255, 87, 51)')).toEqual({ r: 255, g: 87, b: 51, a: undefined });
    expect(parseRgb('rgba(255, 87, 51, 0.5)')).toEqual({ r: 255, g: 87, b: 51, a: 0.5 });
    expect(parseRgb('rgb(255 87 51 / 0.25)')).toEqual({ r: 255, g: 87, b: 51, a: 0.25 });
  });

  it('clamps out-of-range components instead of producing NaN', () => {
    expect(parseRgb('rgb(300 -20 33)')).toEqual({ r: 255, g: 0, b: 33, a: undefined });
    expect(parseRgb('rgb(999 999 999 / 5)')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
  });

  it('supports percentages and rejects garbage', () => {
    expect(parseRgb('rgb(100% 34% 13%)')).toEqual({ r: 255, g: 87, b: 33, a: undefined });
    expect(parseRgb('rgb(a b c)')).toBeNull();
    expect(parseRgb('rgb(1 2)')).toBeNull();
    expect(parseRgb('rgb(1,2,3,4,5)')).toBeNull();
    expect(parseRgb('')).toBeNull();
  });

  it('formats CSS-ready strings', () => {
    expect(formatRgb({ r: 255, g: 87, b: 51 })).toBe('rgb(255 87 51)');
    expect(formatRgb({ r: 255, g: 87, b: 51, a: 0.5 })).toBe('rgb(255 87 51 / 0.5)');
    expect(formatRgb({ r: 255, g: 87, b: 51, a: 1 })).toBe('rgb(255 87 51)');
  });
});

describe('hsl parsing and conversion', () => {
  it('parses comma, space and alpha syntaxes', () => {
    expect(parseHsl('hsl(11 100% 56%)')).toEqual({ h: 11, s: 100, l: 56, a: undefined });
    expect(parseHsl('hsl(11, 100%, 56%)')).toEqual({ h: 11, s: 100, l: 56, a: undefined });
    expect(parseHsl('hsl(11 100% 56% / 0.3)')).toEqual({ h: 11, s: 100, l: 56, a: 0.3 });
  });

  it('normalizes hue and clamps s/l', () => {
    expect(parseHsl('hsl(371 120% -5%)')).toEqual({ h: 11, s: 100, l: 0, a: undefined });
    expect(parseHsl('hsl(-10 50% 50%)')!.h).toBe(350);
  });

  it('rejects invalid hsl', () => {
    expect(parseHsl('hsl(red blue)')).toBeNull();
    expect(parseHsl('hsl(10 20%)')).toBeNull();
    expect(parseHsl('css(10 20% 30%)')).toBeNull();
  });

  it('converts hsl(10.6 100% 60%) back to rgb(255 87 51) exactly', () => {
    const rgb = parseHex('#FF5733')!;
    const round = hslToRgb(rgbToHsl({ ...rgb, a: undefined }));
    expect(round).toEqual({ r: 255, g: 87, b: 51, a: undefined });
  });

  it('handles achromatic hsl (s=0)', () => {
    expect(hslToRgb({ h: 0, s: 0, l: 50 })).toEqual({ r: 128, g: 128, b: 128, a: undefined });
    expect(formatHsl({ h: 0, s: 0, l: 100 })).toBe('hsl(0 0% 100%)');
  });

  it('formats CSS-ready strings with alpha only when < 1', () => {
    expect(formatHsl({ h: 11.4, s: 100, l: 60 })).toBe('hsl(11.4 100% 60%)');
    expect(formatHsl({ h: 11.4, s: 100, l: 60, a: 0.25 })).toBe('hsl(11.4 100% 60% / 0.3)');
  });
});

describe('hsv parsing and conversion', () => {
  it('parses and formats hsv', () => {
    expect(parseHsv('hsv(11 87% 100%)')).toEqual({ h: 11, s: 87, v: 100, a: undefined });
    expect(parseHsv('hsv(11 87% 100% / 0.5)')!.a).toBe(0.5);
    expect(parseHsv('hsv(bad)')).toBeNull();
    expect(formatHsv({ h: 11, s: 87, v: 100 })).toBe('hsv(11 87% 100%)');
    expect(formatHsv({ h: 11, s: 87, v: 100, a: 0 })).toBe('hsv(11 87% 100% / 0)');
  });

  it('round-trips rgb through hsv', () => {
    const rgb = { r: 255, g: 87, b: 51, a: undefined as number | undefined };
    const hsv = rgbToHsv(rgb);
    expect(hsv.h).toBeCloseTo(10.6, 5);
    expect(hsv.s).toBe(80);
    expect(hsv.v).toBe(100);
    expect(hsvToRgb(hsv)).toEqual({ r: 255, g: 87, b: 51, a: undefined });
    const pure = { r: 0, g: 0, b: 0, a: undefined as number | undefined };
    expect(rgbToHsv(pure)).toEqual({ h: 0, s: 0, v: 0, a: undefined });
  });

  it('hsv switch covers all sextants', () => {
    const cases: Array<[number, number, number]> = [
      [0, 100, 100],
      [60, 100, 100],
      [120, 100, 100],
      [180, 100, 100],
      [240, 100, 100],
      [300, 100, 100],
      [360, 100, 100],
    ];
    for (const [h, s, v] of cases) {
      const rgb = hsvToRgb({ h, s, v });
      const back = rgbToHsv(rgb);
      expect(back.h).toBeCloseTo(h % 360, 4);
      expect(back.s).toBe(s);
      expect(back.v).toBe(v);
    }
  });
});

describe('helpers', () => {
  it('clamps values into range', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-3, 0, 1)).toBe(0);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });

  it('rounds to one decimal without -0', () => {
    expect(round1(11.44)).toBe(11.4);
    expect(round1(-0.04)).toBe(0);
    expect(round1(0.05)).toBe(0.1);
  });

  it('toHex8 embeds alpha', () => {
    expect(toHex8({ r: 255, g: 87, b: 51 }, 0.2)).toBe('#ff573333');
    expect(toHex8({ r: 0, g: 0, b: 0 }, 1.5)).toBe('#000000');
  });

  it('computes WCAG luminance and contrast', () => {
    expect(contrastRatio({ r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 })).toBe(21);
    expect(contrastRatio({ r: 255, g: 255, b: 255 }, { r: 255, g: 255, b: 255 })).toBe(1);
    expect(relativeLuminance({ r: 255, g: 0, b: 0 })).toBeGreaterThan(0);
    expect(contrastRatio({ r: 255, g: 87, b: 51 }, { r: 255, g: 255, b: 255 })).toBeGreaterThan(1);
  });

  it('shades and tints colors', () => {
    expect(shadeTint({ r: 100, g: 100, b: 100 }, 0)).toEqual({
      r: 100,
      g: 100,
      b: 100,
      a: undefined,
    });
    expect(shadeTint({ r: 100, g: 100, b: 100 }, -1)).toEqual({ r: 0, g: 0, b: 0, a: undefined });
    expect(shadeTint({ r: 100, g: 100, b: 100 }, 1)).toEqual({
      r: 255,
      g: 255,
      b: 255,
      a: undefined,
    });
    expect(shadeTint({ r: 100, g: 100, b: 100 }, 2)).toEqual({
      r: 255,
      g: 255,
      b: 255,
      a: undefined,
    });
  });

  it('parseColorInput applies the editor alpha when the string omits it', () => {
    const fromHex = parseColorInput('#FF5733', 'hex', 0.5);
    expect(fromHex!.alpha).toBe(0.5);
    const fromHsl = parseColorInput('hsl(10.6 100% 60%)', 'hsl', 1);
    expect(fromHsl!.rgb).toEqual({ r: 255, g: 87, b: 51, a: undefined });
    expect(parseColorInput('nonsense', 'hex', 1)).toBeNull();
  });
});

describe('state serialization', () => {
  it('round-trips state through serialize/deserialize', () => {
    const s = state({
      mode: 'hsl',
      alpha: 0.75,
      history: [{ text: 'rgb(255 87 51)', createdAt: '2026-11-25T10:00:00.000Z' }],
    });
    expect(roundTrips(s)).toBe(true);
    expect(serializeState(s)).toContain('"alpha":0.75');
  });

  it('rejects non-object payloads', () => {
    expect(deserializeState('nope').success).toBe(false);
    expect(deserializeState([1, 2]).success).toBe(false);
    expect(deserializeState(null).success).toBe(false);
    expect(deserializeState({}).success).toBe(true);
  });

  it('repairs invalid fields and clamps alpha', () => {
    const result = deserializeState({ mode: 'cmyk', hexInput: 42, alpha: 7, history: 'bad' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mode).toBe('hex');
      expect(result.data.hexInput).toBe(DEFAULT_STATE.hexInput);
      expect(result.data.alpha).toBe(1);
      expect(result.data.history).toEqual([]);
    }
    const low = deserializeState({ alpha: -2 });
    expect(low.success && low.data.alpha).toBe(0);
  });

  it('caps history at MAX_HISTORY', () => {
    const entries = Array.from({ length: 30 }, (_, i) => ({
      text: `#${i}`,
      createdAt: '2026-11-25T10:00:00.000Z',
    }));
    const result = deserializeState({ history: entries });
    expect(result.success && result.data.history).toHaveLength(MAX_HISTORY);
  });
});

describe('live sync', () => {
  it('typing in hex updates rgb, hsl and hsv inputs', () => {
    const next = syncFromMode(state({ hexInput: '#0AF' }));
    expect(next.rgbInput).toBe('rgb(0 170 255)');
    expect(next.hslInput).toBe('hsl(200 100% 50%)');
    expect(next.hsvInput).toBe('hsv(200 100% 100%)');
  });

  it('typing in rgb updates the other fields and keeps the edited input', () => {
    const next = syncFromMode(state({ mode: 'rgb', rgbInput: 'rgb(0 170 255)' }));
    expect(next.rgbInput).toBe('rgb(0 170 255)');
    expect(next.hexInput).toBe('#00aaff');
  });

  it('keeps the state untouched when the edited input is invalid', () => {
    const s = state({ hexInput: 'zzz' });
    expect(syncFromMode(s)).toEqual(s);
  });

  it('lifts string alpha into state.alpha and formats outputs with it', () => {
    const next = syncFromMode(state({ hexInput: '#ff573380' }));
    expect(next.alpha).toBeCloseTo(0x80 / 255, 5);
    expect(next.rgbInput).toBe('rgb(255 87 51 / 0.5)');
  });

  it('deriveColor produces all four CSS strings', () => {
    const derived = deriveColor(state());
    expect(derived!.rgbHex).toBe('#ff5733');
    expect(derived!.rgb).toBe('rgb(255 87 51)');
    expect(derived!.hsl).toBe('hsl(10.6 100% 60%)');
    expect(derived!.hsv).toBe('hsv(10.6 80% 100%)');
  });

  it('deriveColor respects alpha', () => {
    const derived = deriveColor(state({ alpha: 0.5 }));
    expect(derived!.rgbHex).toBe('#ff573380');
    expect(derived!.rgb).toBe('rgb(255 87 51 / 0.5)');
    expect(derived!.hsl).toBe('hsl(10.6 100% 60% / 0.5)');
    expect(derived!.hsv).toBe('hsv(10.6 80% 100% / 0.5)');
  });

  it('deriveColor returns null on invalid input', () => {
    expect(deriveColor(state({ hexInput: 'bogus' }))).toBeNull();
  });
});

describe('tool contract', () => {
  it('exports a spec-conformant tool definition', () => {
    expect(rgbHslColorConverterTool.id).toBe('rgb-hsl-color-converter');
    expect(rgbHslColorConverterTool.name).toBe('RGB HSL Color Converter');
    expect(rgbHslColorConverterTool.serialize(state())).toBeTruthy();
    expect(rgbHslColorConverterTool.deserialize({ mode: 'hsv' }).success).toBe(true);
    expect(rgbHslColorConverterTool.exporters).toHaveLength(4);
  });

  it('round-trip hex -> hsl -> hex returns the original value', () => {
    const rgb = parseHex('#FF5733')!;
    const hsl = rgbToHsl({ ...rgb, a: undefined });
    expect(formatHex(hslToRgb(hsl))).toBe('#ff5733');
  });

  it('alpha round-trips through HEX8/RGBA/HSLA without precision loss', () => {
    const a = 0x80 / 255;
    const fromHex8 = parseHex(toHex8({ r: 255, g: 87, b: 51, a: undefined }, a))!;
    expect(fromHex8.a).toBe(a);
    const hslString = formatHsl({ ...rgbToHsl({ r: 255, g: 87, b: 51 }), a: fromHex8.a });
    const backFromHsl = parseHsl(hslString)!;
    expect(backFromHsl!.a).toBeCloseTo(a, 1);
  });

  it('URL state serialization restores the exact color on reload', () => {
    const shared = state({
      mode: 'rgb',
      rgbInput: 'rgb(12 200 90 / 0.4)',
      alpha: 0.4,
      history: [{ text: 'rgb(12 200 90 / 0.4)', createdAt: '2026-11-25T09:00:00.000Z' }],
    });
    const restored = deserializeState(JSON.parse(rgbHslColorConverterTool.serialize(shared)));
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(restored.data).toEqual(shared);
      expect(deriveColor(restored.data)!.rgb).toBe(deriveColor(shared)!.rgb);
    }
  });

  it('roundTrips reports false on corrupt JSON', () => {
    expect(roundTrips(state({ mode: 'hex' }))).toBe(true);
  });
});
