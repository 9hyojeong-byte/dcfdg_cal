import React, { useState } from 'react';
import { Lock } from 'lucide-react';

interface PasswordPromptModalProps {
  message: string;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}

export default function PasswordPromptModal({ message, onSubmit, onCancel }: PasswordPromptModalProps) {
  const [value, setValue] = useState('');

  const handleSubmit = () => onSubmit(value);

  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 bg-[#1E293B]/70 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-pop-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#FFFDF5] rounded-3xl w-full max-w-[280px] border-2 border-[#1E293B] shadow-pop-lg flex flex-col p-5 space-y-4"
      >
        <div className="text-center space-y-2">
          <div className="w-10 h-10 mx-auto rounded-full bg-violet-50 border-2 border-[#1E293B] flex items-center justify-center">
            <Lock className="w-4 h-4 text-[#8B5CF6]" strokeWidth={2.5} />
          </div>
          <p className="text-xs font-bold text-[#1E293B] px-1 leading-relaxed">{message}</p>
        </div>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoFocus
          maxLength={20}
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ''))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); handleSubmit(); }
          }}
          placeholder="비밀번호 (숫자)"
          className="w-full px-4 py-3 border-2 border-[#CBD5E1] bg-white rounded-xl text-sm font-semibold text-[#1E293B] text-center tracking-widest input-geo transition placeholder:text-[#94A3B8]"
        />
        <div className="flex flex-col gap-2">
          <button
            onClick={handleSubmit}
            className="w-full py-2.5 bg-[#8B5CF6] text-white font-extrabold text-xs rounded-full border-2 border-[#1E293B] shadow-pop-sm hover:bg-[#7C3AED] transition btn-candy cursor-pointer"
          >
            확인
          </button>
          <button
            onClick={onCancel}
            className="w-full py-2 bg-white text-[#1E293B] font-bold text-xs rounded-full border-2 border-[#1E293B] shadow-pop-sm hover:bg-[#F1F5F9] transition btn-candy cursor-pointer"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
