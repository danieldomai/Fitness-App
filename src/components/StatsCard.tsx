interface Props {
  label: string;
  value: string;
  color?: string;
}

export default function StatsCard({ label, value, color }: Props) {
  return (
    <div className="glass p-4 flex flex-col gap-1">
      <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{label}</span>
      <span className={`text-lg font-semibold ${color || 'text-white'}`}>{value}</span>
    </div>
  );
}
