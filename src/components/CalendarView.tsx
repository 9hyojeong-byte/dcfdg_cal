import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { ScheduleEvent } from '../types';

interface CalendarViewProps {
  currentDate: Date;
  selectedDate: string; // YYYY-MM-DD
  events: ScheduleEvent[];
  onSelectDate: (dateStr: string) => void;
  onNavigateMonth: (offset: number) => void;
  onTodayClick?: () => void;
}

export default function CalendarView({
  currentDate,
  selectedDate,
  events,
  onSelectDate,
  onNavigateMonth,
  onTodayClick,
}: CalendarViewProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Months name in Korean, matching the bold display of design header
  const monthLabel = `${year}년 ${month + 1}월`;

  // Get first day of the month and total days
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  // Create array for grid items
  const gridItems: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  // 1. Previous Month days padding
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = prevMonthTotalDays - i;
    const prevMonthDate = new Date(year, month - 1, d);
    const dateStr = formatLocalDate(prevMonthDate);
    gridItems.push({ dateStr, dayNum: d, isCurrentMonth: false });
  }

  // 2. Current Month days
  for (let d = 1; d <= totalDays; d++) {
    const currentMonthDate = new Date(year, month, d);
    const dateStr = formatLocalDate(currentMonthDate);
    gridItems.push({ dateStr, dayNum: d, isCurrentMonth: true });
  }

  // 3. Next Month days padding to fill full 6 rows (42 grid cells)
  const totalCells = 42;
  const nextMonthPaddingCount = totalCells - gridItems.length;
  for (let d = 1; d <= nextMonthPaddingCount; d++) {
    const nextMonthDate = new Date(year, month + 1, d);
    const dateStr = formatLocalDate(nextMonthDate);
    gridItems.push({ dateStr, dayNum: d, isCurrentMonth: false });
  }

  // Helper to format Date object into YYYY-MM-DD local string
  function formatLocalDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  // Count events for each day
  const getEventsForDay = (dateStr: string) => {
    return events.filter(e => e.date === dateStr);
  };

  return (
    <div id="calendar-container" className="bg-white rounded-[32px] shadow-xs border border-gray-200 p-5">
      {/* Calendar Header with Navigation */}
      <div id="calendar-header" className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-black text-gray-900 tracking-tight">{monthLabel}</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            id="prev-month-btn"
            onClick={() => onNavigateMonth(-1)}
            className="p-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 active:bg-gray-100 text-gray-500 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            id="today-btn"
            onClick={() => {
              const today = new Date();
              onSelectDate(formatLocalDate(today));
              // Set to current month by navigating offset
              const offset = (today.getFullYear() - year) * 12 + (today.getMonth() - month);
              if (offset !== 0) onNavigateMonth(offset);
              if (onTodayClick) onTodayClick();
            }}
            className="px-3 py-1 bg-black hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            오늘
          </button>
          <button
            id="next-month-btn"
            onClick={() => onNavigateMonth(1)}
            className="p-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 active:bg-gray-100 text-gray-500 transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekdays Labels in clean uppercase design */}
      <div id="weekdays-header" className="grid grid-cols-7 text-center mb-3">
        {daysOfWeek.map((day, index) => {
          let colorClass = 'text-gray-400';
          if (index === 0) colorClass = 'text-red-400 font-bold'; // Sunday
          if (index === 6) colorClass = 'text-blue-400 font-bold'; // Saturday
          return (
            <div key={day} className={`text-[10px] font-black tracking-wider py-1 ${colorClass}`}>
              {day}
            </div>
          );
        })}
      </div>

      {/* Days Grid */}
      <div id="days-grid" className="grid grid-cols-7 gap-y-1.5 gap-x-1">
        {gridItems.map(({ dateStr, dayNum, isCurrentMonth }, idx) => {
          const isSelected = selectedDate === dateStr;
          const dayEvents = getEventsForDay(dateStr);
          const hasEvents = dayEvents.length > 0;
          
          // Saturday/Sunday check by cell index
          const dayOfWeekIndex = idx % 7;
          const isSunday = dayOfWeekIndex === 0;
          const isSaturday = dayOfWeekIndex === 6;

          let textColors = 'text-gray-800 font-bold';
          if (!isCurrentMonth) {
            textColors = 'text-gray-300 font-medium';
          } else if (isSunday) {
            textColors = 'text-red-500 font-bold';
          } else if (isSaturday) {
            textColors = 'text-blue-500 font-bold';
          }

          // Special style if it is today
          const todayStr = formatLocalDate(new Date());
          const isToday = todayStr === dateStr;

          return (
            <button
              key={`${dateStr}-${idx}`}
              onClick={() => onSelectDate(dateStr)}
              className={`relative aspect-square flex flex-col items-center justify-center rounded-2xl transition-all duration-200 outline-none py-1 cursor-pointer
                ${isSelected 
                  ? 'bg-blue-600 text-white shadow-lg ring-4 ring-blue-50 font-black' 
                  : isToday 
                    ? `bg-amber-50 border-2 border-amber-400 ${hasEvents ? 'ring-2 ring-blue-100' : ''}`
                    : hasEvents && isCurrentMonth
                      ? 'bg-blue-50/70 border border-blue-100/70 hover:bg-blue-100/40'
                      : 'hover:bg-gray-50 active:bg-gray-100'
                }
              `}
            >
              <span className={`text-sm ${isSelected ? 'text-white' : textColors} ${hasEvents && isCurrentMonth && !isSelected ? 'font-black text-blue-900' : ''}`}>
                {dayNum}
              </span>

              {/* Event indicators with customized sizes */}
              {hasEvents && (
                <div className="absolute bottom-1 flex gap-0.5 justify-center">
                  {dayEvents.slice(0, 3).map((ev, eIdx) => (
                    <span 
                      key={ev.id || eIdx} 
                      className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-600 shadow-xs'}`} 
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white opacity-80' : 'bg-blue-400'}`} />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
