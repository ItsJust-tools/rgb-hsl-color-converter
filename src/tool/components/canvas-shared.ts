import { useState } from 'react';
import type { ColorFormat } from '../types';

export const FORMATS: { value: ColorFormat; label: string; hint: string }[] = [
  { value: 'hex', label: 'HEX', hint: 'hexadecimal, #RGB or #RRGGBB[AA]' },
  { value: 'rgb', label: 'RGB', hint: 'rgb() functional notation' },
  { value: 'hsl', label: 'HSL', hint: 'hue, saturation, lightness' },
  { value: 'hsv', label: 'HSV', hint: 'hue, saturation, value' },
];

export function useStateSummary(): string {
  const [count] = useState(0);
  return `formats: ${FORMATS.length}, seed: ${count}`;
}
