
import React, { useEffect, useState } from 'react';
import { useConvexAuth } from 'convex/react';

const GoogleCalendarEvents: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [events] = useState<any[]>([]);
  // const [code, setCode] = useState<string>("");

  //const fetchEvents = useAction(api.google.listGoogleCalendarEvents);
  // const jwtAccessToken = "";
  // setCode(jwtAccessToken);

  const { isAuthenticated } = useConvexAuth();

  useEffect(() => {
    

    // const fetchData = async () => {
    //   if (isAuthenticated) {
    //     const functionEvents = await fetchEvents({
    //       accessToken: jwtAccessToken,
    //       code: code,
    //     });
        
    //     setEvents(functionEvents as calendar_v3.Schema$Event[]);
    //   }
    // };
  
    // fetchData();
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
