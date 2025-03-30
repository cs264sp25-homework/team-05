import { SignInButton, SignOutButton, UserButton } from "@clerk/clerk-react";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { useRouter } from "@/hooks/use-router";
import GoogleCalendarEvents from "@/components/testclerk";
import { Button } from "@/components/ui/button";

const HomePage: React.FC = () => {
    const { navigate } = useRouter();
    return (
    <div>
    <div className="App">
      <SignInButton mode="modal"/>
      <Authenticated>Signed in</Authenticated>
      <Unauthenticated>not signed in :</Unauthenticated>
      <GoogleCalendarEvents/>
      <SignOutButton/>
      </div>
    <Button onClick={() => navigate("chats")}>Open Chat Interface</Button>
    </div>
  );
}

export default HomePage;