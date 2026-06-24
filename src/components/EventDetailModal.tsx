import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, AlignLeft, Users, UserPlus, UserMinus, Sparkles } from 'lucide-react';
import { ScheduleEvent } from '../types';
import { formatTime } from '../lib/timeUtils';

interface EventDetailModalProps {
  event: ScheduleEvent;
  onClose: () => void;
  onUpdateEvent: (updatedEvent: ScheduleEvent) => void;
}

export default function EventDetailModal({
  event,
  onClose,
  onUpdateEvent,
}: EventDetailModalProps) {
  const [newName, setNewName] = useState('');
  const [savedMyName, setSavedMyName] = useState('');

  // Load saved name from localStorage to simplify repeat registrations
  useEffect(() => {
    const cached = localStorage.getItem('lastAttendeeName') || '';
    setSavedMyName(cached);
    if (cached) {
      setNewName(cached);
    }
  }, []);

  // Parse attendees list
  const getAttendeesList = (): string[] => {
    if (!event.attendees) return [];
    return event.attendees
      .split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0);
  };

  const attendees = getAttendeesList();

  const handleAddAttendee = (nameToRegister: string) => {
    const trimmed = nameToRegister.trim();
    if (!trimmed) return;

    // Check for duplicates
    if (attendees.includes(trimmed)) {
      alert('이미 등록된 참석자 이름입니다.');
      return;
    }

    // Save name to localStorage for future convenience
    localStorage.setItem('lastAttendeeName', trimmed);
    setSavedMyName(trimmed);

    const updatedList = [...attendees, trimmed];
    const updatedEvent: ScheduleEvent = {
      ...event,
      attendees: updatedList.join(', '),
    };

    onUpdateEvent(updatedEvent);
    setNewName('');
  };

  const handleRemoveAttendee = (nameToRemove: string) => {
    const isConfirmed = window.confirm(`"${nameToRemove}" 님을 참석자 명단에서 제외하시겠습니까?`);
    if (!isConfirmed) return;

    const updatedList = attendees.filter(name => name !== nameToRemove);
    const updatedEvent: ScheduleEvent = {
      ...event,
      attendees: updatedList.length > 0 ? updatedList.join(', ') : null,
    };

    onUpdateEvent(updatedEvent);
  };

  // Format Korean date representation
  const formatKoreanDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      
      const dayOfWeek = new Date(dateStr).toLocaleDateString('ko-KR', { weekday: 'short' });
      return `${m}월 ${d}일 (${dayOfWeek})`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#F3F4F6] rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-wider">
              {event.location || '일반'}
            </span>
            <span className="text-xs font-bold text-gray-400">일정 상세</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Title Area */}
          <div className="space-y-1.5 bg-white p-5 rounded-[24px] border border-gray-100 shadow-xs">
            <h2 className="text-xl font-black text-gray-900 leading-snug break-all">
              {event.title}
            </h2>
            
            {/* Meta badges */}
            <div className="flex flex-wrap gap-2 pt-2 text-xs text-gray-500 font-bold">
              <div className="flex items-center gap-1 bg-gray-100/75 px-2.5 py-1 rounded-lg">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span>{formatKoreanDate(event.date)}</span>
              </div>
              <div className="flex items-center gap-1 bg-gray-100/75 px-2.5 py-1 rounded-lg">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span>
                  {event.startTime 
                    ? `${formatTime(event.startTime)}${event.endTime ? ` ~ ${formatTime(event.endTime)}` : ''}` 
                    : '하루종일'}
                </span>
              </div>
              {event.location && (
                <div className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  <span>{event.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Description Area */}
          {event.description && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <AlignLeft className="w-4 h-4 text-gray-400" />
                메모 및 상세설명
              </label>
              <div className="bg-white p-4 rounded-[20px] border border-gray-100 text-sm font-semibold text-gray-700 leading-relaxed break-all whitespace-pre-line">
                {event.description}
              </div>
            </div>
          )}

          {/* Attendees List Area */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-gray-400" />
                참석자 현황
                <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-md text-[10px] font-black">
                  {attendees.length}명
                </span>
              </label>
            </div>

            {/* List of Attendees */}
            {attendees.length === 0 ? (
              <div className="text-center py-6 bg-white rounded-[20px] border border-gray-100 border-dashed">
                <p className="text-xs font-bold text-gray-400">아직 등록된 참석자가 없습니다.</p>
                <p className="text-[10px] text-gray-300 mt-1">가장 먼저 참석 등록을 해보세요!</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 bg-white p-3.5 rounded-[20px] border border-gray-100 min-h-[50px]">
                {attendees.map((name) => (
                  <div
                    key={name}
                    className="flex items-center gap-1 bg-blue-50/75 border border-blue-100 hover:border-red-200 hover:bg-red-50 text-blue-900 hover:text-red-900 px-3 py-1.5 rounded-xl text-xs font-black transition group cursor-pointer"
                    onClick={() => handleRemoveAttendee(name)}
                    title="참석 취소"
                  >
                    <span>{name}</span>
                    <X className="w-3 h-3 text-blue-400 group-hover:text-red-500 transition ml-0.5" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Join/Registration Area */}
          <div className="space-y-2 bg-white/70 p-4 rounded-[24px] border border-gray-200">
            <label className="text-xs font-bold text-gray-500 flex items-center gap-1">
              <UserPlus className="w-4 h-4 text-blue-500" />
              참석자 등록
            </label>
            
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={10}
                placeholder="참석할 이름을 입력하세요 (예: 길동)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-gray-200 bg-white rounded-xl text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
              <button
                type="button"
                onClick={() => handleAddAttendee(newName)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>등록</span>
              </button>
            </div>

            {/* Quick Register Saved Name Button */}
            {savedMyName && !attendees.includes(savedMyName) && (
              <div className="pt-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleAddAttendee(savedMyName)}
                  className="text-[10px] font-black text-blue-600 hover:text-blue-800 flex items-center gap-1 transition"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>내 이름 '{savedMyName}'으로 바로 참석하기</span>
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Footer actions */}
        <div className="p-5 border-t border-gray-100 bg-white shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-900 hover:bg-black text-white font-bold text-sm rounded-2xl transition cursor-pointer text-center"
          >
            확인 및 닫기
          </button>
        </div>

      </div>
    </div>
  );
}
