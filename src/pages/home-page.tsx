import { SignInButton, SignOutButton, UserButton } from "@clerk/clerk-react";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { useRouter } from "@/hooks/use-router";
import GoogleCalendarEvents from "@/components/testclerk";
import { Button } from "@/components/ui/button";

const HomePage: React.FC = () => {
    const { navigate } = useRouter();
    return (
    <div>
    <div className="flex flex-col items-center justify-center min-h-svh">
      
      <Authenticated>
      <Button onClick={() => navigate("chats")}>Open Chat Interface</Button>
      <SignOutButton/>
      </Authenticated>


      <Unauthenticated>
        <SignInButton mode="modal"/>
      </Unauthenticated>
      {/* <GoogleCalendarEvents/> */}
      
      </div>
    
    </div>
  );
}

export default HomePage;