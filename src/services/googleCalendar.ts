interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
}

class GoogleCalendarService {
  private static instance: GoogleCalendarService;
  private isInitialized: boolean = false;

  private constructor() {}

  public static getInstance(): GoogleCalendarService {
    if (!GoogleCalendarService.instance) {
      GoogleCalendarService.instance = new GoogleCalendarService();
    }
    return GoogleCalendarService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        window.gapi.load('client:auth2', async () => {
          try {
            await window.gapi.client.init({
              apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
              clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
              discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
              scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events'
            });
            this.isInitialized = true;
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      };
      script.onerror = (error) => reject(error);
      document.body.appendChild(script);
    });
  }

  public async signIn(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    if (!window.gapi.auth2.getAuthInstance().isSignedIn.get()) {
      await window.gapi.auth2.getAuthInstance().signIn();
    }
  }

  public async getEvents(): Promise<CalendarEvent[]> {
    try {
      await this.signIn();

      const response = await window.gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        showDeleted: false,
        singleEvents: true,
        maxResults: 100,
        orderBy: 'startTime'
      });

      return response.result.items.map((event: GoogleCalendarEvent) => ({
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

  public async addEvent(event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
    try {
      await this.signIn();

      const response = await window.gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource: {
          summary: event.title,
          start: {
            dateTime: event.start,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          end: {
            dateTime: event.end,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        }
      });

      return {
        id: response.result.id,
        title: response.result.summary,
        start: response.result.start.dateTime || response.result.start.date || '',
        end: response.result.end.dateTime || response.result.end.date || '',
        allDay: !response.result.start.dateTime
      };
    } catch (error) {
      console.error('Error adding event:', error);
      throw error;
    }
  }
}

export const googleCalendarService = GoogleCalendarService.getInstance(); 