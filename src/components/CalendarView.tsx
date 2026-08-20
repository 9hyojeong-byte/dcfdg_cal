import React from 'react';
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { ScheduleEvent } from '../types';
import { isPastDate } from '../lib/timeUtils';
import { getDotColorClass, LOCATION_COLORS } from '../lib/locationColors';

type WeekStart = 'sun' | 'mon';
const WEEK_START_STORAGE_KEY = 'calendarWeekStart';

function loadWeekStart(): WeekStart {
  const saved = localStorage.getItem(WEEK_START_STORAGE_KEY);
  return saved === 'sun' ? 'sun' : 'mon';
}

interface CalendarViewProps {
  currentDate: Date;
  selectedDate: string;
  events: ScheduleEvent[];
  onSelectDate: (dateStr: string) => void;
  onNavigateMonth: (offset: number) => void;
  onTodayClick?: () => void;
  selectedLocation: string | null;
  onSelectLocation: (location: string | null) => void;
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function CalendarView({
  currentDate,
  selectedDate,
  events,
  onSelectDate,
  onNavigateMonth,
  onTodayClick,
  selectedLocation,
  onSelectLocation,
}: CalendarViewProps) {
  const legendRef = React.useRef<HTMLDivElement>(null);
  const weekSettingRef = React.useRef<HTMLDivElement>(null);
  const [weekStart, setWeekStart] = React.useState<WeekStart>(loadWeekStart);
  const [isWeekSettingOpen, setIsWeekSettingOpen] = React.useState(false);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectedLocation && legendRef.current && !legendRef.current.contains(e.target as Node)) {
        onSelectLocation(null);
      }
      if (isWeekSettingOpen && weekSettingRef.current && !weekSettingRef.current.contains(e.target as Node)) {
        setIsWeekSettingOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedLocation, onSelectLocation, isWeekSettingOpen]);

  const handleSelectWeekStart = (value: WeekStart) => {
    setWeekStart(value);
    localStorage.setItem(WEEK_START_STORAGE_KEY, value);
    setIsWeekSettingOpen(false);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthLabel = `${year}년 ${month + 1}월`;

  const firstDayIndex = weekStart === 'sun'
    ? new Date(year, month, 1).getDay()
    : (new Date(year, month, 1).getDay() + 6) % 7;
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  const gridItems: { dateStr: string; dayNum: number; isCurrentMonth: boolean; dow: number }[] = [];

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = prevMonthTotalDays - i;
    const dateObj = new Date(year, month - 1, d);
    gridItems.push({ dateStr: formatLocalDate(dateObj), dayNum: d, isCurrentMonth: false, dow: dateObj.getDay() });
  }
  for (let d = 1; d <= totalDays; d++) {
    const dateObj = new Date(year, month, d);
    gridItems.push({ dateStr: formatLocalDate(dateObj), dayNum: d, isCurrentMonth: true, dow: dateObj.getDay() });
  }
  const nextPad = 42 - gridItems.length;
  for (let d = 1; d <= nextPad; d++) {
    const dateObj = new Date(year, month + 1, d);
    gridItems.push({ dateStr: formatLocalDate(dateObj), dayNum: d, isCurrentMonth: false, dow: dateObj.getDay() });
  }

  const getEventsForDay = (dateStr: string) =>
    events.filter(e => {
      if (e.endDate) {
        return dateStr >= e.date && dateStr <= e.endDate;
      }
      return e.date === dateStr;
    });
  const todayStr = formatLocalDate(new Date());

  const daysOfWeek = weekStart === 'sun'
    ? ['일', '월', '화', '수', '목', '금', '토']
    : ['월', '화', '수', '목', '금', '토', '일'];

  return (
    <div className="bg-white rounded-2xl border-2 border-[#1E293B] shadow-pop p-4">

      {/* ── Calendar Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1 relative" ref={weekSettingRef}>
          <h2 className="font-display text-xl font-extrabold text-[#1E293B] tracking-tight">
            {monthLabel}
          </h2>

          <button
            onClick={() => setIsWeekSettingOpen((prev) => !prev)}
            className="w-5 h-5 rounded-full flex items-center justify-center text-[#94A3B8] hover:text-[#1E293B] hover:bg-[#F1F5F9] transition cursor-pointer"
            title="캘린더 설정"
          >
            <Settings className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>

          {isWeekSettingOpen && (
            <div className="absolute top-full left-0 mt-2 z-20 w-40 bg-white rounded-xl border-2 border-[#1E293B] shadow-pop-sm p-1.5 animate-pop-in">
              <p className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider px-2 pt-1 pb-1.5">
                시작 요일
              </p>
              {([
                { value: 'sun' as const, label: '일요일 시작' },
                { value: 'mon' as const, label: '월요일 시작' },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleSelectWeekStart(opt.value)}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer
                    ${weekStart === opt.value ? 'bg-violet-50 text-[#8B5CF6]' : 'text-[#475569] hover:bg-[#F1F5F9]'}`}
                >
                  <span>{opt.label}</span>
                  {weekStart === opt.value && <span className="text-[#8B5CF6]">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

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
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className={`text-[10px] font-extrabold tracking-wider py-1
              ${day === '일' ? 'text-[#F472B6]' : day === '토' ? 'text-[#38BDF8]' : 'text-[#94A3B8]'}`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* ── Days Grid ── */}
      <div className="grid grid-cols-7 gap-y-1 gap-x-0.5">
        {gridItems.map(({ dateStr, dayNum, isCurrentMonth, dow }, idx) => {
          const isSelected = selectedDate === dateStr;
          const isToday = todayStr === dateStr;
          const dayEvents = getEventsForDay(dateStr);
          const hasEvents = dayEvents.length > 0;
          const isSun = dow === 0;
          const isSat = dow === 6;

          let numColor = 'text-[#1E293B] font-bold';
          if (!isCurrentMonth) numColor = 'text-[#CBD5E1] font-medium';
          else if (isSun) numColor = 'text-[#F472B6] font-extrabold';
          else if (isSat) numColor = 'text-[#38BDF8] font-extrabold';

          return (
            <button
              key={`${dateStr}-${idx}`}
              onClick={() => onSelectDate(isSelected ? '' : dateStr)}
              className={`relative aspect-square flex flex-col items-center justify-center rounded-xl transition-all duration-200 outline-none cursor-pointer
                ${isSelected
                  ? 'bg-[#8B5CF6] border-2 border-[#1E293B] shadow-pop-sm'
                  : isToday
                    ? 'bg-[#FBBF24] border-2 border-[#1E293B]'
                    : hasEvents && isCurrentMonth
                      ? isPastDate(dateStr)
                        ? 'bg-slate-50 border border-slate-200 hover:border-slate-300'
                        : 'bg-violet-50 border border-violet-100 hover:border-violet-300'
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
                        ${isSelected || isToday 
                          ? 'bg-white' 
                          : isPastDate(dateStr)
                            ? 'bg-slate-300'
                            : getDotColorClass(ev.location)}`}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Legend ── */}
      <div 
        ref={legendRef}
        className="mt-4 pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5"
      >
        {Object.entries(LOCATION_COLORS).map(([name, colors]) => {
          const isActive = selectedLocation === name;
          const isAnyActive = selectedLocation !== null;
          return (
            <button
              key={name}
              onClick={(e) => {
                e.stopPropagation();
                if (isActive) {
                  onSelectLocation(null);
                } else {
                  onSelectLocation(name);
                }
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-extrabold transition-all duration-200 cursor-pointer
                ${isActive 
                  ? `${colors.text} ${colors.border} bg-white shadow-pop-sm scale-105` 
                  : 'text-[#64748B] border-transparent hover:bg-slate-50'
                }
                ${isAnyActive && !isActive ? 'opacity-40 scale-95' : 'opacity-100'}
              `}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${colors.bg}`} />
              <span>{name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
