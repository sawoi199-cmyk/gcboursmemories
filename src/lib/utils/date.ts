export function formatArchiveDate(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00`);

  return {
    year: String(date.getFullYear()),
    short: `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`,
  };
}

/** Today's calendar date (YYYY-MM-DD) in the viewer's local timezone. */
export function todayLocalIsoDate(now: Date = new Date()) {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** `2026-10-15` → `2026.10.15`, without timezone shifts. */
export function formatDottedDate(isoDate: string) {
  return isoDate.slice(0, 10).replaceAll("-", ".");
}
