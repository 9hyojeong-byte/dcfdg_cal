import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, AlignLeft, Check, MapPin, User } from 'lucide-react';
import { ScheduleEvent } from '../types';
import { formatTime, normalizeToHourLabel } from '../lib/timeUtils';
import { LOCATION_COLORS } from '../lib/locationColors';

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
  const [author, setAuthor] = useState('');
  const [title, setTitle] = useState('');
  const [isTitleUserModified, setIsTitleUserModified] = useState(false);
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState<LocationType>('딥스');
  const [isAllDay, setIsAllDay] = useState(false);
  const [session, setSession] = useState('1부');
  const [hour, setHour] = useState('12시');
  const [description, setDescription] = useState('');

  useEffect(() => {
    // 저장되었던 작성자 또는 마지막 참석자 이름 가져오기
    const savedName = localStorage.getItem('lastAuthorName') || localStorage.getItem('lastAttendeeName') || '';

    if (editingEvent) {
      setTitle(editingEvent.title);
      setIsTitleUserModified(true); // 기존 수정 건은 유저 수정 상태로 유지
      setDate(editingEvent.date);
      setEndDate(editingEvent.endDate || editingEvent.date);
      setDescription(editingEvent.description || '');

      const attendeesList = editingEvent.attendees
        ? editingEvent.attendees.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      if (attendeesList.length > 0) {
        setAuthor(attendeesList[0]);
      } else {
        setAuthor(savedName);
      }

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
      setDate(selectedDate); setEndDate(selectedDate); setLocation('딥스');
      setIsAllDay(false); setSession('1부'); setHour('12시'); setDescription('');
      setAuthor(savedName);
      setIsTitleUserModified(false);

      // 새 일정 초기 자동 제목 설정
      const initialAuthor = savedName.trim() || '';
      const initialTitle = initialAuthor
        ? `${initialAuthor} / 딥스 / 1부`
        : `딥스 / 1부`;
      setTitle(initialTitle);
    }
  }, [editingEvent, selectedDate]);

  // 작성자/장소/시간 변경 시 제목 자동 연결 ("작성자명 / 장소 / 시간")
  useEffect(() => {
    if (!editingEvent && !isTitleUserModified) {
      const timeStr = isAllDay ? '하루종일' : (location === '딥스' || location === '파라' ? session : hour);
      const nameStr = author.trim();
      const autoTitle = nameStr ? `${nameStr} / ${location} / ${timeStr}` : `${location} / ${timeStr}`;
      setTitle(autoTitle);
    }
  }, [author, location, session, hour, isAllDay, isTitleUserModified, editingEvent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) { alert('일정 제목과 날짜는 필수입니다.'); return; }
    if (endDate && endDate < date) {
      alert('종료 날짜는 시작 날짜보다 빠를 수 없습니다.');
      return;
    }

    const trimmedAuthor = author.trim();
    if (trimmedAuthor) {
      localStorage.setItem('lastAuthorName', trimmedAuthor);
      localStorage.setItem('lastAttendeeName', trimmedAuthor);
    }

    let combinedAttendees: string | null = null;
    if (editingEvent && editingEvent.attendees) {
      const existingList = editingEvent.attendees.split(',').map(s => s.trim()).filter(Boolean);
      const rest = existingList.slice(1).filter(s => s !== trimmedAuthor);
      combinedAttendees = trimmedAuthor ? [trimmedAuthor, ...rest].join(', ') : (rest.join(', ') || null);
    } else {
      combinedAttendees = trimmedAuthor || null;
    }

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
      endDate: endDate && endDate !== date ? endDate : null,
      startTime: finalStartTime,
      endTime: editingEvent ? editingEvent.endTime : null,
      description: description.trim() || null,
      location,
      attendees: combinedAttendees,
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

          {/* 1. Author */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-widest flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-[#8B5CF6]" />작성자명 (첫 참석자로 자동 등록됩니다)
            </label>
            <input
              type="text"
              placeholder="예: 홍길동"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full px-4 py-3 border-2 border-[#CBD5E1] bg-white rounded-xl text-sm font-semibold text-[#1E293B] input-geo transition placeholder:text-[#94A3B8]"
              autoFocus
            />
          </div>

          {/* 2. Date Selection */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-widest flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {location === '자유일정' ? '시작 날짜 *' : '날짜 *'}
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  if (location !== '자유일정' || !endDate || endDate < e.target.value) {
                    setEndDate(e.target.value);
                  }
                }}
                className="w-full px-4 py-3 border-2 border-[#CBD5E1] bg-white rounded-xl text-sm font-semibold text-[#1E293B] input-geo transition"
              />
            </div>

            {location === '자유일정' && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-widest flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />종료 날짜 *
                </label>
                <input
                  type="date"
                  required
                  value={endDate || date}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={date}
                  className="w-full px-4 py-3 border-2 border-[#CBD5E1] bg-white rounded-xl text-sm font-semibold text-[#1E293B] input-geo transition"
                />
              </div>
            )}
          </div>

          {/* 3. Location */}
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
                    if (loc !== '자유일정') {
                      setEndDate(date);
                    }
                  }}
                  className={`px-3.5 py-2 text-[11px] font-extrabold rounded-full border-2 transition cursor-pointer
                    ${location === loc
                      ? `${LOCATION_COLORS[loc].bg} text-white border-[#1E293B] shadow-pop-sm`
                      : `bg-white text-[#64748B] border-[#CBD5E1] ${LOCATION_COLORS[loc].hoverBorder} ${LOCATION_COLORS[loc].hoverText}`}`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Time Selection */}
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

          {/* 5. Title */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-widest">
                일정 제목 *
              </label>
              {isTitleUserModified && !editingEvent && (
                <button
                  type="button"
                  onClick={() => setIsTitleUserModified(false)}
                  className="text-[10px] font-bold text-[#8B5CF6] hover:underline cursor-pointer"
                >
                  자동 제목으로 초기화
                </button>
              )}
            </div>
            <input
              type="text"
              required
              placeholder="예: 범고래 / 딥스 / 1부"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setIsTitleUserModified(true);
              }}
              className="w-full px-4 py-3 border-2 border-[#CBD5E1] bg-white rounded-xl text-sm font-semibold text-[#1E293B] input-geo transition placeholder:text-[#94A3B8]"
            />
          </div>

          {/* 6. Description */}
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

          {/* 7. Action Buttons */}
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
