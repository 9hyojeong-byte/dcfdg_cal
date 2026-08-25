import { ScheduleEvent } from '../types';
import { supabase } from './supabaseClient';
import { getAuthorName } from './authors';

const SCHEDULES_TABLE = 'schedules';
const ATTENDEES_TABLE = 'schedule_attendees';

// 이 앱은 공용 schedules/schedule_attendees 테이블을 여러 업체가 나눠 쓰는 구조이므로,
// 항상 이 코드로만 읽고 쓴다.
const COMPANY_CODE = 'dcfdg';

interface ScheduleRow {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string;
  deep_tank_usage: string | null;
  created_at: string;
  schedule_attendees?: { nickname: string }[] | null;
}

function rowToEvent(row: ScheduleRow): ScheduleEvent {
  const nicknames = (row.schedule_attendees ?? []).map((a) => a.nickname);
  return {
    id: row.id,
    title: row.title,
    date: row.start_date,
    endDate: row.end_date,
    startTime: row.start_time,
    endTime: row.end_time,
    description: row.description,
    createdAt: row.created_at,
    location: row.location,
    attendees: nicknames.length > 0 ? nicknames.join(', ') : null,
    deepTankUsage: row.deep_tank_usage,
  };
}

function eventToRow(event: ScheduleEvent) {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    start_date: event.date,
    end_date: event.endDate ?? null,
    start_time: event.startTime,
    end_time: event.endTime,
    location: event.location || '자유일정',
    company: COMPANY_CODE,
    deep_tank_usage: event.deepTankUsage ?? null,
    created_at: event.createdAt || new Date().toISOString(),
  };
}

/**
 * Fetches all active schedule events for this company (dcfdg) from Supabase,
 * joined with their attendee nicknames.
 */
export async function fetchSchedules(): Promise<ScheduleEvent[]> {
  const { data, error } = await supabase
    .from(SCHEDULES_TABLE)
    .select(`*, ${ATTENDEES_TABLE}(nickname)`)
    .eq('company', COMPANY_CODE)
    .is('deleted_at', null)
    .order('start_date', { ascending: true })
    // schedule_attendees는 등록 순서(=작성자 판별 기준)대로 명시적으로 정렬해서 가져와야 한다.
    // ORDER BY 없이 조회하면 첫 번째 참석자(=작성자)가 뒤바뀔 수 있다.
    .order('created_at', { referencedTable: ATTENDEES_TABLE, ascending: true });

  if (error) {
    throw new Error(`Supabase에서 일정을 가져오지 못했습니다: ${error.message}`);
  }

  return (data as unknown as ScheduleRow[] | null ?? []).map(rowToEvent);
}

/**
 * Upserts a single schedule event's own fields (title/date/location/...).
 *
 * 이 함수는 절대 schedule_attendees를 통째로 지웠다 다시 쓰지 않는다 — 같은
 * 일정을 두 사람이 거의 동시에 열어놓고 있으면, 한쪽이 들고 있는 낡은
 * 참석자 스냅샷이 다른 쪽이 방금 추가/삭제한 참석자를 덮어써버리기 때문이다.
 * 참석자 추가/삭제/이름변경은 반드시 addAttendee / removeAttendee /
 * renameAttendee로 "한 행만" 건드릴 것.
 *
 * opts.isNew는 방금 새로 만든 일정일 때만 true로 준다 — 이 경우엔 아직
 * 아무도 참석자를 건드릴 수 없었으므로(경합 대상이 없음) 작성자 1명을
 * 최초 참석자로 삽입해도 안전하다.
 */
export async function saveSingleEvent(
  event: ScheduleEvent,
  opts?: { isNew?: boolean; passwordHash?: string | null }
): Promise<void> {
  const row = eventToRow(event);
  const { error: upsertError } = await supabase
    .from(SCHEDULES_TABLE)
    .upsert(row, { onConflict: 'id' });
  if (upsertError) {
    throw new Error(`Supabase 동기화에 실패했습니다: ${upsertError.message}`);
  }

  if (opts?.isNew) {
    if (opts.passwordHash) {
      const { error: passwordError } = await supabase
        .from(SCHEDULES_TABLE)
        .update({ password_hash: opts.passwordHash })
        .eq('id', event.id);
      if (passwordError) {
        throw new Error(`비밀번호 설정에 실패했습니다: ${passwordError.message}`);
      }
    }

    const authorName = getAuthorName(event.attendees);
    if (authorName) {
      const { error: insertAuthorError } = await supabase
        .from(ATTENDEES_TABLE)
        .insert({ schedule_id: event.id, nickname: authorName });
      if (insertAuthorError) {
        throw new Error(`참석자 등록에 실패했습니다: ${insertAuthorError.message}`);
      }
    }
  }
}

/**
 * 이 일정을 수정/삭제하기 전에 비밀번호가 걸려있는지 확인할 때 쓴다.
 * 비밀번호를 설정하지 않은 일정은 null을 반환한다(=누구나 수정/삭제 가능).
 */
export async function getSchedulePasswordHash(scheduleId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from(SCHEDULES_TABLE)
    .select('password_hash')
    .eq('id', scheduleId)
    .single();
  if (error) {
    throw new Error(`비밀번호 확인에 실패했습니다: ${error.message}`);
  }
  return (data as { password_hash: string | null } | null)?.password_hash ?? null;
}

/**
 * 이 참석자를 제외하기 전에 비밀번호가 걸려있는지 확인할 때 쓴다.
 * 비밀번호를 설정하지 않은 참석자는 null을 반환한다(=누구나 제외 가능).
 */
export async function getAttendeePasswordHash(
  scheduleId: string,
  nickname: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from(ATTENDEES_TABLE)
    .select('password_hash')
    .eq('schedule_id', scheduleId)
    .eq('nickname', nickname)
    .maybeSingle();
  if (error) {
    throw new Error(`비밀번호 확인에 실패했습니다: ${error.message}`);
  }
  return (data as { password_hash: string | null } | null)?.password_hash ?? null;
}

/** 참석자 한 명을 추가한다. 같은 일정의 다른 참석자는 절대 건드리지 않는다. */
export async function addAttendee(
  scheduleId: string,
  nickname: string,
  passwordHash?: string | null
): Promise<void> {
  const { error } = await supabase
    .from(ATTENDEES_TABLE)
    .insert({ schedule_id: scheduleId, nickname, password_hash: passwordHash ?? null });
  if (error) {
    throw new Error(`참석자 등록에 실패했습니다: ${error.message}`);
  }
}

/** 참석자 한 명을 제외한다. 같은 일정의 다른 참석자는 절대 건드리지 않는다. */
export async function removeAttendee(scheduleId: string, nickname: string): Promise<void> {
  const { error } = await supabase
    .from(ATTENDEES_TABLE)
    .delete()
    .eq('schedule_id', scheduleId)
    .eq('nickname', nickname);
  if (error) {
    throw new Error(`참석자 삭제에 실패했습니다: ${error.message}`);
  }
}

/** 작성자/리더 이름 변경: 그 행 하나만 이름을 바꾼다. 나머지 참석자는 그대로 둔다. */
export async function renameAttendee(
  scheduleId: string,
  oldNickname: string,
  newNickname: string
): Promise<void> {
  const { error } = await supabase
    .from(ATTENDEES_TABLE)
    .update({ nickname: newNickname })
    .eq('schedule_id', scheduleId)
    .eq('nickname', oldNickname);
  if (error) {
    throw new Error(`작성자 이름 변경에 실패했습니다: ${error.message}`);
  }
}
