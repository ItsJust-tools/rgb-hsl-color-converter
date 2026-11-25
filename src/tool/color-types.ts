export interface Rgb {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface Hsl {
  h: number;
  s: number;
  l: number;
  a?: number;
}

export interface Hsv {
  h: number;
  s: number;
  v: number;
  a?: number;
}

export interface ParsedColor {
  rgb: Rgb;
  alpha: number;
}
