import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Plus, Settings, X, CalendarDays } from 'lucide-react';
import { ScheduleEvent } from '../types';
import { formatTime } from '../lib/timeUtils';

interface EventListViewProps {
  selectedDate: string;
  events: ScheduleEvent[];
  onEditEvent: (event: ScheduleEvent) => void;
  onDeleteEvent: (id: string) => void;
  onAddEventClick: () => void;
  onEventClick: (event: ScheduleEvent) => void;
}

// Sticker-style: white card + dark border + colored hard shadow
const stickerColors = [
  { shadow: 'shadow-pop-violet', badgeBg: 'bg-violet-100', badgeText: 'text-violet-700', badgeBorder: 'border-violet-200' },
  { shadow: 'shadow-pop-pink',   badgeBg: 'bg-pink-100',   badgeText: 'text-pink-700',   badgeBorder: 'border-pink-200'   },
  { shadow: 'shadow-pop-amber',  badgeBg: 'bg-amber-100',  badgeText: 'text-amber-700',  badgeBorder: 'border-amber-200'  },
  { shadow: 'shadow-pop-emerald',badgeBg: 'bg-emerald-100',badgeText: 'text-emerald-700',badgeBorder: 'border-emerald-200'},
  { shadow: 'shadow-pop-sky',    badgeBg: 'bg-sky-100',    badgeText: 'text-sky-700',    badgeBorder: 'border-sky-200'    },
];

export default function EventListView({
  selectedDate,
  events,
  onEditEvent,
  onDeleteEvent,
  onAddEventClick,
  onEventClick,
}: EventListViewProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.settings-menu-container')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const dayEvents = events
    .filter(e => e.date === selectedDate)
    .sort((a, b) => {
      if (!a.startTime) return -1;
      if (!b.startTime) return 1;
      return a.startTime.localeCompare(b.startTime);
    });

  const formatKoreanDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      return `${parseInt(parts[1], 10)}월 ${parseInt(parts[2], 10)}일 일정`;
    } catch { return dateStr; }
  };

  const handleDeleteClick = (id: string, title: string) => {
    if (window.confirm(`"${title}" 일정을 정말로 삭제하시겠습니까?`)) {
      onDeleteEvent(id);
    }
  };

  return (
    <div className="space-y-3">

      {/* ── List Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-lg font-extrabold text-[#1E293B] tracking-tight">
            {formatKoreanDate(selectedDate)}
          </h3>
          <span className="px-2.5 py-0.5 bg-[#8B5CF6] text-white text-[11px] font-extrabold rounded-full border-2 border-[#1E293B] shadow-pop-sm">
            {dayEvents.length}
          </span>
        </div>

        <button
          onClick={onAddEventClick}
          className="flex items-center gap-1 px-3 py-1.5 bg-white text-[#1E293B] text-xs font-bold rounded-full border-2 border-[#1E293B] shadow-pop-sm btn-candy cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
          <span>추가</span>
        </button>
      </div>

      {/* ── Empty State ── */}
      {dayEvents.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-2xl border-2 border-[#1E293B] shadow-pop flex flex-col items-center gap-3">
          {/* Geometric empty illustration */}
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
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-0.5">
          {dayEvents.map((ev, idx) => {
            const color = stickerColors[idx % stickerColors.length];
            return (
              <div
                key={ev.id}
                className={`event-card bg-white rounded-2xl border-2 border-[#1E293B] ${color.shadow} flex items-start gap-3 p-3.5`}
              >
                {/* Clickable body */}
                <div
                  onClick={() => onEventClick(ev)}
                  className="flex-1 flex items-start gap-3 cursor-pointer min-w-0"
                >
                  {/* Badge */}
                  <div className={`${color.badgeBg} ${color.badgeText} border ${color.badgeBorder} py-2 px-2.5 rounded-xl text-center shrink-0 min-w-[68px] flex flex-col items-center gap-0.5`}>
                    <p className="text-[11px] font-extrabold leading-none truncate max-w-[60px]">
                      {ev.location || '일반'}
                    </p>
                    <p className="text-[11px] font-bold leading-none mt-1">
                      {ev.startTime ? formatTime(ev.startTime) : '하루종일'}
                    </p>
                    {ev.endTime && (
                      <p className="text-[9px] opacity-75 font-semibold leading-none">
                        ~{formatTime(ev.endTime)}
                      </p>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 self-center">
                    <p className="text-sm font-extrabold text-[#1E293B] leading-snug break-all">
                      {ev.title}
                    </p>
                    {ev.description && (
                      <p className="text-[11px] text-[#64748B] mt-0.5 leading-relaxed break-all whitespace-pre-line font-medium max-h-10 overflow-hidden">
                        {ev.description}
                      </p>
                    )}
                    {ev.attendees && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {ev.attendees.split(',').map(n => n.trim()).filter(Boolean).map(name => (
                          <span key={name} className="text-[9px] font-extrabold px-2 py-0.5 bg-[#1E293B] text-white rounded-full">
                            {name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Settings menu */}
                <div className="settings-menu-container shrink-0 self-center">
                  {activeMenuId === ev.id ? (
                    <div className="flex items-center gap-0.5 bg-white py-1 px-1 rounded-xl border-2 border-[#1E293B] shadow-pop-sm">
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); onEditEvent(ev); }}
                        className="p-1.5 text-[#8B5CF6] hover:bg-violet-50 rounded-lg transition flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                        <span className="text-[10px] font-extrabold">수정</span>
                      </button>
                      <div className="w-px h-3 bg-[#E2E8F0]" />
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); handleDeleteClick(ev.id, ev.title); }}
                        className="p-1.5 text-[#F472B6] hover:bg-pink-50 rounded-lg transition flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                        <span className="text-[10px] font-extrabold">삭제</span>
                      </button>
                      <div className="w-px h-3 bg-[#E2E8F0]" />
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }}
                        className="p-1.5 text-[#94A3B8] hover:bg-[#F1F5F9] rounded-lg transition cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveMenuId(ev.id); }}
                      className="w-7 h-7 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#64748B] rounded-lg border border-[#E2E8F0] flex items-center justify-center transition cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
