import { useState, useEffect } from 'react';
import { useAction, useConvexAuth } from 'convex/react';
import { api } from "../../convex/_generated/api";
import { googleCalendarService } from '@/services/googleCalendar';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
}

export function useGoogleCalendar() {
  const { isAuthenticated } = useConvexAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [code] = useState("");

  const fetchEvents = useAction(api.google.listGoogleCalendarEvents);

  useEffect(() => {
    if (isAuthenticated) {
      loadEvents(new Date().toISOString(), new Date().toISOString());
    }
  }, [isAuthenticated]);

  const loadEvents = async (startDate: string, endDate: string) => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const functionEvents = await fetchEvents({
        accessToken: "",
        code: code,
        startDate,
        endDate
      });
      
      const events = functionEvents.map((event: any) => ({
        id: event.id,
        title: event.summary,
        start: event.start.dateTime || event.start.date || '',
        end: event.end.dateTime || event.end.date || '',
        allDay: !event.start.dateTime
      }));
      
      setEvents(events);
    } catch (err) {
      console.error('Error loading events:', err);
      setError(err instanceof Error ? err : new Error('Failed to load events'));
    } finally {
      setIsLoading(false);
    }
  };

  const addEvent = async (event: Omit<CalendarEvent, 'id'>) => {
    if (!isAuthenticated) throw new Error('Not authenticated');

    setIsLoading(true);
    setError(null);
    try {
      const createEvent = useAction(api.google.createGoogleCalendarEvent);
      const newEvent = await createEvent({
        event: {
          summary: event.title,
          start: {
            dateTime: event.start,
          },
          end: {
            dateTime: event.end,
          }
        }
      });

      if (newEvent?.id) {
        setEvents(prev => [...prev, {
          id: newEvent.id as string,
          title: newEvent.summary || 'Untitled Event',
          start: (newEvent.start?.dateTime || newEvent.start?.date || event.start),
          end: (newEvent.end?.dateTime || newEvent.end?.date || event.end),
          allDay: !newEvent.start?.dateTime
        }]);
      }
      return newEvent;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to add event'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    events,
    isLoading,
    error,
    loadEvents,
    addEvent
  };
} 