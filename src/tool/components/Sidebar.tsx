'use client';

import React from 'react';
import { FORMATS } from './canvas-shared';
import type { ToolState } from '../types';

interface SidebarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ state }) => {
  return (
    <div className="p-4 space-y-6 text-sm overflow-y-auto h-full" data-testid="color-sidebar">
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Formats</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          {FORMATS.map((format) => (
            <li key={format.value} className="flex justify-between gap-2">
              <span>{format.label}</span>
              <span className="text-gray-500 dark:text-gray-400">{format.hint}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Saved colors</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-history-count">
          {state.history.length} entr{state.history.length === 1 ? 'y' : 'ies'} in history
          {state.history.length > 0 ? ' (newest first)' : ''}
        </p>
      </div>
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Tips</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li>Type in any field — the other formats update instantly.</li>
          <li>Shorthand hex like #0AF expands to #00AAFF.</li>
          <li>Alpha rounds through HEX8, RGBA and HSLA strings.</li>
          <li>Use the share button to send the exact color as a URL.</li>
        </ul>
      </div>
    </div>
  );
};
