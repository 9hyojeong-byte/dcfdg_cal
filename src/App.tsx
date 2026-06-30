import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, Plus, CheckCircle2, ShieldAlert, X, Zap, Download } from 'lucide-react';
import { ScheduleEvent } from './types';
import CalendarView from './components/CalendarView';
import EventListView from './components/EventListView';
import EventForm from './components/EventForm';
import ImageUploader from './components/ImageUploader';
import EventDetailModal from './components/EventDetailModal';
import { fetchSchedules, saveSchedules } from './lib/gasApi';

export default function App() {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date());

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [selectedEventForDetail, setSelectedEventForDetail] = useState<ScheduleEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [currentSyncEmoji, setCurrentSyncEmoji] = useState('🌊');

  const [todayClickCount, setTodayClickCount] = useState(0);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const installPromptRef = useRef<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const initialDeepLinkChecked = useRef(false);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleOpenEventDetail = (event: ScheduleEvent) => {
    setSelectedEventForDetail(event);
    const newUrl = `${window.location.origin}${window.location.pathname}?scheduleId=${event.id}`;
    window.history.replaceState({}, document.title, newUrl);
  };

  const handleCloseEventDetail = () => {
    setSelectedEventForDetail(null);
    const newUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.replaceState({}, document.title, newUrl);
  };

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      installPromptRef.current = e;
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPromptRef.current) return;
    installPromptRef.current.prompt();
    const { outcome } = await installPromptRef.current.userChoice;
    if (outcome === 'accepted') {
      installPromptRef.current = null;
      setCanInstall(false);
    }
  };

  useEffect(() => {
    if (syncStatus === 'syncing') {
      const seaEmojis = ['🌊', '🏊', '🐬', '🐳', '🐋', '🦈', '🐙', '🦑', '🐠', '🐡', '🦀', '🦞', '🦐', '🐚', '🐧', '⛵', '🏄', '🚣', '🦦', '🧜', '🦭'];
      setCurrentSyncEmoji(seaEmojis[Math.floor(Math.random() * seaEmojis.length)]);
    }
  }, [syncStatus]);


  const loadDataFromGAS = useCallback(async () => {
    setIsLoading(true);
    setSyncStatus('syncing');
    try {
      const loadedEvents = await fetchSchedules();
      setEvents(loadedEvents);
      setSyncStatus('success');

      // Process deep link if not checked yet
      if (!initialDeepLinkChecked.current) {
        initialDeepLinkChecked.current = true;
        const params = new URLSearchParams(window.location.search);
        const scheduleId = params.get('scheduleId');
        if (scheduleId) {
          const activeEvents = loadedEvents.filter(e => e.attendees !== '삭제됨');
          const matched = activeEvents.find(e => e.id === scheduleId);
          if (matched) {
            setSelectedEventForDetail(matched);
            const targetDate = new Date(matched.date);
            if (!isNaN(targetDate.getTime())) {
              setCurrentCalendarDate(targetDate);
              setSelectedDate(matched.date);
            }
          } else {
            // Show error toast
            setToastMessage('존재하지 않거나 삭제된 일정입니다.');
            // Clean URL query parameter
            const newUrl = `${window.location.origin}${window.location.pathname}`;
            window.history.replaceState({}, document.title, newUrl);
          }
        }
      }
    } catch (err) {
      console.error('Error syncing with Google Apps Script:', err);
      setSyncStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDataFromGAS();
  }, [loadDataFromGAS]);

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

  const handleSaveEvent = async (formEvent: Omit<ScheduleEvent, 'createdAt'>) => {
    let updatedEvents: ScheduleEvent[] = [];
    const isExisting = events.some(e => e.id === formEvent.id);
    if (isExisting) {
      updatedEvents = events.map(e => e.id === formEvent.id ? { ...e, ...formEvent } : e);
    } else {
      updatedEvents = [...events, { ...formEvent, createdAt: new Date().toISOString() }];
    }
    setEvents(updatedEvents);
    setIsFormOpen(false);
    setEditingEvent(null);
    syncSchedulesWithGoogle(updatedEvents);
  };

  const handleDeleteEvent = async (id: string) => {
    const updatedEvents = events.map(e =>
      e.id === id ? { ...e, attendees: '삭제됨' } : e
    );
    setEvents(updatedEvents);
    syncSchedulesWithGoogle(updatedEvents);
  };

  const handleUpdateEvent = async (updatedEvent: ScheduleEvent) => {
    const updatedEvents = events.map(e => e.id === updatedEvent.id ? updatedEvent : e);
    setEvents(updatedEvents);
    if (selectedEventForDetail?.id === updatedEvent.id) setSelectedEventForDetail(updatedEvent);
    syncSchedulesWithGoogle(updatedEvents);
  };

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
    if (newEvents.length > 0) {
      setSelectedDate(newEvents[0].date);
      const targetDate = new Date(newEvents[0].date);
      if (!isNaN(targetDate.getTime())) setCurrentCalendarDate(targetDate);
    }
    syncSchedulesWithGoogle(updatedEvents);
    setIsUploaderOpen(false);
    alert(`AI가 성공적으로 ${newEvents.length}개의 일정을 인식하여 등록했습니다!`);
  };

  const handleNavigateMonth = (offset: number) => {
    setCurrentCalendarDate(prev => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + offset);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#FFFDF5] dot-grid flex justify-center py-0 sm:py-10 relative overflow-hidden">

      {/* ── Desktop decorative shapes (hidden on mobile) ── */}
      <div className="absolute top-16 left-10 w-28 h-28 rounded-full bg-[#FBBF24] border-2 border-[#1E293B] opacity-70 hidden sm:block" />
      <div className="absolute top-16 left-10 w-28 h-28 rounded-full stripe-fill hidden sm:block" />
      <div className="absolute bottom-24 right-12 w-20 h-20 rounded-full bg-[#F472B6] border-2 border-[#1E293B] opacity-60 hidden sm:block" />
      <div className="absolute top-1/2 right-20 w-12 h-12 rotate-45 bg-[#34D399] border-2 border-[#1E293B] opacity-60 hidden sm:block" />
      <div className="absolute bottom-16 left-16 w-10 h-10 rounded-full bg-[#8B5CF6] border-2 border-[#1E293B] opacity-50 hidden sm:block" />
      <div className="absolute top-1/3 left-24 w-6 h-6 rotate-12 bg-[#38BDF8] border-2 border-[#1E293B] opacity-60 hidden sm:block" />

      {/* ── Main App Card ── */}
      <div className="w-full max-w-[448px] bg-[#FFFDF5] sm:rounded-3xl flex flex-col min-h-screen sm:min-h-[860px] overflow-hidden relative sm:border-2 sm:border-[#1E293B] sm:shadow-pop-xl">

        {/* ── Header ── */}
        <header className="relative px-5 pt-6 pb-5 shrink-0 overflow-hidden">
          {/* Background accent strip */}
          <div className="absolute inset-0 bg-[#8B5CF6]" />
          {/* Decorative circles */}
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-[#7C3AED] opacity-60" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-[#A78BFA] opacity-40" />
          <div className="absolute top-2 right-20 w-8 h-8 rounded-full bg-[#FBBF24] border-2 border-[#1E293B] opacity-80" />

          <div className="relative flex justify-between items-center">
            {/* Title block */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-violet-200">
                갤훈 : 발사대 학대금지
              </span>
              <h1 className="font-display text-[28px] font-extrabold tracking-tight text-white leading-none drop-shadow-sm">
                프다갤 <span className="text-[#FBBF24]">벙</span> 일정
              </h1>
            </div>

            {/* 다운로드(설치) 버튼 */}
            {canInstall ? (
              <button
                onClick={handleInstall}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-white text-[10px] font-bold bg-[#FBBF24] text-[#1E293B] shadow-pop-sm btn-candy cursor-pointer"
              >
                <Download className="w-3 h-3" strokeWidth={2.5} />
                <span>다운로드</span>
              </button>
            ) : (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-white/40 text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm
                ${syncStatus === 'error'
                  ? 'bg-red-500/80 text-white'
                  : syncStatus === 'syncing'
                    ? 'bg-[#FBBF24]/90 text-[#1E293B]'
                    : 'bg-white/20 text-white'}`}>
                {syncStatus === 'error'
                  ? <ShieldAlert className="w-3 h-3" strokeWidth={2.5} />
                  : syncStatus === 'syncing'
                    ? <span className="animate-spin inline-block">⟳</span>
                    : <CheckCircle2 className="w-3 h-3" strokeWidth={2.5} />}
                <span>
                  {syncStatus === 'syncing' ? 'Sync...' : syncStatus === 'error' ? 'Error' : 'Live'}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* ── Scrollable Content ── */}
        <main className="flex-1 overflow-y-auto px-5 py-2 space-y-4 pb-28">
          <CalendarView
            currentDate={currentCalendarDate}
            selectedDate={selectedDate}
            events={events.filter(e => e.attendees !== '삭제됨')}
            onSelectDate={setSelectedDate}
            onNavigateMonth={handleNavigateMonth}
            onTodayClick={() => {
              setTodayClickCount(prev => {
                const next = prev + 1;
                if (next >= 3) { setIsUploaderOpen(true); return 0; }
                return next;
              });
            }}
          />

          <EventListView
            selectedDate={selectedDate}
            currentMonth={currentCalendarDate}
            events={events.filter(e => e.attendees !== '삭제됨')}
            onEditEvent={(ev) => { setEditingEvent(ev); setIsFormOpen(true); }}
            onDeleteEvent={handleDeleteEvent}
            onAddEventClick={() => { setEditingEvent(null); setIsFormOpen(true); }}
            onEventClick={handleOpenEventDetail}
            onSelectDate={setSelectedDate}
          />
        </main>

        {/* ── Floating Add Button (Candy Style) ── */}
        <div className="absolute bottom-6 right-5 z-40">
          <button
            onClick={() => { setEditingEvent(null); setIsFormOpen(true); }}
            className="w-14 h-14 bg-[#8B5CF6] text-white rounded-full border-2 border-[#1E293B] shadow-pop flex items-center justify-center btn-candy cursor-pointer"
            title="일정 추가"
          >
            <Plus className="w-6 h-6" strokeWidth={2.5} />
          </button>
        </div>

        {/* ── Event Form Modal ── */}
        {isFormOpen && (
          <EventForm
            selectedDate={selectedDate || new Date().toISOString().slice(0, 10)}
            editingEvent={editingEvent}
            onSave={handleSaveEvent}
            onCancel={() => { setIsFormOpen(false); setEditingEvent(null); }}
          />
        )}

        {/* ── Event Detail Modal ── */}
        {selectedEventForDetail && (
          <EventDetailModal
            event={selectedEventForDetail}
            onClose={handleCloseEventDetail}
            onUpdateEvent={handleUpdateEvent}
          />
        )}

        {/* ── AI Image Uploader Modal (Easter Egg) ── */}
        {isUploaderOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E293B]/70 backdrop-blur-sm">
            <div className="bg-[#FFFDF5] rounded-3xl w-full max-w-sm overflow-hidden border-2 border-[#1E293B] shadow-pop-lg flex flex-col max-h-[90vh] animate-pop-in">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b-2 border-[#1E293B] bg-[#8B5CF6]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-white border-2 border-[#1E293B] flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-[#8B5CF6]" strokeWidth={2.5} />
                  </div>
                  <h3 className="font-display text-lg font-extrabold text-white tracking-tight">AI 일정 스캔</h3>
                </div>
                <button
                  onClick={() => setIsUploaderOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/40 border border-white/40 flex items-center justify-center text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <p className="text-xs text-[#64748B] mb-4 leading-relaxed font-medium">
                  스크린샷을 업로드하면 AI가 일정을 자동으로 파싱합니다.
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

        {/* ── Sync Loading Overlay ── */}
        {isLoading && syncStatus === 'syncing' && (
          <div className="fixed inset-0 bg-[#1E293B]/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="relative flex flex-col items-center bg-white p-8 rounded-3xl border-2 border-[#1E293B] shadow-pop-lg max-w-xs text-center animate-pop-in">
              <div className="relative w-24 h-24 flex items-center justify-center mb-5">
                <div className="absolute inset-0 border-4 border-violet-100 border-t-[#8B5CF6] rounded-full animate-spin" />
                <div className="absolute inset-2 bg-violet-50 rounded-full border border-violet-100" />
                <span className="relative text-3xl animate-ocean-bounce-1 z-10 select-none">{currentSyncEmoji}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#FBBF24] border-2 border-[#1E293B] absolute -top-3 -right-3 flex items-center justify-center">
                <Zap className="w-4 h-4 text-[#1E293B]" strokeWidth={2.5} />
              </div>
              <h3 className="font-display text-sm font-extrabold text-[#1E293B] tracking-tight">
                실시간 데이터 동기화 중
              </h3>
              <p className="text-[10px] text-[#64748B] font-bold mt-1 leading-relaxed">
                캘린더 일정을 서버에 동기화 중입니다.<br />잠시만 기다려주세요!
              </p>
              <div className="absolute -bottom-2 -left-2 text-lg animate-pulse">🫧</div>
            </div>
          </div>
        )}
      </div>

      {/* Global Error/Info Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-[#1E293B] text-white text-xs font-bold px-5 py-3 rounded-full border-2 border-[#1E293B] shadow-pop z-50 animate-pop-in flex items-center gap-2 whitespace-nowrap">
          <span>⚠️</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
