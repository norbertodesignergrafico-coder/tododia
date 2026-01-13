

export interface KPIEntry {
  date: string; // ISO String
  value: number;
}

export interface SmartGoal {
  id: string;
  title: string;
  specific: string;
  measurable: string;
  attainable: string;
  relevant: string;
  timebound: string;
  deadline?: string; // ISO Date string YYYY-MM-DD
  kpiName: string;
  kpiTarget: number;
  kpiCurrent: number;
  kpiUnit: string;
  history: KPIEntry[];
  completed: boolean;
}

export interface VisionBoardItem {
  id: string;
  image: string; // Base64 or URL
  caption: string;
}

export interface Habit {
  id: string;
  title: string;
  completedDates: string[]; // List of "YYYY-MM-DD" strings representing completed days
  streak: number; // Current streak count
  reminderTime?: string; // HH:MM
}

export interface WeeklyReview {
  id: string;
  date: string;
  priorities: string[];
  habitsChecked: boolean;
  notes: string;
}

export interface AuditData {
  // Emotional State
  sentiment: number; // 0 to 100
  
  // The Gap (Identity)
  currentIdentity: string; // "Who I am acting like"
  desiredIdentity: string; // "Who I need to be"
  
  // The Blockers
  mainObstacles: string; // External/Internal blockers
  
  // The Drive
  whyItMatters: string; // Deep motivation
  
  // Output
  manifesto: string; // The generated "Doer" statement
}

export type AppView = 'login' | 'welcome' | 'audit' | 'planning' | 'dashboard' | 'review' | 'expired';