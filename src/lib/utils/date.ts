export function formatArchiveDate(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00`);

  return {
    year: String(date.getFullYear()),
    short: `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`,
  };
}
