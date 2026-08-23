import { ScheduleEvent } from '../types';
import { supabase } from './supabaseClient';

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

function parseAttendeeNicknames(attendees: string | null | undefined): string[] {
  if (!attendees) return [];
  const seen = new Set<string>();
  const nicknames: string[] = [];
  for (const raw of attendees.split(',')) {
    const name = raw.trim();
    if (name && !seen.has(name)) {
      seen.add(name);
      nicknames.push(name);
    }
  }
  return nicknames;
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
 * Upserts a single schedule event and resyncs only its own attendee list.
 *
 * 이 앱은 여러 사람이 동시에 쓰는 공용 캘린더라, 변경된 일정 하나만 건드려야 한다.
 * 예전에는 로컬에 들고 있는 전체 events 배열을 통째로 다시 써서, 어떤 클라이언트가
 * (다른 곳에서 방금 추가된 참석자를 아직 못 받아온) 낡은 스냅샷 상태로 아무 일정이나
 * 하나 저장하면 그 사이 다른 사람이 다른 일정에 추가한 참석자가 통째로 삭제되는
 * 버그가 있었다. 반드시 이 함수로 "이번에 실제로 바뀐 이벤트"만 저장할 것 —
 * 로컬 배열 전체를 순회하며 저장하는 방식으로 되돌리지 말 것.
 */
export async function saveSingleEvent(event: ScheduleEvent): Promise<void> {
  const row = eventToRow(event);
  const { error: upsertError } = await supabase
    .from(SCHEDULES_TABLE)
    .upsert(row, { onConflict: 'id' });
  if (upsertError) {
    throw new Error(`Supabase 동기화에 실패했습니다: ${upsertError.message}`);
  }

  const nicknames = parseAttendeeNicknames(event.attendees);

  const { error: deleteAttendeesError } = await supabase
    .from(ATTENDEES_TABLE)
    .delete()
    .eq('schedule_id', event.id);
  if (deleteAttendeesError) {
    throw new Error(`참석자 동기화(삭제)에 실패했습니다: ${deleteAttendeesError.message}`);
  }

  if (nicknames.length > 0) {
    // created_at을 배열 순서에 맞춰 명시적으로 1ms씩 늘려서 부여한다.
    // 재저장 때마다 이 일정의 참석자를 전체 삭제 후 재삽입하므로, DB 기본값(now())에만
    // 맡기면 여러 행이 같은 시각으로 저장되어 등록 순서(=작성자 판별 기준)가
    // 무작위로 뒤섞일 수 있다.
    const baseTime = Date.now();
    const { error: insertAttendeesError } = await supabase
      .from(ATTENDEES_TABLE)
      .insert(
        nicknames.map((nickname, i) => ({
          schedule_id: event.id,
          nickname,
          created_at: new Date(baseTime + i).toISOString(),
        }))
      );
    if (insertAttendeesError) {
      throw new Error(`참석자 동기화(등록)에 실패했습니다: ${insertAttendeesError.message}`);
    }
  }
}
