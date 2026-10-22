export type WallpaperTheme = 'sand-mist' | 'ocean-surf' | 'cyber-game' | 'studio-white';
export type WidgetId = 'text-studio' | 'event-tracker' | 'dice-roller' | 'scratchpad';

export interface WidgetWindowState {
  isOpen: boolean;
  isMinimized: boolean;
  zIndex: number;
}

export type WidgetsState = Record<WidgetId, WidgetWindowState>;

/** Props every desktop widget receives from the Desktop. */
export interface DesktopWidgetProps {
  isMinimized: boolean;
  zIndex: number;
  onFocus: () => void;
  onMinimize: () => void;
  onClose: () => void;
}

export const WIDGET_IDS: WidgetId[] = ['text-studio', 'event-tracker', 'dice-roller', 'scratchpad'];

export const DEFAULT_WIDGETS: WidgetsState = {
  'text-studio': { isOpen: true, isMinimized: false, zIndex: 30 },
  'event-tracker': { isOpen: false, isMinimized: false, zIndex: 29 },
  'dice-roller': { isOpen: false, isMinimized: false, zIndex: 28 },
  scratchpad: { isOpen: false, isMinimized: false, zIndex: 27 },
};

export const WALLPAPERS: { id: WallpaperTheme; label: string; background: string; swatch: string }[] = [
  {
    id: 'sand-mist',
    label: 'MacBook Sand',
    background: 'bg-gradient-to-br from-[#dfd7cc] via-[#eae5df] to-[#c9c0b5]',
    swatch: 'bg-gradient-to-tr from-[#dfd7cc] to-[#eae5df]',
  },
  {
    id: 'ocean-surf',
    label: 'Ocean Surf Waves',
    background: 'bg-gradient-to-br from-[#0c3843] via-[#107080] to-[#5cb3b8]',
    swatch: 'bg-gradient-to-tr from-[#107080] to-[#5cb3b8]',
  },
  {
    id: 'cyber-game',
    label: 'Gamer Dark Neon',
    background: 'bg-gradient-to-br from-[#0d091a] via-[#1a1233] to-[#2b1b4d]',
    swatch: 'bg-gradient-to-tr from-[#1a1233] to-[#2b1b4d]',
  },
  {
    id: 'studio-white',
    label: 'Minimalist Studio',
    background: 'bg-gradient-to-br from-[#f8f9fa] via-[#e9ecef] to-[#dee2e6]',
    swatch: 'bg-gradient-to-tr from-[#f8f9fa] to-[#dee2e6]',
  },
];
