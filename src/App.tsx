import { SignInButton, SignOutButton, UserButton } from "@clerk/clerk-react";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import GoogleCalendarEvents from "./components/testclerk";

function App() {
  return (
    <div className="App">
      <SignInButton mode="modal"/>
      <Authenticated>Signed in</Authenticated>
      <Unauthenticated>not signed in :</Unauthenticated>
      <GoogleCalendarEvents/>
      <SignOutButton/>
      </div>
  );
}


// https://www.googleapis.com/auth/calendar.readonly




// function Content() {
//   return <div>Authenticated content</div>;
// }

export default App;