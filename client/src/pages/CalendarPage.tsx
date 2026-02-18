import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DatesSetArg, DateSelectArg, EventClickArg } from "@fullcalendar/core";
import { api } from "../api";
import TemplateQuickAdd from "../components/TemplateQuickAdd";
import useHotkeys from "../hooks/useHotkeys";

interface CalendarAppointment {
  id: string;
  title: string | null;
  datetime: string;
  patient: { id: string; name: string } | null;
  organization: { id: string; name: string; color: string | null } | null;
}

const calendarStyles = `
.fc {
  --fc-border-color: #374151;
  --fc-page-bg-color: transparent;
  --fc-neutral-bg-color: #1f2937;
  --fc-list-event-hover-bg-color: #1f2937;
  --fc-today-bg-color: rgba(59, 130, 246, 0.1);
}
.fc .fc-button {
  background-color: #374151;
  border-color: #4b5563;
  color: #d1d5db;
}
.fc .fc-button:hover {
  background-color: #4b5563;
}
.fc .fc-button-active {
  background-color: #2563eb !important;
  border-color: #2563eb !important;
}
.fc .fc-col-header-cell {
  background-color: #1f2937;
  color: #9ca3af;
}
.fc td, .fc th {
  border-color: #374151;
}
.fc .fc-daygrid-day-number,
.fc .fc-col-header-cell-cushion {
  color: #d1d5db;
}
.fc .fc-event {
  border: none;
}
.fc .fc-toolbar-title {
  color: #f3f4f6;
}
.fc .fc-button:disabled {
  background-color: #1f2937;
  border-color: #374151;
  color: #6b7280;
}
`;

export default function CalendarPage() {
  const navigate = useNavigate();
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<{ id: string; title: string; start: string; backgroundColor: string }[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  useHotkeys({
    m: () => calendarRef.current?.getApi().changeView("dayGridMonth"),
    w: () => calendarRef.current?.getApi().changeView("timeGridWeek"),
    t: () => calendarRef.current?.getApi().today(),
    ArrowLeft: () => calendarRef.current?.getApi().prev(),
    ArrowRight: () => calendarRef.current?.getApi().next(),
    n: () => navigate("/appointments/new"),
    f: () => setShowTemplateModal(true),
    Escape: () => {
      if (showTemplateModal) setShowTemplateModal(false);
      else (document.activeElement as HTMLElement)?.blur();
    },
  });

  const fetchAppointments = useCallback(async (start: string, end: string) => {
    try {
      const params = new URLSearchParams({ start, end });
      const result = await api<CalendarAppointment[]>(`/api/v1/calendar?${params}`);
      const mapped = result.map((appt) => {
        let title = appt.title;
        if (!title) {
          const parts = [appt.patient?.name, appt.organization?.name].filter(Boolean);
          title = parts.length > 0 ? parts.join(" - ") : "Appointment";
        }
        return {
          id: appt.id,
          title,
          start: appt.datetime,
          backgroundColor: appt.organization?.color || "#3b82f6",
        };
      });
      setEvents(mapped);
    } catch {
      // Calendar fetch failed silently - events just won't show
    }
  }, []);

  function handleDatesSet(arg: DatesSetArg) {
    fetchAppointments(arg.start.toISOString(), arg.end.toISOString());
  }

  function handleDateSelect(arg: DateSelectArg) {
    navigate(`/appointments/new?datetime=${arg.start.toISOString()}`);
  }

  function handleEventClick(arg: EventClickArg) {
    navigate(`/appointments/${arg.event.id}`);
  }

  return (
    <div>
      <style>{calendarStyles}</style>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-100">Calendar</h2>
        <button
          onClick={() => setShowTemplateModal(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          From Template
          <kbd className="relative -top-px ml-1.5 rounded border border-blue-400/30 bg-blue-500/20 px-1 py-0.5 font-mono text-[10px]">F</kbd>
        </button>
      </div>

      <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek",
          }}
          selectable
          selectMirror
          datesSet={handleDatesSet}
          select={handleDateSelect}
          eventClick={handleEventClick}
          events={events}
          height="auto"
          eventTimeFormat={{
            hour: "numeric",
            minute: "2-digit",
            meridiem: "short",
          }}
        />
      </div>

      {showTemplateModal && (
        <TemplateQuickAdd
          onClose={() => setShowTemplateModal(false)}
          onCreated={() => {
            const calApi = calendarRef.current?.getApi();
            if (calApi) fetchAppointments(calApi.view.activeStart.toISOString(), calApi.view.activeEnd.toISOString());
          }}
        />
      )}
    </div>
  );
}
