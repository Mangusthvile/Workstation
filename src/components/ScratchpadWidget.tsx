import { memo } from 'react';
import { Check, Copy } from 'lucide-react';
import { WindowFrame } from './window/WindowFrame';
import { STORAGE_KEYS, readText, writeText } from '../lib/storage';
import { copyText } from '../lib/browser';
import { usePersistentState, useTransientValue } from '../lib/hooks';
import type { DesktopWidgetProps } from './desktop/types';

const DEFAULT_NOTES =
  'Reference Notes:\n• Baseliners: genderless (they/them/name/number)\n• Keep ═════ boxes unbroken\n• Max ~1,000 chars per copy block';

const loadNotes = () => readText(STORAGE_KEYS.scratchpad) ?? DEFAULT_NOTES;
const saveNotes = (text: string) => writeText(STORAGE_KEYS.scratchpad, text);

export const ScratchpadWidget = memo(function ScratchpadWidget(props: DesktopWidgetProps) {
  const [text, setText] = usePersistentState(STORAGE_KEYS.scratchpad, loadNotes, saveNotes);
  const [copied, markCopied] = useTransientValue<boolean>();

  return (
    <WindowFrame
      {...props}
      minWidth={240}
      minHeight={160}
      titleBarHeight="h-9"
      initialRect={() => ({ x: 180, y: 120, width: 360, height: 280 })}
      title={<span>Quick Scratchpad</span>}
      actions={
        <button
          onClick={async () => (await copyText(text)) && markCopied(true)}
          className="p-1 rounded hover:bg-neutral-200/80 text-neutral-600 text-[11px] flex items-center gap-1"
          title="Copy notes"
          aria-label="Copy notes"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
        </button>
      }
    >
      <div className="p-3 flex-1 flex flex-col">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste temporary text or snippets..."
          className="w-full flex-1 bg-transparent resize-none outline-none text-xs text-neutral-800 leading-relaxed font-mono select-text"
        />
      </div>
    </WindowFrame>
  );
});
