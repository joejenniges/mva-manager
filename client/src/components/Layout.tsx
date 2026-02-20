import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import CommandPalette from "./CommandPalette";
import EventSetup from "./EventSetup";
import useHotkeys from "../hooks/useHotkeys";
import { useEvent } from "../event";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { activeEvent, events, loading } = useEvent();

  useHotkeys({
    g: () => setCommandPaletteOpen(true),
  });

  // Show setup screen when no events exist and loading is done
  if (!loading && events.length === 0) {
    return <EventSetup />;
  }

  // Still loading events
  if (loading || !activeEvent) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Desktop sidebar - always visible at md+ */}
      <div className="hidden md:block">
        <Sidebar onOpenCommandPalette={() => setCommandPaletteOpen(true)} />
      </div>

      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar - slides in from left */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 md:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onNavClick={() => setSidebarOpen(false)} onOpenCommandPalette={() => setCommandPaletteOpen(true)} />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar with hamburger */}
        <div className="flex items-center border-b border-gray-800 bg-gray-900 px-4 py-3 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-800 hover:text-gray-200"
            aria-label="Open navigation"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <span className="ml-3 text-sm font-semibold text-gray-100">MVA Manager</span>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
    </div>
  );
}
