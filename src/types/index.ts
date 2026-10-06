// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type ActivityType = "Joging" | "Lari" | "Bersepeda";
export type Gender = "Pria" | "Wanita";
export type HistoryFilter = "Semua" | ActivityType;

export type LatLng = {
  latitude: number;
  longitude: number;
};

export type StoredTrackerState = {
  tracking: boolean;
  paused: boolean;
  activityType: ActivityType;
  weight: number;
  distance: number;
  activeDuration: number;
  lastLocation: LatLng | null;
  lastTimestamp: number | null;
  lastSpokenKm: number;
  startedAt: number | null;
};

export type HistoryItem = {
  id: string;
  date: number;
  activityType: ActivityType;
  distance: number;
  duration: number;
  activeDuration: number;
  calories: number;
  pace: number;
};

export type StoredProfile = {
  profileName: string;
  gender: Gender;
  age: string;
  weight: string;
  height: string;
};

export type UserAccount = {
  name: string;
  pin: string;
  createdAt: number;
};

export type SessionState = {
  name: string;
  loggedInAt: number;
};

export type StreakData = {
  current: number;
  longest: number;
  lastLoginDate: string;
  totalLoginDays: number;
};