import type { ToolConfig } from '@itsjust/core';
import packageJson from '../../package.json';

export const templateBaseVersion = packageJson.version;

const toolConfig = {
  id: 'rgb-hsl-color-converter',
  name: 'RGB HSL Color Converter',
  description:
    'Convert colors between HEX, RGB, HSL and HSV with live previews, alpha support, and copyable output formats.',
  version: '1.0.0',
  exportFormats: ['json', 'png', 'jpeg', 'webp', 'pdf'],
  features: {
    export: true,
    autoSave: true,
    undoRedo: true,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    accent: '#8b5cf6',
    accentHover: '#7c3aed',
    accentSubtle: 'rgba(139, 92, 246, 0.08)',
    brand: 'RGB HSL Color Converter',
    icon: '🎨',
  },
} satisfies ToolConfig;

export default toolConfig;
