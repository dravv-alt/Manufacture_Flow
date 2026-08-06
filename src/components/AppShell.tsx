"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="bg-surface-container-high text-on-surface font-body-md min-h-screen flex selection:bg-primary selection:text-on-primary">
      {/* Sidebar Navigation */}
      <nav className="fixed left-8 top-1/2 -translate-y-1/2 w-20 h-[85vh] rounded-full flex flex-col items-center py-8 bg-surface-container-lowest shadow-[40px_40px_40px_0px_rgba(0,0,0,0.04)] shadow-xl z-50">
        <div className="mb-10 font-headline-md text-headline-md font-bold text-primary text-center leading-tight">
          <span className="material-symbols-outlined text-3xl">precision_manufacturing</span><br/>
          <span className="text-xs">IAI</span>
        </div>
        <div className="flex flex-col gap-y-6 items-center flex-1">
          <Link 
            className={`scale-95 active:scale-90 transition-transform duration-200 rounded-full p-3 transition-colors ${
              pathname === '/dashboard' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-secondary-container'
            }`} 
            href="/dashboard" 
            title="Dashboard"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
          </Link>
          <Link 
            className={`scale-95 active:scale-90 transition-transform duration-200 rounded-full p-3 transition-colors ${
              pathname === '/failure' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-secondary-container'
            }`} 
            href="/failure" 
            title="Failure Control"
          >
            <span className="material-symbols-outlined">report_problem</span>
          </Link>
          <Link 
            className={`scale-95 active:scale-90 transition-transform duration-200 rounded-full p-3 transition-colors ${
              pathname === '/rerouting' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-secondary-container'
            }`} 
            href="/rerouting" 
            title="Rerouting"
          >
            <span className="material-symbols-outlined">alt_route</span>
          </Link>
          <Link 
            className={`scale-95 active:scale-90 transition-transform duration-200 rounded-full p-3 transition-colors ${
              pathname === '/warehouse' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-secondary-container'
            }`} 
            href="/warehouse" 
            title="Warehouse"
          >
            <span className="material-symbols-outlined">warehouse</span>
          </Link>
          <Link 
            className={`scale-95 active:scale-90 transition-transform duration-200 rounded-full p-3 transition-colors mt-auto ${
              pathname === '/settings' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-secondary-container'
            }`} 
            href="/settings" 
            title="Settings"
          >
            <span className="material-symbols-outlined">settings</span>
          </Link>
        </div>
        <div className="mt-6">
          <img 
            alt="Plant Manager Avatar" 
            className="w-10 h-10 rounded-full object-cover border-2 border-surface-container-lowest" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAa1hYm9lfBmyD_y4HxUA3_dyj4TrBNxp6pBlccpSdUErF_qUqfOjEGx2ChQrR8AzjxPsgC8eLFDnBHO2VasvNVSg5Lb21Waeq4E_41R-xR5YJJgXMVyfLMG490BiQsRjm-6Qxjws3hYui_MU2IyXDcUoOonN47hDYI30YKXw4TVDoJOYlQDB5RhnhTba-hNXCcFBt4c_ldlf0KsON1H4uXoBN9vDpFO9LOeXa17vi1Z2CHI-Txy8Ep"
          />
        </div>
      </nav>

      {/* Main Canvas */}
      <main className="ml-[120px] flex-1 p-margin-page max-w-[1440px] mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
