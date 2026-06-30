/**
 * Formats a time string cleanly. Handles raw 24h formats ("15:00"), sessions ("1부"),
 * and ugly Google Sheets serial dates (e.g. "1899-12-30T06:32:08.000Z").
 */
export function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '';

  const trimmed = timeStr.trim();
  if (!trimmed) return '';

  // If it's a known session like "1부", "2부", "3부", "4부", "5부", return as-is
  const sessions = ['1부', '2부', '3부', '4부', '5부'];
  if (sessions.includes(trimmed)) {
    return trimmed;
  }

  // If it's a standard clean HH:MM or HH:MM:SS format
  const simpleTimeRegex = /^([0-9]{1,2}):([0-9]{2})(?::([0-9]{2}))?$/;
  if (simpleTimeRegex.test(trimmed)) {
    const match = trimmed.match(simpleTimeRegex);
    if (match) {
      const h = match[1].padStart(2, '0');
      const m = match[2];
      return `${h}:${m}`;
    }
  }

  // If it's an ISO date string or contains the 1899 base date from Google Sheets
  if (trimmed.includes('1899-12-30') || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(trimmed)) {
    try {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        const h = String(date.getHours()).padStart(2, '0');
        const m = String(date.getMinutes()).padStart(2, '0');
        return `${h}:${m}`;
      }
    } catch (e) {
      console.error("Failed to parse ISO time string:", trimmed, e);
    }
  }

  // Fallback: search for any "HH:MM" pattern in the string
  const timePatternMatch = trimmed.match(/(\d{1,2}):(\d{2})/);
  if (timePatternMatch) {
    const h = timePatternMatch[1].padStart(2, '0');
    const m = timePatternMatch[2];
    return `${h}:${m}`;
  }

  return trimmed;
}

/**
 * Normalizes an hour string like "12시" or "12" or "12:00" into just "12시" for the dropdown selector
 */
export function normalizeToHourLabel(timeStr: string | null | undefined): string {
  const formatted = formatTime(timeStr);
  if (!formatted) return '12시';

  if (formatted.includes(':')) {
    const parts = formatted.split(':');
    const h = parseInt(parts[0], 10);
    if (!isNaN(h) && h >= 0 && h < 24) {
      return `${h}시`;
    }
  }

  const numericMatch = formatted.match(/^(\d+)시?$/);
  if (numericMatch) {
    return `${numericMatch[1]}시`;
  }

  return '12시';
}

/**
 * Returns today's date string in local timezone as YYYY-MM-DD
 */
export function getTodayDateStr(): string {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Checks if the given YYYY-MM-DD date string is before today
 */
export function isPastDate(dateStr: string): boolean {
  if (!dateStr) return false;
  const todayStr = getTodayDateStr();
  return dateStr < todayStr;
}
