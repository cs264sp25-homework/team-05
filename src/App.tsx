import { SignInButton, SignOutButton,  } from "@clerk/clerk-react";
import { Authenticated, Unauthenticated, useAction,  } from "convex/react";
import { useConvexAuth } from "convex/react";
import GoogleCalendarEvents from "./components/testclerk";
import { api } from "../convex/_generated/api";
import CreateEventForm from "./components/create-event-form";

function App() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const createEvent = useAction(api.google.createGoogleCalendarEvent);

  const handleCreateEvent = async (eventData: {
    summary: string;
    start: {
      dateTime: string;
    };
    end: {
      dateTime: string;
    };
    description?: string;
  }) => {
    await createEvent({event:{
      ...eventData,
    }});
  };


  return (
    // <div className="App">
    //   <SignInButton mode="modal"/>
    //   <Authenticated>Signed in</Authenticated>
    //   <Unauthenticated>not signed in :</Unauthenticated>
    //   <GoogleCalendarEvents/>
    //   <SignOutButton/>
    //   </div>
    <div className="flex flex-col items-center justify-center min-h-svh">
    {isAuthenticated ? (
      <>
        <SignOutButton />
        <CreateEventForm onSubmit={handleCreateEvent}/>
        <GoogleCalendarEvents />
        
      </>
    ) : isLoading ? (
      <div>Loading...</div>
    ) : (
      <SignInButton />
    )}
  </div>
  );
}


// https://www.googleapis.com/auth/calendar.readonly




// function Content() {
//   return <div>Authenticated content</div>;
// }

export default App;