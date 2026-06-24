import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Sparkles, Plus, RefreshCw, Layers, CheckCircle2, ShieldAlert, X } from 'lucide-react';
import { ScheduleEvent } from './types';
import CalendarView from './components/CalendarView';
import EventListView from './components/EventListView';
import EventForm from './components/EventForm';
import ImageUploader from './components/ImageUploader';
import EventDetailModal from './components/EventDetailModal';
import { fetchSchedules, saveSchedules } from './lib/gasApi';

export default function App() {
  // 1. Core States
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date());
  
  // UI States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [selectedEventForDetail, setSelectedEventForDetail] = useState<ScheduleEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [currentSyncEmoji, setCurrentSyncEmoji] = useState('🌊');

  // Today click count and modal state
  const [todayClickCount, setTodayClickCount] = useState(0);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);

  // Update random sea emoji when syncStatus switches to 'syncing'
  useEffect(() => {
    if (syncStatus === 'syncing') {
      const seaEmojis = ['🌊', '🏊', '🐬', '🐳', '🐋', '🦈', '🐙', '🦑', '🐠', '🐡', '🦀', '🦞', '🦐', '🐚', '🐧', '⛵', '🏄', '🚣', '🦦', '🧜', '🦭'];
      const randomEmoji = seaEmojis[Math.floor(Math.random() * seaEmojis.length)];
      setCurrentSyncEmoji(randomEmoji);
    }
  }, [syncStatus]);

  // Set today as default selected date on mount
  useEffect(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  }, []);

  // 2. Load schedules from Google Sheets on mount
  const loadDataFromGAS = useCallback(async () => {
    setIsLoading(true);
    setSyncStatus('syncing');
    try {
      const loadedEvents = await fetchSchedules();
      setEvents(loadedEvents);
      setSyncStatus('success');
    } catch (err) {
      console.error('Error syncing with Google Apps Script:', err);
      setSyncStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Trigger load on mount
  useEffect(() => {
    loadDataFromGAS();
  }, [loadDataFromGAS]);

  // Save changes to Google Sheets
  const syncSchedulesWithGoogle = async (updatedEvents: ScheduleEvent[]) => {
    setSyncStatus('syncing');
    try {
      await saveSchedules(updatedEvents);
      setSyncStatus('success');
    } catch (err) {
      console.error('Failed to save to Google Apps Script:', err);
      setSyncStatus('error');
    }
  };

  // 3. CRUD Event Handlers
  const handleSaveEvent = async (formEvent: Omit<ScheduleEvent, 'createdAt'>) => {
    let updatedEvents: ScheduleEvent[] = [];

    const isExisting = events.some(e => e.id === formEvent.id);

    if (isExisting) {
      // Update existing
      updatedEvents = events.map(e => 
          e.id === formEvent.id 
            ? { ...e, ...formEvent } 
            : e
      );
    } else {
      // Add new
      const newEvent: ScheduleEvent = {
        ...formEvent,
        createdAt: new Date().toISOString()
      };
      updatedEvents = [...events, newEvent];
    }

    setEvents(updatedEvents);
    setIsFormOpen(false);
    setEditingEvent(null);

    // Sync to Sheets
    await syncSchedulesWithGoogle(updatedEvents);
  };

  const handleDeleteEvent = async (id: string) => {
    const updatedEvents = events.filter(e => e.id !== id);
    setEvents(updatedEvents);

    // Sync to Sheets
    await syncSchedulesWithGoogle(updatedEvents);
  };

  const handleUpdateEvent = async (updatedEvent: ScheduleEvent) => {
    const updatedEvents = events.map(e => e.id === updatedEvent.id ? updatedEvent : e);
    setEvents(updatedEvents);
    if (selectedEventForDetail && selectedEventForDetail.id === updatedEvent.id) {
      setSelectedEventForDetail(updatedEvent);
    }
    await syncSchedulesWithGoogle(updatedEvents);
  };

  // Handle importing AI-parsed schedules
  const handleImportParsedEvents = async (imported: Omit<ScheduleEvent, 'id' | 'createdAt'>[]) => {
    const newEvents: ScheduleEvent[] = imported.map((item, idx) => ({
      id: `ai-${Date.now()}-${idx}`,
      title: item.title,
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      description: item.description,
      createdAt: new Date().toISOString()
    }));

    const updatedEvents = [...events, ...newEvents];
    setEvents(updatedEvents);

    // If we have an active day in the imported list, select it to show it immediately
    if (newEvents.length > 0) {
      setSelectedDate(newEvents[0].date);
      // Change calendar view to that month too
      const targetDate = new Date(newEvents[0].date);
      if (!isNaN(targetDate.getTime())) {
        setCurrentCalendarDate(targetDate);
      }
    }

    // Sync to Sheets
    await syncSchedulesWithGoogle(updatedEvents);

    // Close the uploader modal
    setIsUploaderOpen(false);

    alert(`AI가 성공적으로 ${newEvents.length}개의 일정을 인식하여 등록했습니다!`);
  };

  // Month navigation helper
  const handleNavigateMonth = (offset: number) => {
    setCurrentCalendarDate(prev => {
      const nextDate = new Date(prev);
      nextDate.setMonth(nextDate.getMonth() + offset);
      return nextDate;
    });
  };

  return (
    <div id="planner-app" className="min-h-screen bg-[#F3F4F6] flex justify-center py-0 sm:py-8 font-sans antialiased text-[#1A1A1A]">
      {/* Mobile Frame Container */}
      <div className="w-full max-w-md bg-[#F3F4F6] sm:rounded-[40px] flex flex-col min-h-screen sm:min-h-[850px] overflow-hidden relative">
        
        {/* App Header mimicking Bento style */}
        <header className="px-6 pt-7 pb-4 bg-[#F3F4F6] shrink-0 relative">
          <div className="flex justify-between items-end">
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-widest text-blue-600 mb-1">일정등록은 톡방에서 해주쇼</span>
              <h1 className="text-3xl font-black tracking-tight text-gray-900 leading-none">프다갤 벙 일정</h1>
            </div>

            {/* Sync status Indicator matching Bento Design */}
            <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-2xl shadow-xs border border-gray-200 text-xs font-bold shrink-0">
              <div className={`w-2 h-2 rounded-full ${
                syncStatus === 'syncing' ? 'bg-amber-400 animate-pulse' : syncStatus === 'error' ? 'bg-red-500' : 'bg-green-500'
              }`} />
              <span className="text-gray-600 text-[10px] font-black uppercase tracking-wider">
                {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'error' ? 'Err' : 'Sync Active'}
              </span>
            </div>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto px-5 py-2 space-y-5 pb-24">
          
          {/* AI Screenshot Uploader */}
          <div className="hidden">
            <ImageUploader
              onImportEvents={handleImportParsedEvents}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />
          </div>

          {/* Interactive Monthly Calendar View */}
          <CalendarView
            currentDate={currentCalendarDate}
            selectedDate={selectedDate}
            events={events}
            onSelectDate={setSelectedDate}
            onNavigateMonth={handleNavigateMonth}
            onTodayClick={() => {
              setTodayClickCount(prev => {
                const nextCount = prev + 1;
                if (nextCount >= 3) {
                  setIsUploaderOpen(true);
                  return 0; // reset
                }
                return nextCount;
              });
            }}
          />

          {/* Selected Date Schedule List View */}
          <EventListView
            selectedDate={selectedDate}
            events={events}
            onEditEvent={(ev) => {
              setEditingEvent(ev);
              setIsFormOpen(true);
            }}
            onDeleteEvent={handleDeleteEvent}
            onAddEventClick={() => {
              setEditingEvent(null);
              setIsFormOpen(true);
            }}
            onEventClick={setSelectedEventForDetail}
          />

        </main>

        {/* Floating Add Button in modern black bento layout */}
        <div className="absolute bottom-6 right-6 z-40">
          <button
            id="floating-add-btn"
            onClick={() => {
              setEditingEvent(null);
              setIsFormOpen(true);
            }}
            className="w-14 h-14 bg-black hover:bg-gray-800 active:scale-95 text-white rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl border border-white/10 transition-all cursor-pointer"
            title="일정 직접 추가"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {/* Manual Add / Edit Overlay Form */}
        {isFormOpen && (
          <EventForm
            selectedDate={selectedDate}
            editingEvent={editingEvent}
            onSave={handleSaveEvent}
            onCancel={() => {
              setIsFormOpen(false);
              setEditingEvent(null);
            }}
          />
        )}

        {/* Event Detail & Attendance Management Modal */}
        {selectedEventForDetail && (
          <EventDetailModal
            event={selectedEventForDetail}
            onClose={() => setSelectedEventForDetail(null)}
            onUpdateEvent={handleUpdateEvent}
          />
        )}

        {/* Hidden Admin/Easter Egg Image Uploader Modal */}
        {isUploaderOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-[#F3F4F6] rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="px-6 pt-6 pb-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-black tracking-tight text-gray-900">AI 일정 스캔</h3>
                </div>
                <button
                  onClick={() => setIsUploaderOpen(false)}
                  className="p-1.5 hover:bg-gray-200/70 rounded-full text-gray-400 hover:text-gray-700 transition"
                  title="닫기"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto px-6 pb-6">
                <p className="text-xs text-gray-500 mb-4 leading-relaxed font-semibold">
                  스크린샷 이미지를 업로드하여 일정을 한 번에 파싱하고 등록할 수 있습니다.
                </p>
                <ImageUploader
                  onImportEvents={handleImportParsedEvents}
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                />
              </div>
            </div>
          </div>
        )}

        {/* DB Sync Loading Overlay with Bouncy Sea/Swim Emojis */}
        {syncStatus === 'syncing' && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex flex-col items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative flex flex-col items-center justify-center bg-white/95 p-8 rounded-[32px] shadow-2xl border border-white/20 max-w-xs text-center overflow-hidden animate-in zoom-in-95 duration-200">
              {/* Spinning/Bouncing ocean themed illustration */}
              <div className="relative w-28 h-28 flex items-center justify-center mb-5">
                {/* Outer spinning ring spinner */}
                <div className="absolute inset-0 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                
                {/* Inner decorative circle */}
                <div className="absolute inset-2 bg-blue-50/70 rounded-full border border-blue-100/50 flex items-center justify-center">
                  {/* Water splash container shadow */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-14 h-4 bg-blue-200/50 blur-xs rounded-full"></div>
                </div>
                
                {/* Floating/bouncing emoji inside the spinner */}
                <div className="relative flex items-center justify-center z-10">
                  {/* Bouncing randomized sea emoji */}
                  <span className="text-3xl animate-ocean-bounce-1 inline-block select-none">
                    {currentSyncEmoji}
                  </span>
                </div>
              </div>
              
              {/* Text indicators */}
              <h3 className="text-sm font-black text-blue-900 tracking-tight flex items-center gap-1.5 justify-center">
                <span>실시간 데이터 동기화 중</span>
              </h3>
              <p className="text-[10px] text-blue-500/80 font-extrabold mt-1 leading-normal">
                캘린더 일정을 서버에 동기화하고 있습니다.<br/>잠시만 기다려주세요!
              </p>

              {/* Playful mini floating bubbles inside the card edges */}
              <div className="absolute -top-1 -left-1 text-xl animate-pulse delay-75">🫧</div>
              <div className="absolute -bottom-1 -right-1 text-2xl animate-pulse delay-300">🫧</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
