import { RACES } from '../constants';
import type { RaceId } from '../types';

interface Props {
  activeRace: RaceId;
  onSelect: (id: RaceId) => void;
  onHome: () => void;
}

export default function NavBar({ activeRace, onSelect, onHome }: Props) {
  return (
    <nav className="sticky top-0 z-10 bg-[#0E0E0E]/90 backdrop-blur-lg border-b border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center gap-1 overflow-x-auto py-2 -mb-px">
          <button
            onClick={onHome}
            className="whitespace-nowrap px-4 py-2 rounded text-sm font-medium transition-colors text-gray-500 hover:text-white hover:bg-white/[0.04]"
          >
            Home
          </button>
          <div className="w-px h-5 bg-white/[0.08] mx-1" />
          {RACES.filter((r) => r.category === 'race').map((race) => (
            <button
              key={race.id}
              onClick={() => onSelect(race.id)}
              className={`whitespace-nowrap px-4 py-2 rounded text-sm font-medium transition-all ${
                activeRace === race.id
                  ? 'bg-[#CCF472] text-[#0E0E0E] font-bold'
                  : 'text-gray-500 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {race.name}
            </button>
          ))}
          <div className="w-px h-5 bg-white/[0.08] mx-1" />
          {RACES.filter((r) => r.category === 'workout').map((race) => (
            <button
              key={race.id}
              onClick={() => onSelect(race.id)}
              className={`whitespace-nowrap px-4 py-2 rounded text-sm font-medium transition-all ${
                activeRace === race.id
                  ? 'bg-[#CCF472] text-[#0E0E0E] font-bold'
                  : 'text-gray-500 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {race.name}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
