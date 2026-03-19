import { useState } from 'react';
import type { RaceId } from './types';
import { loadFromStorage, saveToStorage } from './utils';
import NavBar from './components/NavBar';
import HomePage from './components/HomePage';
import BreakdownPage from './components/BreakdownPage';
import RunRaceDashboard from './components/RunRaceDashboard';
import HyroxDashboard from './components/HyroxDashboard';
import TriathlonDashboard from './components/TriathlonDashboard';
import CyclingDashboard from './components/CyclingDashboard';
import GenericWorkoutDashboard from './components/GenericWorkoutDashboard';

type View = 'home' | 'breakdown' | 'race';

export default function App() {
  const [activeRace, setActiveRace] = useState<RaceId | null>(() =>
    loadFromStorage<RaceId | null>('active-race', null)
  );
  const [view, setView] = useState<View>(() => activeRace ? 'race' : 'home');

  const handleRaceSelect = (id: RaceId) => {
    setActiveRace(id);
    setView('race');
    saveToStorage('active-race', id);
  };

  const handleHome = () => {
    setActiveRace(null);
    setView('home');
    saveToStorage('active-race', null);
  };

  const handleBreakdown = () => {
    setView('breakdown');
  };

  const handleBreakdownBack = () => {
    if (activeRace) {
      setView('race');
    } else {
      setView('home');
    }
  };

  return (
    <div className="min-h-screen bg-[#0E0E0E] text-gray-200 relative">
      {view === 'race' && activeRace && (
        <NavBar activeRace={activeRace} onSelect={handleRaceSelect} onHome={handleHome} />
      )}

      {view === 'home' && <HomePage onSelect={handleRaceSelect} onBreakdown={handleBreakdown} />}
      {view === 'breakdown' && <BreakdownPage onBack={handleBreakdownBack} />}

      {view === 'race' && activeRace && (
        <main className="max-w-4xl mx-auto px-4 py-6">
          {(activeRace === 'half-marathon' || activeRace === 'marathon') && (
            <RunRaceDashboard key={activeRace} raceId={activeRace} />
          )}
          {activeRace === 'hyrox' && <HyroxDashboard />}
          {(activeRace === 'ironman-70.3' || activeRace === 'ironman-140.6') && (
            <TriathlonDashboard key={activeRace} raceId={activeRace} />
          )}
          {activeRace === 'cycling' && <CyclingDashboard />}
          {(activeRace === 'running' || activeRace === 'swimming' || activeRace === 'climbing' || activeRace === 'surfing' || activeRace === 'snowboarding') && (
            <GenericWorkoutDashboard key={activeRace} raceId={activeRace} />
          )}
        </main>
      )}
    </div>
  );
}
