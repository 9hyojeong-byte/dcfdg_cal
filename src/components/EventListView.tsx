import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Plus, Settings, X, CalendarDays, Link } from 'lucide-react';
import { ScheduleEvent } from '../types';
import { formatTime, isPastDate } from '../lib/timeUtils';

interface EventListViewProps {
  selectedDate: string;
  currentMonth: Date;
  events: ScheduleEvent[];
  onEditEvent: (event: ScheduleEvent) => void;
  onDeleteEvent: (id: string) => void;
  onAddEventClick: () => void;
  onEventClick: (event: ScheduleEvent) => void;
  onSelectDate: (dateStr: string) => void;
}

const stickerColors = [
  { shadow: 'shadow-pop-violet', badgeBg: 'bg-violet-100', badgeText: 'text-violet-700', badgeBorder: 'border-violet-200' },
  { shadow: 'shadow-pop-pink',   badgeBg: 'bg-pink-100',   badgeText: 'text-pink-700',   badgeBorder: 'border-pink-200'   },
  { shadow: 'shadow-pop-amber',  badgeBg: 'bg-amber-100',  badgeText: 'text-amber-700',  badgeBorder: 'border-amber-200'  },
  { shadow: 'shadow-pop-emerald',badgeBg: 'bg-emerald-100',badgeText: 'text-emerald-700',badgeBorder: 'border-emerald-200'},
  { shadow: 'shadow-pop-sky',    badgeBg: 'bg-sky-100',    badgeText: 'text-sky-700',    badgeBorder: 'border-sky-200'    },
];

// 전역 색상 인덱스 카운터 (날짜 그룹 간 색상이 이어지도록)
let globalColorIdx = 0;

const formatKoreanDate = (dateStr: string, includeDayOfWeek: boolean = false) => {
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = dayNames[date.getDay()];
    
    const formatted = `${month + 1}월 ${day}일`;
    return includeDayOfWeek ? `${formatted} (${dayOfWeek})` : formatted;
  } catch { return dateStr; }
};

const isNewSchedule = (createdAt: string): boolean => {
  if (!createdAt) return false;
  const createdTime = new Date(createdAt).getTime();
  if (isNaN(createdTime)) return false;
  const diffTime = Date.now() - createdTime;
  const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
  return diffTime <= threeDaysInMs;
};

