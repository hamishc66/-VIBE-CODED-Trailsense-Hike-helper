export enum ExperienceLevel {
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced',
}

export interface UserProfile {
  experience: ExperienceLevel;
  fitness: 'low' | 'medium' | 'high';
}

export interface HikeDetails {
  trailName: string;
  location: string;
  date: string;
  startTime: string;
  distanceKm?: number;
  notes?: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface TripReportSummary {
  difficulty: string;
  stats: string;
  riskFactor: string;
  highlights: string[];
  tips: string[]; // Personalized tips based on profile
  verdict: string;
}

export interface SafetyAnalysis {
  pros: string[];
  cons: string[];
  dealBreakers: string[];
}

export interface TripData {
  distanceKm: number;
  elevationM: number;
  weatherCondition: string;
  tempC: number;
  sunsetTime?: string; // e.g. "18:30"
  elevationProfile?: number[]; // simplified array of numbers for graph
}

export interface WarningChip {
  type: 'Heat' | 'Storm' | 'Late' | 'Steep' | 'Remote' | 'Cold';
  label: string;
  severity: 'yellow' | 'orange' | 'red';
}

export interface TripReport {
  summary: TripReportSummary;
  safety: SafetyAnalysis;
  markdownContent: string;
  sources: GroundingSource[];
  data: TripData;
  warnings?: WarningChip[];
  ulGear?: string; // Single string suggestion
  gearList?: string[]; // Structured list for dropdown
  gearReason?: string; // Explanation for dropdown
}

export interface AIResponse {
  report: TripReport;
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}

export type RiskLevel = 'Low' | 'Moderate' | 'Elevated' | 'High';

export interface RiskFactor {
  name: string;
  score: number;
  description: string;
}

export interface RiskAnalysis {
  level: RiskLevel;
  score: number;
  factors: RiskFactor[];
  color: string;
}

export interface SaferAlternative {
  title: string;
  description: string;
  reason: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  trailName: string;
  userProfile: UserProfile;
  hikeDetails: HikeDetails;
  report: TripReport;
  riskAnalysis: RiskAnalysis;
}

export interface RecommendedTrail {
  name: string;
  location: string;
  difficulty: string;
  reason: string;
}