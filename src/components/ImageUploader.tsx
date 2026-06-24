import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, Sparkles, AlertCircle, CheckCircle2, List, Trash2 } from 'lucide-react';
import { ScheduleEvent } from '../types';

interface ImageUploaderProps {
  onImportEvents: (importedEvents: Omit<ScheduleEvent, 'id' | 'createdAt'>[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export default function ImageUploader({
  onImportEvents,
  isLoading,
  setIsLoading,
}: ImageUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Storing extracted events for review before committing to calendar
  const [extractedEvents, setExtractedEvents] = useState<Omit<ScheduleEvent, 'id' | 'createdAt'>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('이미지 파일(*.png, *.jpg, *.jpeg 등)만 업로드할 수 있습니다.');
      return;
    }

    setError(null);
    setIsLoading(true);
    setExtractedEvents([]);

    // Create a local preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Read file as Base64 for Server Gemini API
    const base64Reader = new FileReader();
    base64Reader.onload = async () => {
      try {
        const base64String = base64Reader.result as string;
        
        const response = await fetch('/api/analyze-screenshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64String,
            mimeType: file.type
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || '스크린샷을 분석하는 동안 오류가 발생했습니다.');
        }

        const data = await response.json();
        
        if (data.events && data.events.length > 0) {
          setExtractedEvents(data.events);
        } else {
          setError('이미지에서 일정을 감지하지 못했습니다. 명확한 일정이 포함된 스크린샷인지 확인해주세요.');
        }
      } catch (err: any) {
        console.error('Analysis failed:', err);
        setError(err.message || '스크린샷 분석에 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    base64Reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleConfirmImport = () => {
    if (extractedEvents.length === 0) return;
    onImportEvents(extractedEvents);
    // Reset state after import
    setExtractedEvents([]);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveExtractedEvent = (index: number) => {
    setExtractedEvents(prev => prev.filter((_, idx) => idx !== index));
  };

  return (
    <div id="image-uploader-wrapper" className="space-y-4">
      {/* Upload Box Area */}
      {extractedEvents.length === 0 && (
        <div
          id="drag-drop-area"
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          className={`bg-white rounded-[32px] p-5 shadow-xs border transition-all flex items-center justify-center gap-4 cursor-pointer group
            ${dragActive 
              ? 'border-blue-500 bg-blue-50/50 scale-[0.98]' 
              : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50/50'
            }
            ${isLoading ? 'pointer-events-none opacity-80' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {isLoading ? (
            <div className="flex items-center gap-4 py-1.5 w-full justify-center">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
                <Sparkles className="w-4.5 h-4.5 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="text-left">
                <p className="font-extrabold text-gray-800 text-sm leading-tight">AI 분석 중...</p>
                <p className="text-[10px] text-gray-400 mt-0.5 font-medium">스크린샷 글자를 파싱하는 중입니다.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-110 transition duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-black text-gray-800">스크린샷 스캔</p>
                  <span className="px-1.5 py-0.5 bg-blue-50 text-[9px] font-bold text-blue-600 rounded-md flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5" />
                    AI
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 uppercase tracking-tighter mt-0.5">
                  이미지를 드래그하거나 선택하여 일정 자동 생성
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Error Notice */}
      {error && (
        <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-100 rounded-[24px] text-xs text-red-700 animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">오류 발생</p>
            <p className="mt-0.5 text-red-600/90 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Extracted Events Preview Checklist */}
      {extractedEvents.length > 0 && (
        <div id="review-area" className="bg-white border border-gray-200 rounded-[32px] p-5 space-y-4 shadow-xs animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-blue-700">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h4 className="text-sm font-black">AI 인식 결과 ({extractedEvents.length}건)</h4>
            </div>
            <button
              onClick={() => {
                setExtractedEvents([]);
                setPreviewUrl(null);
              }}
              className="text-xs text-gray-400 hover:text-gray-600 font-bold"
            >
              다시 업로드
            </button>
          </div>

          {/* Uploaded Thumbnail and Extracted Cards list */}
          <div className="flex gap-3 items-stretch max-h-56 overflow-hidden">
            {previewUrl && (
              <div className="w-20 shrink-0 relative rounded-2xl overflow-hidden border border-gray-200 bg-white flex items-center justify-center">
                <img src={previewUrl} alt="Uploaded preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                  <ImageIcon className="w-4 h-4 text-white drop-shadow-sm" />
                </div>
              </div>
            )}

            {/* Extracted list list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-52">
              {extractedEvents.map((ev, idx) => (
                <div key={idx} className="bg-gray-50/50 border border-gray-150 rounded-2xl p-3 relative group flex flex-col gap-1">
                  <button
                    onClick={() => handleRemoveExtractedEvent(idx)}
                    className="absolute right-2 top-2 p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                    title="제거"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <p className="text-xs font-bold text-gray-800 pr-6 leading-tight">{ev.title}</p>
                  
                  <div className="flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-gray-400">
                    <span className="font-semibold text-blue-600">{ev.date}</span>
                    {ev.startTime && (
                      <span>
                        {ev.startTime} ~ {ev.endTime || ''}
                      </span>
                    )}
                    {ev.description && (
                      <span className="text-gray-500 italic truncate max-w-[120px]">- {ev.description}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <button
              onClick={handleConfirmImport}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>캘린더에 일정 추가 및 동기화</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
