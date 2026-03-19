import { formatTime } from '../utils';

interface Props {
  estimatedSeconds: number;
  raceType: 'run' | 'hyrox' | 'triathlon' | 'cycling';
  distanceMiles?: number;
}

export default function NutritionInsights({ estimatedSeconds, raceType, distanceMiles }: Props) {
  const hours = estimatedSeconds / 3600;

  const carbsPerHour = hours <= 1 ? 30 : hours <= 2.5 ? 50 : hours <= 5 ? 70 : 90;
  const totalCarbs = Math.round(carbsPerHour * hours);

  const sodiumPerHour = hours <= 1.5 ? 300 : hours <= 4 ? 500 : 700;
  const totalSodium = Math.round(sodiumPerHour * hours);

  const potassiumPerHour = hours <= 2 ? 100 : 150;
  const totalPotassium = Math.round(potassiumPerHour * hours);

  const fluidPerHour = hours <= 2 ? 500 : 700;
  const totalFluidMl = Math.round(fluidPerHour * hours);
  const totalFluidOz = Math.round(totalFluidMl / 29.574);

  const intensityLabel = hours <= 1.5 ? 'High intensity' : hours <= 3 ? 'Moderate intensity' : 'Endurance pace';

  const tips: string[] = [];

  if (raceType === 'run' || raceType === 'hyrox') {
    if (hours < 1) {
      tips.push('For efforts under 1 hour, water alone is usually sufficient. A small gel at 45 min can help.');
    } else if (hours < 2.5) {
      tips.push('Take a gel or chews every 30-45 minutes. Practice in training to avoid GI issues.');
    } else {
      tips.push('Use a mix of glucose + fructose sources for optimal absorption at higher carb rates.');
      tips.push('Start fueling early (within first 30 min) - don\'t wait until you feel depleted.');
    }
  }

  if (raceType === 'triathlon') {
    tips.push('Front-load nutrition on the bike - it\'s harder to fuel while running.');
    tips.push('Use liquid calories on the swim-to-bike transition to get fueling started early.');
    if (hours > 5) {
      tips.push('Consider solid foods on the bike (bars, rice cakes) and switch to gels/liquids on the run.');
    }
  }

  if (raceType === 'cycling') {
    if (hours > 2) {
      tips.push('Eat real food (bars, rice cakes, bananas) for rides over 2 hours in addition to gels.');
    }
    tips.push('Aim to drink every 15-20 minutes rather than waiting until thirsty.');
  }

  if (raceType === 'hyrox') {
    tips.push('Hydrate between stations. Sip electrolyte drinks during run segments.');
    tips.push('Avoid heavy solid food - stick to gels, chews, or liquid carbs mid-race.');
  }

  if (hours > 3) {
    tips.push('Add electrolyte salt tabs if you\'re a heavy sweater or racing in heat (up to 1,000mg Na/hr).');
  }

  const nutrients = [
    {
      label: 'Carbohydrates',
      perHour: `${carbsPerHour}g/hr`,
      total: `${totalCarbs}g total`,
      sources: 'Gels, chews, sports drink, bananas, rice cakes',
    },
    {
      label: 'Sodium',
      perHour: `${sodiumPerHour}mg/hr`,
      total: `${totalSodium}mg total`,
      sources: 'Electrolyte tabs, sports drink, salt packets, pretzels',
    },
    {
      label: 'Potassium',
      perHour: `${potassiumPerHour}mg/hr`,
      total: `${totalPotassium}mg total`,
      sources: 'Bananas, coconut water, electrolyte mix, potatoes',
    },
    {
      label: 'Fluid',
      perHour: `${fluidPerHour}ml/hr`,
      total: `${totalFluidOz} oz (${(totalFluidMl / 1000).toFixed(1)}L)`,
      sources: 'Water, electrolyte drink, diluted juice',
    },
  ];

  return (
    <div className="glass p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Race Day Nutrition</h3>
        <div className="text-xs text-gray-600">
          Based on {formatTime(estimatedSeconds)} estimated time
          {distanceMiles ? ` / ${distanceMiles} mi` : ''}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2.5 py-1 rounded-md bg-white/[0.04] text-gray-500 border border-white/[0.06]">{intensityLabel}</span>
        <span className="px-2.5 py-1 rounded-md bg-white/[0.04] text-gray-500 border border-white/[0.06]">{hours.toFixed(1)} hrs</span>
        <span className="px-2.5 py-1 rounded-md bg-white/[0.04] text-gray-500 border border-white/[0.06]">{carbsPerHour}g carbs/hr</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {nutrients.map((n) => (
          <div key={n.label} className="bg-white/[0.02] border border-white/[0.06] rounded p-4 space-y-2">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{n.label}</div>
            <div className="flex items-baseline gap-3">
              <span className="text-lg font-bold text-white">{n.perHour}</span>
              <span className="text-xs text-gray-500">{n.total}</span>
            </div>
            <p className="text-xs text-gray-600">{n.sources}</p>
          </div>
        ))}
      </div>

      {tips.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Tips</h4>
          <ul className="space-y-1.5">
            {tips.map((tip, i) => (
              <li key={i} className="text-sm text-gray-500 flex gap-2">
                <span className="text-gray-600 shrink-0">-</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
