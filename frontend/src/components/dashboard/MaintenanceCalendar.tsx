"use client";

/**
 * REDUNDANT — superseded by MaintenanceControl and shared workflow state.
 * Retained intact for review; do not import into active routes.
 */

// demo_data
import { useState } from "react";

export interface CalendarEvent {
  id: string;
  date: number; // day number
  month: number; // 0-indexed month
  year: number;
  workstationId: string;
  workstationName: string;
  title: string;
  type: 'completed' | 'scheduled' | 'critical';
  details: string;
}

const INITIAL_EVENTS: CalendarEvent[] = [
  { id: '1', date: 2, month: 7, year: 2026, workstationId: 'WS-105', workstationName: 'Precision Milling Center', title: 'Bearing Lubrication & Spindle Calibration', type: 'completed', details: 'Completed by Tech #402. All vibration metrics normalized.' },
  { id: '2', date: 6, month: 7, year: 2026, workstationId: 'WS-102', workstationName: 'CNC Lathe Alpha', title: 'Diagnostic Telemetry Scan (Current Day)', type: 'scheduled', details: 'High vibration alert analysis underway (TTF 18h).' },
  { id: '3', date: 10, month: 7, year: 2026, workstationId: 'WS-112', workstationName: 'Conveyor Line Gamma', title: 'Drive Belt Tension Alignment', type: 'scheduled', details: 'Routine quarterly drive belt adjustment.' },
  { id: '4', date: 13, month: 7, year: 2026, workstationId: 'WS-108', workstationName: 'Robotic Arm Beta', title: 'Critical Actuator Joint B Replacement', type: 'critical', details: 'Work Order WO-2024-0312 scheduled for emergency replacement.' },
  { id: '5', date: 16, month: 7, year: 2026, workstationId: 'WS-205', workstationName: 'Packaging Unit Delta', title: 'Pneumatic Cylinder Seal Replacement', type: 'completed', details: 'Seal replaced & pressure tested up to 6.0 bar.' },
  { id: '6', date: 17, month: 7, year: 2026, workstationId: 'WS-110', workstationName: 'Laser Cutter Sigma', title: 'Optical Lens Array Recalibration', type: 'scheduled', details: 'Post-recovery precision tolerance verification.' },
];

interface MaintenanceCalendarProps {
  onSelectWorkstationId?: (wsId: string) => void;
}

