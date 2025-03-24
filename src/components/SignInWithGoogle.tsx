import React, { useEffect, useState } from 'react';
import { useAction, useConvexAuth } from 'convex/react';
import { api } from "../../convex/_generated/api";
import { useAuthActions, useAuthToken } from '@convex-dev/auth/react';
import { Button } from './ui/button';

const GoogleCalendarEvents: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [events, setEvents] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);

  const {signIn } = useAuthActions();

  const fetchEvents = useAction(api.google.listGoogleCalendarEvents);
  const accessToken = useAuthToken(); // Replace with your method to get the access token
  


  useEffect(() => {
    // Parse the URL to extract the code parameter
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");

    if (code) {
      // setAuthCode(code);
      console.log("Authorization Code:", code);
      setCode(code);
      //exchangeCodeForTokens(code);
      // getTokens(code);
      // You may want to remove it from the URL after storing it

    }
  }, []);

  useEffect(() => {
    const getEvents = async () => {
      const refreshToken = localStorage.getItem('__convexAuthRefreshToken_httpsoriginalpeccary306convexcloud');
      if (!accessToken || !code || !refreshToken) {
        return;
      }
      console.log('Refresh Token:', refreshToken);
      try {
        console.log('Fetching events with access token:', accessToken);
        const data = await fetchEvents({accessToken: refreshToken, code} );
        setEvents(data);
      } catch (err) {
        setError(`Failed to fetch events. ${err}`);
      }
    };

    getEvents();
  }, [fetchEvents, accessToken, code]);

  

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
