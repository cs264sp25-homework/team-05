import { useState, useEffect } from 'react';
import { googleCalendarService } from '@/services/googleCalendar';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
}

export function useGoogleCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const events = await googleCalendarService.getEvents();
      setEvents(events);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load events'));
    } finally {
      setIsLoading(false);
    }
  };

  const addEvent = async (event: Omit<CalendarEvent, 'id'>) => {
    setIsLoading(true);
    setError(null);
    try {
      const newEvent = await googleCalendarService.addEvent(event);
      setEvents(prev => [...prev, newEvent]);
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