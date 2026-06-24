import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, AlignLeft, Check, MapPin } from 'lucide-react';
import { ScheduleEvent } from '../types';
import { formatTime, normalizeToHourLabel } from '../lib/timeUtils';

interface EventFormProps {
  selectedDate: string; // YYYY-MM-DD
  editingEvent: ScheduleEvent | null; // Null if adding a new one
  onSave: (event: Omit<ScheduleEvent, 'createdAt'>) => void;
  onCancel: () => void;
}

const LOCATIONS = ['딥스', '성남', '파라', '수원', '자유일정'] as const;
type LocationType = typeof LOCATIONS[number];

const SESSIONS = ['1부', '2부', '3부', '4부', '5부'] as const;
const HOURS = Array.from({ length: 24 }, (_, i) => `${i}시`);

export default function EventForm({
  selectedDate,
  editingEvent,
  onSave,
  onCancel,
}: EventFormProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState<LocationType>('딥스');
  const [isAllDay, setIsAllDay] = useState(false);
  const [session, setSession] = useState('1부');
  const [hour, setHour] = useState('12시');
  const [description, setDescription] = useState('');

  // Initialize form fields with edit values if provided, or selectedDate
  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title);
      setDate(editingEvent.date);
      setDescription(editingEvent.description || '');

      // Detect location
      let detLocation: LocationType = '딥스';
      if (editingEvent.location && LOCATIONS.includes(editingEvent.location as any)) {
        detLocation = editingEvent.location as LocationType;
      } else {
        const fullText = `${editingEvent.title} ${editingEvent.description || ''}`;
        if (fullText.includes('성남')) detLocation = '성남';
        else if (fullText.includes('파라')) detLocation = '파라';
        else if (fullText.includes('수원')) detLocation = '수원';
        else if (fullText.includes('자유일정')) detLocation = '자유일정';
        else if (fullText.includes('딥스')) detLocation = '딥스';
      }
      setLocation(detLocation);

      // Is All Day?
      const isDayAll = !editingEvent.startTime;
      setIsAllDay(isDayAll);

      // Parse custom time format
      if (!isDayAll && editingEvent.startTime) {
        const rawTimeVal = editingEvent.startTime;
        const formattedTime = formatTime(rawTimeVal);

        if (detLocation === '딥스' || detLocation === '파라') {
          if (SESSIONS.includes(rawTimeVal as any)) {
            setSession(rawTimeVal);
          } else if (SESSIONS.includes(formattedTime as any)) {
            setSession(formattedTime);
          } else {
            setSession('1부');
          }
        } else {
          // 성남 or 수원
          setHour(normalizeToHourLabel(rawTimeVal));
        }
      } else {
        setSession('1부');
        setHour('12시');
      }
    } else {
      setTitle('');
      setDate(selectedDate);
      setLocation('딥스');
      setIsAllDay(false);
      setSession('1부');
      setHour('12시');
      setDescription('');
    }
  }, [editingEvent, selectedDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) {
      alert('일정 제목과 날짜는 필수 입력 항목입니다.');
      return;
    }

    // Determine final startTime based on selections
    let finalStartTime: string | null = null;
    if (!isAllDay) {
      if (location === '딥스' || location === '파라') {
        finalStartTime = session;
      } else {
        // Convert "14시" to "14:00" for standardization and sorting
        const hNum = parseInt(hour.replace('시', ''), 10);
        const formattedHour = String(hNum).padStart(2, '0');
        finalStartTime = `${formattedHour}:00`;
      }
    }

    onSave({
      ...editingEvent,
      id: editingEvent?.id || `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: title.trim(),
      date,
      startTime: finalStartTime,
      // If we are editing, we should preserve the original endTime, otherwise keep it null for new events.
      endTime: editingEvent ? editingEvent.endTime : null,
      description: description.trim() || null,
      location,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-[#F3F4F6] rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
          <h3 className="font-black text-gray-900 text-lg tracking-tight">
            {editingEvent ? '일정 수정하기' : '새로운 일정 추가'}
          </h3>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Title Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              일정 제목 *
            </label>
            <input
              type="text"
              required
              placeholder="예: 딥스 1부늦입, 저녁 종로 술병 등"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 bg-white rounded-2xl text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              autoFocus
            />
          </div>

          {/* Date Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-4 h-4 text-gray-400" />
              날짜 *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 bg-white rounded-2xl text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {/* Location Segmented Tabs */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <MapPin className="w-4 h-4 text-gray-400" />
              장소 *
            </label>
            <div className="grid grid-cols-5 gap-1 bg-gray-200/60 p-1 rounded-2xl border border-gray-200">
              {LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => {
                    setLocation(loc);
                    // Set sensible default time unit for each type of location
                    if (loc === '딥스' || loc === '파라') {
                      setSession('1부');
                    } else {
                      setHour('12시');
                    }
                  }}
                  className={`py-2 text-[11px] font-black rounded-xl transition cursor-pointer text-center ${
                    location === loc
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          {/* Time/Session Selector (Conditional) */}
          {!isAllDay && (
            <div className="animate-in slide-in-from-top-2 duration-150">
              {location === '딥스' || location === '파라' ? (
                /* Sessions Grid (1부 ~ 5부) */
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    시간 (부 선택) *
                  </label>
                  <div className="grid grid-cols-5 gap-1 bg-gray-200/60 p-1 rounded-2xl border border-gray-200">
                    {SESSIONS.map((sess) => (
                      <button
                        key={sess}
                        type="button"
                        onClick={() => setSession(sess)}
                        className={`py-2 text-xs font-black rounded-xl transition cursor-pointer text-center ${
                          session === sess
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        {sess}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Hours Dropdown (0시 ~ 23시) */
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    시간 (정각 단위 선택) *
                  </label>
                  <select
                    value={hour}
                    onChange={(e) => setHour(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 bg-white rounded-2xl text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition appearance-none cursor-pointer"
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* All Day Toggle Row */}
          <div className="flex items-center justify-between py-2 bg-white px-4 rounded-2xl border border-gray-200">
            <span className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-gray-400" />
              하루 종일 진행
            </span>
            <button
              type="button"
              onClick={() => setIsAllDay(!isAllDay)}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center cursor-pointer ${
                isAllDay ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform absolute ${
                  isAllDay ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Description Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <AlignLeft className="w-4 h-4 text-gray-400" />
              메모 및 상세 설명
            </label>
            <textarea
              placeholder="추가적인 설명이나 세부 메모를 입력하세요 (예: 하루 종일, 서해민어도 가기? 등)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 bg-white rounded-2xl text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-none"
            />
          </div>

          {/* Submit & Cancel Buttons */}
          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 font-bold text-sm rounded-2xl transition cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-100 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>저장하기</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
