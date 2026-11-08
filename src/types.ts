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
  company?: string; // DB company 값. 희선캘린더에서 넘어온 일정은 'deephee' (저장 시 그대로 유지)
  attendees?: string | null; // Comma-separated or similar string of attendee names
  deepTankUsage?: string | null; // 딥탱크 이용시간: "전반부이", "후반부이" 등
  sharedMemo?: string | null; // 비밀번호 없이 누구나 쓸 수 있는 공유 메모
  sharedMemoVersion?: number; // 공유 메모 낙관적 동시성 제어용 버전 번호
}

export interface GoogleSheetConfig {
  spreadsheetId: string;
  sheetName: string;
}

