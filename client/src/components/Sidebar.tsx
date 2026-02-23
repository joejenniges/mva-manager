import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../auth";
import EventSelector from "./EventSelector";

interface NavItem { to: string; label: string; icon: string }

const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { to: "/appointments", label: "Appointments", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { to: "/persons", label: "Persons", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
  { to: "/organizations", label: "Organizations", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
  { to: "/locations", label: "Locations", icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" },
  { to: "/documents", label: "Documents", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { to: "/mileage", label: "Mileage", icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" },
  { to: "/calendar", label: "Calendar", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { to: "/templates", label: "Templates", icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" },
];

const typesItems: NavItem[] = [
  { to: "/activities", label: "Activities", icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" },
  { to: "/person-roles", label: "Person Roles", icon: "M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" },
  { to: "/document-types", label: "Doc Types", icon: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" },
];

const TYPES_PATHS = typesItems.map((i) => i.to);

function NavItemLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
          isActive
            ? "bg-gray-800 text-blue-400"
            : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
        }`
      }
    >
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
      </svg>
      {item.label}
    </NavLink>
  );
}

export default function Sidebar({ onNavClick, onOpenCommandPalette }: { onNavClick?: () => void; onOpenCommandPalette?: () => void }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const typesChildActive = TYPES_PATHS.some((p) => location.pathname.startsWith(p));
  const [typesOpen, setTypesOpen] = useState(typesChildActive);

  return (
    <aside className="flex h-full w-56 flex-col border-r border-gray-800 bg-gray-900">
      <div className="border-b border-gray-800 px-4 py-4">
        <h1 className="text-lg font-semibold text-gray-100">MVA Manager</h1>
      </div>

      <EventSelector />

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {onOpenCommandPalette && (
          <button
            onClick={onOpenCommandPalette}
            className="mb-2 flex w-full items-center justify-between rounded-md border border-gray-700 bg-gray-800/50 px-3 py-1.5 text-sm text-gray-500 hover:border-gray-600 hover:text-gray-400"
          >
            Go to...
            <kbd className="relative -top-px rounded border border-gray-600 bg-gray-700/50 px-1.5 py-0.5 font-mono text-[10px] text-gray-500">G</kbd>
          </button>
        )}
        {navItems.map((item) => (
          <NavItemLink key={item.to} item={item} onClick={onNavClick} />
        ))}

        {/* Types sub-category */}
        <button
          onClick={() => setTypesOpen(!typesOpen)}
          className={`mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
            typesChildActive && !typesOpen
              ? "text-blue-400"
              : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
          }`}
        >
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          <span className="flex-1 text-left">Types</span>
          <svg className={`h-3 w-3 shrink-0 transition-transform ${typesOpen ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        {typesOpen && (
          <div className="ml-3">
            {typesItems.map((item) => (
              <NavItemLink key={item.to} item={item} onClick={onNavClick} />
            ))}
          </div>
        )}
      </nav>

      <div className="border-t border-gray-800 px-4 py-3">
        <div className="mb-1 text-[10px] text-gray-600">{__COMMIT_HASH__}</div>
        <div className="mb-2 truncate text-xs text-gray-500">{user?.email}</div>
        <button
          onClick={logout}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
