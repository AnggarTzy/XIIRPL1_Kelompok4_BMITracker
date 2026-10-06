import type { ActivityType } from "../types";

// ============================================================
// MET VALUES
// ============================================================

export const MET_VALUES: Record<ActivityType, number> = {
  Joging: 7.0,
  Lari: 9.8,
  Bersepeda: 8.0,
};

// ============================================================
// MAP DEFAULT REGION
// ============================================================

export const DEFAULT_REGION = {
  latitude: -7.250445,
  longitude: 112.768845,
};

// ============================================================
// BACKGROUND TASK
// ============================================================

export const BACKGROUND_LOCATION_TASK = "IFIT_BACKGROUND_LOCATION";

// ============================================================
// STORAGE KEYS
// ============================================================

export const TRACKER_STORAGE_KEY = "@ifit_tracker_state";
export const HISTORY_STORAGE_KEY = "@ifit_history";
export const SETTINGS_STORAGE_KEY = "@ifit_settings";
export const PROFILE_STORAGE_KEY = "@ifit_profile";
export const USER_STORAGE_KEY = "@ifit_user";
export const SESSION_STORAGE_KEY = "@ifit_session";
export const STREAK_STORAGE_KEY = "@ifit_streak";

// ============================================================
// APP LIMITS
// ============================================================

export const MAX_HISTORY = 200;
export const SIDEBAR_HISTORY_PREVIEW = 5;
export const AUTO_PAUSE_MS = 20000;