function EventCard({
  ev,
  colorIdx,
  onEventClick,
  onOpenMenu,
  showDate = false,
}: {
  ev: ScheduleEvent;
  colorIdx: number;
  onEventClick: (e: ScheduleEvent) => void;
  onOpenMenu: (e: ScheduleEvent) => void;
  showDate?: boolean;
}) {
  const [showCopyToast, setShowCopyToast] = useState(false);
  const isPast = isPastDate(ev.date);
  const color = stickerColors[colorIdx % stickerColors.length];

  // Past event styling overrides
  const cardBorder = isPast ? 'border-slate-300' : 'border-[#1E293B]';
  const cardBg = isPast ? 'bg-[#F8FAFC] opacity-70' : 'bg-white';
  const cardShadow = isPast ? 'shadow-pop-gray' : color.shadow;

  const badgeBg = isPast ? 'bg-slate-100' : color.badgeBg;
  const badgeText = isPast ? 'text-slate-500' : color.badgeText;
  const badgeBorder = isPast ? 'border-slate-200' : color.badgeBorder;

  const dateBadgeBg = isPast ? 'bg-slate-100' : 'bg-violet-50';
  const dateBadgeText = isPast ? 'text-slate-500' : 'text-[#8B5CF6]';
  const dateBadgeBorder = isPast ? 'border-slate-200' : 'border-violet-200';

  const titleText = isPast ? 'text-slate-500' : 'text-[#1E293B]';
  const descText = isPast ? 'text-slate-400' : 'text-[#64748B]';

  const attendeeBg = isPast ? 'bg-slate-200' : 'bg-[#1E293B]';
  const attendeeText = isPast ? 'text-slate-600' : 'text-white';

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const formattedDate = ev.endDate
      ? `${formatKoreanDate(ev.date, true)} ~ ${formatKoreanDate(ev.endDate, true)}`
      : formatKoreanDate(ev.date, true);
    const timeText = ev.startTime
      ? `${formatTime(ev.startTime)}${ev.endTime ? ` ~ ${formatTime(ev.endTime)}` : ''}`
      : '하루종일';
    const locationText = ev.location || '일반';
    const url = `${window.location.origin}${window.location.pathname}?scheduleId=${ev.id}`;
    
    const attendeesList = ev.attendees
      ? ev.attendees.split(',').map(n => n.trim()).filter(n => n.length > 0)
      : [];
    const attendeesText = attendeesList.length > 0
      ? `${attendeesList.join(', ')} (${attendeesList.length}명)`
      : '없음';

    const textToCopy = `📅 [프다갤 벙 일정]
• 제목: ${ev.title}
• 일시: ${formattedDate} (${timeText})
• 장소: ${locationText}
• 메모: ${ev.description || '-'}
• 참석자: ${attendeesText}
🔗 링크: ${url}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setShowCopyToast(true);
      setTimeout(() => setShowCopyToast(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      alert('링크 복사에 실패했습니다.');
    }
  };

  return (
    <>
      <div className={`${cardBg} rounded-2xl border-2 ${cardBorder} ${cardShadow} flex items-start gap-3 p-3.5`}>
        <div onClick={() => onEventClick(ev)} className="flex-1 flex items-start gap-3 cursor-pointer min-w-0">
          <div className={`${badgeBg} ${badgeText} border ${badgeBorder} py-2 px-2.5 rounded-xl text-center shrink-0 min-w-[68px] flex flex-col items-center gap-0.5`}>
            <p className="text-[11px] font-extrabold leading-none truncate max-w-[60px]">{ev.location || '일반'}</p>
            <p className="text-[11px] font-bold leading-none mt-1">{ev.startTime ? formatTime(ev.startTime) : '하루종일'}</p>
            {ev.endTime && <p className="text-[9px] opacity-75 font-semibold leading-none">~{formatTime(ev.endTime)}</p>}
          </div>
          <div className="flex-1 min-w-0 self-center">
            <div className="flex flex-col items-start gap-1">
              {showDate && (
                <span className={`text-[10px] font-extrabold ${dateBadgeText} ${dateBadgeBg} border ${dateBadgeBorder} px-1.5 py-0.5 rounded-md shrink-0`}>
                  {formatKoreanDate(ev.date, true)}{ev.endDate ? ` ~ ${formatKoreanDate(ev.endDate, true)}` : ''}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-extrabold ${titleText} leading-snug break-all align-middle mr-1.5`}>
                  {ev.title}
                </span>
                {!isPast && isNewSchedule(ev.createdAt) && (
                  <span className="px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-extrabold rounded-md border-2 border-[#1E293B] shadow-pop-sm shrink-0 inline-block align-middle">
                    NEW
                  </span>
                )}
              </div>
            </div>
            {ev.description && (
              <p className={`text-[11px] ${descText} mt-0.5 leading-relaxed break-all whitespace-pre-line font-medium max-h-10 overflow-hidden`}>
                {ev.description}
              </p>
            )}
            {ev.attendees && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {ev.attendees.split(',').map(n => n.trim()).filter(Boolean).map(name => (
                  <span key={name} className={`text-[9px] font-extrabold px-2 py-0.5 ${attendeeBg} ${attendeeText} rounded-full`}>{name}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="settings-menu-container shrink-0 self-center flex items-center gap-1.5">
          <button
            onClick={handleCopyLink}
            className="w-7 h-7 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#64748B] rounded-lg border border-[#E2E8F0] flex items-center justify-center transition cursor-pointer"
            title="일정 링크 복사"
          >
            <Link className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onOpenMenu(ev); }}
            className="w-7 h-7 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#64748B] rounded-lg border border-[#E2E8F0] flex items-center justify-center transition cursor-pointer"
            title="일정 관리"
          >
            <Settings className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {showCopyToast && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-[#1E293B] text-white text-xs font-bold px-4 py-2.5 rounded-full border-2 border-[#1E293B] shadow-pop z-[60] animate-pop-in flex items-center gap-1.5 whitespace-nowrap">
          <span>일정 링크가 복사되었습니다!</span>
          <span>🔗</span>
        </div>
      )}
    </>
  );
}

