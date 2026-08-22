// 참석자(attendees)는 콤마로 구분된 문자열로 저장되고, 그 첫 번째 항목이 작성자다.
// 이 순서가 실제 작성자와 항상 일치하려면 두 가지가 보장되어야 한다:
//   1. supabaseApi.fetchSchedules()가 schedule_attendees를 등록 순서(created_at)대로
//      명시적으로 정렬해서 가져올 것 (DB가 순서를 보장해주지 않으므로 직접 ORDER BY 필요)
//   2. supabaseApi.saveSchedules()가 재저장 시에도 그 등록 순서를 보존하도록
//      created_at을 배열 순서에 맞게 명시적으로 부여할 것
// 이 조건이 지켜지는 한, "작성자 판별"은 반드시 이 파일의 함수를 통해서만 하고
// 컴포넌트에서 attendees[0] / index === 0 을 직접 사용하지 않는다.

export function getAttendeesList(attendees: string | null | undefined): string[] {
  if (!attendees) return [];
  return attendees.split(',').map((n) => n.trim()).filter(Boolean);
}

export function getAuthorName(attendees: string | null | undefined): string | null {
  const list = getAttendeesList(attendees);
  return list.length > 0 ? list[0] : null;
}

// 화면 표시용으로 작성자를 항상 맨 앞에 오도록 정렬한 목록을 반환한다.
// (저장된 원본 attendees 문자열의 순서 자체는 변경하지 않는다)
export function getDisplayAttendeesList(attendees: string | null | undefined): string[] {
  const list = getAttendeesList(attendees);
  const author = list[0];
  if (!author) return list;
  return [author, ...list.slice(1).filter((n) => n !== author)];
}
