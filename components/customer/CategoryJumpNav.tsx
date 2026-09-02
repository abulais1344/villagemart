'use client';

const JUMP_CATEGORIES = [
  { id: 'section-food',       emoji: '🍛', label: 'Food'      },
  { id: 'section-chicken',    emoji: '🍗', label: 'Chicken'   },
  { id: 'section-paneer',     emoji: '🧀', label: 'Paneer'    },
  { id: 'section-pharmacy',   emoji: '💊', label: 'Pharmacy'  },
  { id: 'section-bakery',     emoji: '🍰', label: 'Bakery'    },
  { id: 'section-vegetables', emoji: '🥦', label: 'Vegetables'},
];

export function CategoryJumpNav() {
  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
      {JUMP_CATEGORIES.map(({ id, emoji, label }) => (
        <button
          key={id}
          onClick={() => scrollTo(id)}
          className="shrink-0 flex items-center gap-1.5 bg-[#F5F5F7] border border-[#E5E7EB] rounded-full px-3 py-1.5 text-xs font-medium text-[#1A1A1A] active:bg-[#E5E7EB] transition-colors"
        >
          <span className="text-sm leading-none">{emoji}</span>
          <span className="whitespace-nowrap">{label}</span>
        </button>
      ))}
    </div>
  );
}
