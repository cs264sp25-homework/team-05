import { SignInButton, UserButton } from "@clerk/clerk-react";
import { Authenticated, Unauthenticated } from "convex/react";
import { useRouter } from "@/hooks/use-router";
import { Button } from "@/components/ui/button";
import Calendar from "@/components/Calendar";

const HomePage: React.FC = () => {
    const { navigate } = useRouter();
    return (
    <div>
    <div className="flex flex-col items-center justify-center min-h-svh">
      
      <Authenticated>
      <div className="w-full max-w-7xl mx-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <Button onClick={() => navigate("chats")}>Open Chat Interface</Button>
          <UserButton />
        </div>
        <div className="h-[800px]">
          <Calendar />
        </div>
      </div>
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