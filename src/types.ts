export interface ScheduleEvent {
  id: string; // Google Sheet row index, or a unique UUID
  title: string;
  date: string; // YYYY-MM-DD (Start Date)
  endDate?: string | null; // YYYY-MM-DD (End Date)
  startTime: string | null; // HH:MM, or part like "1부" etc
  endTime: string | null; // HH:MM
  description: string | null;
  createdAt: string;
  location?: string | null; // Location (딥스, 성남, 파라, 수원, 자유일정)
  attendees?: string | null; // Comma-separated or similar string of attendee names
}

export interface GoogleSheetConfig {
  spreadsheetId: string;
  sheetName: string;
}
