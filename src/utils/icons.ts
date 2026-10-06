import type { ActivityType } from "../types";

export const getActivityIcon = (type: ActivityType) => {
  if (type === "Bersepeda") return "bicycle";
  if (type === "Lari") return "running";
  return "walking";
};