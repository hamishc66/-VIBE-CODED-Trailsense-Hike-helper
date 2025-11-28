
import { ExperienceLevel, UserProfile, TripData, RiskAnalysis, RiskLevel, RiskFactor, WarningChip } from '../types';

export const calculateRiskAnalysis = (
  user: UserProfile, 
  data: TripData, 
  startTime: string
): RiskAnalysis => {
  let score = 0;
  const factors: RiskFactor[] = [];

  // Helper to add factor
  const add = (name: string, points: number, desc: string) => {
    if (points > 0) {
      score += points;
      factors.push({ name, score: points, description: desc });
    }
  };

  // 1. Distance vs Experience
  let distLimit = 5;
  if (user.experience === ExperienceLevel.INTERMEDIATE) distLimit = 12;
  if (user.experience === ExperienceLevel.ADVANCED) distLimit = 20;

  if (data.distanceKm > distLimit * 1.5) {
    add('Distance', 2, `Significantly longer than recommended for ${user.experience} level.`);
  } else if (data.distanceKm > distLimit) {
    add('Distance', 1, `At the upper end of comfort range for ${user.experience}.`);
  }

  // 2. Elevation vs Fitness
  // Rough gains: Low fitness < 300m, Med < 800m, High < 1500m
  let elevLimit = 300;
  if (user.fitness === 'medium') elevLimit = 800;
  if (user.fitness === 'high') elevLimit = 1500;

  if (data.elevationM > elevLimit * 1.5) {
    add('Elevation', 2, 'Very steep climb for current fitness level.');
  } else if (data.elevationM > elevLimit) {
    add('Elevation', 1, 'Significant elevation gain.');
  }

  // 3. Time of Day (Start Time)
  // Assume late start is after 2 PM (14:00)
  const hour = parseInt(startTime.split(':')[0], 10);
  if (hour >= 14) {
    // Higher risk if distance is long
    if (data.distanceKm > 5) {
      add('Timing', 2, 'Late start creates risk of hiking in the dark.');
    } else {
      add('Timing', 1, 'Late start; watch sunset times.');
    }
  }

  // 4. Weather Conditions (Heuristics based on keywords)
  const weather = data.weatherCondition.toLowerCase();
  const temp = data.tempC;

  if (weather.includes('storm') || weather.includes('thunder') || weather.includes('snow') || weather.includes('blizzard')) {
    add('Weather', 2, 'Hazardous weather conditions reported.');
  } else if (weather.includes('rain') || weather.includes('wind') || weather.includes('fog')) {
    add('Weather', 1, 'Weather may make trail slippery or reduce visibility.');
  }

  if (temp > 30) {
    add('Temperature', 2, 'Extreme heat risk. Dehydration danger.');
  } else if (temp > 27) {
    add('Temperature', 1, 'Hot conditions. Extra water required.');
  } else if (temp < 0) {
    add('Temperature', 2, 'Freezing conditions. Hypothermia risk.');
  } else if (temp < 10 && (weather.includes('rain') || weather.includes('wind'))) {
    add('Temperature', 1, 'Cold and wet/windy. Hypothermia risk.');
  }

  // 5. Missing Data Penalty
  if (data.distanceKm === 0 || data.elevationM === 0) {
    add('Uncertainty', 1, 'Missing key trail data increases risk.');
  }

  // Determine Level
  let level: RiskLevel = 'Low';
  let color = 'bg-forest-500'; // Green

  if (score >= 7) {
    level = 'High';
    color = 'bg-red-600';
  } else if (score >= 5) {
    level = 'Elevated';
    color = 'bg-orange-500';
  } else if (score >= 3) {
    level = 'Moderate';
    color = 'bg-amber-400';
  }

  return { level, score, factors, color };
};

// --- NEW UTILITIES ---

