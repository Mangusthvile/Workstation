import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Minus,
  Maximize2,
  Dices,
  RotateCcw,
  Copy,
  Check,
  Plus,
  Trash2,
  Sparkles,
  Tag,
  Swords,
  Shield,
} from 'lucide-react';

type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export interface DiceGroup {
  id: string;
  count: number;
  sides: number;
  modifier: number; // Dedicated modifier for THIS die!
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

interface DiceRollerWidgetProps {
  isMinimized: boolean;
  zIndex: number;
  onFocus: () => void;
  onMinimize: () => void;
  onClose: () => void;
}

const COMMON_DICE = [4, 6, 8, 10, 12, 20, 100];

export const DiceRollerWidget: React.FC<DiceRollerWidgetProps> = ({
  isMinimized,
  zIndex,
  onFocus,
  onMinimize,
  onClose,
}) => {
  // Window rect & states
  const [rect, setRect] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 140,
    y: 80,
    width: 520,
    height: 560,
  });

  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Dice groups: each die has count, sides, its OWN modifier, and optional label
  const [diceGroups, setDiceGroups] = useState<DiceGroup[]>(() => {
    try {
      const saved = localStorage.getItem('WORKSTATION_DICE_ROLLER_V1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed?.groups)) return parsed.groups;
      }
    } catch {}
    return [
      { id: '1', count: 1, sides: 20, modifier: 5, label: 'Attack' },
      { id: '2', count: 2, sides: 6, modifier: 3, label: 'Damage' },
    ];
  });

  const [customSides, setCustomSides] = useState<string>('');

  // History & Last Result
  const [history, setHistory] = useState<RollHistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem('WORKSTATION_DICE_ROLLER_V1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed?.history)) return parsed.history;
      }
    } catch {}
    return [];
  });
  const [lastRoll, setLastRoll] = useState<RollHistoryEntry | null>(null);

  // Sync dice state to storage
  useEffect(() => {
    try {
      localStorage.setItem(
        'WORKSTATION_DICE_ROLLER_V1',
        JSON.stringify({ groups: diceGroups, history })
      );
    } catch {}
  }, [diceGroups, history]);

  // Listen for workstation-wide load progress events
  useEffect(() => {
    const handleReload = () => {
      try {
        const saved = localStorage.getItem('WORKSTATION_DICE_ROLLER_V1');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed?.groups)) setDiceGroups(parsed.groups);
          if (Array.isArray(parsed?.history)) setHistory(parsed.history);
        }
      } catch {}
    };
    window.addEventListener('workstation-progress-loaded', handleReload);
    return () => window.removeEventListener('workstation-progress-loaded', handleReload);
  }, []);

  const dragStartRef = useRef<{ startX: number; startY: number; origX: number; origY: number }>({
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });

  const resizeRef = useRef<{
    dir: ResizeDir;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  }>({
    dir: 'se',
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
    origW: 0,
    origH: 0,
  });

  // Dragging handlers
  const handleDragDown = (e: React.PointerEvent) => {
    if (isFullScreen) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;
    e.preventDefault();
    onFocus();
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.x,
      origY: rect.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    setRect((r) => ({
      ...r,
      x: Math.max(0, Math.min(window.innerWidth - 120, dragStartRef.current.origX + dx)),
      y: Math.max(28, Math.min(window.innerHeight - 80, dragStartRef.current.origY + dy)),
    }));
  };

  const handleDragUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Resizing handlers
  const handleResizeDown = (dir: ResizeDir, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isFullScreen) return;
    onFocus();
    setIsResizing(true);
    resizeRef.current = {
      dir,
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.x,
      origY: rect.y,
      origW: rect.width,
      origH: rect.height,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleResizeMove = (e: React.PointerEvent) => {
    if (!isResizing) return;
    const { dir, startX, startY, origX, origY, origW, origH } = resizeRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    const minW = 360;
    const minH = 400;

    let newX = origX;
    let newY = origY;
    let newW = origW;
    let newH = origH;

    if (dir.includes('e')) newW = Math.max(minW, origW + dx);
    if (dir.includes('s')) newH = Math.max(minH, origH + dy);
    if (dir.includes('w')) {
      const pw = origW - dx;
      if (pw >= minW) {
        newW = pw;
        newX = origX + dx;
      }
    }
    if (dir.includes('n')) {
      const ph = origH - dy;
      if (ph >= minH) {
        newH = ph;
        newY = origY + dy;
      }
    }

    setRect({ x: newX, y: newY, width: newW, height: newH });
  };

  const handleResizeUp = (e: React.PointerEvent) => {
    if (isResizing) {
      setIsResizing(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Add a new die group with default 0 modifier
  const addNewDiceGroup = (sides: number) => {
    setDiceGroups((prev) => [
      ...prev,
      {
        id: Date.now().toString() + Math.random().toString().slice(2, 5),
        count: 1,
        sides,
        modifier: 0,
        label: '',
      },
    ]);
  };

  // Update specific group field (count, modifier, label)
  const updateGroup = (id: string, updates: Partial<DiceGroup>) => {
    setDiceGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...updates } : g))
    );
  };

  // Remove a die group
  const removeGroup = (id: string) => {
    setDiceGroups((prev) => prev.filter((g) => g.id !== id));
  };

  // Clear all dice
  const clearAll = () => {
    setDiceGroups([]);
  };

  // Presets
  const applyPreset = (preset: 'attack-damage' | 'advantage' | 'stats') => {
    if (preset === 'attack-damage') {
      setDiceGroups([
        { id: '1', count: 1, sides: 20, modifier: 6, label: 'Attack' },
        { id: '2', count: 2, sides: 6, modifier: 4, label: 'Damage' },
      ]);
    } else if (preset === 'advantage') {
      setDiceGroups([
        { id: '1', count: 1, sides: 20, modifier: 5, label: 'Roll A' },
        { id: '2', count: 1, sides: 20, modifier: 5, label: 'Roll B' },
      ]);
    } else if (preset === 'stats') {
      setDiceGroups([
        { id: '1', count: 1, sides: 20, modifier: 3, label: 'Check' },
        { id: '2', count: 1, sides: 4, modifier: 0, label: 'Bless (d4)' },
        { id: '3', count: 1, sides: 8, modifier: 2, label: 'Bonus' },
      ]);
    }
  };

  // Roll All Dice with their respective modifiers
  const rollAllDice = () => {
    if (diceGroups.length === 0) return;

    setIsRolling(true);

    setTimeout(() => {
      let grandTotal = 0;

      const groupResults: GroupRollResult[] = diceGroups.map((group) => {
        const rolls: number[] = [];
        let rollsSum = 0;
        let hasCrit20 = false;
        let hasFumble1 = false;

        for (let i = 0; i < group.count; i++) {
          const val = Math.floor(Math.random() * group.sides) + 1;
          rolls.push(val);
          rollsSum += val;
          if (group.sides === 20 && val === 20) hasCrit20 = true;
          if (group.sides === 20 && val === 1) hasFumble1 = true;
        }

        const subtotal = rollsSum + group.modifier;
        grandTotal += subtotal;

        return {
          groupId: group.id,
          label: group.label,
          sides: group.sides,
          count: group.count,
          rolls,
          rollsSum,
          modifier: group.modifier,
          subtotal,
          hasCrit20,
          hasFumble1,
        };
      });

      // Overall formula string
      const formula = diceGroups
        .map((g) => {
          const base = `${g.count}d${g.sides}`;
          const mod =
            g.modifier > 0 ? `+${g.modifier}` : g.modifier < 0 ? `${g.modifier}` : '';
          const name = g.label ? `[${g.label}] ` : '';
          return `${name}${base}${mod}`;
        })
        .join(' + ');

      const entry: RollHistoryEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        formula,
        groups: groupResults,
        grandTotal,
      };

      setLastRoll(entry);
      setHistory((prev) => [entry, ...prev.slice(0, 19)]);
      setIsRolling(false);
    }, 180);
  };

  const copyResult = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isMinimized) return null;

  return (
    <div
      onPointerDown={onFocus}
      style={
        isFullScreen
          ? {
              position: 'fixed',
              top: '0px',
              left: '0px',
              right: '0px',
              bottom: '0px',
              width: '100vw',
              height: '100vh',
              zIndex: 100,
            }
          : {
              position: 'absolute',
              top: `${rect.y}px`,
              left: `${rect.x}px`,
              width: `${rect.width}px`,
              height: `${rect.height}px`,
              zIndex,
            }
      }
      className={`group flex flex-col bg-white/95 backdrop-blur-2xl border ${
        isFullScreen ? 'border-none rounded-none' : 'border-neutral-300/80 rounded-2xl shadow-2xl'
      } transition-shadow select-none ${
        isDragging || isResizing ? 'ring-2 ring-neutral-400/40 shadow-2xl' : ''
      }`}
    >
      {/* Edge & Corner Resizing handles */}
      {!isFullScreen && (
        <>
          <div onPointerDown={(e) => handleResizeDown('n', e)} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} className="absolute -top-1 left-2 right-2 h-2.5 cursor-ns-resize z-50" />
          <div onPointerDown={(e) => handleResizeDown('s', e)} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} className="absolute -bottom-1 left-2 right-2 h-2.5 cursor-ns-resize z-50" />
          <div onPointerDown={(e) => handleResizeDown('w', e)} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} className="absolute top-2 bottom-2 -left-1 w-2.5 cursor-ew-resize z-50" />
          <div onPointerDown={(e) => handleResizeDown('e', e)} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} className="absolute top-2 bottom-2 -right-1 w-2.5 cursor-ew-resize z-50" />
          <div onPointerDown={(e) => handleResizeDown('nw', e)} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} className="absolute -top-1.5 -left-1.5 w-3 h-3 cursor-nwse-resize z-50" />
          <div onPointerDown={(e) => handleResizeDown('ne', e)} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} className="absolute -top-1.5 -right-1.5 w-3 h-3 cursor-nesw-resize z-50" />
          <div onPointerDown={(e) => handleResizeDown('sw', e)} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} className="absolute -bottom-1.5 -left-1.5 w-3 h-3 cursor-nesw-resize z-50" />
          <div onPointerDown={(e) => handleResizeDown('se', e)} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} className="absolute -bottom-1.5 -right-1.5 w-3 h-3 cursor-nwse-resize z-50" />
        </>
      )}

      {/* Titlebar with Traffic Lights */}
      <div
        onPointerDown={handleDragDown}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragUp}
        className={`h-10 px-3 bg-neutral-100/90 border-b border-neutral-200/90 ${
          isFullScreen ? 'rounded-none' : 'rounded-t-2xl'
        } flex items-center justify-between cursor-grab active:cursor-grabbing shrink-0`}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-600 border border-rose-600/30 flex items-center justify-center text-rose-950 group"
            title="Close"
          >
            <X className="w-2 h-2 opacity-0 group-hover:opacity-100 font-bold" />
          </button>
          <button
            onClick={onMinimize}
            className="w-3 h-3 rounded-full bg-amber-400 hover:bg-amber-500 border border-amber-500/30 flex items-center justify-center text-amber-950 group"
            title="Minimize"
          >
            <Minus className="w-2 h-2 opacity-0 group-hover:opacity-100 font-bold" />
          </button>
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="w-3 h-3 rounded-full bg-emerald-500 hover:bg-emerald-600 border border-emerald-600/30 flex items-center justify-center text-emerald-950 group"
            title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
          >
            <Maximize2 className="w-2 h-2 opacity-0 group-hover:opacity-100 font-bold" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800">
          <Dices className="w-3.5 h-3.5" />
          <span>Multi-Dice Roller</span>
          {isFullScreen && (
            <span className="px-1.5 py-0.2 rounded bg-neutral-900 text-white text-[10px] font-normal">
              Full Screen
            </span>
          )}
        </div>

        <button
          onClick={clearAll}
          className="p-1 rounded-md hover:bg-neutral-200 text-neutral-500 hover:text-black text-[11px] flex items-center gap-1"
          title="Clear all dice"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      {/* Widget Content Area */}
      <div className="p-3.5 sm:p-4 overflow-y-auto flex-1 flex flex-col space-y-3.5">
        {/* Quick Add Die Type Palette */}
        <div>
          <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Add Dice</span>
            <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-normal">
              <button
                onClick={() => applyPreset('attack-damage')}
                className="hover:text-black underline"
              >
                Atk+Dmg
              </button>
              <span>•</span>
              <button
                onClick={() => applyPreset('advantage')}
                className="hover:text-black underline"
              >
                Advantage
              </button>
              <span>•</span>
              <button
                onClick={() => applyPreset('stats')}
                className="hover:text-black underline"
              >
                Check+Bless
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {COMMON_DICE.map((sides) => (
              <button
                key={sides}
                onClick={() => addNewDiceGroup(sides)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-200 shadow-2xs text-xs font-semibold transition-all hover:scale-105 active:scale-95"
                title={`Add a d${sides}`}
              >
                <Plus className="w-2.5 h-2.5 text-neutral-400" />
                <span>d{sides}</span>
              </button>
            ))}

            {/* Custom die */}
            <div className="flex items-center border border-neutral-200 rounded-xl bg-white px-2 py-0.5 shadow-2xs">
              <span className="text-xs text-neutral-400 font-mono">d</span>
              <input
                type="number"
                min="2"
                max="1000"
                placeholder="X"
                value={customSides}
                onChange={(e) => setCustomSides(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customSides) {
                    const s = parseInt(customSides, 10);
                    if (s > 1) addNewDiceGroup(s);
                    setCustomSides('');
                  }
                }}
                className="w-9 text-xs bg-transparent outline-none font-mono text-center"
              />
              <button
                onClick={() => {
                  if (customSides) {
                    const s = parseInt(customSides, 10);
                    if (s > 1) addNewDiceGroup(s);
                    setCustomSides('');
                  }
                }}
                className="text-xs font-bold text-neutral-700 hover:text-black px-0.5"
                title="Add custom die"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Active Dice Groups - EACH WITH ITS OWN MODIFIER! */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-neutral-700 flex items-center justify-between">
            <span>Configured Dice ({diceGroups.length})</span>
            <span className="text-[10px] text-neutral-400">
              Each die can have a different modifier & label
            </span>
          </div>

          {diceGroups.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-neutral-300 text-center text-xs text-neutral-400">
              No dice added. Click any die above (like d20 or d6) to add!
            </div>
          ) : (
            <div className="space-y-2">
              {diceGroups.map((group, idx) => (
                <div
                  key={group.id}
                  className="bg-white border border-neutral-200 rounded-xl p-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 hover:border-neutral-300 transition-all"
                >
                  {/* Left: Die type, count controls & label */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-neutral-400 font-bold w-4">
                      #{idx + 1}
                    </span>

                    {/* Count controls */}
                    <div className="flex items-center bg-neutral-100 rounded-lg p-0.5">
                      <button
                        onClick={() =>
                          updateGroup(group.id, { count: Math.max(1, group.count - 1) })
                        }
                        className="w-5 h-5 rounded hover:bg-neutral-200 flex items-center justify-center font-bold text-neutral-700 text-xs"
                      >
                        -
                      </button>
                      <span className="w-5 text-center font-mono font-bold text-xs">
                        {group.count}
                      </span>
                      <button
                        onClick={() => updateGroup(group.id, { count: group.count + 1 })}
                        className="w-5 h-5 rounded hover:bg-neutral-200 flex items-center justify-center font-bold text-neutral-700 text-xs"
                      >
                        +
                      </button>
                    </div>

                    {/* Die Pill */}
                    <span className="px-2 py-0.5 rounded-md bg-black text-white font-mono font-bold text-xs shadow-2xs">
                      d{group.sides}
                    </span>

                    {/* Optional Label (e.g. "Attack", "Damage") */}
                    <input
                      type="text"
                      placeholder="Label (optional)"
                      value={group.label}
                      onChange={(e) => updateGroup(group.id, { label: e.target.value })}
                      className="w-24 sm:w-28 text-xs bg-neutral-50 px-2 py-1 rounded-md border border-neutral-200/80 outline-none placeholder:text-neutral-300 focus:bg-white focus:border-black transition-colors"
                    />
                  </div>

                  {/* Right: Individual Modifier (+ / -) & remove */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-[10px] text-neutral-400 font-medium">Mod:</span>
                      <div className="flex items-center bg-neutral-100 rounded-lg p-0.5 border border-neutral-200">
                        <button
                          onClick={() =>
                            updateGroup(group.id, { modifier: group.modifier - 1 })
                          }
                          className="w-5 h-5 rounded hover:bg-neutral-200 flex items-center justify-center font-bold text-neutral-700 text-xs"
                          title="Decrease modifier"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={group.modifier}
                          onChange={(e) =>
                            updateGroup(group.id, {
                              modifier: parseInt(e.target.value, 10) || 0,
                            })
                          }
                          className="w-9 text-center font-mono font-bold text-xs bg-transparent outline-none"
                        />
                        <button
                          onClick={() =>
                            updateGroup(group.id, { modifier: group.modifier + 1 })
                          }
                          className="w-5 h-5 rounded hover:bg-neutral-200 flex items-center justify-center font-bold text-neutral-700 text-xs"
                          title="Increase modifier"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Preview formula for this specific die */}
                    <span className="font-mono text-xs text-neutral-500 font-medium hidden sm:inline">
                      ({group.count}d{group.sides}
                      {group.modifier > 0
                        ? `+${group.modifier}`
                        : group.modifier < 0
                        ? `${group.modifier}`
                        : ''}
                      )
                    </span>

                    {/* Delete group */}
                    <button
                      onClick={() => removeGroup(group.id)}
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

        {/* Big Roll Button */}
        <button
          onClick={rollAllDice}
          disabled={isRolling || diceGroups.length === 0}
          className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all ${
            isRolling || diceGroups.length === 0
              ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
              : 'bg-black text-white hover:bg-neutral-800 active:scale-[0.99]'
          }`}
        >
          <Dices className={`w-4 h-4 ${isRolling ? 'animate-spin' : ''}`} />
          <span>{isRolling ? 'Rolling Dice...' : `Roll All Dice (${diceGroups.length} types)`}</span>
        </button>

        {/* Result Card with Individual Subtotals & Grand Total */}
        {lastRoll && (
          <div className="bg-white border-2 border-neutral-300 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div className="text-xs font-semibold text-neutral-700 flex items-center gap-2">
                <span>Roll Breakdown</span>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {lastRoll.timestamp}
                </span>
              </div>

              <button
                onClick={() =>
                  copyResult(
                    `Dice Roll: ${lastRoll.groups
                      .map(
                        (g) =>
                          `${g.label ? `${g.label} ` : ''}${g.count}d${g.sides}${
                            g.modifier > 0 ? `+${g.modifier}` : g.modifier < 0 ? `${g.modifier}` : ''
                          } = ${g.subtotal} ([${g.rolls.join(', ')}]${
                            g.modifier ? ` mod: ${g.modifier}` : ''
                          })`
                      )
                      .join(' | ')} -> GRAND TOTAL = ${lastRoll.grandTotal}`,
                    lastRoll.id
                  )
                }
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

            {/* Individual Die Results List with their OWN modifiers */}
            <div className="space-y-2">
              {lastRoll.groups.map((g, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 text-xs ${
                    g.hasCrit20
                      ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300'
                      : g.hasFumble1
                      ? 'bg-rose-50/70 border-rose-300'
                      : 'bg-neutral-50/70 border-neutral-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
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
                      {g.modifier !== 0 && (
                        <span className="font-semibold text-neutral-700 ml-1">
                          {g.modifier > 0 ? `+${g.modifier}` : g.modifier}
                        </span>
                      )}
                    </span>

                    {g.hasCrit20 && (
                      <span className="text-[9px] bg-amber-400 text-amber-950 px-1.5 py-0.2 rounded-full font-bold">
                        NAT 20
                      </span>
                    )}
                    {g.hasFumble1 && (
                      <span className="text-[9px] bg-rose-500 text-white px-1.5 py-0.2 rounded-full font-bold">
                        NAT 1
                      </span>
                    )}
                  </div>

                  {/* Group Subtotal */}
                  <div className="text-right">
                    <span className="font-mono font-bold text-sm text-neutral-900">
                      {g.subtotal}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Grand Total */}
            <div className="pt-2 border-t border-neutral-200 flex items-baseline justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Grand Total:
              </span>
              <span className="text-3xl font-black font-mono text-black">
                {lastRoll.grandTotal}
              </span>
            </div>
          </div>
        )}

        {/* Previous Rolls History */}
        {history.length > 1 && (
          <div className="pt-1">
            <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
              History
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {history.slice(1).map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-neutral-50 border border-neutral-100 text-xs hover:bg-neutral-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-neutral-900 w-8">{h.grandTotal}</span>
                    <span className="text-neutral-500 font-mono text-[11px] truncate max-w-[220px]">
                      {h.formula}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono shrink-0">
                    {h.timestamp}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Visible Bottom-Right Resize Grip */}
      {!isFullScreen && (
        <div
          onPointerDown={(e) => handleResizeDown('se', e)}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeUp}
          className="absolute bottom-1 right-1 w-3.5 h-3.5 cursor-nwse-resize flex items-end justify-end p-0.5 text-neutral-400"
        >
          <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor">
            <circle cx="5" cy="5" r="0.8" />
            <circle cx="5" cy="2" r="0.8" />
            <circle cx="2" cy="5" r="0.8" />
          </svg>
        </div>
      )}
    </div>
  );
};
