import { cn } from "@/lib/utils";
import { Bot, Calendar } from "lucide-react";
import { useRouter } from "@/hooks/use-router";
import { useUser } from "@clerk/clerk-react";

const DEBUG = false;

const Header: React.FC = () => {
  const {navigate} = useRouter();
  const { user } = useUser();

  console.log(user?.firstName);

  let firstName = "";
  if (user?.firstName) {
    firstName = user.firstName;
  }


  return (
    <header
      className={cn("flex items-center justify-between gap-1 w-full py-1 border-b", {
      "border-2 border-green-500": DEBUG,
      })}
    >
      <div
      className={cn(
      "flex items-center justify-start w-full font-light text-muted-foreground",
      {
      "border-2 border-blue-500": DEBUG,
      },
      )}
      >
      <Calendar className="w-5 h-5 mr-1" onClick={() => navigate("home")} />
      <span className="truncate">Scheduler App</span>
      </div>
      <div className="flex items-center whitespace-nowrap pr-2">
      <Bot className="w-5 h-5 mr-1" onClick={() => navigate("assistants")}/>
      <span>{firstName}'s Assistants</span>
      </div>
    </header>
  );
};

export default Header;
