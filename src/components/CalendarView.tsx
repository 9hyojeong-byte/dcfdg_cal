import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ScheduleEvent } from '../types';

interface CalendarViewProps {
  currentDate: Date;
  selectedDate: string;
  events: ScheduleEvent[];
  onSelectDate: (dateStr: string) => void;
  onNavigateMonth: (offset: number) => void;
  onTodayClick?: () => void;
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const DOT_COLORS = ['bg-[#8B5CF6]', 'bg-[#F472B6]', 'bg-[#FBBF24]', 'bg-[#34D399]'];

export default function CalendarView({
  currentDate,
  selectedDate,
  events,
  onSelectDate,
  onNavigateMonth,
  onTodayClick,
}: CalendarViewProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthLabel = `${year}년 ${month + 1}월`;

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  const gridItems: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = prevMonthTotalDays - i;
    gridItems.push({ dateStr: formatLocalDate(new Date(year, month - 1, d)), dayNum: d, isCurrentMonth: false });
  }
  for (let d = 1; d <= totalDays; d++) {
    gridItems.push({ dateStr: formatLocalDate(new Date(year, month, d)), dayNum: d, isCurrentMonth: true });
  }
  const nextPad = 42 - gridItems.length;
  for (let d = 1; d <= nextPad; d++) {
    gridItems.push({ dateStr: formatLocalDate(new Date(year, month + 1, d)), dayNum: d, isCurrentMonth: false });
  }

  const getEventsForDay = (dateStr: string) => events.filter(e => e.date === dateStr);
  const todayStr = formatLocalDate(new Date());

  const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="bg-white rounded-2xl border-2 border-[#1E293B] shadow-pop p-4">

      {/* ── Calendar Header ── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-extrabold text-[#1E293B] tracking-tight">
          {monthLabel}
        </h2>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onNavigateMonth(-1)}
            className="w-8 h-8 rounded-xl border-2 border-[#1E293B] shadow-pop-sm bg-white hover:bg-[#F1F5F9] flex items-center justify-center btn-candy cursor-pointer text-[#1E293B]"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
          </button>

          <button
            onClick={() => {
              const today = new Date();
              onSelectDate(formatLocalDate(today));
              const offset = (today.getFullYear() - year) * 12 + (today.getMonth() - month);
              if (offset !== 0) onNavigateMonth(offset);
              if (onTodayClick) onTodayClick();
            }}
            className="px-4 py-1.5 bg-[#1E293B] text-white text-xs font-bold rounded-full border-2 border-[#1E293B] shadow-pop-sm hover:bg-[#334155] btn-candy cursor-pointer"
          >
            오늘
          </button>

          <button
            onClick={() => onNavigateMonth(1)}
            className="w-8 h-8 rounded-xl border-2 border-[#1E293B] shadow-pop-sm bg-white hover:bg-[#F1F5F9] flex items-center justify-center btn-candy cursor-pointer text-[#1E293B]"
          >
            <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* ── Day Labels ── */}
      <div className="grid grid-cols-7 text-center mb-2">
        {daysOfWeek.map((day, i) => (
          <div
            key={day}
            className={`text-[10px] font-extrabold tracking-wider py-1
              ${i === 0 ? 'text-[#F472B6]' : i === 6 ? 'text-[#38BDF8]' : 'text-[#94A3B8]'}`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* ── Days Grid ── */}
      <div className="grid grid-cols-7 gap-y-1 gap-x-0.5">
        {gridItems.map(({ dateStr, dayNum, isCurrentMonth }, idx) => {
          const isSelected = selectedDate === dateStr;
          const isToday = todayStr === dateStr;
          const dayEvents = getEventsForDay(dateStr);
          const hasEvents = dayEvents.length > 0;
          const dow = idx % 7;
          const isSun = dow === 0;
          const isSat = dow === 6;

          let numColor = 'text-[#1E293B] font-bold';
          if (!isCurrentMonth) numColor = 'text-[#CBD5E1] font-medium';
          else if (isSun) numColor = 'text-[#F472B6] font-extrabold';
          else if (isSat) numColor = 'text-[#38BDF8] font-extrabold';

          return (
            <button
              key={`${dateStr}-${idx}`}
              onClick={() => onSelectDate(dateStr)}
              className={`relative aspect-square flex flex-col items-center justify-center rounded-xl transition-all duration-200 outline-none cursor-pointer
                ${isSelected
                  ? 'bg-[#8B5CF6] border-2 border-[#1E293B] shadow-pop-sm'
                  : isToday
                    ? 'bg-[#FBBF24] border-2 border-[#1E293B]'
                    : hasEvents && isCurrentMonth
                      ? 'bg-violet-50 border border-violet-100 hover:border-violet-300'
                      : 'hover:bg-[#F1F5F9] active:bg-[#E2E8F0]'}
              `}
            >
              <span className={`text-[13px] leading-none
                ${isSelected ? 'text-white font-extrabold'
                  : isToday ? 'text-[#1E293B] font-extrabold'
                  : numColor}`}>
                {dayNum}
              </span>

              {hasEvents && (
                <div className="absolute bottom-0.5 flex gap-0.5 justify-center">
                  {dayEvents.slice(0, 3).map((ev, eIdx) => (
                    <span
                      key={ev.id || eIdx}
                      className={`w-1.5 h-1.5 rounded-full
                        ${isSelected || isToday ? 'bg-white' : DOT_COLORS[eIdx % DOT_COLORS.length]}`}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
