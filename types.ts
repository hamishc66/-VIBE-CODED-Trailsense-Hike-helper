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
  verdict: string;
}

export interface SafetyAnalysis {
  pros: string[];
  cons: string[];
  dealBreakers: string[];
}

export interface TripReport {
  summary: TripReportSummary;
  safety: SafetyAnalysis;
  markdownContent: string;
  sources: GroundingSource[];
}

export interface AIResponse {
  report: TripReport;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}