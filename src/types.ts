export interface ScheduleEvent {
  id: string; // Google Sheet row index, or a unique UUID
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string | null; // HH:MM
  endTime: string | null; // HH:MM
  description: string | null;
  createdAt: string;
}

export interface GoogleSheetConfig {
  spreadsheetId: string;
  sheetName: string;
}