export default function MaintenanceCalendar({ onSelectWorkstationId }: MaintenanceCalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 7, 1)); // August 2026
  const [events, setEvents] = useState<CalendarEvent[]>(INITIAL_EVENTS);
  const [selectedDay, setSelectedDay] = useState<number>(6); // Default 6th (today)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newWsId, setNewWsId] = useState("WS-102");
  const [newType, setNewType] = useState<'completed' | 'scheduled' | 'critical'>('scheduled');
  const [newDetails, setNewDetails] = useState("");

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const startingOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Mon start

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const getEventsForDay = (d: number) => {
    return events.filter(e => e.date === d && e.month === currentMonth && e.year === currentYear);
  };

  const selectedDayEvents = getEventsForDay(selectedDay);

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      date: selectedDay,
      month: currentMonth,
      year: currentYear,
      workstationId: newWsId,
      workstationName: newWsId === 'WS-102' ? 'CNC Lathe Alpha' : newWsId === 'WS-108' ? 'Robotic Arm Beta' : 'Workstation ' + newWsId,
      title: newTitle,
      type: newType,
      details: newDetails || 'Manual event scheduled by Plant Manager.'
    };

    setEvents(prev => [...prev, newEvent]);
    setNewTitle("");
    setNewDetails("");
    setIsModalOpen(false);
  };

  return (
    <div className="bg-inverse-surface rounded-lg p-container-padding shadow-[0px_40px_40px_0px_rgba(0,0,0,0.08)] text-inverse-on-surface h-[440px] flex flex-col justify-between relative">
      
      {/* Calendar Header with Functional Month Switcher */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-headline-md text-headline-md text-inverse-on-surface font-bold">Maintenance Schedule</h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={handlePrevMonth}
            className="w-7 h-7 rounded-full bg-surface-tint/20 hover:bg-surface-tint/40 flex items-center justify-center text-inverse-on-surface transition-colors cursor-pointer"
            title="Previous Month"
          >
            <span className="material-symbols-outlined text-sm">chevron_left</span>
          </button>
          <span className="font-body-md text-body-md font-bold px-1">
            {monthNames[currentMonth]} {currentYear}
          </span>
          <button 
            onClick={handleNextMonth}
            className="w-7 h-7 rounded-full bg-surface-tint/20 hover:bg-surface-tint/40 flex items-center justify-center text-inverse-on-surface transition-colors cursor-pointer"
            title="Next Month"
          >
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Days Grid Header */}
      <div className="grid grid-cols-7 text-center gap-y-4 flex-1 font-body-md text-body-md">
        <div className="text-tertiary-fixed-dim font-label-caps text-label-caps">M</div>
        <div className="text-tertiary-fixed-dim font-label-caps text-label-caps">T</div>
        <div className="text-tertiary-fixed-dim font-label-caps text-label-caps">W</div>
        <div className="text-tertiary-fixed-dim font-label-caps text-label-caps">T</div>
        <div className="text-tertiary-fixed-dim font-label-caps text-label-caps">F</div>
        <div className="text-tertiary-fixed-dim font-label-caps text-label-caps">S</div>
        <div className="text-tertiary-fixed-dim font-label-caps text-label-caps">S</div>

        {/* Empty Offset Slots */}
        {Array.from({ length: startingOffset }).map((_, i) => (
          <div key={`offset-${i}`} className="text-tertiary-fixed-dim opacity-30"></div>
        ))}

        {/* Dynamic Days of the Month */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dayEvents = getEventsForDay(dayNum);
          const hasCompleted = dayEvents.some(e => e.type === 'completed');
          const hasScheduled = dayEvents.some(e => e.type === 'scheduled');
          const hasCritical = dayEvents.some(e => e.type === 'critical');
          const isCurrentDay = dayNum === 6 && currentMonth === 7 && currentYear === 2026;
          const isSelected = selectedDay === dayNum;

          return (
            <div 
              key={dayNum}
              onClick={() => setSelectedDay(dayNum)}
              className={`relative flex items-center justify-center cursor-pointer transition-all ${
                isSelected ? 'scale-110 font-bold' : ''
              }`}
            >
              {/* Day Circle Styling */}
              {isCurrentDay ? (
                <span className="absolute inset-0 border-2 border-amber-400 rounded-full z-0 transform scale-125"></span>
              ) : hasCritical ? (
                <span className="absolute inset-0 bg-error rounded-full z-0 transform scale-125 animate-pulse"></span>
              ) : hasCompleted ? (
                <span className="absolute inset-0 bg-amber-400 rounded-full z-0 transform scale-125"></span>
              ) : hasScheduled ? (
                <span className="absolute inset-0 bg-surface-tint rounded-full z-0 transform scale-125 opacity-50"></span>
              ) : null}

              <span className={`relative z-10 text-xs ${
                hasCompleted || hasCritical ? 'text-primary font-bold' : 
                isCurrentDay ? 'text-amber-400 font-bold' : 'text-inverse-on-surface'
              }`}>
                {dayNum}
              </span>
            </div>
          );
        })}
      </div>

      {/* Selected Day Event Drawer & Add Event Bar */}
      <div className="mt-3 pt-3 border-t border-outline/20 flex flex-col gap-2">
        <div className="flex justify-between items-center text-xs">
          <span className="font-label-caps text-tertiary-fixed-dim font-bold">
            {monthNames[currentMonth]} {selectedDay}, {currentYear} ({selectedDayEvents.length} Tasks)
          </span>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="text-[11px] text-amber-400 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-xs">add</span> Schedule Event
          </button>
        </div>

        {/* Selected Day Details Preview */}
        <div className="max-h-16 overflow-y-auto pr-1 flex flex-col gap-1.5">
          {selectedDayEvents.length > 0 ? (
            selectedDayEvents.map((evt) => (
              <div 
                key={evt.id} 
                className="bg-surface-container-high/40 p-2 rounded flex items-center justify-between text-xs border-l-2 border-amber-400"
              >
                <div className="flex flex-col">
                  <span className="font-bold text-inverse-on-surface">{evt.title}</span>
                  <span className="text-[10px] text-tertiary-fixed-dim">{evt.workstationId} • {evt.details}</span>
                </div>
                {onSelectWorkstationId && (
                  <button 
                    onClick={() => onSelectWorkstationId(evt.workstationId)}
                    className="text-[10px] bg-amber-400 text-primary px-2 py-0.5 rounded font-bold hover:bg-amber-300 transition-colors"
                  >
                    View Machine
                  </button>
                )}
              </div>
            ))
          ) : (
            <p className="text-[11px] text-tertiary-fixed-dim italic">No maintenance scheduled for this day.</p>
          )}
        </div>
      </div>

      {/* Footer Legend */}
      <div className="flex items-center justify-start gap-4 mt-2 pt-2 border-t border-outline/10 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full border border-amber-400"></div>
          <span className="font-label-caps text-[10px] text-tertiary-fixed-dim">Current day</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-400"></div>
          <span className="font-label-caps text-[10px] text-tertiary-fixed-dim">Maintenance Done</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-surface-tint"></div>
          <span className="font-label-caps text-[10px] text-tertiary-fixed-dim">Scheduled</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-error"></div>
          <span className="font-label-caps text-[10px] text-error">Critical</span>
        </div>
      </div>

      {/* Add Event Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest text-primary rounded-xl p-6 w-full max-w-md shadow-2xl border border-outline-variant/30">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-headline-md text-base font-bold">Schedule Maintenance Task</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-on-surface-variant hover:text-primary">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateEvent} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="block text-on-surface-variant mb-1 font-bold">Date</label>
                <p className="font-mono bg-surface-container-low p-2 rounded text-primary">
                  {monthNames[currentMonth]} {selectedDay}, {currentYear}
                </p>
              </div>
              <div>
                <label className="block text-on-surface-variant mb-1 font-bold">Target Machine</label>
                <select 
                  value={newWsId} 
                  onChange={(e) => setNewWsId(e.target.value)}
                  className="w-full bg-surface-container-low p-2.5 rounded border border-outline-variant/30 focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="WS-102">WS-102 (CNC Lathe Alpha)</option>
                  <option value="WS-108">WS-108 (Robotic Arm Beta)</option>
                  <option value="WS-112">WS-112 (Conveyor Line Gamma)</option>
                  <option value="WS-205">WS-205 (Packaging Unit Delta)</option>
                  <option value="WS-105">WS-105 (Precision Milling Center)</option>
                  <option value="WS-110">WS-110 (Laser Cutter Sigma)</option>
                </select>
              </div>
              <div>
                <label className="block text-on-surface-variant mb-1 font-bold">Task Title</label>
                <input 
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Spindle Bearing Replacement" 
                  className="w-full bg-surface-container-low p-2.5 rounded border border-outline-variant/30 focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-on-surface-variant mb-1 font-bold">Task Severity</label>
                <select 
                  value={newType} 
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full bg-surface-container-low p-2.5 rounded border border-outline-variant/30 focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="scheduled">Scheduled (Routine)</option>
                  <option value="completed">Completed (Log Past Entry)</option>
                  <option value="critical">Critical (High Urgency)</option>
                </select>
              </div>
              <div>
                <label className="block text-on-surface-variant mb-1 font-bold">Task Details / Instructions</label>
                <textarea 
                  value={newDetails}
                  onChange={(e) => setNewDetails(e.target.value)}
                  placeholder="Enter specific instructions or part numbers..."
                  className="w-full bg-surface-container-low p-2.5 rounded border border-outline-variant/30 focus:ring-2 focus:ring-primary outline-none h-20"
                />
              </div>
              <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-outline-variant/20">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded bg-surface-container-high text-on-surface-variant font-bold hover:bg-surface-variant"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 rounded bg-primary text-on-primary font-bold hover:bg-inverse-surface"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
