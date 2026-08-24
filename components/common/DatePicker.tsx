"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

interface DatePickerProps {
  value: string; // Format: "YYYY-MM-DD"
  onChange: (dateStr: string) => void;
  placeholder?: string;
  minDate?: string; // Format: "YYYY-MM-DD"
  maxDate?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

const MONTH_NAMES_VI = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

const DAY_NAMES_VI = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

function parseYMD(str: string): Date | null {
  if (!str) return null;
  const parts = str.split("-");
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return new Date(y, m, d);
}

function formatToYMD(date: Date): string {
  const y = date.getFullYear();
  const m = padZero(date.getMonth() + 1);
  const d = padZero(date.getDate());
  return `${y}-${m}-${d}`;
}

function formatToDisplayVN(dateStr: string): string {
  const d = parseYMD(dateStr);
  if (!d) return "";
  const day = padZero(d.getDate());
  const month = padZero(d.getMonth() + 1);
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Chọn ngày (DD/MM/YYYY)...",
  minDate,
  maxDate,
  disabled = false,
  required = false,
  className = "",
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current selected date or fallback to today
  const selectedDate = parseYMD(value);
  const initialDate = selectedDate || new Date();

  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth());

  // Close when clicked outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Sync view when value changes
  useEffect(() => {
    if (value) {
      const parsed = parseYMD(value);
      if (parsed) {
        setViewYear(parsed.getFullYear());
        setViewMonth(parsed.getMonth());
      }
    }
  }, [value]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDate = (d: Date) => {
    const ymd = formatToYMD(d);
    onChange(ymd);
    setIsOpen(false);
  };

  const handleQuickSelect = (offsetDays: number) => {
    const target = new Date();
    target.setDate(target.getDate() + offsetDays);
    const ymd = formatToYMD(target);
    onChange(ymd);
    setViewYear(target.getFullYear());
    setViewMonth(target.getMonth());
    setIsOpen(false);
  };

  // Generate calendar days for viewMonth & viewYear
  // Monday is index 0 in DAY_NAMES_VI
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);

  // Convert JS Sunday=0..Saturday=6 to Monday=0..Sunday=6
  let firstDayIndex = firstDayOfMonth.getDay() - 1;
  if (firstDayIndex < 0) firstDayIndex = 6;

  const totalDaysInMonth = lastDayOfMonth.getDate();
  const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();

  const calendarDays: Array<{
    date: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
    isDisabled: boolean;
  }> = [];

  // Previous month trailing days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = new Date(viewYear, viewMonth - 1, prevMonthLastDay - i);
    calendarDays.push({
      date: d,
      isCurrentMonth: false,
      isToday: isSameDay(d, new Date()),
      isSelected: selectedDate ? isSameDay(d, selectedDate) : false,
      isDisabled: isDateDisabled(d, minDate, maxDate),
    });
  }

  // Current month days
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const d = new Date(viewYear, viewMonth, day);
    calendarDays.push({
      date: d,
      isCurrentMonth: true,
      isToday: isSameDay(d, new Date()),
      isSelected: selectedDate ? isSameDay(d, selectedDate) : false,
      isDisabled: isDateDisabled(d, minDate, maxDate),
    });
  }

  // Next month leading days to complete grid (multiples of 7)
  const remainingCells = (7 - (calendarDays.length % 7)) % 7;
  for (let day = 1; day <= remainingCells; day++) {
    const d = new Date(viewYear, viewMonth + 1, day);
    calendarDays.push({
      date: d,
      isCurrentMonth: false,
      isToday: isSameDay(d, new Date()),
      isSelected: selectedDate ? isSameDay(d, selectedDate) : false,
      isDisabled: isDateDisabled(d, minDate, maxDate),
    });
  }

  function isSameDay(d1: Date, d2: Date): boolean {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  function isDateDisabled(d: Date, min?: string, max?: string): boolean {
    const ymd = formatToYMD(d);
    if (min && ymd < min) return true;
    if (max && ymd > max) return true;
    return false;
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between pl-3.5 pr-3 py-3 rounded-xl border text-sm font-medium transition-all cursor-pointer select-none ${
          disabled
            ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
            : isOpen
            ? "bg-white border-emerald-500 ring-2 ring-emerald-500/20 text-slate-900 shadow-xs"
            : "bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-900 hover:bg-white"
        }`}
      >
        <div className="flex items-center gap-2.5 truncate">
          <CalendarIcon
            className={`w-4 h-4 shrink-0 transition-colors ${
              value ? "text-emerald-600" : "text-slate-400"
            }`}
          />
          {value ? (
            <span className="font-semibold text-slate-900 font-mono tracking-wide">
              {formatToDisplayVN(value)}
            </span>
          ) : (
            <span className="text-slate-400 text-xs font-normal">
              {placeholder}
            </span>
          )}
        </div>

        {value && !disabled && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            title="Xóa ngày đã chọn"
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-md transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}
      </button>

      {/* Hidden input for HTML form validation */}
      {required && (
        <input
          type="text"
          value={value}
          required={required}
          readOnly
          className="sr-only"
          tabIndex={-1}
        />
      )}

      {/* Modern Vietnamese Calendar Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 z-50 w-72 sm:w-80 bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-150 space-y-3.5">
          {/* Calendar Header: Month, Year & Nav */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-slate-900">
                {MONTH_NAMES_VI[viewMonth]}
              </span>
              <span className="font-bold text-sm text-emerald-700 font-mono">
                {viewYear}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                title="Tháng trước"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                title="Tháng sau"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Shortcuts Bar */}
          <div className="grid grid-cols-4 gap-1 pb-1">
            <button
              type="button"
              onClick={() => handleQuickSelect(0)}
              className="px-1.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 rounded-lg border border-slate-100 transition-all cursor-pointer text-center"
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect(1)}
              className="px-1.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 rounded-lg border border-slate-100 transition-all cursor-pointer text-center"
            >
              Ngày mai
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect(3)}
              className="px-1.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 rounded-lg border border-slate-100 transition-all cursor-pointer text-center"
            >
              +3 ngày
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect(7)}
              className="px-1.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 rounded-lg border border-slate-100 transition-all cursor-pointer text-center"
            >
              +1 tuần
            </button>
          </div>

          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {DAY_NAMES_VI.map((d, i) => (
              <span
                key={d}
                className={`text-[11px] font-bold py-1 ${
                  i >= 5 ? "text-rose-500 font-extrabold" : "text-slate-400"
                }`}
              >
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarDays.map((item, idx) => {
              const dayNum = item.date.getDate();

              let btnClasses =
                "relative h-8 w-8 mx-auto flex items-center justify-center rounded-xl text-xs font-semibold transition-all cursor-pointer select-none";

              if (item.isDisabled) {
                btnClasses +=
                  " text-slate-300 cursor-not-allowed bg-transparent hover:bg-transparent";
              } else if (item.isSelected) {
                btnClasses +=
                  " bg-emerald-600 text-white font-black shadow-md shadow-emerald-600/30 scale-105";
              } else if (item.isToday) {
                btnClasses +=
                  " bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold hover:bg-emerald-100";
              } else if (item.isCurrentMonth) {
                btnClasses +=
                  " text-slate-800 hover:bg-slate-100 hover:text-emerald-700";
              } else {
                btnClasses +=
                  " text-slate-300 hover:bg-slate-50 hover:text-slate-500";
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={item.isDisabled}
                  onClick={() => handleSelectDate(item.date)}
                  className={btnClasses}
                >
                  <span>{dayNum}</span>
                  {item.isToday && !item.isSelected && (
                    <span className="absolute bottom-1 w-1 h-1 bg-emerald-600 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
