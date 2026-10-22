import { memo } from 'react';
import { Check } from 'lucide-react';
import { formatProgressUnitLabel, percentOf } from './logic';
import type { TrackedEvent } from './types';

interface ProgressDisplayProps {
  event: TrackedEvent;
  unit: string;
  isDark: boolean;
  onStepClick: (stepIndex: number) => void;
}

const RING_CIRCUMFERENCE = 88; // 2πr for r = 14

/** The five selectable progress visualizations. */
export const ProgressDisplay = memo(function ProgressDisplay({ event, unit, isDark, onStepClick }: ProgressDisplayProps) {
  const percent = percentOf(event);
  const fill = event.iconColor || (isDark ? '#FFFFFF' : '#171717');
  const steps = Array.from({ length: event.totalSteps }, (_, i) => i);
  const muted = isDark ? 'text-neutral-400' : 'text-neutral-500';

  switch (event.progressStyle) {
    case 'segmented-blocks': {
      const thresholdSteps = new Set(event.thresholds.map((t) => t.step));
      return (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-1">
            {steps.map((stepIdx) => {
              const isChecked = stepIdx < event.currentStep;
              const isThresholdStep = thresholdSteps.has(stepIdx + 1);
              return (
                <button
                  key={stepIdx}
                  onClick={() => onStepClick(stepIdx)}
                  className={`relative w-5 sm:w-6 h-5 sm:h-6 rounded-md flex items-center justify-center font-mono text-[9px] sm:text-[10px] font-bold transition-all shadow-2xs ${
                    isChecked
                      ? 'ring-1 ring-black/40'
                      : isDark
                      ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 border border-neutral-700'
                      : 'bg-white text-neutral-400 hover:bg-neutral-100 border border-neutral-300'
                  }`}
                  style={isChecked ? { backgroundColor: fill, color: '#FFFFFF' } : undefined}
                  title={`${formatProgressUnitLabel(stepIdx + 1, unit)} ${stepIdx + 1} of ${event.totalSteps} ${unit} (Click to set)${
                    isThresholdStep ? ' [Threshold Milestone]' : ''
                  }`}
                >
                  {stepIdx + 1}
                  {isThresholdStep && isChecked && (
                    <span
                      className="absolute -top-1.5 -right-1 w-3.5 h-3.5 rounded-full bg-red-600 text-white text-[8px] font-black flex items-center justify-center shadow-xs z-10"
                      title="Threshold reached today!"
                    >
                      !
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className={`text-[10px] font-mono tracking-wider pt-0.5 opacity-60 ${muted}`}>
            Matrix: {event.currentStep} {unit} filled / {event.totalSteps - event.currentStep} remaining
          </div>
        </div>
      );
    }

    case 'smooth-linear':
      return (
        <div className="space-y-1.5">
          <div
            className={`w-full h-3.5 rounded-full overflow-hidden p-0.5 border ${
              isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-neutral-200/90 border-neutral-300'
            }`}
          >
            <div
              className="h-full rounded-full transition-all duration-300 shadow-xs"
              style={{ width: `${percent}%`, backgroundColor: fill }}
            />
          </div>
          <div className={`flex justify-between text-[10px] font-mono ${muted}`}>
            <span>0 {unit}</span>
            <span>{percent}% Completed</span>
            <span>
              {event.totalSteps} {unit}
            </span>
          </div>
        </div>
      );

    case 'segmented-pips':
      return (
        <div className="flex items-center gap-1.5 py-1">
          {steps.map((stepIdx) => {
            const isChecked = stepIdx < event.currentStep;
            return (
              <button
                key={stepIdx}
                onClick={() => onStepClick(stepIdx)}
                className={`h-3.5 flex-1 rounded-sm transition-all ${
                  isChecked
                    ? 'shadow-xs scale-102'
                    : isDark
                    ? 'bg-neutral-800 border border-neutral-700 hover:bg-neutral-700'
                    : 'bg-neutral-200/80 hover:bg-neutral-300'
                }`}
                style={isChecked ? { backgroundColor: fill } : undefined}
                title={`${formatProgressUnitLabel(stepIdx + 1, unit)} ${stepIdx + 1}/${event.totalSteps} ${unit}`}
                aria-label={`Set progress to ${stepIdx + 1}`}
              />
            );
          })}
        </div>
      );

    case 'circular-ring':
      return (
        <div className="flex items-center gap-4 py-1">
          <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36" aria-hidden>
              <circle cx="18" cy="18" r="14" fill="none" stroke={isDark ? '#404040' : '#E5E7EB'} strokeWidth="3.5" />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke={fill}
                strokeWidth="3.5"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * percent) / 100}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            </svg>
            <span className="absolute font-mono text-xs font-bold">{percent}%</span>
          </div>
          <div className="flex-1 text-xs">
            <div className="font-semibold">
              {event.currentStep} of {event.totalSteps} {unit} logged
            </div>
            <div className={`text-[11px] mt-0.5 ${muted}`}>Radial progress gauge meter</div>
          </div>
        </div>
      );

    case 'milestone-nodes':
      return (
        <div className="flex items-center justify-between relative px-2 py-2">
          <div
            className={`absolute left-3 right-3 top-1/2 -translate-y-1/2 h-1 -z-0 rounded ${
              isDark ? 'bg-neutral-800' : 'bg-neutral-200'
            }`}
          >
            <div className="h-full rounded transition-all duration-300" style={{ width: `${percent}%`, backgroundColor: fill }} />
          </div>
          {steps.map((stepIdx) => {
            const isReached = stepIdx < event.currentStep;
            const isCurrent = stepIdx === event.currentStep;
            return (
              <button
                key={stepIdx}
                onClick={() => onStepClick(stepIdx)}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold z-10 transition-transform ${
                  isReached
                    ? 'text-white shadow-xs scale-105'
                    : isCurrent
                    ? 'ring-2 ring-black bg-white text-black font-extrabold'
                    : isDark
                    ? 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                    : 'bg-white text-neutral-400 border border-neutral-300'
                }`}
                style={isReached ? { backgroundColor: fill } : undefined}
                title={`Milestone ${stepIdx + 1} ${unit}`}
              >
                {isReached ? <Check className="w-3 h-3 stroke-[3]" /> : stepIdx + 1}
              </button>
            );
          })}
        </div>
      );

    default:
      return null;
  }
});
