import React from 'react';
import { Calendar, Clock, Edit2, Trash2, CalendarDays, Plus } from 'lucide-react';
import { ScheduleEvent } from '../types';

interface EventListViewProps {
  selectedDate: string; // YYYY-MM-DD
  events: ScheduleEvent[];
  onEditEvent: (event: ScheduleEvent) => void;
  onDeleteEvent: (id: string) => void;
  onAddEventClick: () => void;
}

// Beautiful pastel-colored palette matching the Bento Grid HTML design
const bentoColors = [
  { bg: 'bg-blue-50/60', border: 'border-blue-100', text: 'text-blue-900', badgeBg: 'bg-blue-100/80', badgeText: 'text-blue-700', descText: 'text-blue-700' },
  { bg: 'bg-purple-50/60', border: 'border-purple-100', text: 'text-purple-900', badgeBg: 'bg-purple-100/80', badgeText: 'text-purple-700', descText: 'text-purple-700' },
  { bg: 'bg-orange-50/60', border: 'border-orange-100', text: 'text-orange-900', badgeBg: 'bg-orange-100/80', badgeText: 'text-orange-700', descText: 'text-orange-700' },
  { bg: 'bg-emerald-50/60', border: 'border-emerald-100', text: 'text-emerald-900', badgeBg: 'bg-emerald-100/80', badgeText: 'text-emerald-700', descText: 'text-emerald-700' },
  { bg: 'bg-rose-50/60', border: 'border-rose-100', text: 'text-rose-900', badgeBg: 'bg-rose-100/80', badgeText: 'text-rose-700', descText: 'text-rose-700' },
];

export default function EventListView({
  selectedDate,
  events,
  onEditEvent,
  onDeleteEvent,
  onAddEventClick,
}: EventListViewProps) {
  // Filter events for the selected date and sort them chronologically
  const dayEvents = events
    .filter(e => e.date === selectedDate)
    .sort((a, b) => {
      if (!a.startTime) return -1;
      if (!b.startTime) return 1;
      return a.startTime.localeCompare(b.startTime);
    });

  // Simple date format helper for Korean display (e.g. 2026-06-28 -> 6월 28일)
  const formatKoreanDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      return `${m}월 ${d}일 일정`;
    } catch {
      return dateStr;
    }
  };

  const handleDeleteClick = (id: string, title: string) => {
    const isConfirmed = window.confirm(`"${title}" 일정을 정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`);
    if (isConfirmed) {
      onDeleteEvent(id);
    }
  };

  return (
    <div id="event-list-container" className="space-y-4">
      {/* List Header */}
      <div className="flex items-center justify-between pb-1">
        <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          <span>{formatKoreanDate(selectedDate)}</span>
          <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[11px] font-black">
            {dayEvents.length}
          </span>
        </h3>
        <button
          id="add-event-btn"
          onClick={onAddEventClick}
          className="hidden text-xs font-bold text-blue-600 hover:text-blue-800 items-center gap-0.5"
        >
          <Plus className="w-4 h-4" />
          <span>일정 추가</span>
        </button>
      </div>

      {/* Events Cards List */}
      {dayEvents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-[32px] border border-gray-200 flex flex-col items-center justify-center gap-2">
          <Clock className="w-8 h-8 text-gray-300 animate-pulse" />
          <div>
            <p className="text-sm font-extrabold text-gray-600">등록된 일정이 없습니다</p>
            <p className="text-xs text-gray-400 mt-1">직접 추가하거나 스크린샷 스캔을 시작해 보세요!</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
          {dayEvents.map((ev, idx) => {
            const color = bentoColors[idx % bentoColors.length];
            return (
              <div
                key={ev.id}
                className={`${color.bg} border ${color.border} rounded-[24px] p-4 flex items-start gap-3.5 shadow-xs hover:shadow-md transition-all duration-300`}
              >
                {/* Event Time indicator badge */}
                <div className={`${color.badgeBg} ${color.badgeText} py-1.5 px-3 rounded-2xl text-center shrink-0 min-w-[76px]`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider leading-none">Time</p>
                  <p className="text-xs font-black mt-1 leading-none tracking-tight">
                    {ev.startTime ? ev.startTime : '하루종일'}
                  </p>
                  {ev.endTime && (
                    <p className="text-[9px] opacity-85 mt-1 font-semibold leading-none">
                      ~ {ev.endTime}
                    </p>
                  )}
                </div>

                {/* Event Content */}
                <div className="flex-1 min-w-0 self-center">
                  <p className={`text-sm font-black ${color.text} leading-snug break-all`}>
                    {ev.title}
                  </p>
                  {ev.description && (
                    <p className={`text-[11px] ${color.descText} opacity-85 mt-1 leading-relaxed break-all whitespace-pre-line font-medium`}>
                      {ev.description}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 self-center">
                  <button
                    onClick={() => onEditEvent(ev)}
                    className="p-2 bg-white/75 hover:bg-white text-gray-500 hover:text-blue-600 rounded-xl transition shadow-xs"
                    title="수정"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(ev.id, ev.title)}
                    className="p-2 bg-white/75 hover:bg-red-50 text-gray-500 hover:text-red-500 rounded-xl transition shadow-xs"
                    title="삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

