import React, { useEffect, useState } from 'react';
import { useAction, useConvexAuth } from 'convex/react';
import { api } from "../../convex/_generated/api";
import { useAuthActions, useAuthToken } from '@convex-dev/auth/react';
import { Button } from './ui/button';

const GoogleCalendarEvents: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const {signIn } = useAuthActions();

  const fetchEvents = useAction(api.google.listGoogleCalendarEvents);
  const accessToken = useAuthToken(); // Replace with your method to get the access token



  useEffect(() => {
    const getEvents = async () => {
      if (!accessToken) {
        return;
      }
      try {
        console.log('Fetching events with access token:', accessToken);
        const data = await fetchEvents({accessToken});
        setEvents(data);
      } catch (err) {
        setError('Failed to fetch events.');
      }
    };

    getEvents();
  }, [fetchEvents, accessToken]);

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div>
      <Button
      className="flex-1"
      variant="outline"
      type="button"
      onClick={() => void signIn("google")}
    >
      Google
    </Button>
      <h2>Google Calendar Events</h2>
      <ul>
        {events.map((event) => (
          <li key={event.id}>
            {event.summary} - {new Date(event.start.dateTime).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default GoogleCalendarEvents;
