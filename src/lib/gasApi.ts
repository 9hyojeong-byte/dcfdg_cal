import { ScheduleEvent } from '../types';

const GAS_URL = "https://script.google.com/macros/s/AKfycbwbHpLmx7ed68A1L5kP_F4CCBW6qZmc1HliYMXp1dooZbLqZC_-v1Wumv1-7QRnvx3m9A/exec";

async function fetchSchedulesDirectly(): Promise<ScheduleEvent[]> {
  const res = await fetch(GAS_URL, {
    method: "GET",
    headers: { "Accept": "application/json" }
  });
  if (!res.ok) {
    throw new Error(`Google Apps Script returned status ${res.status}`);
  }
  const data = await res.json();
  if (data && data.success) {
    return data.events || [];
  }
  throw new Error((data && data.error) || "Apps Script에서 일정을 가져오지 못했습니다.");
}

async function saveSchedulesDirectly(schedules: ScheduleEvent[]): Promise<void> {
  const res = await fetch(GAS_URL, {
    method: "POST",
    headers: { 
      "Content-Type": "text/plain;charset=utf-8" 
    },
    body: JSON.stringify({
      action: "sync",
      events: schedules || []
    })
  });
  if (!res.ok) {
    throw new Error(`Google Apps Script returned status ${res.status}`);
  }
  const data = await res.json();
  if (!data || !data.success) {
    throw new Error((data && data.error) || "Apps Script 동기화에 실패했습니다.");
  }
}

/**
 * Fetches all schedule events from our secure Express backend proxy.
 * Falls back to direct client-side fetch if the proxy is unavailable (e.g. on Vercel).
 */
export async function fetchSchedules(): Promise<ScheduleEvent[]> {
  try {
    const res = await fetch('/api/schedules');
    
    if (res.status === 404) {
      console.warn("Express proxy returned 404. Falling back to direct client-side fetch to Google Apps Script...");
      return await fetchSchedulesDirectly();
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `서버 에러가 발생했습니다: ${res.statusText}`);
    }

    const data = await res.json();
    return data.events || [];
  } catch (error) {
    console.warn("Express proxy fetch failed. Trying direct client-side Google Apps Script fetch:", error);
    return await fetchSchedulesDirectly();
  }
}

/**
 * Synchronizes and overwrites all schedules in the Google Spreadsheet via Express proxy.
 * Falls back to direct client-side synchronization if the proxy is unavailable (e.g. on Vercel).
 */
export async function saveSchedules(schedules: ScheduleEvent[]): Promise<void> {
  try {
    const res = await fetch('/api/schedules', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events: schedules }),
    });

    if (res.status === 404) {
      console.warn("Express proxy returned 404. Falling back to direct client-side sync to Google Apps Script...");
      await saveSchedulesDirectly(schedules);
      return;
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `서버 에러가 발생했습니다: ${res.statusText}`);
    }
  } catch (error) {
    console.warn("Express proxy save failed. Trying direct client-side Google Apps Script sync:", error);
    await saveSchedulesDirectly(schedules);
  }
}

