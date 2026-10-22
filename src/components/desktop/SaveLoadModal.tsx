import React, { useEffect, useMemo, useRef } from 'react';
import { Check, Download, FileJson, FolderDown, Save, Upload, X } from 'lucide-react';
import { readSavedSnapshot, summarizeSnapshot } from './workstationSnapshot';

interface SaveLoadModalProps {
  /** Changes whenever a new checkpoint is saved, so the summary refreshes. */
  saveVersion: number;
  message: string | null;
  onDismissMessage: () => void;
  onClose: () => void;
  onSave: () => void;
  onRestoreSaved: () => void;
  onDownload: () => void;
  onImportFile: (file: File) => void;
}

export const SaveLoadModal: React.FC<SaveLoadModalProps> = ({
  saveVersion,
  message,
  onDismissMessage,
  onClose,
  onSave,
  onRestoreSaved,
  onDownload,
  onImportFile,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parsing the saved checkpoint is not free; do it once per open/save instead of every render.
  const summary = useMemo(() => summarizeSnapshot(readSavedSnapshot()), [saveVersion]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-load-title"
    >
      <div className="bg-white/95 backdrop-blur-2xl border border-neutral-200/90 shadow-2xl rounded-2xl max-w-lg w-full p-5 space-y-4 text-xs text-neutral-800">
        <div className="flex items-start justify-between pb-3 border-b border-neutral-200/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center shadow-2xs">
              <FolderDown className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <h3 id="save-load-title" className="text-sm font-bold text-neutral-900">
                Workstation Save & Load
              </h3>
              <p className="text-[11px] text-neutral-500">
                Preserve, restore, and export progress across all workstation widgets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {message && (
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs flex items-center justify-between">
            <span>{message}</span>
            <button onClick={onDismissMessage} className="text-amber-700 hover:text-black ml-2" aria-label="Dismiss">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Browser checkpoint */}
        <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-neutral-900 text-xs flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5 text-neutral-600" />
              Browser Saved Checkpoint
            </span>
            {summary ? (
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                Saved: {summary.savedAtFormatted}
              </span>
            ) : (
              <span className="text-[10px] text-neutral-400 font-mono">None saved yet</span>
            )}
          </div>

          {summary ? (
            <>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-600">
                <SummaryTile label="World Clock" value={`${summary.eventsCount} events, ${summary.historyCount} completed`} />
                <SummaryTile label="Text Editor" value={`${summary.textChars} characters`} />
                <SummaryTile label="Quick Scratchpad" value={`${summary.scratchpadChars} characters`} />
                <SummaryTile label="Dice Roller" value={`${summary.diceGroupsCount} groups saved`} />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={onRestoreSaved}
                  className="flex-1 py-2 px-3 rounded-xl bg-black hover:bg-neutral-800 text-white font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Restore This Checkpoint</span>
                </button>
                <button
                  onClick={onSave}
                  className="py-2 px-3 rounded-xl bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Overwrite browser checkpoint with current state"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Update Save</span>
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-neutral-500">
                No workstation checkpoint has been saved to your browser yet. Click below to save your current work
                right now.
              </p>
              <button
                onClick={onSave}
                className="w-full py-2 px-3 rounded-xl bg-black hover:bg-neutral-800 text-white font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-emerald-400" />
                <span>Save Current Workstation Now (Ctrl+S)</span>
              </button>
            </div>
          )}
        </div>

        {/* JSON file backup */}
        <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-neutral-900 text-xs flex items-center gap-1.5">
              <FileJson className="w-3.5 h-3.5 text-neutral-600" />
              JSON File Backup & Restore
            </span>
            <span className="text-[10px] text-neutral-400">Offline file</span>
          </div>
          <p className="text-[11px] text-neutral-500 leading-normal">
            Download a file to your device or load an existing backup. Backups preserve all documents, custom
            repeatable events, timeline milestones, scratchpad notes, and dice rolls.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={onDownload}
              className="py-2 px-3 rounded-xl bg-white hover:bg-neutral-100 text-neutral-800 font-semibold text-xs border border-neutral-200 transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Download Backup (.json)</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="py-2 px-3 rounded-xl bg-white hover:bg-neutral-100 text-neutral-800 font-semibold text-xs border border-neutral-200 transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-sky-600" />
              <span>Upload & Load (.json)</span>
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImportFile(file);
              e.target.value = '';
            }}
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-[11px] text-neutral-400">
          <span>
            Tip: Press{' '}
            <kbd className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-300 rounded text-[10px] text-neutral-700 font-mono">
              Ctrl+S
            </kbd>{' '}
            anytime to save
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg text-neutral-600 hover:text-black font-semibold hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const SummaryTile: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="p-2 bg-white rounded-lg border border-neutral-200/60">
    <span className="text-neutral-400 block text-[10px]">{label}</span>
    <span className="font-semibold text-neutral-800">{value}</span>
  </div>
);
