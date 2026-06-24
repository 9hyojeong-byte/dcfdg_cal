import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, AlignLeft, Check, MapPin } from 'lucide-react';
import { ScheduleEvent } from '../types';
import { formatTime, normalizeToHourLabel } from '../lib/timeUtils';

interface EventFormProps {
  selectedDate: string;
  editingEvent: ScheduleEvent | null;
  onSave: (event: Omit<ScheduleEvent, 'createdAt'>) => void;
  onCancel: () => void;
}

const LOCATIONS = ['딥스', '성남', '파라', '수원', '자유일정'] as const;
type LocationType = typeof LOCATIONS[number];
const SESSIONS = ['1부', '2부', '3부', '4부', '5부'] as const;
const HOURS = Array.from({ length: 24 }, (_, i) => `${i}시`);

export default function EventForm({ selectedDate, editingEvent, onSave, onCancel }: EventFormProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState<LocationType>('딥스');
  const [isAllDay, setIsAllDay] = useState(false);
  const [session, setSession] = useState('1부');
  const [hour, setHour] = useState('12시');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title);
      setDate(editingEvent.date);
      setDescription(editingEvent.description || '');

      let detLocation: LocationType = '딥스';
      if (editingEvent.location && LOCATIONS.includes(editingEvent.location as any)) {
        detLocation = editingEvent.location as LocationType;
      } else {
        const fullText = `${editingEvent.title} ${editingEvent.description || ''}`;
        if (fullText.includes('성남')) detLocation = '성남';
        else if (fullText.includes('파라')) detLocation = '파라';
        else if (fullText.includes('수원')) detLocation = '수원';
        else if (fullText.includes('자유일정')) detLocation = '자유일정';
      }
      setLocation(detLocation);

      const isDayAll = !editingEvent.startTime;
      setIsAllDay(isDayAll);
      if (!isDayAll && editingEvent.startTime) {
        const raw = editingEvent.startTime;
        if (detLocation === '딥스' || detLocation === '파라') {
          setSession(SESSIONS.includes(raw as any) ? raw : '1부');
        } else {
          setHour(normalizeToHourLabel(raw));
        }
      } else {
        setSession('1부');
        setHour('12시');
      }
    } else {
      setTitle(''); setDate(selectedDate); setLocation('딥스');
      setIsAllDay(false); setSession('1부'); setHour('12시'); setDescription('');
    }
  }, [editingEvent, selectedDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) { alert('일정 제목과 날짜는 필수입니다.'); return; }

    let finalStartTime: string | null = null;
    if (!isAllDay) {
      if (location === '딥스' || location === '파라') {
        finalStartTime = session;
      } else {
        const hNum = parseInt(hour.replace('시', ''), 10);
        finalStartTime = `${String(hNum).padStart(2, '0')}:00`;
      }
    }

    onSave({
      ...editingEvent,
      id: editingEvent?.id || `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: title.trim(),
      date,
      startTime: finalStartTime,
      endTime: editingEvent ? editingEvent.endTime : null,
      description: description.trim() || null,
      location,
    });
  };

  return (
    <div className="fixed inset-0 bg-[#1E293B]/70 z-50 flex items-end sm:items-center justify-center backdrop-blur-sm">
      <div className="bg-[#FFFDF5] rounded-t-3xl sm:rounded-3xl w-full max-w-md overflow-hidden border-2 border-[#1E293B] shadow-pop-lg animate-slide-up sm:animate-pop-in">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-[#1E293B] bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#8B5CF6] border-2 border-[#1E293B] flex items-center justify-center shadow-pop-sm">
              <Calendar className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <h3 className="font-display font-extrabold text-[#1E293B] text-lg tracking-tight">
              {editingEvent ? '일정 수정' : '새 일정 추가'}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full border-2 border-[#1E293B] bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4 text-[#1E293B]" strokeWidth={2.5} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-widest">
              일정 제목 *
            </label>
            <input
              type="text"
              required
              placeholder="예: 딥스 1부늦입, 저녁 종로 술병 등"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border-2 border-[#CBD5E1] bg-white rounded-xl text-sm font-semibold text-[#1E293B] input-geo transition placeholder:text-[#94A3B8]"
              autoFocus
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-widest flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />날짜 *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 border-2 border-[#CBD5E1] bg-white rounded-xl text-sm font-semibold text-[#1E293B] input-geo transition"
            />
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-widest flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />장소 *
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => {
                    setLocation(loc);
                    if (loc === '딥스' || loc === '파라') setSession('1부');
                    else setHour('12시');
                  }}
                  className={`px-3.5 py-2 text-[11px] font-extrabold rounded-full border-2 transition cursor-pointer
                    ${location === loc
                      ? 'bg-[#8B5CF6] text-white border-[#1E293B] shadow-pop-sm'
                      : 'bg-white text-[#64748B] border-[#CBD5E1] hover:border-[#8B5CF6] hover:text-[#8B5CF6]'}`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          {/* Time/Session */}
          {!isAllDay && (
            <div className="space-y-1.5">
              {location === '딥스' || location === '파라' ? (
                <>
                  <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-widest">
                    시간 (부 선택) *
                  </label>
                  <div className="flex gap-1.5">
                    {SESSIONS.map((sess) => (
                      <button
                        key={sess}
                        type="button"
                        onClick={() => setSession(sess)}
                        className={`flex-1 py-2.5 text-xs font-extrabold rounded-full border-2 transition cursor-pointer
                          ${session === sess
                            ? 'bg-[#FBBF24] text-[#1E293B] border-[#1E293B] shadow-pop-sm'
                            : 'bg-white text-[#64748B] border-[#CBD5E1] hover:border-[#FBBF24]'}`}
                      >
                        {sess}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-widest">
                    시간 (정각 단위) *
                  </label>
                  <select
                    value={hour}
                    onChange={(e) => setHour(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-[#CBD5E1] bg-white rounded-xl text-sm font-semibold text-[#1E293B] input-geo transition appearance-none cursor-pointer"
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </>
              )}
            </div>
          )}

          {/* All Day Toggle */}
          <div className="flex items-center justify-between py-3 px-4 bg-white rounded-xl border-2 border-[#E2E8F0]">
            <span className="text-xs font-bold text-[#1E293B] flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#64748B]" strokeWidth={2} />
              하루 종일 진행
            </span>
            <button
              type="button"
              onClick={() => setIsAllDay(!isAllDay)}
              className={`w-12 h-6 rounded-full border-2 border-[#1E293B] relative flex items-center transition-colors cursor-pointer
                ${isAllDay ? 'bg-[#8B5CF6]' : 'bg-[#E2E8F0]'}`}
            >
              <span className={`w-4 h-4 rounded-full bg-white border border-[#1E293B] shadow-sm transition-transform absolute
                ${isAllDay ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-widest flex items-center gap-1">
              <AlignLeft className="w-3.5 h-3.5" />메모
            </label>
            <textarea
              placeholder="추가 메모를 입력하세요"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border-2 border-[#CBD5E1] bg-white rounded-xl text-sm font-semibold text-[#1E293B] input-geo transition resize-none placeholder:text-[#94A3B8]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 bg-white border-2 border-[#1E293B] text-[#1E293B] font-bold text-sm rounded-full shadow-pop-sm btn-candy cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-[#8B5CF6] border-2 border-[#1E293B] text-white font-bold text-sm rounded-full shadow-pop btn-candy cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" strokeWidth={2.5} />
              저장하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
