import { cn } from "@/lib/utils";
import { Calendar, Users, MessageSquare } from "lucide-react";
import { useRouter } from "@/hooks/use-router";
import { Button } from "./ui/button";

const DEBUG = false;

const Header: React.FC = () => {
  const { navigate, currentRoute } = useRouter();

  const navItems = [
    {
      icon: <Calendar className="w-5 h-5" />,
      label: "Calendar",
      route: "home",
    },
    {
      icon: <Users className="w-5 h-5" />,
      label: "Groups",
      route: "groups",
    },
    {
      icon: <MessageSquare className="w-5 h-5" />,
      label: "Chats",
      route: "chats",
    },
  ];

  return (
    <header
      className={cn(
        "flex items-center justify-between gap-4 w-full py-2 px-4 border-b",
        {
        "border-2 border-green-500": DEBUG,
        }
      )}
    >
      <div
        className={cn("flex items-center justify-start gap-2", {
            "border-2 border-blue-500": DEBUG,
        })}
      >
        <Calendar className="w-6 h-6" />
        <span className="font-semibold text-lg">Scheduler App</span>
      </div>

      <nav className="flex items-center gap-2">
        {navItems.map((item) => (
          <Button
            key={item.route}
            variant={currentRoute === item.route ? "default" : "ghost"}
            className="flex items-center gap-2"
            onClick={() => navigate(item.route)}
          >
            {item.icon}
            <span>{item.label}</span>
          </Button>
        ))}
      </nav>
    </header>
  );
};

export default Header;
