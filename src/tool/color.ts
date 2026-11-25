import type { Rgb, Hsl, Hsv, ParsedColor } from './color-types';

const BYTE = 255;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Round to one decimal, normalizing -0 to 0 (e.g. -0.04 -> -0 -> 0). */
export function round1(value: number): number {
  const r = Math.round(value * 10) / 10;
  return Object.is(r, -0) ? 0 : r;
}

/** Parse a CSS hex color: #RGB, #RGBA, #RRGGBB or #RRGGBBAA (case-insensitive). */
export function parseHex(input: string): Rgb | null {
  const m = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(input.trim());
  if (!m || !m[1]) return null;
  let hex = m[1];
  if (hex.length <= 4) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
    a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / BYTE : undefined,
  };
}

/** Format RGB as CSS hex, lowercase, omitting alpha when 1; always #rrggbb[-aa]. */
export function formatHex(rgb: Rgb): string {
  const to2 = (v: number) => clamp(Math.round(v), 0, BYTE).toString(16).padStart(2, '0');
  const base = `#${to2(rgb.r)}${to2(rgb.g)}${to2(rgb.b)}`;
  if (rgb.a === undefined || rgb.a >= 1) return base;
  return `${base}${to2(rgb.a * BYTE)}`;
}

const NUM = /^[+-]?(\d+(\.\d*)?|\.\d+)$/;

/** Parse "rgb(255 87 33)", "rgb(255, 87, 33)", "rgba(...)" or "rgb(... / 0.5)". */
export function parseRgb(input: string): Rgb | null {
  const m = /^rgba?\(\s*([^)]*)\)$/i.exec(input.trim());
  if (!m || !m[1]) return null;
  const body = m[1].replace(/\//g, ' ');
  const parts = body.split(/[\s,]+/).filter(Boolean);
  if (parts.length !== 3 && parts.length !== 4) return null;
  const nums = parts.map((p) => (NUM.test(p.replace('%', '')) ? Number(p.replace('%', '')) : NaN));
  if (nums.some((n) => !Number.isFinite(n))) return null;
  const r = nums[0];
  const g = nums[1];
  const b = nums[2];
  if (r === undefined || g === undefined || b === undefined) return null;
  const pct = parts.some((p) => p.endsWith('%'));
  const scale = pct ? 2.55 : 1;
  const alphaRaw = nums[3];
  return {
    r: clamp(Math.round(r * scale), 0, BYTE),
    g: clamp(Math.round(g * scale), 0, BYTE),
    b: clamp(Math.round(b * scale), 0, BYTE),
    a:
      alphaRaw === undefined
        ? undefined
        : pct && parts[3]?.endsWith('%')
          ? clamp(alphaRaw / 100, 0, 1)
          : clamp(alphaRaw, 0, 1),
  };
}

/** CSS-functional rgb() string, space syntax with alpha only when < 1. */
export function formatRgb(rgb: Rgb): string {
  const base = `rgb(${Math.round(rgb.r)} ${Math.round(rgb.g)} ${Math.round(rgb.b)}`;
  if (rgb.a === undefined || rgb.a >= 1) return `${base})`;
  const a = round1(clamp(rgb.a, 0, 1));
  return `${base} / ${a})`;
}

/** Parse "hsl(h s% l%)", "hsl(h, s%, l%)", "hsla(...)" or "hsl(... / a)". */
export function parseHsl(input: string): Hsl | null {
  const m = /^hsla?\(\s*([^)]*)\)$/i.exec(input.trim());
  if (!m || !m[1]) return null;
  const body = m[1].replace(/\//g, ' ').replace(/,/g, ' ');
  const parts = body.split(/\s+/).filter(Boolean);
  if (parts.length !== 3 && parts.length !== 4) return null;
  const hRaw = NUM.test(parts[0]?.replace('%', '') ?? '')
    ? Number(parts[0]?.replace('%', ''))
    : NaN;
  const sRaw = NUM.test(parts[1]?.replace('%', '') ?? '')
    ? Number(parts[1]?.replace('%', ''))
    : NaN;
  const lRaw = NUM.test(parts[2]?.replace('%', '') ?? '')
    ? Number(parts[2]?.replace('%', ''))
    : NaN;
  if (![hRaw, sRaw, lRaw].every(Number.isFinite)) return null;
  let a: number | undefined;
  if (parts[3] !== undefined) {
    const raw = parts[3].replace('%', '');
    if (!NUM.test(raw)) return null;
    const p3 = parts[3]!;
    a = clamp(p3.endsWith('%') ? Number(raw) / 100 : Number(raw), 0, 1);
  }
  return { h: ((hRaw % 360) + 360) % 360, s: clamp(sRaw, 0, 100), l: clamp(lRaw, 0, 100), a };
}

/** CSS-functional hsl() string with alpha only when < 1. */
export function formatHsl(hsl: Hsl): string {
  const base = `hsl(${round1(hsl.h)} ${round1(hsl.s)}% ${round1(hsl.l)}%`;
  if (hsl.a === undefined || hsl.a >= 1) return `${base})`;
  return `${base} / ${round1(clamp(hsl.a, 0, 1))})`;
}

/** Parse "hsv(h s% v%)" with the same tolerance as HSL. */
export function parseHsv(input: string): Hsv | null {
  const m2 = /^hsv\(\s*([^)]*)\)$/i.exec(input.trim());
  if (!m2 || !m2[1]) return null;
  const hsl = parseHsl(`hsl(${m2[1]})`);
  return hsl ? { h: hsl.h, s: hsl.s, v: hsl.l, a: hsl.a } : null;
}

