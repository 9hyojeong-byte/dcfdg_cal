export const LOCATION_COLORS = {
  '딥스': {
    bg: 'bg-[#3B82F6]',
    text: 'text-[#3B82F6]',
    border: 'border-[#3B82F6]',
    hoverBorder: 'hover:border-[#3B82F6]',
    hoverText: 'hover:text-[#3B82F6]',
  },
  '성남': {
    bg: 'bg-[#10B981]',
    text: 'text-[#10B981]',
    border: 'border-[#10B981]',
    hoverBorder: 'hover:border-[#10B981]',
    hoverText: 'hover:text-[#10B981]',
  },
  '파라': {
    bg: 'bg-[#EF4444]',
    text: 'text-[#EF4444]',
    border: 'border-[#EF4444]',
    hoverBorder: 'hover:border-[#EF4444]',
    hoverText: 'hover:text-[#EF4444]',
  },
  '수원': {
    bg: 'bg-[#F97316]',
    text: 'text-[#F97316]',
    border: 'border-[#F97316]',
    hoverBorder: 'hover:border-[#F97316]',
    hoverText: 'hover:text-[#F97316]',
  },
  '자유일정': {
    bg: 'bg-[#8B5CF6]',
    text: 'text-[#8B5CF6]',
    border: 'border-[#8B5CF6]',
    hoverBorder: 'hover:border-[#8B5CF6]',
    hoverText: 'hover:text-[#8B5CF6]',
  },
} as const;

export type LocationKey = keyof typeof LOCATION_COLORS;

export function getDotColorClass(location: string | null | undefined): string {
  if (!location) return 'bg-slate-400';
  const trimmed = location.trim();
  for (const key of Object.keys(LOCATION_COLORS) as LocationKey[]) {
    if (trimmed.includes(key)) {
      return LOCATION_COLORS[key].bg;
    }
  }
  return 'bg-slate-400';
}
