import { ScheduleEvent } from '../types';

/**
 * Fetches all schedule events from our secure Express backend proxy.
 */
export async function fetchSchedules(): Promise<ScheduleEvent[]> {
  const res = await fetch('/api/schedules');
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `서버 에러가 발생했습니다: ${res.statusText}`);
  }

  const data = await res.json();
  return data.events || [];
}

/**
 * Synchronizes and overwrites all schedules in the Google Spreadsheet via Express proxy.
 */
export async function saveSchedules(schedules: ScheduleEvent[]): Promise<void> {
  const res = await fetch('/api/schedules', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ events: schedules }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `서버 에러가 발생했습니다: ${res.statusText}`);
  }
}
