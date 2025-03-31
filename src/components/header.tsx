import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";

const DEBUG = false;

const Header: React.FC = () => {
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
        <Calendar className="w-5 h-5 mr-1" />
        <span className="truncate">Scheduler App</span>
      </div>
    </header>
  );
};

export default Header;
