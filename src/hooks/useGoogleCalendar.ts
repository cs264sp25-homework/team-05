import { useState, useEffect } from 'react';
import { useAction, useConvexAuth, useQuery } from 'convex/react';
import { api } from "../../convex/_generated/api";
import { useAuth } from '@clerk/clerk-react';


interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  description?: string;
  location?: string;
  recurrence?: string[];
  colorId?: string;
}

export function useGoogleCalendar() {
  const { isAuthenticated } = useConvexAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { userId } = useAuth();
  

  //TODO change this to fetch events from the database
  const createEvent = useAction(api.google.createGoogleCalendarEvent);
  const updateEventAction = useAction(api.google.updateGoogleCalendarEvent);
  const deleteEventAction = useAction(api.google.deleteGoogleCalendarEvent);

  const getEventsFromDB = useQuery(api.calendarEvents.getEvents);
  

  
  useEffect(() => {
    if (isAuthenticated) {
      loadEvents(new Date().toISOString(), new Date().toISOString());

    }
  }, [getEventsFromDB, isAuthenticated]);

  const loadEvents = async (startDate: string, endDate: string) => {
    console.log(startDate, endDate);
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    setError(null);
    try {

      const listEvents = getEventsFromDB || [];
      
      const events = listEvents.map((event: any) => ({
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
      const newEvent = await createEvent({
        event: {
          summary: event.title,
          start: {
            dateTime: event.start,
          },
          end: {
            dateTime: event.end,
          }
        },
        userId: userId,
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

  const updateEvent = async (eventId: string, updatedEvent: Omit<CalendarEvent, 'id'>) => {
    if (!isAuthenticated) throw new Error('Not authenticated');

    setIsLoading(true);
    setError(null);
    try {
      const updatedGoogleEvent = await updateEventAction({
        eventId: eventId,
        userId: userId,
        event: {
          summary: updatedEvent.title,
          start: {
            dateTime: updatedEvent.start,
          },
          end: {
            dateTime: updatedEvent.end,
          }
        }
      });

    


      if (updatedGoogleEvent?.id) {
        setEvents(prev => prev.map(event => 
          event.id === eventId 
            ? {
                id: eventId,
                title: updatedGoogleEvent.summary || 'Untitled Event',
                start: (updatedGoogleEvent.start?.dateTime || updatedGoogleEvent.start?.date || updatedEvent.start),
                end: (updatedGoogleEvent.end?.dateTime || updatedGoogleEvent.end?.date || updatedEvent.end),
                allDay: !updatedGoogleEvent.start?.dateTime
              }
            : event
        ));
      }
      return updatedGoogleEvent;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update event'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (!isAuthenticated) throw new Error('Not authenticated');

    setIsLoading(true);
    setError(null);
    try {
      await deleteEventAction({ eventId, userId });
      setEvents(prev => prev.filter(event => event.id !== eventId));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete event'));
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
    addEvent,
    updateEvent,
    deleteEvent
  };
} 