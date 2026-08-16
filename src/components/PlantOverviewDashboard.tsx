"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Bot, Ellipsis, Factory, Package, Pencil, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useOperations } from "@/contexts/OperationsContext";
import type { CalendarEvent } from "@/demo-data/operations";
import type { Workstation } from "@/demo-data/workstations";
import { cn } from "@/lib/utils";

// demo_data
const weekdayLabels = ["M", "T", "W", "T", "F", "S", "S"];
const initialCalendarMonth = new Date(2026, 7, 1);
const calendarMonthLabels = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const calendarYears = [2025, 2026, 2027];

export function PlantOverviewDashboard() {
  const { data, state, update } = useOperations();
  const [query, setQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [reportExported, setReportExported] = useState(false);
  const workstations = data.workstations;
  const selectedStation = workstations.find((station) => station.id === state.selectedWorkstationId) ?? workstations[0];
  const visibleWorkstations = useMemo(
    () => workstations.filter((station) => `${station.id} ${station.name} ${station.predictedComponent}`.toLowerCase().includes(query.toLowerCase())),
    [query, workstations],
  );

  const openStationTelemetry = (id: string) => {
    update({ selectedWorkstationId: id });
    setDrawerOpen(true);
  };

  const scheduleMaintenance = (station: Workstation) => {
    update({ selectedWorkstationId: station.id, maintenanceStage: Math.max(state.maintenanceStage, 3) });
  };

  const throttleProduction = (station: Workstation) => {
    update({ selectedWorkstationId: station.id, allocationBlocked: true });
  };

  const exportDashboardReport = () => {
    const rows = workstations.map((station) => [station.id, station.name, station.status, `${station.failureProb}%`, station.estimatedTTF].join(","));
    const file = new Blob([["Workstation,Name,Status,Failure risk,Estimated TTF", ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "machine-overwatch-plant-report.csv";
    link.click();
    URL.revokeObjectURL(url);
    setReportExported(true);
    window.setTimeout(() => setReportExported(false), 1800);
  };

  return (
    <main className="dashboard-reference min-h-screen bg-background px-5 py-8 text-[#1c1b1b] lg:px-8">
      <div className="mx-auto w-full max-w-[1440px] lg:pl-10">
        <header className="mb-10 flex flex-col justify-between gap-5 pt-1 md:flex-row md:items-start">
          <div>
            <h1 className="text-[32px] font-semibold tracking-[-0.02em]">Hi, Plant Manager!</h1>
            <p className="mt-2 text-base text-[#46464a]">Here is the current status of the manufacturing floor.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#46464a]" />
              <span className="sr-only">Search for machines, anomalies, or parts</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-12 w-full rounded-full bg-white pl-11 pr-5 text-sm shadow-[0_10px_20px_rgba(0,0,0,0.03)] outline-none placeholder:text-[#77767b] focus:ring-2 focus:ring-black sm:w-80" placeholder="Search for machines, anomalies, or parts..." />
            </label>
            <button onClick={exportDashboardReport} className="h-12 rounded-full bg-black px-6 text-xs font-semibold tracking-[0.05em] text-white shadow-md transition-colors hover:bg-[#313030]">{reportExported ? "Report Downloaded" : "Export Report"}</button>
          </div>
        </header>

        <section className="grid grid-cols-12 gap-6">
          <RiskCard workstations={workstations} selectedId={selectedStation.id} onOpenStation={openStationTelemetry} />
          <MaintenanceCalendar events={data.calendar} onOpenStation={openStationTelemetry} />
          <OeeCard />
          <EnergyCard />
          <MonitoredStations workstations={workstations.slice(0, 4)} selectedId={selectedStation.id} onOpenStation={openStationTelemetry} />
        </section>
        <ActivePredictionsPanel failures={data.failures} />
        <HealthTable workstations={visibleWorkstations} onOpenStation={openStationTelemetry} />
      </div>
      <TelemetryDrawer open={drawerOpen} station={selectedStation} onClose={() => setDrawerOpen(false)} onSchedule={scheduleMaintenance} onThrottle={throttleProduction} />
    </main>
  );
}

function ActivePredictionsPanel({ failures }: { failures: readonly { id: string; stationId: string; component: string; severity: "critical" | "warning"; probability: number; ttfHours: number; }[] }) {
  const predictions = [...failures].sort((left, right) => right.probability - left.probability).slice(0, 3);
  return <section className="mt-6 overflow-hidden rounded-[2rem] bg-[#242323] p-6 text-[#f8f5f2] shadow-[0_28px_42px_rgba(0,0,0,0.10)] md:p-7"><div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end"><div><p className="text-[10px] font-bold tracking-[0.16em] text-amber-300">PREDICTIVE PRIORITY QUEUE</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em]">Active failure predictions</h2><p className="mt-1 text-sm text-white/60">Ranked by probability and remaining intervention window.</p></div><span className="inline-flex w-max items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-white/80"><i className="size-2 rounded-full bg-emerald-400" />Scenario synchronized</span></div><div className="mt-5 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">{predictions.map((failure) => <Link key={failure.id} href={`/failure/${failure.id}`} className="group min-h-36 rounded-[1.35rem] border border-white/10 bg-white/[0.06] p-5 transition-colors hover:bg-white/[0.12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"><div className="flex items-start justify-between gap-3"><span className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.06em] text-white/70"><AlertTriangle className={failure.severity === "critical" ? "size-4 text-rose-300" : "size-4 text-amber-300"} />{failure.stationId}</span><span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.07em]", failure.severity === "critical" ? "bg-rose-300 text-[#4e1111]" : "bg-amber-300 text-[#372800]")}>{failure.probability}% RISK</span></div><p className="mt-4 text-base font-semibold">{failure.component}</p><div className="mt-3 flex items-center justify-between text-xs text-white/60"><span>{failure.ttfHours}h intervention window</span><span className="flex items-center gap-1 font-semibold text-white">Open case <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" /></span></div></Link>)}</div></section>;
}

function RiskCard({ workstations, selectedId, onOpenStation }: { workstations: readonly Workstation[]; selectedId: string; onOpenStation: (id: string) => void }) {
  const [showSummary, setShowSummary] = useState(false);
  const ws102 = workstations.find((station) => station.id === "WS-102") ?? workstations[0];
  const ws108 = workstations.find((station) => station.id === "WS-108") ?? workstations[0];
  const atRiskStations = workstations.filter((station) => station.status === "At Risk" || station.health === "Critical");
  const highestRisk = [...workstations].sort((left, right) => right.failureProb - left.failureProb)[0];

  return (
    <section className="relative col-span-12 flex h-[400px] flex-col justify-between overflow-hidden rounded-[2rem] bg-white p-8 shadow-[0_40px_40px_rgba(0,0,0,0.04)] lg:col-span-7">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,#e7e1d2_0%,transparent_60%),radial-gradient(circle_at_30%_70%,#efeadc_0%,transparent_50%)]" />
      <div className="relative z-10 flex items-start justify-between">
        <div><h2 className="text-xl font-semibold">Overall Plant Risk Level</h2><p className="mt-1 text-xs font-medium text-[#66636a]">Select a risk signal to inspect its live workstation telemetry.</p></div>
        <button onClick={() => setShowSummary((current) => !current)} aria-expanded={showSummary} aria-label="Toggle plant-risk summary" className="grid size-8 place-items-center rounded-full bg-white/60 shadow-sm transition-transform hover:scale-105"><Ellipsis className="size-4" /></button>
      </div>
      {showSummary && <div className="relative z-20 -mb-4 mt-3 rounded-2xl bg-white/90 px-4 py-3 text-xs shadow-sm backdrop-blur"><strong>{atRiskStations.length} stations need attention.</strong><span className="ml-2 text-[#5b575a]">Highest current signal: {highestRisk.id} at {highestRisk.failureProb}% risk.</span></div>}
      <div className="relative z-10 flex flex-1 items-center justify-center">
        <div className="relative h-full w-full max-w-sm">
          <RiskBubble station={ws108} color="bg-[#ba1a1a]/90" className="right-1/4 top-1/4 z-20 size-32 text-white" selected={selectedId === ws108.id} onClick={() => onOpenStation(ws108.id)} label={`Arm (${ws108.failureProb}% Risk)`} />
          <RiskBubble station={ws102} color="bg-amber-400/90" className="bottom-1/4 left-1/4 z-10 size-40 text-black" selected={selectedId === ws102.id} onClick={() => onOpenStation(ws102.id)} label={`CNC (${ws102.failureProb}% Risk)`} />
          <button onClick={() => onOpenStation(highestRisk.id)} className="absolute left-10 top-10 flex size-24 flex-col items-center justify-center rounded-full bg-[#313030]/90 text-[#f4f0ef] shadow-lg transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black" aria-label={`Inspect highest risk anomaly: ${highestRisk.id}`}>
            <span className="text-xl font-semibold">{atRiskStations.length + 12}</span><span className="text-center text-xs font-semibold tracking-[0.05em] text-white/70">Anomalies</span>
          </button>
        </div>
      </div>
      <div className="relative z-10 flex flex-col gap-2 text-xs font-semibold tracking-[0.05em]">
        <Legend color="bg-[#ba1a1a]" label="Critical Failure Imminent" /><Legend color="bg-amber-400" label="High Wear Detected" /><Legend color="bg-[#313030]" label="Normal Operation" />
      </div>
    </section>
  );
}

function RiskBubble({ station, color, className, selected, label, onClick }: { station: Workstation; color: string; className: string; selected: boolean; label: string; onClick: () => void }) {
  return <button onClick={onClick} aria-pressed={selected} className={cn("absolute flex flex-col items-center justify-center rounded-full shadow-xl backdrop-blur-sm transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black", color, className, selected && "ring-4 ring-black/20 ring-offset-4")}><span className="text-xl font-semibold">{station.id}</span><span className="text-center text-xs font-semibold tracking-[0.05em] opacity-75">{label}</span></button>;
}

function MaintenanceCalendar({ events, onOpenStation }: { events: readonly CalendarEvent[]; onOpenStation: (id: string) => void }) {
  const [selectedMonth, setSelectedMonth] = useState(initialCalendarMonth.getMonth());
  const [selectedYear, setSelectedYear] = useState(initialCalendarMonth.getFullYear());
  const [selectedDate, setSelectedDate] = useState("2026-08-10");
  const currentMonth = new Date(selectedYear, selectedMonth, 1);
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstWeekday = (currentMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const eventByDate = new Map(events.map((event) => [event.date, event]));
  const dateKey = (day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const selectCalendarMonth = (monthValue: number, yearValue: number) => {
    setSelectedMonth(monthValue);
    setSelectedYear(yearValue);
    setSelectedDate(`${yearValue}-${String(monthValue + 1).padStart(2, "0")}-01`);
  };

  return (
    <section className="col-span-12 flex h-[400px] flex-col overflow-hidden rounded-[2rem] bg-[#313030] p-6 text-[#f4f0ef] shadow-[0_40px_40px_rgba(0,0,0,0.08)] lg:col-span-5 lg:p-7">
      <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between"><h2 className="text-xl font-semibold">Maintenance Schedule</h2><div className="flex gap-2"><label className="sr-only" htmlFor="maintenance-month">Select maintenance month</label><select id="maintenance-month" value={selectedMonth} onChange={(event) => selectCalendarMonth(Number(event.target.value), selectedYear)} className="h-8 min-w-0 rounded-full border border-white/15 bg-white/10 px-2.5 text-xs text-[#f4f0ef] outline-none transition-colors hover:bg-white/15 focus:ring-2 focus:ring-white"><option className="bg-[#313030]" value="" disabled>Select month</option>{calendarMonthLabels.map((monthLabel, index) => <option className="bg-[#313030]" key={monthLabel} value={index}>{monthLabel}</option>)}</select><label className="sr-only" htmlFor="maintenance-year">Select maintenance year</label><select id="maintenance-year" value={selectedYear} onChange={(event) => selectCalendarMonth(selectedMonth, Number(event.target.value))} className="h-8 rounded-full border border-white/15 bg-white/10 px-2.5 text-xs text-[#f4f0ef] outline-none transition-colors hover:bg-white/15 focus:ring-2 focus:ring-white">{calendarYears.map((calendarYear) => <option className="bg-[#313030]" key={calendarYear} value={calendarYear}>{calendarYear}</option>)}</select></div></div>
      <div className="grid flex-1 grid-cols-7 content-start gap-y-1 text-center text-sm">{weekdayLabels.map((day, index) => <span key={`${day}-${index}`} className="text-[10px] font-semibold tracking-[0.05em] text-[#c9c6c1]">{day}</span>)}{Array.from({ length: firstWeekday }, (_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: daysInMonth }, (_, index) => { const day = index + 1; const key = dateKey(day); const event = eventByDate.get(key); const isSelected = key === selectedDate; return <button key={key} onClick={() => { setSelectedDate(key); if (event) onOpenStation(event.workstationId); }} aria-pressed={isSelected} aria-label={`${key}${event ? `: ${event.title}` : ""}`} className="relative mx-auto grid size-7 place-items-center rounded-full text-xs transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><i className={cn("absolute inset-0 rounded-full", event?.type === "scheduled" && "border border-amber-400", event?.type === "completed" && "bg-amber-400", event?.type === "critical" && "bg-[#ba1a1a]", isSelected && !event && "bg-white/15", isSelected && "ring-2 ring-white ring-offset-2 ring-offset-[#313030]")} /><b className={cn("relative text-xs", event?.type === "completed" && "text-black")}>{day}</b></button>; })}</div>
      <div className="mt-2 flex shrink-0 flex-wrap gap-3 border-t border-white/15 pt-2 text-[9px] font-semibold tracking-[0.05em] text-[#c9c6c1]"><Legend color="border border-amber-400" label="Scheduled" small /><Legend color="bg-amber-400" label="Maintenance Done" small /><Legend color="bg-[#ba1a1a]" label="Critical" small /></div>
    </section>
  );
}

function OeeCard() { const [target, setTarget] = useState(95); const [showTargetControl, setShowTargetControl] = useState(false); const oee = 87.5; return <section className="relative col-span-12 flex h-[325px] flex-col justify-between overflow-hidden rounded-[2rem] bg-white p-8 shadow-[0_20px_40px_rgba(0,0,0,0.02)] md:col-span-6 lg:col-span-4"><div><h3 className="text-xl font-semibold">Plant Efficiency (OEE)</h3><p className="mt-1 text-sm text-[#46464a]">Keep the line moving</p></div><div className="flex flex-1 items-center justify-center py-4"><div className="relative grid size-32 shrink-0 place-items-center rounded-full" role="img" aria-label={`Plant efficiency is ${oee} percent against a ${target} percent target`} style={{ background: `conic-gradient(#10b981 0 ${oee}%, #e5e2e1 ${oee}% 100%)` }}><div className="grid size-[104px] place-items-center rounded-full bg-white text-center"><strong className="text-[28px] tracking-[-0.04em]">{oee}%</strong><span className="text-[10px] font-semibold tracking-[0.05em] text-[#46464a]">Target {target}%</span></div></div></div>{showTargetControl && <label className="absolute bottom-16 left-8 right-8 rounded-xl bg-[#f7f3f2] p-3 text-xs font-semibold text-[#46464a] shadow-sm">Target: {target}%<input aria-label="Plant efficiency target" value={target} onChange={(event) => setTarget(Number(event.target.value))} type="range" min="80" max="100" className="mt-2 block w-full accent-black" /></label>}<button onClick={() => setShowTargetControl((current) => !current)} aria-expanded={showTargetControl} className="flex w-max items-center gap-2 text-xs font-bold tracking-[0.05em] transition-colors hover:text-[#77767b]">Adjust Target <span className="grid size-6 place-items-center rounded-full bg-black text-white"><Pencil className="size-3" /></span></button></section>; }
function EnergyCard() { return <section className="col-span-12 flex min-h-[325px] flex-col justify-between rounded-[2rem] bg-white p-8 shadow-[0_20px_40px_rgba(0,0,0,0.02)] md:col-span-6 lg:col-span-4"><div><div className="flex items-end justify-between gap-4"><h3 className="text-xl font-semibold">Energy Consumption</h3><strong className="text-xl">450 <span className="text-sm font-normal text-[#46464a]">kWh</span></strong></div><p className="mt-1 text-sm text-[#46464a]">88% of daily quota</p></div><div className="my-auto py-8"><div className="h-3 overflow-hidden rounded-full bg-[#e5e2e1]"><div className="h-full w-[88%] rounded-full bg-black" /></div><div className="mt-2 flex justify-between text-xs font-semibold tracking-[0.05em] text-[#46464a]"><span>0 kWh</span><span>500 kWh</span></div></div></section>; }
function MonitoredStations({ workstations, selectedId, onOpenStation }: { workstations: readonly Workstation[]; selectedId: string; onOpenStation: (id: string) => void }) { return <section className="col-span-12 flex min-h-[325px] flex-col rounded-[2rem] bg-white p-8 shadow-[0_20px_40px_rgba(0,0,0,0.02)] lg:col-span-4"><div className="mb-6 flex items-center justify-between gap-3"><h3 className="text-xl font-semibold">Monitored Workstations</h3><button className="flex items-center gap-1 text-xs font-semibold tracking-[0.05em] transition-colors hover:text-[#77767b]">Add Sensor <span className="grid size-5 place-items-center rounded-full bg-black text-white"><Plus className="size-3" /></span></button></div><div className="flex flex-1 flex-col gap-3">{workstations.map((station) => <button key={station.id} onClick={() => onOpenStation(station.id)} className={cn("flex items-center justify-between rounded-xl bg-[#f7f3f2] p-3 text-left transition-colors hover:bg-[#e5e2e1]", station.id === selectedId && "ring-2 ring-black/15")}><span className="flex min-w-0 items-center gap-3"><StationIcon id={station.id} /><span className="min-w-0"><b className="block truncate text-sm">{station.id} {station.name}</b><small className="block truncate text-[10px] font-semibold tracking-[0.05em] text-[#46464a]">{station.predictedComponent}</small></span></span><i className={cn("size-3 shrink-0 rounded-full", station.status === "At Risk" ? "bg-[#ba1a1a]" : "bg-[#c7c6ca]")} /></button>)}</div></section>; }
function HealthTable({ workstations, onOpenStation }: { workstations: readonly Workstation[]; onOpenStation: (id: string) => void }) { return <section className="mt-10 overflow-x-auto rounded-[2rem] bg-white p-8 shadow-[0_20px_40px_rgba(0,0,0,0.02)]"><div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><h2 className="text-xl font-semibold">Comprehensive Workstation Health Data</h2><div className="flex gap-2"><button className="rounded-full bg-[#f7f3f2] px-4 py-2 text-xs font-semibold tracking-[0.05em] transition-colors hover:bg-[#e5e2e1]">Filter</button><button className="rounded-full bg-[#f7f3f2] px-4 py-2 text-xs font-semibold tracking-[0.05em] transition-colors hover:bg-[#e5e2e1]">Export CSV</button></div></div><table className="w-full whitespace-nowrap text-left text-sm"><thead className="border-b border-black/15 text-[10px] font-semibold tracking-[0.05em] text-[#46464a]"><tr>{["WS ID", "Type", "Status", "Temp (C)", "Vib (mm/s)", "Power (kW)", "OEE (%)", "Cycle Time (s)", "Output/hr", "Defect Rate (%)", "Last Maint.", "Next Maint.", "Est. RUL (Days)", "Operator ID", "Firmware", "Network Ping (ms)", "Anomaly Score", "Action"].map((label) => <th className="p-3" key={label}>{label}</th>)}</tr></thead><tbody className="divide-y divide-black/10">{workstations.map((station, index) => { const critical = station.status === "At Risk" && station.failureProb >= 80; const warning = station.status === "At Risk" && !critical; return <tr className={cn("transition-colors hover:bg-[#f7f3f2]/70", critical && "bg-[#ffdad6]/20")} key={station.id}><td className={cn("p-3 font-bold", critical && "text-[#ba1a1a]")}>{station.id}</td><td className="p-3">{station.name.includes("Robot") ? "Robotic Arm" : station.name.includes("Conveyor") ? "Conveyor" : station.name.includes("Packaging") ? "Packaging" : "CNC"}</td><td className="p-3"><StatusPill critical={critical} warning={warning} status={station.status} /></td><td className={cn("p-3", critical && "font-bold text-[#ba1a1a]")}>{station.temperature.toFixed(0)}</td><td className={cn("p-3", station.vibration >= 3 && "font-bold text-amber-600", critical && "text-[#ba1a1a]")}>{station.vibration.toFixed(1)}</td><td className="p-3">{station.motorCurrent.toFixed(1)}</td><td className={cn("p-3", critical && "text-[#ba1a1a]")}>{station.capacity}</td><td className="p-3">{station.id === "WS-112" ? "N/A" : Math.max(25, 120 - index * 15)}</td><td className="p-3">{station.id === "WS-112" ? "500" : 30 + index * 20}</td><td className={cn("p-3", critical && "font-bold text-[#ba1a1a]")}>{critical ? "4.5" : warning ? "1.2" : "0.1"}</td><td className="p-3">{station.lastMaintenance}</td><td className={cn("p-3", critical && "font-bold text-[#ba1a1a]")}>{critical ? "OVERDUE" : "2026-09-02"}</td><td className={cn("p-3", critical && "font-bold text-[#ba1a1a]")}>{critical ? "2" : "120"}</td><td className="p-3">{index === 2 ? "SYS" : `OP-${String(91 + index * 21).padStart(3, "0")}`}</td><td className="p-3">v{index + 1}.2.0</td><td className="p-3">{12 + index * 3}</td><td className={cn("p-3", critical ? "font-bold text-[#ba1a1a]" : warning && "font-bold text-amber-600")}>{(station.failureProb / 100).toFixed(2)}</td><td className="p-3"><button onClick={() => onOpenStation(station.id)} className={cn("font-semibold underline", critical ? "text-[#ba1a1a]" : "text-black")}>{critical ? "Halt" : "Inspect"}</button></td></tr>; })}</tbody></table></section>; }
function TelemetryDrawer({ open, station, onClose, onSchedule, onThrottle }: { open: boolean; station: Workstation; onClose: () => void; onSchedule: (station: Workstation) => void; onThrottle: (station: Workstation) => void }) { const [actionMessage, setActionMessage] = useState(""); const highRisk = station.failureProb >= 80 || station.health === "Critical"; const telemetry = [["Temperature", `${station.temperature.toFixed(1)} C${station.temperature >= 75 ? " (High)" : ""}`], ["Vibration", `${station.vibration.toFixed(1)} mm/s${station.vibration >= 3 ? " (High)" : ""}`], ["Motor current", `${station.motorCurrent.toFixed(1)} A`]]; return <aside aria-hidden={!open} className={cn("fixed inset-y-0 right-0 z-50 flex w-full max-w-[400px] flex-col bg-white shadow-2xl transition-transform duration-300", open ? "translate-x-0" : "translate-x-full")}><div className="flex items-center justify-between border-b border-black/10 p-6"><div><h3 className="text-xl font-semibold">{station.id} Telemetry</h3><p className="mt-1 text-xs text-[#66636a]">{station.name}</p></div><button onClick={onClose} className="rounded-full p-2 text-xl hover:bg-[#f7f3f2]" aria-label="Close telemetry panel">x</button></div><div className="flex-1 space-y-6 overflow-y-auto p-6"><div><h4 className="mb-2 text-xs font-semibold tracking-[0.05em] text-[#46464a]">Current Status</h4><div className={cn("rounded-xl p-4 font-bold", highRisk ? "bg-[#ffdad6] text-[#93000a]" : "bg-[#e5e2e1] text-[#313030]")}>{station.status.toUpperCase()}: {station.predictedComponent}</div><p className="mt-2 text-xs text-[#66636a]">Failure probability {station.failureProb}% - estimated time to failure {station.estimatedTTF}.</p></div><div><h4 className="mb-2 text-xs font-semibold tracking-[0.05em] text-[#46464a]">Live Telemetry</h4><div className="space-y-3">{telemetry.map(([label, value], index) => <div key={label} className="flex items-center justify-between rounded-xl bg-[#f7f3f2] p-3"><span>{label}</span><strong className={index < 2 && (station.temperature >= 75 || station.vibration >= 3) ? "text-[#ba1a1a]" : ""}>{value}</strong></div>)}</div></div><div><h4 className="mb-2 text-xs font-semibold tracking-[0.05em] text-[#46464a]">Recommended Actions</h4><button onClick={() => { onSchedule(station); setActionMessage(`Maintenance planning started for ${station.id}.`); }} className="mb-2 w-full rounded-xl bg-black py-3 text-sm font-bold text-white hover:bg-[#313030]">{highRisk ? "Schedule Emergency Maintenance" : "Schedule Maintenance"}</button><button onClick={() => { onThrottle(station); setActionMessage(`Production throttle applied to ${station.id}.`); }} className="w-full rounded-xl border border-[#77767b] py-3 text-sm font-bold hover:bg-[#f7f3f2]">Throttle Production Rate</button>{actionMessage && <p role="status" className="mt-3 rounded-xl bg-[#f7f3f2] p-3 text-xs font-semibold text-[#46464a]">{actionMessage}</p>}</div></div></aside>; }
function StatusPill({ critical, warning, status }: { critical: boolean; warning: boolean; status: string }) { return <span className={cn("rounded-md px-2 py-1 text-xs font-bold", critical ? "bg-[#ba1a1a] text-white" : warning ? "bg-amber-400/20 text-amber-700" : "bg-[#313030] text-[#f4f0ef]")}>{critical ? "Critical" : warning ? "Warning" : status === "Under Maintenance" ? "Maintenance" : "Normal"}</span>; }
function StationIcon({ id }: { id: string }) { const Icon = id === "WS-108" ? Bot : id === "WS-205" ? Package : Factory; return <span className="grid size-8 place-items-center rounded-full bg-[#e5e2e1] text-[#46464a]"><Icon className="size-4" /></span>; }
function Legend({ color, label, small = false }: { color: string; label: string; small?: boolean }) { return <span className="flex items-center gap-3"><i className={cn("rounded-full", small ? "size-2" : "h-1 w-6", color)} />{label}</span>; }
