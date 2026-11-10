import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X, Check, RotateCcw } from 'lucide-react';
import { formatDateDDMMYYYY, parseDateToISO } from '../utils/auditHelper';

interface SmartDateInputProps {
  id?: string;
  ariaLabel?: string;
  value: string;
  onChange: (newDateISO: string) => void;
  placeholder?: string;
  theme?: 'light' | 'dark';
  hasError?: boolean;
  disabled?: boolean;
  className?: string;
}

const ARABIC_MONTHS = [
  'يناير (01)',
  'فبراير (02)',
  'مارس (03)',
  'أبريل (04)',
  'مايو (05)',
  'يونيو (06)',
  'يوليو (07)',
  'أغسطس (08)',
  'سبتمبر (09)',
  'أكتوبر (10)',
  'نوفمبر (11)',
  'ديسمبر (12)',
];

const ARABIC_DAYS_SHORT = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export const SmartDateInput: React.FC<SmartDateInputProps> = ({
  id,
  ariaLabel,
  value,
  onChange,
  placeholder = 'dd/mm/yyyy',
  theme = 'light',
  hasError = false,
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [textVal, setTextVal] = useState(() => formatDateDDMMYYYY(value));
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync textVal when external value changes
  useEffect(() => {
    setTextVal(formatDateDDMMYYYY(value));
  }, [value]);

  // Parse current value for calendar view month/year
  const getInitialViewDate = () => {
    const iso = parseDateToISO(value);
    if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const [y, m, d] = iso.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      if (!isNaN(dt.getTime())) return dt;
    }
    return new Date();
  };

  const [viewDate, setViewDate] = useState<Date>(getInitialViewDate);

  useEffect(() => {
    if (isOpen) {
      setViewDate(getInitialViewDate());
    }
  }, [isOpen, value]);

  // Close popover on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow clearing
    if (!raw.trim()) {
      setTextVal('');
      onChange('');
      return;
    }

    // Format digits into dd/mm/yyyy while typing if user enters numbers
    const digitsOnly = raw.replace(/[^\d/]/g, '');
    let formatted = digitsOnly;

    if (!raw.includes('/') && /^\d+$/.test(digitsOnly)) {
      if (digitsOnly.length <= 2) {
        formatted = digitsOnly;
      } else if (digitsOnly.length <= 4) {
        formatted = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`;
      } else {
        formatted = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4, 8)}`;
      }
    }

    setTextVal(formatted);

    // Check if complete dd/mm/yyyy
    const match = formatted.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const d = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const y = parseInt(match[3], 10);
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1980 && y <= 2100) {
        const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        onChange(iso);
      }
    }
  };

  const handleBlur = () => {
    if (!textVal.trim()) {
      onChange('');
      return;
    }
    const iso = parseDateToISO(textVal);
    if (iso) {
      onChange(iso);
      setTextVal(formatDateDDMMYYYY(iso));
    } else {
      // Revert to valid formatted value if invalid
      setTextVal(formatDateDDMMYYYY(value));
    }
  };

  const selectDay = (day: number) => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth() + 1;
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(iso);
    setTextVal(formatDateDDMMYYYY(iso));
    setIsOpen(false);
  };

  const handleSetToday = () => {
    const now = new Date();
    const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    onChange(iso);
    setTextVal(formatDateDDMMYYYY(iso));
    setViewDate(now);
    setIsOpen(false);
  };

  const handleAddOneYear = () => {
    const base = getInitialViewDate();
    base.setFullYear(base.getFullYear() + 1);
    const iso = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
    onChange(iso);
    setTextVal(formatDateDDMMYYYY(iso));
    setViewDate(base);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTextVal('');
    onChange('');
    setIsOpen(false);
  };

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const selectedISO = parseDateToISO(value);
  const todayNow = new Date();
  const todayISO = `${todayNow.getFullYear()}-${String(todayNow.getMonth() + 1).padStart(2, '0')}-${String(todayNow.getDate()).padStart(2, '0')}`;

  // Generate years array (2015 to 2040)
  const years = Array.from({ length: 26 }, (_, i) => 2015 + i);

  const isDark = theme === 'dark';

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div
        className={`flex items-center justify-between rounded-xl border-2 transition-all overflow-hidden ${
          hasError
            ? 'border-red-500 bg-red-50/80'
            : isDark
            ? 'bg-slate-950 border-amber-500/60 hover:border-amber-400 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-500/30'
            : 'bg-white border-slate-300 hover:border-amber-500 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20'
        }`}
      >
        {/* Left-to-right input so DD is on the LEFT, MM in the MIDDLE, YYYY on the RIGHT */}
        <input
          id={id}
          aria-label={ariaLabel}
          type="text"
          dir="ltr"
          disabled={disabled}
          value={textVal}
          onChange={handleTextChange}
          onBlur={handleBlur}
          onFocus={() => !disabled && setIsOpen(true)}
          placeholder={placeholder}
          className={`w-full px-2.5 py-1.5 text-xs font-mono font-black tracking-wider text-center focus:outline-none ${
            isDark ? 'bg-transparent text-white placeholder-slate-500' : 'bg-transparent text-slate-950 placeholder-slate-400'
          }`}
        />

        <div className="flex items-center gap-0.5 pl-1.5 pr-1 shrink-0">
          {textVal && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              title="مسح التاريخ"
              className={`p-1 rounded-lg transition cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-red-400 hover:bg-slate-800' : 'text-slate-400 hover:text-red-600 hover:bg-slate-100'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsOpen((prev) => !prev)}
            title="فتح التقويم الاحترافي (يوم/شهر/سنة DD/MM/YYYY)"
            className={`p-1.5 rounded-lg transition cursor-pointer flex items-center justify-center ${
              isDark
                ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/40'
                : 'bg-amber-100 text-amber-900 hover:bg-amber-500 hover:text-white border border-amber-300'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Format preview pill showing Day (Left) / Month (Middle) / Year (Right) */}
      {textVal && (
        <div
          dir="ltr"
          className={`mt-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-black flex items-center justify-center gap-1 border ${
            isDark
              ? 'bg-slate-900/90 text-amber-300 border-amber-500/30'
              : 'bg-amber-50/90 text-slate-900 border-amber-300'
          }`}
        >
          <span>📅</span>
          <span className="tracking-widest">{formatDateDDMMYYYY(value || textVal)}</span>
        </div>
      )}

      {/* Chic Royal Calendar Popover */}
      {isOpen && !disabled && (
        <div
          className="absolute z-[120] mt-1.5 left-0 right-0 min-w-[285px] sm:min-w-[305px] bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white border-2 border-amber-500 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-3.5 animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Popover Header: Format Legend */}
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span className="text-[11px] font-black text-amber-300">التقويم الذكي</span>
            </div>
            <span
              dir="ltr"
              className="text-[10px] font-mono font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full"
            >
              DD / MM / YYYY
            </span>
          </div>

          {/* Month & Year Navigation */}
          <div className="flex items-center justify-between gap-1.5 mb-3">
            <button
              type="button"
              onClick={() => setViewDate(new Date(currentYear, currentMonth - 1, 1))}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 border border-slate-700 transition cursor-pointer"
              title="الشهر السابق"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 flex-1 justify-center">
              <select
                value={currentMonth}
                onChange={(e) => setViewDate(new Date(currentYear, Number(e.target.value), 1))}
                className="bg-slate-900 border border-amber-500/40 rounded-lg px-2 py-1 text-[11px] font-black text-amber-300 focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                {ARABIC_MONTHS.map((mName, idx) => (
                  <option key={mName} value={idx} className="bg-slate-900 text-white">
                    {mName}
                  </option>
                ))}
              </select>

              <select
                value={currentYear}
                onChange={(e) => setViewDate(new Date(Number(e.target.value), currentMonth, 1))}
                className="bg-slate-900 border border-amber-500/40 rounded-lg px-2 py-1 text-[11px] font-mono font-black text-white focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                {!years.includes(currentYear) && (
                  <option value={currentYear} className="bg-slate-900 text-white">
                    {currentYear}
                  </option>
                )}
                {years.map((yr) => (
                  <option key={yr} value={yr} className="bg-slate-900 text-white">
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setViewDate(new Date(currentYear, currentMonth + 1, 1))}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 border border-slate-700 transition cursor-pointer"
              title="الشهر التالي"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 mb-1.5 text-center">
            {ARABIC_DAYS_SHORT.map((dayName) => (
              <div
                key={dayName}
                className="text-[9.5px] font-black text-slate-400 py-1 bg-slate-900/70 rounded-md"
              >
                {dayName.replace('ال', '')}
              </div>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-8" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const cellISO = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isSelected = selectedISO === cellISO;
              const isToday = todayISO === cellISO;

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => selectDay(dayNum)}
                  className={`h-8 rounded-xl font-mono text-xs font-black transition-all flex items-center justify-center cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/30 scale-105 border border-white'
                      : isToday
                      ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-400 hover:bg-emerald-800'
                      : 'bg-slate-900/60 hover:bg-slate-800 text-slate-200 hover:text-amber-300 border border-slate-800/80'
                  }`}
                >
                  {String(dayNum).padStart(2, '0')}
                </button>
              );
            })}
          </div>

          {/* Selected Date Preview in DD/MM/YYYY */}
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-bold">التاريخ (يوم/شهر/سنة):</span>
            <span
              dir="ltr"
              className="font-mono font-black text-amber-300 bg-slate-900 px-2.5 py-0.5 rounded-lg border border-amber-500/40 tracking-wider"
            >
              {textVal || 'DD/MM/YYYY'}
            </span>
          </div>

          {/* Quick Action Footer Buttons */}
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
            <button
              type="button"
              onClick={handleSetToday}
              className="flex-1 py-1.5 px-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-[11px] font-black transition cursor-pointer flex items-center justify-center gap-1"
            >
              <Check className="w-3 h-3" />
              <span>اليوم</span>
            </button>

            <button
              type="button"
              onClick={handleAddOneYear}
              className="flex-1 py-1.5 px-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl text-[11px] font-black transition cursor-pointer flex items-center justify-center gap-1"
              title="إضافة سنة كاملة على التاريخ المحدد"
            >
              <span>+1 سنة</span>
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="py-1.5 px-2.5 bg-red-950/80 hover:bg-red-800 text-rose-200 border border-red-700/60 rounded-xl text-[11px] font-black transition cursor-pointer flex items-center justify-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>مسح</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
