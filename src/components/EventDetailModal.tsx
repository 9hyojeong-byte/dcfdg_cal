import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, AlignLeft, Users, UserPlus, Sparkles } from 'lucide-react';
import { ScheduleEvent } from '../types';
import { formatTime } from '../lib/timeUtils';

interface EventDetailModalProps {
  event: ScheduleEvent;
  onClose: () => void;
  onUpdateEvent: (updatedEvent: ScheduleEvent) => void;
}

export default function EventDetailModal({ event, onClose, onUpdateEvent }: EventDetailModalProps) {
  const [newName, setNewName] = useState('');
  const [savedMyName, setSavedMyName] = useState('');

  useEffect(() => {
    const cached = localStorage.getItem('lastAttendeeName') || '';
    setSavedMyName(cached);
    if (cached) setNewName(cached);
  }, []);

  const getAttendeesList = (): string[] => {
    if (!event.attendees) return [];
    return event.attendees.split(',').map(n => n.trim()).filter(n => n.length > 0);
  };
  const attendees = getAttendeesList();

  const handleAddAttendee = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (attendees.includes(trimmed)) { alert('이미 등록된 참석자입니다.'); return; }
    localStorage.setItem('lastAttendeeName', trimmed);
    setSavedMyName(trimmed);
    const updated = [...attendees, trimmed];
    onUpdateEvent({ ...event, attendees: updated.join(', ') });
    setNewName('');
  };

  const handleRemoveAttendee = (name: string) => {
    if (!window.confirm(`"${name}" 님을 참석자에서 제외하시겠습니까?`)) return;
    const updated = attendees.filter(n => n !== name);
    onUpdateEvent({ ...event, attendees: updated.length > 0 ? updated.join(', ') : null });
  };

  const formatKoreanDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      const dow = new Date(dateStr).toLocaleDateString('ko-KR', { weekday: 'short' });
      return `${parseInt(parts[1], 10)}월 ${parseInt(parts[2], 10)}일 (${dow})`;
    } catch { return dateStr; }
  };

  // Rotating color for location badge
  const locationColors: Record<string, string> = {
    '딥스':   'bg-[#8B5CF6] text-white',
    '파라':   'bg-[#F472B6] text-white',
    '성남':   'bg-[#FBBF24] text-[#1E293B]',
    '수원':   'bg-[#34D399] text-[#1E293B]',
    '자유일정':'bg-[#38BDF8] text-[#1E293B]',
  };
  const locColor = locationColors[event.location || ''] || 'bg-[#E2E8F0] text-[#1E293B]';

  return (
    <div className="fixed inset-0 bg-[#1E293B]/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
      <div className="bg-[#FFFDF5] rounded-t-3xl sm:rounded-3xl w-full max-w-md overflow-hidden border-2 border-[#1E293B] shadow-pop-lg flex flex-col max-h-[92vh] animate-slide-up sm:animate-pop-in">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-[#1E293B] bg-white shrink-0">
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 rounded-full border-2 border-[#1E293B] text-[10px] font-extrabold uppercase tracking-wider shadow-pop-sm ${locColor}`}>
              {event.location || '일반'}
            </span>
            <span className="text-xs font-bold text-[#94A3B8]">일정 상세</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border-2 border-[#1E293B] bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4 text-[#1E293B]" strokeWidth={2.5} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Title Card */}
          <div className="bg-white rounded-2xl border-2 border-[#1E293B] shadow-pop p-4 space-y-3">
            <h2 className="font-display text-xl font-extrabold text-[#1E293B] leading-snug break-all">
              {event.title}
            </h2>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 bg-[#F1F5F9] px-3 py-1.5 rounded-full border border-[#E2E8F0] text-xs font-bold text-[#64748B]">
                <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" strokeWidth={2} />
                <span>{formatKoreanDate(event.date)}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-[#F1F5F9] px-3 py-1.5 rounded-full border border-[#E2E8F0] text-xs font-bold text-[#64748B]">
                <Clock className="w-3.5 h-3.5 text-[#94A3B8]" strokeWidth={2} />
                <span>
                  {event.startTime
                    ? `${formatTime(event.startTime)}${event.endTime ? ` ~ ${formatTime(event.endTime)}` : ''}`
                    : '하루종일'}
                </span>
              </div>
              {event.location && (
                <div className="flex items-center gap-1.5 bg-violet-50 px-3 py-1.5 rounded-full border border-violet-100 text-xs font-bold text-violet-700">
                  <MapPin className="w-3.5 h-3.5 text-violet-400" strokeWidth={2} />
                  <span>{event.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-widest flex items-center gap-1">
                <AlignLeft className="w-3.5 h-3.5" />메모
              </label>
              <div className="bg-white p-4 rounded-xl border-2 border-[#E2E8F0] text-sm font-medium text-[#475569] leading-relaxed break-all whitespace-pre-line">
                {event.description}
              </div>
            </div>
          )}

          {/* Attendees */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-widest flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />참석자 현황
              </label>
              <span className="px-2 py-0.5 bg-[#8B5CF6] text-white text-[10px] font-extrabold rounded-full border-2 border-[#1E293B] shadow-pop-sm">
                {attendees.length}명
              </span>
            </div>

            {attendees.length === 0 ? (
              <div className="text-center py-6 bg-white rounded-xl border-2 border-dashed border-[#CBD5E1]">
                <p className="text-xs font-bold text-[#94A3B8]">아직 등록된 참석자가 없어요.</p>
                <p className="text-[10px] text-[#CBD5E1] mt-0.5">가장 먼저 참석 등록을 해보세요!</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 bg-white p-3 rounded-xl border-2 border-[#E2E8F0] min-h-12">
                {attendees.map((name) => (
                  <button
                    key={name}
                    onClick={() => handleRemoveAttendee(name)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-violet-50 border-2 border-[#8B5CF6] text-violet-700 hover:bg-pink-50 hover:border-[#F472B6] hover:text-pink-700 rounded-full text-xs font-extrabold transition group cursor-pointer"
                    title="참석 취소"
                  >
                    <span>{name}</span>
                    <X className="w-3 h-3 text-violet-400 group-hover:text-pink-500 transition" strokeWidth={2.5} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Add Attendee */}
          <div className="space-y-2 bg-white p-4 rounded-xl border-2 border-[#E2E8F0]">
            <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-widest flex items-center gap-1">
              <UserPlus className="w-3.5 h-3.5 text-[#8B5CF6]" />참석자 등록
            </label>

            <div className="flex gap-2">
              <input
                type="text"
                maxLength={10}
                placeholder="이름 입력 (예: 길동)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddAttendee(newName); }}}
                className="flex-1 px-3 py-2.5 border-2 border-[#CBD5E1] bg-white rounded-full text-xs font-bold text-[#1E293B] input-geo transition placeholder:text-[#94A3B8]"
              />
              <button
                type="button"
                onClick={() => handleAddAttendee(newName)}
                className="px-4 py-2.5 bg-[#8B5CF6] text-white font-extrabold text-xs rounded-full border-2 border-[#1E293B] shadow-pop-sm btn-candy cursor-pointer"
              >
                등록
              </button>
            </div>

            {savedMyName && !attendees.includes(savedMyName) && (
              <button
                type="button"
                onClick={() => handleAddAttendee(savedMyName)}
                className="text-[10px] font-bold text-[#8B5CF6] hover:text-violet-800 flex items-center gap-1 transition cursor-pointer"
              >
                <Sparkles className="w-3 h-3" strokeWidth={2.5} />
                <span>'{savedMyName}'으로 바로 참석</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t-2 border-[#1E293B] bg-white shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#1E293B] text-white font-extrabold text-sm rounded-full border-2 border-[#1E293B] shadow-pop btn-candy cursor-pointer"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
}