export default function EventListView({
  selectedDate,
  currentMonth,
  events,
  onEditEvent,
  onDeleteEvent,
  onAddEventClick,
  onEventClick,
  onSelectDate,
}: EventListViewProps) {
  const [menuEvent, setMenuEvent] = useState<ScheduleEvent | null>(null);

  // 모달 외부 클릭 시 닫기
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.menu-modal-backdrop') && !target.closest('.menu-modal-content')) {
        setMenuEvent(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleDeleteClick = (id: string, title: string) => {
    if (window.confirm(`"${title}" 일정을 정말로 삭제하시겠습니까?`)) {
      onDeleteEvent(id);
    }
  };

  // 1. 데이터 준비 (필터링 및 정렬)
  let displayEvents: ScheduleEvent[] = [];
  let isFiltered = false;

  if (selectedDate) {
    isFiltered = true;
    displayEvents = events
      .filter(e => {
        if (e.endDate) {
          return selectedDate >= e.date && selectedDate <= e.endDate;
        }
        return e.date === selectedDate;
      })
      .sort((a, b) => {
        if (!a.startTime) return -1;
        if (!b.startTime) return 1;
        return a.startTime.localeCompare(b.startTime);
      });
  } else {
    isFiltered = false;
    displayEvents = [...events].sort((a, b) => {
      // 날짜 기준 역순(내림차순) 정렬
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;

      // 날짜가 같으면 시작 시간 기준 오름차순 정렬
      if (!a.startTime) return -1;
      if (!b.startTime) return 1;
      return a.startTime.localeCompare(b.startTime);
    });
  }

  return (
    <div className="space-y-3">
      {/* ── 헤더 영역 ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-lg font-extrabold text-[#1E293B] tracking-tight">
            {isFiltered ? `${formatKoreanDate(selectedDate, true)} 일정` : '전체 일정'}
          </h3>
          <span className="px-2.5 py-0.5 bg-[#8B5CF6] text-white text-[11px] font-extrabold rounded-full border-2 border-[#1E293B] shadow-pop-sm">
            {displayEvents.length}
          </span>
          {isFiltered && (
            <button
              onClick={() => onSelectDate('')}
              className="px-2.5 py-0.5 bg-white text-[#1E293B] text-[10px] font-extrabold rounded-md border-2 border-[#1E293B] shadow-pop-sm hover:bg-[#F1F5F9] btn-candy cursor-pointer ml-1"
            >
              전체보기
            </button>
          )}
        </div>
        <button
          onClick={onAddEventClick}
          className="flex items-center gap-1 px-3 py-1.5 bg-white text-[#1E293B] text-xs font-bold rounded-full border-2 border-[#1E293B] shadow-pop-sm btn-candy cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
          <span>추가</span>
        </button>
      </div>

      {/* ── 리스트 영역 ── */}
      {displayEvents.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {displayEvents.map((ev, idx) => (
            <EventCard
              key={ev.id}
              ev={ev}
              colorIdx={idx}
              onEventClick={onEventClick}
              onOpenMenu={setMenuEvent}
              showDate={!isFiltered}
            />
          ))}
        </div>
      )}

      {/* ── 일정 관리 오버레이 모달 ── */}
      {menuEvent && (
        <div className="fixed inset-0 bg-[#1E293B]/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm menu-modal-backdrop animate-pop-in">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FFFDF5] rounded-3xl w-full max-w-[280px] border-2 border-[#1E293B] shadow-pop-lg flex flex-col p-5 space-y-4 menu-modal-content"
          >
            <div className="text-center space-y-1">
              <span className="text-[10px] font-extrabold text-[#8B5CF6] bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full inline-block">
                일정 관리
              </span>
              <h4 className="font-display text-sm font-extrabold text-[#1E293B] truncate max-w-full pt-1.5 px-1">
                {menuEvent.title}
              </h4>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  const ev = menuEvent;
                  setMenuEvent(null);
                  onEditEvent(ev);
                }}
                className="w-full py-2.5 bg-[#8B5CF6] text-white font-extrabold text-xs rounded-full border-2 border-[#1E293B] shadow-pop-sm hover:bg-[#7C3AED] transition btn-candy flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                <span>수정하기</span>
              </button>

              <button
                onClick={() => {
                  const ev = menuEvent;
                  setMenuEvent(null);
                  handleDeleteClick(ev.id, ev.title);
                }}
                className="w-full py-2.5 bg-[#F472B6] text-[#1E293B] font-extrabold text-xs rounded-full border-2 border-[#1E293B] shadow-pop-sm hover:bg-[#F05DA7] transition btn-candy flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-[#1E293B]" strokeWidth={2.5} />
                <span>삭제하기</span>
              </button>

              <button
                onClick={() => setMenuEvent(null)}
                className="w-full py-2 bg-white text-[#1E293B] font-bold text-xs rounded-full border-2 border-[#1E293B] shadow-pop-sm hover:bg-[#F1F5F9] transition btn-candy cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-10 bg-white rounded-2xl border-2 border-[#1E293B] shadow-pop flex flex-col items-center gap-3">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full bg-[#F1F5F9] border-2 border-[#1E293B]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <CalendarDays className="w-7 h-7 text-[#94A3B8]" strokeWidth={2} />
        </div>
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FBBF24] border-2 border-[#1E293B]" />
      </div>
      <div>
        <p className="text-sm font-extrabold text-[#1E293B]">등록된 일정이 없어요</p>
        <p className="text-xs text-[#64748B] mt-1 font-medium">직접 추가하거나 스크린샷을 스캔해보세요!</p>
      </div>
    </div>
  );
}
