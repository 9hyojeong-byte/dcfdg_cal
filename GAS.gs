/**
 * =========================================================================
 * Mobile AI Planner - Google Sheets Apps Script (GAS.gs)
 * =========================================================================
 * 
 * [설정 및 배포 방법]
 * 1. 구글 스프레드시트(Mobile_Planner_Schedules)를 엽니다.
 *    (구글 계정 연동 후 앱에서 일정을 하나 이상 추가하면 드라이브에 자동 생성됩니다)
 * 2. 상단 메뉴에서 [확장 프로그램] -> [Apps Script]를 클릭합니다.
 * 3. 기존 코드를 모두 지우고 이 파일(GAS.gs)의 전체 코드를 복사하여 붙여넣습니다.
 * 4. 상단의 [저장] 아이콘(디스켓 모양)을 누릅니다.
 * 
 * [웹 앱 배포 방법 (선택사항 - 외부 API 연동 시 활용)]
 * 1. 우측 상단의 [배포] -> [새 배포]를 클릭합니다.
 * 2. 유형 선택(톱니바퀴)에서 [웹 앱]을 선택합니다.
 * 3. 다음으로 설정합니다:
 *    - 설명: Mobile Planner API
 *    - 웹 앱을 실행할 사용자: 나 (내 구글 계정)
 *    - 액세스 권한이 있는 사용자: 모든 사용자 (Anyone)
 * 4. [배포]를 누르고 권한 검토(Review Permissions) 후 승인합니다.
 * 5. 생성된 "웹 앱 URL"을 통해 외부에서 일정을 직접 조회하거나 등록할 수 있습니다.
 */

// 시트가 열릴 때 실행되는 트리거 (헤더 자동 검증 및 정렬)
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📅 AI 플래너 매니저')
    .addItem('만료된 과거 일정 자동 정리', 'cleanupPastEvents')
    .addToUi();
  
  initializeSheet();
}

/**
 * 1. 시트 초기화 및 헤더 자동 삽입
 */
function initializeSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const headers = ['ID', 'Title', 'Date', 'StartTime', 'EndTime', 'Description', 'CreatedAt', 'Location', 'Attendees', 'EndDate'];
  
  // 첫 번째 행이 비어있으면 헤더 작성
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

/**
 * 2. 시트 및 날짜 가독성 포맷 정돈 (비활성화됨)
 */
function formatSheet() {
  // 사용자의 스프레드시트 수동 스타일링 보존을 위해 포맷팅 로직 비활성화
}

/**
 * 3. 만료된 과거 일정 자동 정리 (현재 날짜 기준 어제 이전 일정을 정리)
 */
function cleanupPastEvents() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert('정리할 데이터가 없습니다.');
    return;
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastCol = sheet.getLastColumn();
  const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const remainingRows = [];
  let deletedCount = 0;
  
  for (let i = 0; i < data.length; i++) {
    const dateStr = data[i][2]; // Date (Index 2)
    const eventDate = new Date(dateStr);
    
    if (isNaN(eventDate.getTime()) || eventDate >= today) {
      remainingRows.push(data[i]);
    } else {
      deletedCount++;
    }
  }
  
  if (deletedCount > 0) {
    // 시트 비우고 새 데이터 덮어쓰기
    sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
    if (remainingRows.length > 0) {
      sheet.getRange(2, 1, remainingRows.length, lastCol).setValues(remainingRows);
    }
    SpreadsheetApp.getUi().alert('성공적으로 ' + deletedCount + '개의 지난 일정을 정리했습니다.');
  } else {
    SpreadsheetApp.getUi().alert('정리할 만료된 일정이 없습니다.');
  }
}

/**
 * =========================================================================
 * [웹 앱 API 제공용 엔드포인트]
 * 다른 외부 애플리케이션에서 GET / POST 통신을 지원하는 함수입니다.
 * =========================================================================
 */

// GET 요청 처리: 전체 일정 또는 특정 날짜의 일정을 JSON으로 변환하여 반환
function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ success: true, events: [] }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
    
    const lastCol = Math.max(sheet.getLastColumn(), 10);
    const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    const targetDate = e && e.parameter ? e.parameter.date : null; // YYYY-MM-DD 필터링 지원
    
    const events = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const eventDate = Utilities.formatDate(new Date(row[2]), Session.getScriptTimeZone(), 'yyyy-MM-dd');
      
      if (targetDate && eventDate !== targetDate) {
        continue;
      }
      
      let endDateVal = null;
      if (row[9]) {
        try {
          endDateVal = Utilities.formatDate(new Date(row[9]), Session.getScriptTimeZone(), 'yyyy-MM-dd');
        } catch(e) {
          endDateVal = String(row[9]);
        }
      }
      
      events.push({
        id: row[0],
        title: row[1],
        date: eventDate,
        startTime: row[3] || null,
        endTime: row[4] || null,
        description: row[5] || null,
        createdAt: row[6],
        location: row[7] || null,
        attendees: row[8] || null,
        endDate: endDateVal
      });
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, events: events }))
                         .setMimeType(ContentService.MimeType.JSON);
                         
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

// POST 요청 처리: 외부에서 새로운 일정을 시트에 행으로 신속 추가 또는 전체 동기화
function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // 1. 만약 action이 "sync" 이고 events 배열이 들어오는 경우 시트를 통째로 동기화
    if (postData.action === 'sync' && Array.isArray(postData.events)) {
      const headers = ['ID', 'Title', 'Date', 'StartTime', 'EndTime', 'Description', 'CreatedAt', 'Location', 'Attendees', 'EndDate'];
      
      // 기존 전체 데이터 클리어 후 새로 쓰기
      sheet.clearContents();
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      if (postData.events.length > 0) {
        const rows = postData.events.map(function(ev) {
          return [
            ev.id || ('id-' + Math.random().toString(36).substr(2, 9)),
            ev.title || '제목 없음',
            ev.date || '',
            ev.startTime || '',
            ev.endTime || '',
            ev.description || '',
            ev.createdAt || new Date().toISOString(),
            ev.location || '',
            ev.attendees || '',
            ev.endDate || ''
          ];
        });
        sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
      }
      
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: '모든 일정이 동기화되었습니다.' }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
    
    // 2. 단일 이벤트 등록 (기존 기본 기능 호환)
    const id = postData.id || ('ai-' + Date.now());
    const title = postData.title || '제목 없음';
    const date = postData.date || '';
    const startTime = postData.startTime || '';
    const endTime = postData.endTime || '';
    const description = postData.description || '';
    const location = postData.location || '';
    const attendees = postData.attendees || '';
    const createdAt = postData.createdAt || new Date().toISOString();
    const endDate = postData.endDate || '';
    
    sheet.appendRow([id, title, date, startTime, endTime, description, createdAt, location, attendees, endDate]);
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: '일정이 추가되었습니다.' }))
                         .setMimeType(ContentService.MimeType.JSON);
                         
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}
