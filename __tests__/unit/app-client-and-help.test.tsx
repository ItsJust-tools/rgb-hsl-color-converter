import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import ToolClient from '@/app/tool-client';
import ToolClientWrapper from '@/app/tool-client-wrapper';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid="dynamic-tool-client">dynamic-tool-client</div>,
}));

const mockSetData = vi.fn();
const mockToast = vi.fn();
const mockHandleExport = vi.fn();
const mockImport = vi.fn();
const mockToolbarActions = { canUndo: true, canRedo: true, onUndo: vi.fn(), onRedo: vi.fn() };

vi.mock('@itsjust/core', () => ({
  ToolShell: ({ toolbar, sidebar, canvas, statusBar }: Record<string, unknown>) => (
    <div>
      <div>{toolbar as ReactNode}</div>
      <div>{sidebar as ReactNode}</div>
      <div>{canvas as ReactNode}</div>
      <div>{statusBar as ReactNode}</div>
    </div>
  ),
  ImportExport: ({ onShare }: { onShare?: () => void }) => (
    <button type="button" onClick={onShare}>
      trigger-share
    </button>
  ),
  useTool: () => ({
    state: {
      data: {
        mode: 'hex',
        hexInput: '#FF5733',
        rgbInput: 'rgb(255 87 51)',
        hslInput: 'hsl(10.6 100% 60%)',
        hsvInput: 'hsv(10.6 80% 100%)',
        alpha: 1,
        history: [],
      },
      setData: mockSetData,
      isDirty: false,
      lastSaved: 'just now',
    },
    toast: mockToast,
    supportedFormats: ['json'],
    handleExport: mockHandleExport,
    importFromFile: mockImport,
    isImporting: false,
    toolbarActions: mockToolbarActions,
  }),
}));

vi.mock('@/tool', () => ({
  toolConfig: {
    id: 'rgb-hsl-color-converter',
    name: 'RGB HSL Color Converter',
    version: '1.0.0',
    features: { sidebar: true },
    theme: { brand: 'RGB HSL Color Converter' },
  },
  templateBaseVersion: '1.1.0',
  Canvas: ({ state }: { state: Record<string, unknown> }) => <div>canvas:{String(state.mode)}</div>,
  Toolbar: () => <div>toolbar</div>,
  Sidebar: () => <div>sidebar</div>,
  deriveColor: () => null,
  syncFromMode: (s: unknown) => s,
  DEFAULT_STATE: { mode: 'hex' },
}));

vi.mock('@/tool/tool-definition', () => ({
  rgbHslColorConverterTool: {
    serialize: (state: unknown) => JSON.stringify(state),
    deserialize: () => ({
      success: true,
      data: {
        mode: 'hex',
        hexInput: '#FF5733',
        rgbInput: 'rgb(255 87 51)',
        hslInput: 'hsl(10.6 100% 60%)',
        hsvInput: 'hsv(10.6 80% 100%)',
        alpha: 1,
        history: [],
      },
    }),
  },
}));

describe('app client and help page', () => {
  beforeEach(() => {
    mockSetData.mockReset();
    mockToast.mockReset();
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    Object.defineProperty(navigator, 'share', {
      writable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });
    window.history.replaceState(null, '', 'http://localhost:3000/?state=e30%3D');
  });

  it('renders dynamic tool client wrapper', () => {
    render(<ToolClientWrapper />);
    expect(screen.getByTestId('dynamic-tool-client')).toBeInTheDocument();
  });

  it('handles share flow in tool client', async () => {
    render(<ToolClient />);

    expect(screen.getByText('toolbar')).toBeInTheDocument();
    fireEvent.click(screen.getByText('trigger-share'));

    expect(mockToast).toHaveBeenCalled();
  });
});
