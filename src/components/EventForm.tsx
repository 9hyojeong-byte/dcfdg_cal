import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, AlignLeft, Check } from 'lucide-react';
import { ScheduleEvent } from '../types';

interface EventFormProps {
  selectedDate: string; // YYYY-MM-DD
  editingEvent: ScheduleEvent | null; // Null if adding a new one
  onSave: (event: Omit<ScheduleEvent, 'createdAt'>) => void;
  onCancel: () => void;
}

export default function EventForm({
  selectedDate,
  editingEvent,
  onSave,
  onCancel,
}: EventFormProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [isAllDay, setIsAllDay] = useState(true);

  // Initialize form fields with edit values if provided, or selectedDate
  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title);
      setDate(editingEvent.date);
      setStartTime(editingEvent.startTime || '');
      setEndTime(editingEvent.endTime || '');
      setDescription(editingEvent.description || '');
      setIsAllDay(!editingEvent.startTime);
    } else {
      setTitle('');
      setDate(selectedDate);
      setStartTime('');
      setEndTime('');
      setDescription('');
      setIsAllDay(true);
    }
  }, [editingEvent, selectedDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) {
      alert('일정 제목과 날짜는 필수 입력 항목입니다.');
      return;
    }

    onSave({
      id: editingEvent?.id || `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: title.trim(),
      date,
      startTime: isAllDay ? null : (startTime || null),
      endTime: isAllDay ? null : (endTime || null),
      description: description.trim() || null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-bold text-gray-800 text-lg">
            {editingEvent ? '일정 수정하기' : '새로운 일정 추가'}
          </h3>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title Input */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              일정 제목 *
            </label>
            <input
              type="text"
              required
              placeholder="예: 딥스 1부늦입, 저녁 종로 술병 등"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              autoFocus
            />
          </div>

          {/* Date Input */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              날짜 *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center justify-between py-1 bg-gray-50 px-4 rounded-2xl">
            <span className="text-xs font-semibold text-gray-600 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
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

          {/* Time Input (Conditional) */}
          {!isAllDay && (
            <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-150">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  시작 시간
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  종료 시간
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>
            </div>
          )}

          {/* Description Input */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <AlignLeft className="w-3.5 h-3.5 text-gray-400" />
              메모 및 상세 설명
            </label>
            <textarea
              placeholder="추가적인 설명이나 세부 메모를 입력하세요 (예: 하루 종일, 서해민어도 가기? 등)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-none"
            />
          </div>

          {/* Submit & Cancel Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 border border-gray-200 text-gray-500 hover:bg-gray-50 font-semibold text-sm rounded-2xl transition cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-2xl shadow-lg shadow-blue-100 flex items-center justify-center gap-2 transition cursor-pointer"
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
