import { useState, useRef, useCallback } from 'react';

interface Props {
  /** Called whenever the value changes – receives formatted "HH:MM:SS:MS" string and total milliseconds */
  onChange: (formatted: string, totalMs: number) => void;
  /** Optional initial value as "HH:MM:SS:MS" string */
  value?: string;
  /** Compact mode for inline / quick-log usage */
  compact?: boolean;
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function pad(n: number, len: number) {
  return String(n).padStart(len, '0');
}

/** Parse a formatted "HH:MM:SS:MS" string into individual parts */
function parseFormatted(s: string): [string, string, string, string] {
  if (!s) return ['', '', '', ''];
  const parts = s.split(':');
  return [parts[0] || '', parts[1] || '', parts[2] || '', parts[3] || ''];
}

export default function TimeInput({ onChange, value = '', compact = false }: Props) {
  const [parts, setParts] = useState<[string, string, string, string]>(() => parseFormatted(value));

  const hRef = useRef<HTMLInputElement>(null);
  const mRef = useRef<HTMLInputElement>(null);
  const sRef = useRef<HTMLInputElement>(null);
  const msRef = useRef<HTMLInputElement>(null);

  const refs = [hRef, mRef, sRef, msRef];
  const maxChars = [3, 2, 2, 2];
  const maxVals = [999, 60, 60, 60];
  const labels = ['HH', 'MM', 'SS', 'MS'];

  const emit = useCallback((newParts: [string, string, string, string]) => {
    const h = parseInt(newParts[0]) || 0;
    const m = parseInt(newParts[1]) || 0;
    const s = parseInt(newParts[2]) || 0;
    const ms = parseInt(newParts[3]) || 0;
    const totalMs = h * 3600000 + m * 60000 + s * 1000 + ms;
    const formatted = `${h}:${pad(m, 2)}:${pad(s, 2)}:${pad(ms, 2)}`;
    onChange(formatted, totalMs);
  }, [onChange]);

  const handleChange = (index: number, raw: string) => {
    // Strip non-digits
    const digits = raw.replace(/\D/g, '');
    const max = maxChars[index];

    // Clamp to max value
    let clamped = digits;
    if (digits.length > 0) {
      const num = clamp(parseInt(digits) || 0, 0, maxVals[index]);
      clamped = String(num);
    }

    const newParts = [...parts] as [string, string, string, string];
    newParts[index] = clamped;
    setParts(newParts);
    emit(newParts);

    // Auto-advance: move to next field when the value is "complete"
    // - If max chars reached, always advance
    // - If single digit typed and no valid two-digit number starts with it, advance early
    //   (e.g. for max 60: typing "7" can only be 7, so advance; typing "6" could be 60, so wait)
    if (index < 3) {
      const num = parseInt(clamped) || 0;
      const maxVal = maxVals[index];
      if (digits.length >= max || (digits.length === 1 && num * 10 > maxVal)) {
        refs[index + 1].current?.focus();
        refs[index + 1].current?.select();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Backspace on empty → go back
    if (e.key === 'Backspace' && parts[index] === '' && index > 0) {
      e.preventDefault();
      refs[index - 1].current?.focus();
    }
    // Arrow keys to navigate
    if (e.key === 'ArrowRight' && index < 3) {
      const input = refs[index].current;
      if (input && input.selectionStart === input.value.length) {
        e.preventDefault();
        refs[index + 1].current?.focus();
        refs[index + 1].current?.select();
      }
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      const input = refs[index].current;
      if (input && input.selectionStart === 0) {
        e.preventDefault();
        refs[index - 1].current?.focus();
      }
    }
    // Tab is natural, let it flow
  };

  const handleBlur = (index: number) => {
    // Clamp on blur but do NOT pad with leading zeros — padding caused
    // maxLength to block further typing (e.g. "3" → "03" → can't type "33").
    // The emit() function already pads the formatted output string.
    const val = parts[index];
    if (val === '') return;
    const num = clamp(parseInt(val) || 0, 0, maxVals[index]);
    const newParts = [...parts] as [string, string, string, string];
    newParts[index] = String(num);
    setParts(newParts);
    emit(newParts);
  };

  const inputSize = compact ? 'w-10 px-1.5 py-1 text-xs' : 'w-14 px-2 py-1.5 text-sm';
  const separatorSize = compact ? 'text-xs' : 'text-sm';
  const labelSize = compact ? 'text-[8px]' : 'text-[9px]';

  return (
    <div className="flex items-end gap-0.5">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-end gap-0.5">
          <div className="flex flex-col items-center">
            <span className={`${labelSize} text-gray-600 uppercase tracking-wider mb-0.5 select-none`}>
              {labels[i]}
            </span>
            <input
              ref={refs[i]}
              type="text"
              inputMode="numeric"
              maxLength={maxChars[i]}
              placeholder={labels[i]}
              value={parts[i]}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onBlur={() => handleBlur(i)}
              onFocus={(e) => e.target.select()}
              className={`${inputSize} glass-input text-center tabular-nums font-mono`}
            />
          </div>
          {i < 3 && (
            <span className={`${separatorSize} text-gray-600 font-bold pb-1.5 select-none`}>:</span>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Convert a "HH:MM:SS:MS" string to total seconds (for backward compat with existing time storage).
 * Milliseconds are rounded.
 */
export function timeInputToSeconds(formatted: string): number {
  if (!formatted) return 0;
  const parts = formatted.split(':').map(Number);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  const s = parts[2] || 0;
  const ms = parts[3] || 0;
  return h * 3600 + m * 60 + s + Math.round(ms / 1000);
}

/**
 * Convert total seconds to "H:MM:SS:00" formatted string (for initializing from existing data).
 */
export function secondsToTimeInput(totalSeconds: number): string {
  if (totalSeconds <= 0) return '';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}:${pad(m, 2)}:${pad(s, 2)}:00`;
}
