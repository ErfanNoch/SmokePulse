export type SmokingTrigger =
  | 'After Meal'
  | 'Work Break'
  | 'Morning Coffee'
  | 'Stress'
  | 'Social'
  | 'Boredom'
  | 'Commute'
  | 'Craving'
  | 'Night Out'
  | 'Stress & Pressure'
  | 'Social Gathering'
  | 'Driving / Commute'
  | 'Craving & Habit'
  | 'Alcohol & Evening'
  | 'Other';

export type MoodType = 'Neutral' | 'Stressed' | 'Relaxed' | 'Restless' | 'Social' | 'Tired';

export interface CigaretteLog {
  id: string;
  timestamp: number; // epoch ms
  count: number; // usually 1, or batch count
  reason: SmokingTrigger;
  customReason?: string;
  mood?: MoodType;
  note?: string;
  packId?: string;
  costEstimate: number; // cost in user's currency for this specific log
  synced?: boolean;
  updatedAt?: number;
  isDeleted?: boolean;
}

export interface PackPurchase {
  id: string;
  timestamp: number; // epoch ms
  brandName: string;
  sticksPerPack: number;
  cost: number;
  quantity: number;
  storeName?: string;
  note?: string;
  synced?: boolean;
  updatedAt?: number;
  isDeleted?: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  pin?: string; // 4 digit passcode for privacy
  currency: string;
  dailyStickLimit: number;
  defaultPackCost: number;
  defaultPackSize: number;
  defaultBrand: string;
  manualStockCalibration?: number; // base stock calibration for pocket inventory
  soundFeedback: boolean;
  theme: 'light' | 'dark' | 'system';
  createdAt: number;
  updatedAt: number;
  syncKey?: string;
}

export interface SyncPayload {
  app: 'SmokePulse';
  version: number;
  senderDeviceId: string;
  timestamp: number;
  profiles?: UserProfile[];
  logs: CigaretteLog[];
  packs: PackPurchase[];
}

export interface DailySummary {
  dateStr: string; // YYYY-MM-DD
  totalSticks: number;
  estimatedCost: number;
  logs: CigaretteLog[];
  packsPurchased: PackPurchase[];
  totalPackSpend: number;
  totalPackCost?: number;
  exceededLimit: boolean;
  limitRatio: number;
}

export interface HabitInsight {
  trigger: SmokingTrigger;
  count: number;
  percentage: number;
}

export interface HourlyDistribution {
  hour: number; // 0 - 23
  count: number;
  percentage: number;
}
