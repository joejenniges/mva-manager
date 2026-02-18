import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEvent } from "../event";
import type { Event } from "../event";

export default function EventSelector() {
  const { events, activeEvent, setActiveEvent } = useEvent();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!activeEvent) return null;

  return (
    <div className="relative px-2 pb-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-md border border-gray-700 bg-gray-800/50 px-3 py-2 text-left text-sm text-gray-200 hover:border-gray-600 hover:bg-gray-800"
      >
        <svg className="h-4 w-4 flex-shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
        <span className="min-w-0 flex-1 truncate">{activeEvent.title}</span>
        <svg className={`h-3 w-3 flex-shrink-0 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-2 right-2 z-50 mt-1 rounded-lg border border-gray-700 bg-gray-800 py-1 shadow-xl">
            {events.map((evt) => (
              <EventOption
                key={evt.id}
                event={evt}
                active={evt.id === activeEvent.id}
                onClick={() => {
                  setActiveEvent(evt);
                  setOpen(false);
                }}
              />
            ))}
            <div className="border-t border-gray-700 mt-1 pt-1">
              <button
                onClick={() => {
                  navigate("/events");
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-400 hover:bg-gray-700 hover:text-gray-200"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.204-.107-.397.165-.71.505-.78.929l-.15.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Manage Events
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EventOption({ event, active, onClick }: { event: Event; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-700 ${
        active ? "text-blue-400" : "text-gray-300"
      }`}
    >
      <span className="min-w-0 flex-1 truncate">{event.title}</span>
      {event.date && (
        <span className="flex-shrink-0 text-xs text-gray-500">
          {new Date(event.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" })}
        </span>
      )}
      {active && (
        <svg className="h-4 w-4 flex-shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      )}
    </button>
  );
}
