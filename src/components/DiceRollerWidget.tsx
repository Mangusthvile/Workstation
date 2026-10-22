import React, { memo, useEffect, useRef, useState } from 'react';
import { Check, Copy, Dices, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { WindowFrame } from './window/WindowFrame';
import { STORAGE_KEYS, readJSON, writeJSON } from '../lib/storage';
import { copyText, uid } from '../lib/browser';
import { usePersistentState, useTransientValue } from '../lib/hooks';
import type { DesktopWidgetProps } from './desktop/types';

export interface DiceGroup {
  id: string;
  count: number;
  sides: number;
  modifier: number; // Dedicated modifier for THIS die
  label: string; // Optional label (e.g., "Attack", "Slashing", "Initiative")
}

export interface GroupRollResult {
  groupId: string;
  label: string;
  sides: number;
  count: number;
  rolls: number[];
  rollsSum: number;
  modifier: number;
  subtotal: number;
  hasCrit20: boolean;
  hasFumble1: boolean;
}

export interface RollHistoryEntry {
  id: string;
  timestamp: string;
  formula: string;
  groups: GroupRollResult[];
  grandTotal: number;
}

interface DiceState {
  groups: DiceGroup[];
  history: RollHistoryEntry[];
}

const COMMON_DICE = [4, 6, 8, 10, 12, 20, 100];
const MAX_DICE_PER_GROUP = 100;
const MIN_SIDES = 2;
const MAX_SIDES = 1000;
const HISTORY_LIMIT = 20;

const DEFAULT_GROUPS: DiceGroup[] = [
  { id: '1', count: 1, sides: 20, modifier: 5, label: 'Attack' },
  { id: '2', count: 2, sides: 6, modifier: 3, label: 'Damage' },
];

const PRESETS: Record<'attack-damage' | 'advantage' | 'stats', { label: string; groups: Omit<DiceGroup, 'id'>[] }> = {
  'attack-damage': {
    label: 'Atk+Dmg',
    groups: [
      { count: 1, sides: 20, modifier: 6, label: 'Attack' },
      { count: 2, sides: 6, modifier: 4, label: 'Damage' },
    ],
  },
  advantage: {
    label: 'Advantage',
    groups: [
      { count: 1, sides: 20, modifier: 5, label: 'Roll A' },
      { count: 1, sides: 20, modifier: 5, label: 'Roll B' },
    ],
  },
  stats: {
    label: 'Check+Bless',
    groups: [
      { count: 1, sides: 20, modifier: 3, label: 'Check' },
      { count: 1, sides: 4, modifier: 0, label: 'Bless (d4)' },
      { count: 1, sides: 8, modifier: 2, label: 'Bonus' },
    ],
  },
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const formatMod = (m: number) => (m > 0 ? `+${m}` : m < 0 ? `${m}` : '');

/** Unbiased roll of one die using the browser's cryptographic RNG. */
function rollDie(sides: number): number {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x1_0000_0000 / sides) * sides; // reject the biased tail
  do {
    crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return (buf[0] % sides) + 1;
}

function rollGroups(groups: DiceGroup[]): RollHistoryEntry {
  let grandTotal = 0;
  const results = groups.map((g): GroupRollResult => {
    const rolls = Array.from({ length: g.count }, () => rollDie(g.sides));
    const rollsSum = rolls.reduce((a, b) => a + b, 0);
    const subtotal = rollsSum + g.modifier;
    grandTotal += subtotal;
    return {
      groupId: g.id,
      label: g.label,
      sides: g.sides,
      count: g.count,
      rolls,
      rollsSum,
      modifier: g.modifier,
      subtotal,
      hasCrit20: g.sides === 20 && rolls.includes(20),
      hasFumble1: g.sides === 20 && rolls.includes(1),
    };
  });

  return {
    id: uid('roll-'),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    formula: groups.map((g) => `${g.label ? `[${g.label}] ` : ''}${g.count}d${g.sides}${formatMod(g.modifier)}`).join(' + '),
    groups: results,
    grandTotal,
  };
}

function loadDiceState(): DiceState {
  const saved = readJSON(STORAGE_KEYS.diceRoller) as Partial<DiceState> | undefined;
  return {
    groups: Array.isArray(saved?.groups) ? saved.groups : DEFAULT_GROUPS,
    history: Array.isArray(saved?.history) ? saved.history : [],
  };
}
const saveDiceState = (state: DiceState) => writeJSON(STORAGE_KEYS.diceRoller, state);

const stepperBtn =
  'w-5 h-5 rounded hover:bg-neutral-200 flex items-center justify-center font-bold text-neutral-700 text-xs';

export const DiceRollerWidget = memo(function DiceRollerWidget(props: DesktopWidgetProps) {
  const [state, setState] = usePersistentState(STORAGE_KEYS.diceRoller, loadDiceState, saveDiceState);
  const { groups, history } = state;
  const [customSides, setCustomSides] = useState('');
  const [isRolling, setIsRolling] = useState(false);
  // The breakdown card shows the newest roll, but only once a roll happens in this session.
  const [showLatest, setShowLatest] = useState(false);
  const [copiedId, markCopied] = useTransientValue<string>();
  const rollTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(rollTimer.current), []);

  const setGroups = (update: (prev: DiceGroup[]) => DiceGroup[]) =>
    setState((s) => ({ ...s, groups: update(s.groups) }));

  const addGroup = (sides: number) =>
    setGroups((prev) => [...prev, { id: uid('die-'), count: 1, sides: clamp(sides, MIN_SIDES, MAX_SIDES), modifier: 0, label: '' }]);

  const updateGroup = (id: string, updates: Partial<DiceGroup>) =>
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));

  const addCustomDie = () => {
    const sides = parseInt(customSides, 10);
    if (sides >= MIN_SIDES) addGroup(sides);
    setCustomSides('');
  };

  const rollAll = () => {
    if (groups.length === 0 || isRolling) return;
    setIsRolling(true);
    // Short delay so the spin animation reads as a "roll".
    rollTimer.current = setTimeout(() => {
      const entry = rollGroups(groups);
      setState((s) => ({ ...s, history: [entry, ...s.history].slice(0, HISTORY_LIMIT) }));
      setShowLatest(true);
      setIsRolling(false);
    }, 180);
  };

  const lastRoll = showLatest ? history[0] ?? null : null;
  const olderRolls = lastRoll ? history.slice(1) : history;

  const copyRoll = async (roll: RollHistoryEntry) => {
    const text = `Dice Roll: ${roll.groups
      .map(
        (g) =>
          `${g.label ? `${g.label} ` : ''}${g.count}d${g.sides}${formatMod(g.modifier)} = ${g.subtotal} ([${g.rolls.join(', ')}]${
            g.modifier ? ` mod: ${g.modifier}` : ''
          })`
      )
      .join(' | ')} -> GRAND TOTAL = ${roll.grandTotal}`;
    if (await copyText(text)) markCopied(roll.id);
  };

  return (
    <WindowFrame
      {...props}
      minWidth={360}
      minHeight={400}
      className="select-none"
      initialRect={() => ({ x: 140, y: 80, width: 520, height: 560 })}
      title={
        <>
          <Dices className="w-3.5 h-3.5" />
          <span>Multi-Dice Roller</span>
        </>
      }
      actions={
        <button
          onClick={() => setGroups(() => [])}
          className="p-1 rounded-md hover:bg-neutral-200 text-neutral-500 hover:text-black text-[11px] flex items-center gap-1"
          title="Clear all dice"
          aria-label="Clear all dice"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      }
    >
      <div className="p-3.5 sm:p-4 overflow-y-auto flex-1 flex flex-col space-y-3.5">
        {/* Add dice */}
        <div>
          <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Add Dice</span>
            <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-normal">
              {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((key, i) => (
                <React.Fragment key={key}>
                  {i > 0 && <span>•</span>}
                  <button
                    onClick={() => setGroups(() => PRESETS[key].groups.map((g, idx) => ({ ...g, id: String(idx + 1) })))}
                    className="hover:text-black underline"
                  >
                    {PRESETS[key].label}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {COMMON_DICE.map((sides) => (
              <button
                key={sides}
                onClick={() => addGroup(sides)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-200 shadow-2xs text-xs font-semibold transition-all hover:scale-105 active:scale-95"
                title={`Add a d${sides}`}
              >
                <Plus className="w-2.5 h-2.5 text-neutral-400" />
                <span>d{sides}</span>
              </button>
            ))}

            <div className="flex items-center border border-neutral-200 rounded-xl bg-white px-2 py-0.5 shadow-2xs">
              <span className="text-xs text-neutral-400 font-mono">d</span>
              <input
                type="number"
                min={MIN_SIDES}
                max={MAX_SIDES}
                placeholder="X"
                value={customSides}
                onChange={(e) => setCustomSides(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomDie()}
                className="w-9 text-xs bg-transparent outline-none font-mono text-center"
                aria-label="Custom die sides"
              />
              <button onClick={addCustomDie} className="text-xs font-bold text-neutral-700 hover:text-black px-0.5" title="Add custom die">
                +
              </button>
            </div>
          </div>
        </div>

        {/* Configured dice */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-neutral-700 flex items-center justify-between">
            <span>Configured Dice ({groups.length})</span>
            <span className="text-[10px] text-neutral-400">Each die can have a different modifier & label</span>
          </div>

          {groups.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-neutral-300 text-center text-xs text-neutral-400">
              No dice added. Click any die above (like d20 or d6) to add!
            </div>
          ) : (
            <div className="space-y-2">
              {groups.map((group, idx) => (
                <div
                  key={group.id}
                  className="bg-white border border-neutral-200 rounded-xl p-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 hover:border-neutral-300 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-neutral-400 font-bold w-4">#{idx + 1}</span>
                    <div className="flex items-center bg-neutral-100 rounded-lg p-0.5">
                      <button onClick={() => updateGroup(group.id, { count: clamp(group.count - 1, 1, MAX_DICE_PER_GROUP) })} className={stepperBtn} aria-label="Fewer dice">
                        -
                      </button>
                      <span className="w-5 text-center font-mono font-bold text-xs">{group.count}</span>
                      <button onClick={() => updateGroup(group.id, { count: clamp(group.count + 1, 1, MAX_DICE_PER_GROUP) })} className={stepperBtn} aria-label="More dice">
                        +
                      </button>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-black text-white font-mono font-bold text-xs shadow-2xs">d{group.sides}</span>
                    <input
                      type="text"
                      placeholder="Label (optional)"
                      value={group.label}
                      onChange={(e) => updateGroup(group.id, { label: e.target.value })}
                      className="w-24 sm:w-28 text-xs bg-neutral-50 px-2 py-1 rounded-md border border-neutral-200/80 outline-none placeholder:text-neutral-300 focus:bg-white focus:border-black transition-colors"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-[10px] text-neutral-400 font-medium">Mod:</span>
                      <div className="flex items-center bg-neutral-100 rounded-lg p-0.5 border border-neutral-200">
                        <button onClick={() => updateGroup(group.id, { modifier: group.modifier - 1 })} className={stepperBtn} title="Decrease modifier">
                          -
                        </button>
                        <input
                          type="number"
                          value={group.modifier}
                          onChange={(e) => updateGroup(group.id, { modifier: parseInt(e.target.value, 10) || 0 })}
                          className="w-9 text-center font-mono font-bold text-xs bg-transparent outline-none"
                          aria-label="Modifier"
                        />
                        <button onClick={() => updateGroup(group.id, { modifier: group.modifier + 1 })} className={stepperBtn} title="Increase modifier">
                          +
                        </button>
                      </div>
                    </div>
                    <span className="font-mono text-xs text-neutral-500 font-medium hidden sm:inline">
                      ({group.count}d{group.sides}
                      {formatMod(group.modifier)})
                    </span>
                    <button
                      onClick={() => setGroups((prev) => prev.filter((g) => g.id !== group.id))}
                      className="p-1 rounded text-neutral-300 hover:text-rose-600 transition-colors"
                      title="Remove this die"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={rollAll}
          disabled={isRolling || groups.length === 0}
          className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all ${
            isRolling || groups.length === 0
              ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
              : 'bg-black text-white hover:bg-neutral-800 active:scale-[0.99]'
          }`}
        >
          <Dices className={`w-4 h-4 ${isRolling ? 'animate-spin' : ''}`} />
          <span>{isRolling ? 'Rolling Dice...' : `Roll All Dice (${groups.length} types)`}</span>
        </button>

        {/* Latest roll breakdown */}
        {lastRoll && (
          <div className="bg-white border-2 border-neutral-300 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div className="text-xs font-semibold text-neutral-700 flex items-center gap-2">
                <span>Roll Breakdown</span>
                <span className="text-[10px] text-neutral-400 font-mono">{lastRoll.timestamp}</span>
              </div>
              <button
                onClick={() => copyRoll(lastRoll)}
                className="text-xs text-neutral-600 hover:text-black flex items-center gap-1"
                title="Copy full result"
              >
                {copiedId === lastRoll.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-medium">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Result</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-2">
              {lastRoll.groups.map((g, idx) => (
                <div
                  key={`${g.groupId}-${idx}`}
                  className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 text-xs ${
                    g.hasCrit20
                      ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300'
                      : g.hasFumble1
                      ? 'bg-rose-50/70 border-rose-300'
                      : 'bg-neutral-50/70 border-neutral-200'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    {g.label && (
                      <span className="font-semibold text-neutral-800 bg-white px-2 py-0.5 rounded border border-neutral-200 text-[11px]">
                        {g.label}
                      </span>
                    )}
                    <span className="font-mono text-neutral-600 text-xs">
                      {g.count}d{g.sides}
                      {g.modifier > 0 ? ` + ${g.modifier}` : g.modifier < 0 ? ` - ${Math.abs(g.modifier)}` : ''}:
                    </span>
                    <span className="font-mono text-neutral-500 text-[11px]">
                      [{g.rolls.join(', ')}]
                      {g.modifier !== 0 && <span className="font-semibold text-neutral-700 ml-1">{formatMod(g.modifier)}</span>}
                    </span>
                    {g.hasCrit20 && <span className="text-[9px] bg-amber-400 text-amber-950 px-1.5 rounded-full font-bold">NAT 20</span>}
                    {g.hasFumble1 && <span className="text-[9px] bg-rose-500 text-white px-1.5 rounded-full font-bold">NAT 1</span>}
                  </div>
                  <span className="font-mono font-bold text-sm text-neutral-900">{g.subtotal}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-neutral-200 flex items-baseline justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Grand Total:</span>
              <span className="text-3xl font-black font-mono text-black">{lastRoll.grandTotal}</span>
            </div>
          </div>
        )}

        {/* History */}
        {olderRolls.length > 0 && (
          <div className="pt-1">
            <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">History</div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {olderRolls.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-neutral-50 border border-neutral-100 text-xs hover:bg-neutral-100 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-bold text-neutral-900 w-8 shrink-0">{h.grandTotal}</span>
                    <span className="text-neutral-500 font-mono text-[11px] truncate max-w-[220px]">{h.formula}</span>
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono shrink-0">{h.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </WindowFrame>
  );
});
