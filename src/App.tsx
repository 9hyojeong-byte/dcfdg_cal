import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, Plus, CheckCircle2, ShieldAlert, X, Zap, Download, Search } from 'lucide-react';
import { ScheduleEvent } from './types';
import CalendarView from './components/CalendarView';
import EventListView from './components/EventListView';
import EventForm from './components/EventForm';
import ImageUploader from './components/ImageUploader';
import EventDetailModal from './components/EventDetailModal';
import { fetchSchedules, saveSingleEvent, addAttendee, removeAttendee, renameAttendee } from './lib/supabaseApi';
import { getAuthorName } from './lib/authors';

function isEventDeleted(event: ScheduleEvent): boolean {
  if (!event.attendees) return false;
  return event.attendees.split(',').map(n => n.trim()).includes('삭제됨');
}

function isIOSDevice(): boolean {
  const ua = window.navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) return true;
  // iPadOS 13+ reports itself as "Macintosh" but exposes multi-touch
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
}

function isRunningStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

export default function App() {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date());
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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
  const [isStandalone, setIsStandalone] = useState(false);

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
    setIsStandalone(isRunningStandalone());

    const handler = (e: any) => {
      e.preventDefault();
      installPromptRef.current = e;
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const onInstalled = () => {
      installPromptRef.current = null;
      setCanInstall(false);
      setIsStandalone(true);
    };
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOSDevice()) {
      alert('홈 화면에 추가하기\n\n하단(또는 상단)의 공유 버튼을 누른 뒤 "홈 화면에 추가"를 선택해주세요.');
      return;
    }
    if (!installPromptRef.current) return;
    installPromptRef.current.prompt();
    const { outcome } = await installPromptRef.current.userChoice;
    if (outcome === 'accepted') {
      installPromptRef.current = null;
      setCanInstall(false);
    }
  };

  const showInstallButton = !isStandalone && (canInstall || isIOSDevice());

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
          const activeEvents = loadedEvents.filter(e => !isEventDeleted(e));
          const matched = activeEvents.find(e => String(e.id) === String(scheduleId));
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

  // 일정 자체(제목/날짜/장소 등)만 저장한다. 참석자는 절대 이 경로로
  // 통째로 동기화하지 않음 — 같은 일정을 두 사람이 거의 동시에 열어놓고
  // 있으면, 낡은 참석자 스냅샷이 서로의 변경을 덮어쓰는 버그가 생긴다.
  // 참석자 추가/삭제/작성자명 변경은 addAttendee/removeAttendee/
  // renameAttendee로 한 행만 건드릴 것.
  const syncSchedulesWithGoogle = async (changedEvent: ScheduleEvent, opts?: { isNew?: boolean }) => {
    setSyncStatus('syncing');
    try {
      await saveSingleEvent(changedEvent, opts);
      setSyncStatus('success');
    } catch (err) {
      console.error('Failed to save event:', err);
      setSyncStatus('error');
    }
  };

  const handleSaveEvent = async (formEvent: Omit<ScheduleEvent, 'createdAt'>) => {
    const existingEvent = events.find(e => String(e.id) === String(formEvent.id));
    const isNew = !existingEvent;
    const savedEvent: ScheduleEvent = isNew
      ? { ...formEvent, createdAt: new Date().toISOString() }
      : { ...existingEvent, ...formEvent };
    setEvents(
      isNew
        ? [...events, savedEvent]
        : events.map(e => String(e.id) === String(formEvent.id) ? savedEvent : e)
    );
    setIsFormOpen(false);
    setEditingEvent(null);

    await syncSchedulesWithGoogle(savedEvent, { isNew });

    // 기존 일정을 수정한 경우, 작성자명이 바뀌었으면 그 참석자 행 하나만
    // 동기화한다 (다른 참석자는 손대지 않음).
    if (!isNew && existingEvent) {
      const oldAuthorName = getAuthorName(existingEvent.attendees);
      const newAuthorName = getAuthorName(savedEvent.attendees);
      if (oldAuthorName !== newAuthorName) {
        try {
          if (oldAuthorName && newAuthorName) {
            await renameAttendee(savedEvent.id, oldAuthorName, newAuthorName);
          } else if (oldAuthorName && !newAuthorName) {
            await removeAttendee(savedEvent.id, oldAuthorName);
          } else if (newAuthorName) {
            await addAttendee(savedEvent.id, newAuthorName);
          }
        } catch (err) {
          console.error('Failed to sync author change:', err);
          setSyncStatus('error');
        }
      }
    }
  };

  const handleDeleteEvent = async (id: string) => {
    const target = events.find(e => String(e.id) === String(id));
    if (!target) return;
    const attendeesList = target.attendees ? target.attendees.split(',').map(n => n.trim()) : [];
    if (attendeesList.includes('삭제됨')) return;
    const updatedEvent = { ...target, attendees: [...attendeesList, '삭제됨'].join(', ') };
    setEvents(events.map(e => String(e.id) === String(id) ? updatedEvent : e));

    setSyncStatus('syncing');
    try {
      await addAttendee(id, '삭제됨');
      setSyncStatus('success');
    } catch (err) {
      console.error('Failed to delete event:', err);
      setSyncStatus('error');
    }
  };

  const handleAddAttendeeToEvent = async (eventId: string, nickname: string) => {
    const target = events.find(e => String(e.id) === String(eventId));
    if (!target) return;
    const attendeesList = target.attendees ? target.attendees.split(',').map(n => n.trim()).filter(Boolean) : [];
    const updatedEvent = { ...target, attendees: [...attendeesList, nickname].join(', ') };
    setEvents(events.map(e => String(e.id) === String(eventId) ? updatedEvent : e));
    if (selectedEventForDetail && String(selectedEventForDetail.id) === String(eventId)) setSelectedEventForDetail(updatedEvent);

    setSyncStatus('syncing');
    try {
      await addAttendee(eventId, nickname);
      setSyncStatus('success');
    } catch (err) {
      console.error('Failed to add attendee:', err);
      setSyncStatus('error');
    }
  };

  const handleRemoveAttendeeFromEvent = async (eventId: string, nickname: string) => {
    const target = events.find(e => String(e.id) === String(eventId));
    if (!target) return;
    const attendeesList = target.attendees ? target.attendees.split(',').map(n => n.trim()).filter(Boolean) : [];
    const updatedEvent = { ...target, attendees: attendeesList.filter(n => n !== nickname).join(', ') || null };
    setEvents(events.map(e => String(e.id) === String(eventId) ? updatedEvent : e));
    if (selectedEventForDetail && String(selectedEventForDetail.id) === String(eventId)) setSelectedEventForDetail(updatedEvent);

    setSyncStatus('syncing');
    try {
      await removeAttendee(eventId, nickname);
      setSyncStatus('success');
    } catch (err) {
      console.error('Failed to remove attendee:', err);
      setSyncStatus('error');
    }
  };

  const handleImportParsedEvents = async (imported: Omit<ScheduleEvent, 'id' | 'createdAt'>[]) => {
    const newEvents: ScheduleEvent[] = imported.map((item) => ({
      id: crypto.randomUUID(),
      title: item.title,
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      description: item.description,
      createdAt: new Date().toISOString()
    }));
    setEvents([...events, ...newEvents]);
    if (newEvents.length > 0) {
      setSelectedDate(newEvents[0].date);
      const targetDate = new Date(newEvents[0].date);
      if (!isNaN(targetDate.getTime())) setCurrentCalendarDate(targetDate);
    }
    setSyncStatus('syncing');
    try {
      await Promise.all(newEvents.map(ev => saveSingleEvent(ev, { isNew: true })));
      setSyncStatus('success');
    } catch (err) {
      console.error('Failed to save imported events:', err);
      setSyncStatus('error');
    }
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

  const handleSearch = () => {
    setSearchQuery(searchVal);
    if (searchVal.trim()) {
      localStorage.setItem('lastSearchAttendee', searchVal.trim());
    }
  };

  const handleClearSearch = () => {
    setSearchVal('');
    setSearchQuery('');
  };

  const filteredEvents = events.filter(e => {
    if (isEventDeleted(e)) return false;
    if (selectedLocation && (!e.location || !e.location.trim().includes(selectedLocation))) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const atts = e.attendees ? e.attendees.toLowerCase() : '';
      if (!atts.includes(q)) return false;
    }
    return true;
  });

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

            <div className="flex items-center gap-2">
              {/* Search Toggle Button */}
              <button
                onClick={() => {
                  const nextSearchOpen = !isSearchOpen;
                  setIsSearchOpen(nextSearchOpen);
                  if (nextSearchOpen) {
                    const lastSearch = localStorage.getItem('lastSearchAttendee') || '';
                    setSearchVal(lastSearch);
                  } else {
                    handleClearSearch();
                  }
                }}
                className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center cursor-pointer hover:bg-white/20 transition shadow-pop-sm text-white ${
                  isSearchOpen ? 'bg-white/30' : 'bg-transparent'
                }`}
                title="참석자 검색"
              >
                <Search className="w-4 h-4" strokeWidth={2.5} />
              </button>

              {/* 다운로드(설치) 버튼 */}
              {showInstallButton ? (
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
          </div>

          {/* ── Search Input Row ── */}
          {isSearchOpen && (
            <div className="relative mt-4 flex gap-2 animate-pop-in">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSearch();
                  }}
                  placeholder="참석자 이름 검색..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border-2 border-[#1E293B] bg-white text-xs font-bold text-[#1E293B] shadow-pop-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 transform -translate-y-1/2" />
              </div>
              <button
                onClick={handleSearch}
                className="px-4 py-1.5 rounded-xl border-2 border-[#1E293B] bg-[#FBBF24] text-[#1E293B] text-xs font-extrabold shadow-pop-sm btn-candy cursor-pointer"
              >
                검색
              </button>
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="px-3 py-1.5 rounded-xl border-2 border-[#1E293B] bg-red-500 text-white text-xs font-extrabold shadow-pop-sm btn-candy cursor-pointer"
                >
                  초기화
                </button>
              )}
            </div>
          )}
        </header>

        {/* ── Scrollable Content ── */}
        <main className="flex-1 overflow-y-auto px-5 py-2 space-y-4 pb-28">
          <CalendarView
            currentDate={currentCalendarDate}
            selectedDate={selectedDate}
            events={filteredEvents}
            onSelectDate={setSelectedDate}
            onNavigateMonth={handleNavigateMonth}
            onTodayClick={() => {
              setTodayClickCount(prev => {
                const next = prev + 1;
                if (next >= 3) { setIsUploaderOpen(true); return 0; }
                return next;
              });
            }}
            selectedLocation={selectedLocation}
            onSelectLocation={setSelectedLocation}
          />

          <EventListView
            selectedDate={selectedDate}
            currentMonth={currentCalendarDate}
            events={filteredEvents}
            onEditEvent={(ev) => { setEditingEvent(ev); setIsFormOpen(true); }}
            onDeleteEvent={handleDeleteEvent}
            onAddEventClick={() => { setEditingEvent(null); setIsFormOpen(true); }}
            onEventClick={handleOpenEventDetail}
            onSelectDate={setSelectedDate}
            searchQuery={searchQuery}
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
            onAddAttendee={(nickname) => handleAddAttendeeToEvent(selectedEventForDetail.id, nickname)}
            onRemoveAttendee={(nickname) => handleRemoveAttendeeFromEvent(selectedEventForDetail.id, nickname)}
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
