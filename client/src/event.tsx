import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { api, getStoredEventId, setStoredEventId, clearStoredEventId } from "./api";

export interface Event {
  id: string;
  title: string;
  date: string;
  notes: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: string | null;
  lng: string | null;
  createdAt: string;
}

interface EventState {
  events: Event[];
  activeEvent: Event | null;
  loading: boolean;
  setActiveEvent: (event: Event) => void;
  createEvent: (data: Omit<Event, "id" | "createdAt">) => Promise<Event>;
  refreshEvents: () => void;
}

const EventContext = createContext<EventState>({
  events: [],
  activeEvent: null,
  loading: true,
  setActiveEvent: () => {},
  createEvent: async () => { throw new Error("No EventProvider"); },
  refreshEvents: () => {},
});

export function EventProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [activeEvent, setActiveEventState] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshEvents = useCallback(() => {
    api<{ data: Event[] }>("/api/v1/events?limit=100")
      .then((res) => {
        setEvents(res.data);

        // Restore active event from localStorage
        const storedId = getStoredEventId();
        if (storedId) {
          const found = res.data.find((e) => e.id === storedId);
          if (found) {
            setActiveEventState(found);
          } else if (res.data.length > 0) {
            // Stored ID no longer valid, pick first
            setActiveEventState(res.data[0]);
            setStoredEventId(res.data[0].id);
          } else {
            clearStoredEventId();
            setActiveEventState(null);
          }
        } else if (res.data.length > 0) {
          // No stored ID, pick first
          setActiveEventState(res.data[0]);
          setStoredEventId(res.data[0].id);
        }
      })
      .catch(() => {
        // Not authenticated yet or server error -- leave empty
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(refreshEvents, [refreshEvents]);

  const setActiveEvent = useCallback((event: Event) => {
    setActiveEventState(event);
    setStoredEventId(event.id);
  }, []);

  const createEvent = useCallback(async (data: Omit<Event, "id" | "createdAt">) => {
    const created = await api<Event>("/api/v1/events", { body: data });
    setEvents((prev) => [created, ...prev]);
    setActiveEventState(created);
    setStoredEventId(created.id);
    return created;
  }, []);

  return (
    <EventContext.Provider value={{ events, activeEvent, loading, setActiveEvent, createEvent, refreshEvents }}>
      {children}
    </EventContext.Provider>
  );
}

export function useEvent() {
  return useContext(EventContext);
}
