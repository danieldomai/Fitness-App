interface LevelSegment {
  label: string;
  min: number;
  max: number;
}

const LEVEL_COLORS: Record<string, string> = {
  Elite: 'bg-emerald-500',
  Competitive: 'bg-sky-500',
  Average: 'bg-amber-500',
  Beginner: 'bg-rose-400',
};

const LEVEL_TEXT_COLORS: Record<string, string> = {
  Elite: 'text-emerald-400',
  Competitive: 'text-sky-400',
  Average: 'text-amber-400',
  Beginner: 'text-rose-300',
};

interface Props {
  levels: LevelSegment[];
  sliderMin: number;
  sliderMax: number;
}

export default function LevelTimeline({ levels, sliderMin, sliderMax }: Props) {
  const range = sliderMax - sliderMin;
  if (range <= 0) return null;

  return (
    <div className="w-full space-y-1">
      <div className="flex w-full">
        {levels.map((level) => {
          const clampedMin = Math.max(level.min, sliderMin);
          const clampedMax = Math.min(level.max, sliderMax);
          const width = ((clampedMax - clampedMin) / range) * 100;
          if (width <= 0) return null;
          return (
            <div key={level.label} style={{ width: `${width}%` }} className="text-center">
              <span className={`text-[10px] font-semibold uppercase tracking-wide ${LEVEL_TEXT_COLORS[level.label] || 'text-gray-500'}`}>
                {level.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex w-full rounded-full overflow-hidden h-2 bg-white/[0.03] gap-px">
        {levels.map((level) => {
          const clampedMin = Math.max(level.min, sliderMin);
          const clampedMax = Math.min(level.max, sliderMax);
          const width = ((clampedMax - clampedMin) / range) * 100;
          if (width <= 0) return null;
          const color = LEVEL_COLORS[level.label] || 'bg-white/10';
          return (
            <div
              key={level.label}
              className={color}
              style={{ width: `${width}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}

export type { LevelSegment };
