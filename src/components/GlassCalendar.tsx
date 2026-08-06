"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

export interface ScheduledEvent {
  day: number;
  month: number; // 0-indexed
  year: number;
  title: string;
  type: 'completed' | 'scheduled' | 'critical';
  details: string;
}

const MOCK_EVENTS: ScheduledEvent[] = [
  { day: 2, month: 7, year: 2026, title: 'WS-105 Preventive Calibration', type: 'completed', details: 'Completed bearing lubrication & spindle alignment' },
  { day: 6, month: 7, year: 2026, title: 'WS-102 Diagnostic Sensor Scan', type: 'scheduled', details: 'High vibration alert analysis' },
  { day: 13, month: 7, year: 2026, title: 'WS-108 Critical Actuator Swap', type: 'critical', details: 'Emergency maintenance order WO-2024-0312' },
  { day: 16, month: 7, year: 2026, title: 'WS-112 Belt Tension Check', type: 'completed', details: 'Routine drive belt adjustment' },
  { day: 22, month: 7, year: 2026, title: 'WS-205 Pneumatic Seal Check', type: 'scheduled', details: 'Quarterly seal replacement' },
];

export default function GlassCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 7, 6)); // Aug 2026
  const [selectedDay, setSelectedDay] = useState<number | null>(6);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Adjust for Monday start (0: Sun -> 6, 1: Mon -> 0)
  const startingOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const getEventForDay = (d: number) => {
    return MOCK_EVENTS.find(e => e.day === d && e.month === month && e.year === year);
  };

  const selectedEvent = selectedDay ? getEventForDay(selectedDay) : null;

  return (
    <div className="bg-surface-container-lowest/80 backdrop-blur-xl border border-white/40 dark:border-outline-variant/30 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)] text-primary h-[430px] flex flex-col justify-between relative overflow-hidden">
      {/* Background Glass Accent */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header Month Navigation */}
      <div className="flex justify-between items-center mb-4 z-10">
        <div>
          <h2 className="font-headline-md text-lg font-bold flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-amber-500" />
            Maintenance Calendar
          </h2>
          <p className="text-xs text-on-surface-variant">{monthNames[month]} {year}</p>
        </div>
        <div className="flex items-center gap-1 bg-surface-container-high/60 backdrop-blur-md rounded-full p-1 border border-outline-variant/20">
          <button onClick={handlePrevMonth} className="w-8 h-8 rounded-full hover:bg-surface-variant flex items-center justify-center transition-colors cursor-pointer">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold px-2">{monthNames[month].slice(0, 3)}</span>
          <button onClick={handleNextMonth} className="w-8 h-8 rounded-full hover:bg-surface-variant flex items-center justify-center transition-colors cursor-pointer">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 text-center gap-y-2 flex-1 font-body-md text-xs z-10">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
          <div key={i} className="text-on-surface-variant font-label-caps text-[10px] font-bold uppercase tracking-wider py-1">
            {d}
          </div>
        ))}

        {/* Empty Offset Slots */}
        {Array.from({ length: startingOffset }).map((_, i) => (
          <div key={`offset-${i}`}></div>
        ))}

        {/* Month Days */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const event = getEventForDay(dayNum);
          const isSelected = selectedDay === dayNum;
          const isToday = dayNum === 6 && month === 7 && year === 2026;

          return (
            <div
              key={dayNum}
              onClick={() => setSelectedDay(dayNum)}
              className={`relative flex items-center justify-center h-8 w-8 mx-auto rounded-full cursor-pointer transition-all duration-200 text-xs font-medium ${
                isSelected ? 'ring-2 ring-primary ring-offset-2 scale-110 font-bold' : 'hover:scale-105'
              } ${
                isToday ? 'bg-primary text-on-primary font-bold shadow-md' : 'hover:bg-surface-container-high'
              }`}
            >
              <span>{dayNum}</span>

              {/* Event Badge Indicators */}
              {event && !isToday && (
                <span className={`absolute bottom-0.5 w-1.5 h-1.5 rounded-full ${
                  event.type === 'completed' ? 'bg-emerald-500' :
                  event.type === 'critical' ? 'bg-error animate-pulse' : 'bg-amber-400'
                }`}></span>
              )}
            </div>
          );
        })}
      </div>

      {/* Dynamic Selected Day Event Preview Drawer */}
      <div className="mt-3 pt-3 border-t border-outline-variant/20 z-10 flex items-center justify-between text-xs bg-surface-container-low/60 backdrop-blur-md p-3 rounded-2xl">
        {selectedEvent ? (
          <div className="flex items-center gap-3 w-full justify-between">
            <div className="flex items-center gap-2">
              {selectedEvent.type === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
              {selectedEvent.type === 'critical' && <AlertTriangle className="w-4 h-4 text-error shrink-0 animate-bounce" />}
              {selectedEvent.type === 'scheduled' && <Clock className="w-4 h-4 text-amber-500 shrink-0" />}
              <div>
                <p className="font-bold text-primary">{selectedEvent.title}</p>
                <p className="text-[10px] text-on-surface-variant">{selectedEvent.details}</p>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
              selectedEvent.type === 'completed' ? 'bg-emerald-500/10 text-emerald-600' :
              selectedEvent.type === 'critical' ? 'bg-error/10 text-error' : 'bg-amber-500/10 text-amber-600'
            }`}>
              {selectedEvent.type}
            </span>
          </div>
        ) : (
          <div className="flex justify-between items-center w-full text-on-surface-variant">
            <span>Select a highlighted date to view scheduled machine maintenance</span>
            <span className="font-mono text-[10px] bg-surface-variant px-2 py-0.5 rounded-full">Aug 2026</span>
          </div>
        )}
      </div>
    </div>
  );
}
