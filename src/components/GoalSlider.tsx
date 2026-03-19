import { formatTime, formatPace } from '../utils';
import LevelTimeline from './LevelTimeline';
import type { LevelSegment } from './LevelTimeline';

interface Props {
  value: number;
  min: number;
  max: number;
  wrSeconds: number;
  cutoffSeconds: number;
  distanceMiles: number;
  levels?: LevelSegment[];
  onChange: (val: number) => void;
}

export default function GoalSlider({ value, min, max, wrSeconds, cutoffSeconds, distanceMiles, levels, onChange }: Props) {
  const progress = ((value - wrSeconds) / (cutoffSeconds - wrSeconds)) * 100;
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const gapToWR = value - wrSeconds;
  const gapToCutoff = cutoffSeconds - value;

  return (
    <div className="glass p-6 space-y-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Goal Time Calculator</h3>

      {levels && <LevelTimeline levels={levels} sliderMin={min} sliderMax={max} />}

      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Goal Time</div>
          <div className="text-xl font-bold text-[#CCF472]">{formatTime(value)}</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Avg Pace</div>
          <div className="text-lg font-semibold text-white">{formatPace(value, distanceMiles)}</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Gap to WR</div>
          <div className="text-lg font-semibold text-gray-400">+{formatTime(gapToWR)}</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Gap to Cutoff</div>
          <div className="text-lg font-semibold text-gray-400">-{formatTime(gapToCutoff)}</div>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-gray-600 uppercase tracking-wider">
          <span>WR ({formatTime(wrSeconds)})</span>
          <span>Cutoff ({formatTime(cutoffSeconds)})</span>
        </div>
        <div className="w-full bg-white/[0.06] rounded-full h-2 relative overflow-hidden">
          <div
            className="h-full rounded-full bg-[#CCF472] transition-all"
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
