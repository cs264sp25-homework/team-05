
import React, { useEffect, useState } from 'react';
import { useAction, useConvexAuth } from 'convex/react';
import { api } from "../../convex/_generated/api";
import { useAuthActions, useAuthToken } from '@convex-dev/auth/react';
import { Button } from './ui/button';

const GoogleCalendarEvents: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [events, setEvents] = useState<any[]>([]);
  const [code, setCode] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useAction(api.google.listGoogleCalendarEvents);
  const jwtAccessToken = "";

  const { isAuthenticated } = useConvexAuth();

  console.log("isAuthenticated:", isAuthenticated);
  

  useEffect(() => {
  }, []);



  useEffect(() => {
    console.log("within the useEffect hook");
    console.log("isAuthenticated:", isAuthenticated);

    const fetchData = async () => {
      if (isAuthenticated) {
        console.log("Going into function")
        const functionEvents = await fetchEvents({
          accessToken: jwtAccessToken,
          code: code,
        });
        
        console.log("Function Events:", functionEvents);
        //setEvents(functionEvents);
      }
    };
  
    fetchData();
  }, [isAuthenticated]);  
  

  return (
    <div>

      {events.length > 0 && (
      <>
        <h2>Google Calendar Events</h2>
        <ul>
        {events.map((event) => (
          <li key={event.id}>
          {event.summary} - {new Date(event.start.dateTime).toLocaleString()}
          </li>
        ))}
        </ul>
      </>
      )}
    </div>
  );
};

export default GoogleCalendarEvents;
