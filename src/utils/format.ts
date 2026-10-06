// ============================================================
// DATE HELPERS
// ============================================================

export const todayKey = (ts: number = Date.now()) => {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const yesterdayKey = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayKey(d.getTime());
};

// ============================================================
// TIME FORMATTERS
// ============================================================

export const formatTime = (secs: number) => {
  const h = Math.floor(secs / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((secs % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
};

export const formatDurationShort = (secs: number) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}j ${m}m`;
  return `${m}m`;
};

export const formatDate = (ts: number) => {
  const d = new Date(ts);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatClock = (ts: number) => {
  const d = new Date(ts);
  return d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
};