export const generateWarnings = (data: TripData, startTime: string): WarningChip[] => {
  const warnings: WarningChip[] = [];
  const temp = data.tempC;
  const weather = data.weatherCondition.toLowerCase();
  const startHour = parseInt(startTime.split(':')[0], 10);

  // Heat
  if (temp >= 30) warnings.push({ type: 'Heat', label: 'Extreme Heat', severity: 'red' });
  else if (temp >= 27) warnings.push({ type: 'Heat', label: 'High Heat', severity: 'orange' });

  // Cold
  if (temp <= 0) warnings.push({ type: 'Cold', label: 'Freezing', severity: 'red' });
  
  // Storm
  if (weather.includes('storm') || weather.includes('thunder')) {
    warnings.push({ type: 'Storm', label: 'Storm Risk', severity: 'red' });
  }

  // Late
  if (startHour >= 14 && data.distanceKm > 5) {
    warnings.push({ type: 'Late', label: 'Late Start', severity: 'orange' });
  }

  // Steep
  // Heuristic: > 50m gain per km is reasonably steep for hiking
  if (data.distanceKm > 0 && (data.elevationM / data.distanceKm) > 60) {
    warnings.push({ type: 'Steep', label: 'Steep Sections', severity: 'yellow' });
  }

  return warnings;
};

export const calculateTurnaroundTime = (data: TripData, startTime: string, fitness: string): string => {
  // Naive pace calc (km/h)
  let speed = 4; // medium
  if (fitness === 'low') speed = 3;
  if (fitness === 'high') speed = 5;

  // Adjust for elevation: -1km/h for every 500m gain roughly
  const elevFactor = data.elevationM / 500;
  speed = Math.max(1, speed - elevFactor * 0.5);

  const durationHours = (data.distanceKm / speed) * 1.1; // +10% buffer
  
  // Halfway point turnaround logic? Or just total time?
  // Let's suggest turning around at half the safe daylight duration available?
  // Simpler: Just calculate expected finish. If it's near sunset, turnaround = sunset - (duration/2).
  // Default: Turnaround is Start + (Duration / 2) + buffer? 
  // Actually usually "Turnaround Time" means "If you haven't reached the top by X, go back".
  // Let's output the estimated time they should be halfway.
  
  const startHour = parseInt(startTime.split(':')[0], 10);
  const startMin = parseInt(startTime.split(':')[1], 10);
  const startTotalMinutes = startHour * 60 + startMin;

  const halfDurationMinutes = (durationHours * 60) / 2;
  const turnAroundMinutes = startTotalMinutes + halfDurationMinutes;

  const h = Math.floor(turnAroundMinutes / 60) % 24;
  const m = Math.floor(turnAroundMinutes % 60);
  
  return `${h}:${m.toString().padStart(2, '0')}`;
};

export const estimatePackWeight = (data: TripData): number => {
  let base = 3.5; // kg, light base
  // Water: 0.5L per 5km roughly + temp factor
  let waterL = (data.distanceKm / 5) * 0.5;
  if (data.tempC > 25) waterL *= 1.5;
  
  // Food
  const foodKg = (data.distanceKm / 20) * 0.5; // 0.5kg per 20km? very rough

  // Layers
  let layersKg = 0.5;
  if (data.tempC < 10) layersKg += 1.0;
  if (data.weatherCondition.toLowerCase().includes('rain')) layersKg += 0.5;

  return parseFloat((base + waterL + foodKg + layersKg).toFixed(1));
};

export const calculateULScore = (weight: number, data: TripData): number => {
  // Arbitrary gamified score
  // If weight < 4kg => 100? No, that's empty.
  // Let's say: 
  // < 4kg = 95-100 (SUL)
  // 4-6kg = 80-94 (UL)
  // 6-8kg = 60-79 (Light)
  // 8-10kg = 40-59 (Trad)
  // > 10kg = < 40
  
  if (weight < 4) return 98;
  if (weight < 6) return 85;
  if (weight < 8) return 65;
  if (weight < 10) return 45;
  return 30;
};