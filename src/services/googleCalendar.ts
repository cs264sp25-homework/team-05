// interface GoogleCalendarEvent {
//   id: string;
//   summary: string;
//   start: {
//     dateTime?: string;
//     date?: string;
//     timeZone?: string;
//   };
//   end: {
//     dateTime?: string;
//     date?: string;
//     timeZone?: string;
//   };
// }

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
}

class GoogleCalendarService {
  private static instance: GoogleCalendarService;

  private constructor() {}

  public static getInstance(): GoogleCalendarService {
    if (!GoogleCalendarService.instance) {
      GoogleCalendarService.instance = new GoogleCalendarService();
    }
    return GoogleCalendarService.instance;
  }

  public async getEvents(fetchEvents: any): Promise<CalendarEvent[]> {
    try {
      const events = await fetchEvents();
      return events.map((event: any) => ({
        id: event.id,
        title: event.summary,
        start: event.start.dateTime || event.start.date || '',
        end: event.end.dateTime || event.end.date || '',
        allDay: !event.start.dateTime
      }));
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  }

  public async addEvent(createEvent: any, event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
    try {
      const newEvent = await createEvent({
        summary: event.title,
        start: {
          dateTime: event.start,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: event.end,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      });

      return {
        id: newEvent.id,
        title: newEvent.summary,
        start: newEvent.start.dateTime || newEvent.start.date || '',
        end: newEvent.end.dateTime || newEvent.end.date || '',
        allDay: !newEvent.start.dateTime
      };
    } catch (error) {
      console.error('Error adding event:', error);
      throw error;
    }
  }
}

export const googleCalendarService = GoogleCalendarService.getInstance(); 