/** CSS-functional hsv() string (alpha only when < 1). */
export function formatHsv(hsv: Hsv): string {
  const base = `hsv(${round1(hsv.h)} ${round1(hsv.s)}% ${round1(hsv.v)}%`;
  if (hsv.a === undefined || hsv.a >= 1) return `${base})`;
  return `${base} / ${round1(clamp(hsv.a, 0, 1))})`;
}

/** rgb -> hsl; h in 0-360, s/l in 0-100. */
export function rgbToHsl(rgb: Rgb): Hsl {
  const r = rgb.r / BYTE;
  const g = rgb.g / BYTE;
  const b = rgb.b / BYTE;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return {
    h: round1(((h % 360) + 360) % 360),
    s: clamp(round1(s * 100), 0, 100),
    l: clamp(round1(l * 100), 0, 100),
    a: rgb.a,
  };
}

/** hsl -> rgb (integers 0-255). */
export function hslToRgb(hsl: Hsl): Rgb {
  const h = (((hsl.h % 360) + 360) % 360) / 360;
  const s = clamp(hsl.s, 0, 100) / 100;
  const l = clamp(hsl.l, 0, 100) / 100;
  if (s === 0) {
    const v = Math.round(l * BYTE);
    return { r: v, g: v, b: v, a: hsl.a };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (t: number): number => {
    let t2 = t;
    if (t2 < 0) t2 += 1;
    if (t2 > 1) t2 -= 1;
    if (t2 < 1 / 6) return p + (q - p) * 6 * t2;
    if (t2 < 1 / 2) return q;
    if (t2 < 2 / 3) return p + (q - p) * (2 / 3 - t2) * 6;
    return p;
  };
  return {
    r: Math.round(hue2rgb(p + h) * BYTE),
    g: Math.round(hue2rgb(h) * BYTE),
    b: Math.round(hue2rgb(h - 1 / 3) * BYTE),
    a: hsl.a,
  };
}

/** rgb -> hsv; h in 0-360, s/v in 0-100. */
export function rgbToHsv(rgb: Rgb): Hsv {
  const r = rgb.r / BYTE;
  const g = rgb.g / BYTE;
  const b = rgb.b / BYTE;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (max !== min) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  const s = max === 0 ? 0 : d / max;
  return {
    h: round1(((h % 360) + 360) % 360),
    s: clamp(round1(s * 100), 0, 100),
    v: clamp(round1(max * 100), 0, 100),
    a: rgb.a,
  };
}

/** hsv -> rgb (integers 0-255). */
export function hsvToRgb(hsv: Hsv): Rgb {
  const h = (((hsv.h % 360) + 360) % 360) / 60;
  const s = clamp(hsv.s, 0, 100) / 100;
  const v = clamp(hsv.v, 0, 100) / 100;
  const i = Math.floor(h);
  const f = h - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r = v;
  let g = p;
  let b = p;
  switch (i % 6) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    default:
      r = v;
      g = p;
      b = q;
      break;
  }
  return {
    r: Math.round(r * BYTE),
    g: Math.round(g * BYTE),
    b: Math.round(b * BYTE),
    a: hsv.a,
  };
}

/**
 * Parse any format input into a normalized parsed color (canon Rgb + alpha).
 * Alpha from the input string wins; otherwise the editor alpha is applied.
 */
export function parseColorInput(
  input: string,
  mode: 'hex' | 'rgb' | 'hsl' | 'hsv',
  alpha: number
): ParsedColor | null {
  const rgb =
    mode === 'hex'
      ? parseHex(input)
      : mode === 'rgb'
        ? parseRgb(input)
        : mode === 'hsl'
          ? parseHsl(input)
            ? hslToRgb(parseHsl(input)!)
            : null
          : parseHsv(input)
            ? hsvToRgb(parseHsv(input)!)
            : null;
  if (!rgb) return null;
  return { rgb, alpha: rgb.a ?? alpha };
}

/** Convert a parsed color to its canonical string form for serialization. */
export function toHex8(rgb: Rgb, alpha: number): string {
  return formatHex({ ...rgb, a: clamp(alpha, 0, 1) });
}

/** WCAG relative luminance of an RGB color. */
export function relativeLuminance(rgb: Rgb): number {
  const lin = (c: number) => {
    const v = c / BYTE;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b);
}

/** WCAG contrast ratio between two colors, 1–21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const ratio = (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  return Math.round(ratio * 100) / 100;
}

/** Mix with white (t>0) or black (t<0); t in [-1, 1]. */
export function shadeTint(rgb: Rgb, t: number): Rgb {
  const target = t >= 0 ? BYTE : 0;
  const amount = Math.abs(clamp(t, -1, 1));
  return {
    r: Math.round(rgb.r + (target - rgb.r) * amount),
    g: Math.round(rgb.g + (target - rgb.g) * amount),
    b: Math.round(rgb.b + (target - rgb.b) * amount),
    a: rgb.a,
  };
}

export function randomColor(): Rgb {
  return {
    r: Math.floor(Math.random() * (BYTE + 1)),
    g: Math.floor(Math.random() * (BYTE + 1)),
    b: Math.floor(Math.random() * (BYTE + 1)),
    a: 1,
  };
}
