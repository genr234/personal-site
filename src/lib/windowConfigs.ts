import type { WindowConfig } from './types';

export const defaultWindowConfigs: WindowConfig[] = [
  {
    id: 'music',
    title: 'Music',
    color: '#ff0045',
    icon: '🎵',
    initialSize: { width: 480, height: 600 },
    initialPosition: { x: 100, y: 80 },
  },
];
