'use client';

import React from 'react';
import { deriveColor } from '../tool-definition';
import { contrastRatio, parseHex, parseColorInput, shadeTint, toHex8, randomColor } from '../color';
import { DEFAULT_STATE, type ColorFormat, type ToolState } from '../types';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
  onSaveHistory?: (text: string) => void;
}

const FORMATS: { value: ColorFormat; label: string; hint: string }[] = [
  { value: 'hex', label: 'HEX', hint: 'hexadecimal, #RGB or #RRGGBB[AA]' },
  { value: 'rgb', label: 'RGB', hint: 'rgb() functional notation' },
  { value: 'hsl', label: 'HSL', hint: 'hue, saturation, lightness' },
  { value: 'hsv', label: 'HSV', hint: 'hue, saturation, value' },
];

const inputClass =
  'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

function CopyButton({ value, testid }: { value: string; testid?: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  }, [value]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      data-testid={testid}
      className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label="Copy value"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function Field({
  label,
  value,
  onChangeState,
  testid,
  error,
}: {
  label: string;
  value: string;
  onChangeState: (next: string) => void;
  testid: string;
  error?: string | null;
}) {
  return (
    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
      {label}
      <input
        type="text"
        value={value}
        onChange={(e) => onChangeState(e.target.value)}
        data-testid={testid}
        aria-invalid={Boolean(error)}
        className={`${inputClass} ${error ? 'border-red-500' : ''}`}
      />
      {error ? (
        <span
          className="mt-1 block text-xs text-red-600 dark:text-red-400"
          data-testid={`${testid}-error`}
          role="alert"
        >
          {error}
        </span>
      ) : null}
    </label>
  );
}

const VALIDATION_HINTS: Record<ColorFormat, string> = {
  hex: 'Enter a valid hex color like #FF5733 or #0AF.',
  rgb: 'Enter valid rgb like rgb(255 87 33).',
  hsl: 'Enter valid hsl like hsl(11 100% 56%).',
  hsv: 'Enter valid hsv like hsv(11 87% 100%).',
};

/** WCAG contrast readout against white and black. */
function ContrastRow({ rgb }: { rgb: import('../color-types').Rgb }) {
  const onWhite = contrastRatio(rgb, { r: 255, g: 255, b: 255 });
  const onBlack = contrastRatio(rgb, { r: 0, g: 0, b: 0 });
  return (
    <div className="grid grid-cols-2 gap-2 text-xs" data-testid="contrast-readout">
      <div className="rounded-md border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-900">
        <span className="block text-[10px] uppercase tracking-wider text-gray-500">On white</span>
        <span className="font-mono font-bold" data-testid="contrast-white">
          {onWhite}:1
        </span>
      </div>
      <div className="rounded-md border border-gray-200 bg-black p-2 dark:border-gray-800">
        <span className="block text-[10px] uppercase tracking-wider text-gray-400">On black</span>
        <span className="font-mono font-bold text-white" data-testid="contrast-black">
          {onBlack}:1
        </span>
      </div>
    </div>
  );
}

export const Canvas: React.FC<CanvasProps> = ({ state, onChange, onSaveHistory }) => {
  const update = (patch: Partial<ToolState>) => onChange?.({ ...state, ...patch });
  const parsed = parseColorInput(
    state.mode === 'hex'
      ? state.hexInput
      : state.mode === 'rgb'
        ? state.rgbInput
        : state.mode === 'hsl'
          ? state.hslInput
          : state.hsvInput,
    state.mode,
    state.alpha
  );
  const derived = deriveColor(state);
  const alphaHex =
    parsed && state.alpha < 1 ? toHex8({ ...parsed.rgb, a: undefined }, state.alpha) : null;

  const inputFor = (mode: ColorFormat): { value: string; set: (v: string) => void } => {
    switch (mode) {
      case 'hex':
        return { value: state.hexInput, set: (v) => update({ hexInput: v }) };
      case 'rgb':
        return { value: state.rgbInput, set: (v) => update({ rgbInput: v }) };
      case 'hsl':
        return { value: state.hslInput, set: (v) => update({ hslInput: v }) };
      case 'hsv':
        return { value: state.hsvInput, set: (v) => update({ hsvInput: v }) };
    }
  };

  const applyRandom = () => {
    const rgb = randomColor();
    const seed: ToolState = { ...state, mode: 'hex', hexInput: formatSeedHex(rgb) };
    const derived2 = deriveColor(seed);
    onChange?.({
      ...state,
      mode: 'hex',
      hexInput: formatSeedHex(rgb),
      rgbInput: derived2?.rgb ?? state.rgbInput,
      hslInput: derived2?.hsl ?? state.hslInput,
      hsvInput: derived2?.hsv ?? state.hsvInput,
      alpha: 1,
    });
  };

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full" data-testid="color-canvas">
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Color format"
        data-testid="format-tabs"
      >
        {FORMATS.map((f) => (
          <button
            key={f.value}
            type="button"
            role="tab"
            aria-selected={state.mode === f.value}
            data-testid={`format-tab-${f.value}`}
            title={f.hint}
            onClick={() => update({ mode: f.value })}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
              state.mode === f.value
                ? 'border-violet-500 bg-violet-50 text-violet-800 dark:bg-violet-900/40 dark:text-violet-100'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2" data-testid="format-inputs">
        {FORMATS.map((f) => {
          const field = inputFor(f.value);
          const invalid = f.value === state.mode && !parsed;
          return (
            <Field
              key={f.value}
              label={f.label}
              value={field.value}
              onChangeState={(v) =>
                update(
                  f.value === state.mode
                    ? ({ [`${f.value}Input`]: v } as Partial<ToolState>)
                    : { mode: f.value }
                )
              }
              testid={`input-${f.value}`}
              error={invalid ? VALIDATION_HINTS[f.value] : null}
            />
          );
        })}
      </div>

      <label
        className="block text-xs font-medium text-gray-700 dark:text-gray-300"
        data-testid="alpha-row"
      >
        Alpha: {Math.round(state.alpha * 100)}%
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={state.alpha}
          onChange={(e) => update({ alpha: Number(e.target.value) })}
          data-testid="input-alpha"
          className="mt-1 w-full"
        />
      </label>

      <div
        className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
        data-testid="preview-card"
      >
        <div
          className="flex h-32 items-center justify-center rounded-md border border-gray-300 dark:border-gray-700"
          style={{ backgroundColor: derived?.rgb ?? 'transparent' }}
          data-testid="preview-swatch"
        >
          <span className="rounded-full bg-white/70 px-3 py-1 font-mono text-xs text-black dark:bg-black/50 dark:text-white">
            {derived?.rgbHex ?? 'invalid color'}
          </span>
        </div>
        <div className="mt-3 flex gap-2" data-testid="readability-preview">
          <span
            className="rounded-md px-3 py-1 font-mono text-xs"
            style={{ backgroundColor: derived?.rgb ?? 'transparent', color: '#ffffff' }}
            data-testid="sample-on-color-light"
          >
            Light sample
          </span>
          <span
            className="rounded-md px-3 py-1 font-mono text-xs"
            style={{ backgroundColor: derived?.rgb ?? 'transparent', color: '#000000' }}
            data-testid="sample-on-color-dark"
          >
            Dark sample
          </span>
        </div>
        {parsed ? (
          <div className="mt-3">
            <ContrastRow rgb={{ ...parsed.rgb, a: undefined }} />
          </div>
        ) : null}
      </div>

      <div
        className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
        data-testid="output-formats"
      >
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          CSS-ready outputs
        </h3>
        <ul className="space-y-2">
          {derived
            ? (
                [
                  ['HEX8', derived.rgbHex],
                  ['RGB', derived.rgb],
                  ['HSL', derived.hsl],
                  ['HSV', derived.hsv],
                ] as const
              ).map(([label, value]) => (
                <li
                  key={label}
                  className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-xs dark:border-gray-800"
                >
                  <span className="w-10 font-medium text-gray-500 dark:text-gray-400">{label}</span>
                  <span
                    className="flex-1 truncate font-mono text-gray-700 dark:text-gray-300"
                    data-testid={`output-${label.toLowerCase()}`}
                  >
                    {value}
                  </span>
                  <CopyButton value={value} testid={`copy-${label.toLowerCase()}`} />
                </li>
              ))
            : null}
          {alphaHex ? (
            <li className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-xs dark:border-gray-800">
              <span className="w-10 font-medium text-gray-500 dark:text-gray-400">RGBA</span>
              <span
                className="flex-1 truncate font-mono text-gray-700 dark:text-gray-300"
                data-testid="output-rgba"
              >
                {derived?.rgb}
              </span>
              <CopyButton value={derived?.rgb ?? ''} testid="copy-rgba" />
            </li>
          ) : null}
        </ul>
      </div>

      <div
        className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50"
        data-testid="shade-tint-row"
      >
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Shades &amp; tints
        </h3>
        <div className="flex flex-wrap gap-2">
          {parsed
            ? ([-0.4, -0.2, 0, 0.2, 0.4] as const).map((t) => {
                const mixed = shadeTint({ ...parsed.rgb, a: undefined }, t);
                const hex = parseHex(toHex8(mixed, 1))!;
                return (
                  <button
                    key={t}
                    type="button"
                    title={
                      t === 0 ? 'Current color' : t > 0 ? `Tint +${t * 100}%` : `Shade ${t * 100}%`
                    }
                    aria-label={`Apply ${hex}`}
                    data-testid={`shade-${t}`}
                    onClick={() =>
                      update({
                        mode: 'hex',
                        hexInput: formatSeedHex({ ...mixed, a: undefined }),
                        alpha: state.alpha,
                      })
                    }
                    className="h-10 w-10 rounded-md border border-gray-300 dark:border-gray-700"
                    style={{ backgroundColor: toHex8(mixed, 1) }}
                  />
                );
              })
            : null}
          <button
            type="button"
            onClick={applyRandom}
            data-testid="btn-random"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Random
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Recent colors
          </h3>
          {onSaveHistory && derived ? (
            <button
              type="button"
              data-testid="btn-save-history"
              onClick={() => onSaveHistory(derived.rgb)}
              className="mb-2 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Save current
            </button>
          ) : null}
        </div>
        {state.history.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="history-empty">
            No saved colors yet.
          </p>
        ) : (
          <ul className="space-y-1" data-testid="history-list">
            {state.history.map((entry, i) => (
              <li
                key={`${entry.createdAt}-${i}`}
                className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-xs dark:border-gray-800"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="h-4 w-4 rounded border border-gray-300 dark:border-gray-700"
                    style={{ backgroundColor: entry.text }}
                  />
                  <span className="font-mono text-gray-700 dark:text-gray-300">{entry.text}</span>
                </span>
                <span className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => update({ mode: 'rgb', ...{ rgbInput: entry.text } })}
                    data-testid={`history-apply-${i}`}
                    className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Apply
                  </button>
                  <CopyButton value={entry.text} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        All conversions run locally in your browser; nothing is uploaded.
      </p>
    </div>
  );
};

function formatSeedHex(rgb: { r: number; g: number; b: number; a?: number }): string {
  const to2 = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
  return `#${to2(rgb.r)}${to2(rgb.g)}${to2(rgb.b)}`;
}
