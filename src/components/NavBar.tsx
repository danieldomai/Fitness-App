import { useState, useRef, useEffect } from 'react';
import { RACES } from '../constants';
import type { RaceId } from '../types';
import { loadFromStorage } from '../utils';

interface Props {
  activeRace: RaceId | null;
  onSelect: (id: RaceId) => void;
  onHome: () => void;
}

export default function NavBar({ activeRace, onSelect, onHome }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownSub, setDropdownSub] = useState<'races' | 'workouts' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navFavorites = loadFromStorage<RaceId[]>('nav-favorites', []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setDropdownSub(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const favoriteRaces = RACES.filter(r => navFavorites.includes(r.id));

  return (
    <nav className="sticky top-0 z-10 bg-[#0E0E0E]/90 backdrop-blur-lg border-b border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center gap-1 py-2 -mb-px">
          <button
            onClick={onHome}
            className={`whitespace-nowrap px-4 py-2 rounded text-sm font-medium transition-colors flex-shrink-0 ${
              activeRace === null
                ? 'bg-[#CCF472] text-[#0E0E0E] font-bold'
                : 'text-gray-500 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            Home
          </button>
          <div className="w-px h-5 bg-white/[0.08] mx-1 flex-shrink-0" />

          {/* Pinned favorites for quick switching */}
          {favoriteRaces.length > 0 ? (
            <>
              <div className="flex items-center gap-1 overflow-x-auto">
                {favoriteRaces.map((race) => (
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
              <div className="w-px h-5 bg-white/[0.08] mx-1 flex-shrink-0" />
            </>
          ) : (
            /* Default: show all races/workouts when no favorites are set */
            <>
              <div className="flex items-center gap-1 overflow-x-auto">
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
                <div className="w-px h-5 bg-white/[0.08] mx-1 flex-shrink-0" />
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
            </>
          )}

          {/* Training dropdown — always visible */}
          <div className="relative ml-auto flex-shrink-0" ref={dropdownRef}>
            <button
              onClick={() => { setDropdownOpen(!dropdownOpen); setDropdownSub(null); }}
              className="glow-btn px-4 py-2 text-sm font-medium flex items-center gap-2"
            >
              <span>Training</span>
              <svg
                className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 glass-elevated rounded overflow-hidden shadow-2xl z-50">
                {dropdownSub === null ? (
                  <>
                    <button
                      onClick={() => setDropdownSub('races')}
                      className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-white/[0.06] transition-colors border-b border-white/[0.04]"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-4.5 h-4.5 text-[#CCF472]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
                        </svg>
                        <div>
                          <div className="text-sm font-medium text-white">Races</div>
                          <div className="text-[10px] text-gray-600">Ironman, Marathon, Hyrox</div>
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDropdownSub('workouts')}
                      className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-white/[0.06] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-4.5 h-4.5 text-[#CCF472]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <div>
                          <div className="text-sm font-medium text-white">Workouts</div>
                          <div className="text-[10px] text-gray-600">Running, Swimming, Cycling & more</div>
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setDropdownSub(null)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-white/[0.06] transition-colors border-b border-white/[0.06]"
                    >
                      <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                        {dropdownSub === 'races' ? 'Races' : 'Workouts'}
                      </span>
                    </button>
                    {RACES.filter((r) => r.category === dropdownSub.slice(0, -1) as 'race' | 'workout').map((race) => (
                      <button
                        key={race.id}
                        onClick={() => { onSelect(race.id); setDropdownOpen(false); setDropdownSub(null); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.06] transition-colors border-b border-white/[0.04] last:border-0 ${
                          activeRace === race.id ? 'bg-[#CCF472]/10' : ''
                        }`}
                      >
                        <span className="text-xs font-bold text-gray-500 w-8">{race.icon}</span>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-white">{race.name}</div>
                          <div className="text-[10px] text-gray-600">{race.description}</div>
                        </div>
                        {activeRace === race.id && (
                          <div className="w-2 h-2 rounded-full bg-[#CCF472] flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
