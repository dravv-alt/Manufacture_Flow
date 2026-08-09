import React from "react";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  const pageTitles: Record<string, string> = {
    "/dashboard": "Plant Dashboard",
    "/failure": "Failure Control",
    "/rerouting": "Production Rerouting",
    "/warehouse": "Warehouse",
    "/procurement": "Procurement Request",
    "/maintenance": "Maintenance & Recovery",
  };

  const title = pageTitles[pathname] || "AI Plant Dashboard";

  return (
    <header className="flex items-center justify-between py-6 mb-4">
      <div>
        <h1 className="text-headline-lg font-bold text-primary">{title}</h1>
        <p className="text-on-surface-variant mt-1">Here is the current status of the manufacturing floor.</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
            search
          </span>
          <input
            type="text"
            placeholder="Search machines, anomalies, or parts..."
            className="pl-12 pr-6 py-3 rounded-full bg-surface-container border border-outline-variant focus:outline-none focus:border-primary w-[320px] transition-all"
          />
        </div>
        <button className="bg-primary text-on-primary px-6 py-3 rounded-full font-label-caps hover:bg-surface-tint transition-colors">
          Export Report
        </button>
      </div>
    </header>
  );
}
