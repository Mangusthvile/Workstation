import {
  BookOpen,
  Bookmark,
  CheckCircle2,
  Clock,
  Compass,
  Crown,
  Dumbbell,
  Flag,
  Flame,
  Heart,
  Shield,
  Star,
  Target,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { EventBgTheme, EventIconName, ProgressBarStyle } from './types';

export const AVAILABLE_ICONS: { name: EventIconName; label: string; component: LucideIcon }[] = [
  { name: 'target', label: 'Target', component: Target },
  { name: 'flame', label: 'Flame', component: Flame },
  { name: 'star', label: 'Star', component: Star },
  { name: 'trophy', label: 'Trophy', component: Trophy },
  { name: 'book', label: 'Book', component: BookOpen },
  { name: 'shield', label: 'Shield', component: Shield },
  { name: 'zap', label: 'Energy', component: Zap },
  { name: 'flag', label: 'Milestone', component: Flag },
  { name: 'check', label: 'Verified', component: CheckCircle2 },
  { name: 'dumbbell', label: 'Power', component: Dumbbell },
  { name: 'heart', label: 'Life', component: Heart },
  { name: 'bookmark', label: 'Lore', component: Bookmark },
  { name: 'compass', label: 'Quest', component: Compass },
  { name: 'crown', label: 'Mastery', component: Crown },
  { name: 'clock', label: 'Clock', component: Clock },
];

export const ICON_BY_NAME: Record<string, LucideIcon> = Object.fromEntries(
  AVAILABLE_ICONS.map((i) => [i.name, i.component])
);

export const COLOR_PALETTE = [
  { label: 'Obsidian', value: '#171717' },
  { label: 'Crimson', value: '#E11D48' },
  { label: 'Amber', value: '#D97706' },
  { label: 'Emerald', value: '#059669' },
  { label: 'Sky', value: '#0284C7' },
  { label: 'Violet', value: '#7C3AED' },
  { label: 'Rose', value: '#DB2777' },
];

export interface BgTheme {
  id: EventBgTheme;
  label: string;
  cardClass: string;
  isDark?: boolean;
}

export const BG_THEMES: BgTheme[] = [
  { id: 'white', label: 'Clean White', cardClass: 'bg-white border-neutral-200/90 text-neutral-900 shadow-sm' },
  { id: 'slate', label: 'Cool Slate', cardClass: 'bg-slate-50 border-slate-200/90 text-slate-900 shadow-sm' },
  { id: 'sage', label: 'Mint Sage', cardClass: 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950 shadow-sm' },
  { id: 'indigo', label: 'Soft Indigo', cardClass: 'bg-indigo-50/70 border-indigo-200/80 text-indigo-950 shadow-sm' },
  { id: 'amber', label: 'Warm Amber', cardClass: 'bg-amber-50/75 border-amber-200/80 text-amber-950 shadow-sm' },
  { id: 'rose', label: 'Blush Rose', cardClass: 'bg-rose-50/70 border-rose-200/80 text-rose-950 shadow-sm' },
  { id: 'noir', label: 'Cyber Noir', cardClass: 'bg-neutral-900 border-neutral-700/80 text-white shadow-md', isDark: true },
];

const THEME_BY_ID = new Map(BG_THEMES.map((t) => [t.id, t]));
export const getTheme = (id: EventBgTheme): BgTheme => THEME_BY_ID.get(id) ?? BG_THEMES[0];

export const PROGRESS_STYLES: { id: ProgressBarStyle; label: string; desc: string }[] = [
  {
    id: 'segmented-blocks',
    label: 'Segmented Checkpoint Blocks',
    desc: 'Numbered step boxes / grid matrix with active fill (e.g. 10 per row)',
  },
  { id: 'smooth-linear', label: 'Continuous Smooth Bar', desc: 'Sleek rounded progress bar with real-time percentage fill' },
  { id: 'segmented-pips', label: 'Segmented Pips', desc: 'Battery-style multi charge pips (discrete pills)' },
  { id: 'circular-ring', label: 'Radial Ring Gauge', desc: 'Circular SVG donut meter with progress in the center' },
  { id: 'milestone-nodes', label: 'Milestone Nodes', desc: 'Connected timeline stepper with linked checkpoints' },
];

export const STATUS_OPTIONS = [
  { emoji: '🟩', label: 'Active' },
  { emoji: '🟨', label: 'Frozen / Paused' },
  { emoji: '🟥', label: 'Critical / Urgent' },
  { emoji: '🟦', label: 'Complete / Sealed' },
];

export const UNIT_PRESETS = ['Days', 'Steps', 'Points', 'Hours', 'Words', 'Pages', 'Sessions', 'Charges'];

/** Upper bound on steps so a typo (e.g. 30000) cannot render tens of thousands of buttons. */
export const MAX_TOTAL_STEPS = 1000;
